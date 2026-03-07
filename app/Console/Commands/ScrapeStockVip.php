<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use App\Models\LotteryType;
use App\Models\LotteryResult;
use App\Models\ScraperLog;
use App\Services\BetSettlementService;
use Carbon\Carbon;

/**
 * หุ้น VIP Scraper
 * ดึงผลหวยหุ้น VIP จาก stocks-vip.com ผ่าน Puppeteer
 * 
 * Source: stocks-vip.com (Vue.js SPA)
 * Fallback: nikkeivipstock.com, hangseng-vip.com, dowjones-vip.com
 * 
 * 13 หุ้น VIP:
 *   นิเคอิเช้า(09:05), จีนเช้า(10:05), ฮั่งเส็งเช้า(10:35),
 *   ไต้หวัน(11:35), เกาหลี(12:35), นิเคอิบ่าย(13:25),
 *   จีนบ่าย(14:25), ฮั่งเส็งบ่าย(15:25), สิงคโปร์(17:05),
 *   อังกฤษ(21:50), เยอรมัน(22:50), รัสเซีย(23:50), ดาวโจนส์(00:30)
 */
class ScrapeStockVip extends Command
{
    protected $signature = 'lottery:scrape-stock-vip
                            {--slug= : Scrape specific VIP stock by slug}
                            {--calculate : Also calculate winning bets after scraping}';

    protected $description = 'Scrape VIP stock lottery results from stocks-vip.com';

    protected BetSettlementService $settlementService;

    public function __construct(BetSettlementService $settlementService)
    {
        parent::__construct();
        $this->settlementService = $settlementService;
    }

    public function handle()
    {
        $filterSlug = $this->option('slug');
        $calculate = $this->option('calculate');

        $this->info('📈 Starting VIP Stock scraper at ' . now()->format('Y-m-d H:i:s'));

        // Call Node.js Puppeteer script
        $scriptPath = base_path('scripts/stocks_vip_draw.js');

        if (!file_exists($scriptPath)) {
            $this->error("❌ Script not found: {$scriptPath}");
            return Command::FAILURE;
        }

        $this->info('🔄 Running Puppeteer scraper for stocks-vip.com...');

        $output = shell_exec("cd " . base_path() . " && node \"{$scriptPath}\" 2>&1");

        if (empty($output)) {
            $this->error('❌ No output from scraper');
            ScraperLog::log('stock-vip', 'หุ้น VIP', 'stocks-vip.com', 'failed', 'No output', null, null);
            return Command::FAILURE;
        }

        // Find JSON in output (stderr goes first, JSON on stdout)
        $jsonStart = strpos($output, '{');
        if ($jsonStart === false) {
            $this->error('❌ No JSON found in output');
            $this->line(substr($output, 0, 500));
            ScraperLog::log('stock-vip', 'หุ้น VIP', 'stocks-vip.com', 'failed', 'No JSON', null, null);
            return Command::FAILURE;
        }

        $json = substr($output, $jsonStart);
        $data = json_decode($json, true);

        if (!$data || !isset($data['success'])) {
            $this->error('❌ Invalid JSON');
            $this->line(substr($json, 0, 300));
            return Command::FAILURE;
        }

        if (!$data['success']) {
            $this->error('❌ Scraper failed: ' . ($data['error'] ?? 'Unknown'));
            ScraperLog::log('stock-vip', 'หุ้น VIP', 'stocks-vip.com', 'failed', $data['error'] ?? 'Unknown', null, null);
            return Command::FAILURE;
        }

        $results = $data['results'] ?? [];
        $this->info("📊 Found " . count($results) . " VIP stock results");

        // Debug: show all slugs returned by scraper
        $allSlugs = array_map(fn($r) => $r['slug'] ?? '?', $results);
        $this->info("📋 Slugs found: " . implode(', ', $allSlugs));

        if (empty($results)) {
            $this->warn('⚠️  No results found (ยังไม่มีผล หรือ page structure เปลี่ยน)');
            ScraperLog::log('stock-vip', 'หุ้น VIP', 'stocks-vip.com', 'pending', 'No results', $data, null);
            return Command::SUCCESS;
        }

        $successCount = 0;
        $skippedCount = 0;
        $failedCount = 0;

        foreach ($results as $r) {
            $slug = $r['slug'] ?? '';
            $lotteryName = $r['lottery_name'] ?? '';
            $threeTop = $r['three_top'] ?? '';
            $twoTop = $r['two_top'] ?? '';
            $twoBottom = $r['two_bottom'] ?? '';
            $drawDate = $r['draw_date'] ?? Carbon::today()->format('Y-m-d');

            // Validate draw_date format
            try {
                $drawDate = Carbon::parse($drawDate)->format('Y-m-d');
            } catch (\Exception $e) {
                $drawDate = Carbon::today()->format('Y-m-d');
            }

            if ($filterSlug && $slug !== $filterSlug) {
                continue;
            }

            if (empty($slug) || empty($threeTop)) {
                $this->warn("⚠️  Skip invalid: slug={$slug}, three_top={$threeTop}");
                continue;
            }

            $lotteryType = LotteryType::where('slug', $slug)->first();
            if (!$lotteryType) {
                $this->warn("⚠️  ไม่พบ lottery type: '{$slug}' — ต้อง run migration ก่อน");
                continue;
            }

            if (!$lotteryType->is_active) {
                continue;
            }

            // ✅ ข้ามหุ้นที่ยังไม่ถึงเวลาออกผล — ป้องกันบันทึกผลเก่า/ค้าง
            if ($lotteryType->draw_time) {
                $now = Carbon::now('Asia/Bangkok');
                list($dh, $dm) = explode(':', $lotteryType->draw_time);
                $drawMoment = $now->copy()->setTime((int) $dh, (int) $dm, 0);

                // ถ้ายังไม่ถึง draw_time → ข้ามไป ไม่บันทึก
                if ($now->lessThan($drawMoment)) {
                    $this->line("⏰ {$lotteryName}: ยังไม่ถึงเวลาออกผล ({$lotteryType->draw_time}) — ข้าม");
                    continue;
                }
            }

            // Check duplicate
            $existing = LotteryResult::where('lottery_type_id', $lotteryType->id)
                ->where('draw_date', $drawDate)
                ->first();

            if ($existing) {
                // ⚠️ SAFETY: ไม่อัปเดตผลทับอัตโนมัติ — ป้องกัน "แก้ไขผลหวย" หักเครดิตลูกค้า
                if ($existing->three_top !== $threeTop || $existing->two_bottom !== $twoBottom) {
                    $this->warn("⚠️  {$lotteryName}: ผลใหม่ ({$threeTop}/{$twoBottom}) ≠ ผลเดิม ({$existing->three_top}/{$existing->two_bottom}) — ไม่อัปเดตอัตโนมัติ! ต้องแก้ผ่าน Admin");
                    \Log::warning("VIP Stock result mismatch: {$lotteryName} ({$slug}) " .
                        "existing={$existing->three_top}/{$existing->two_bottom} " .
                        "new={$threeTop}/{$twoBottom} — NOT auto-updating");
                    ScraperLog::log(
                        $slug,
                        $lotteryName,
                        'stocks-vip.com',
                        'mismatch',
                        "Existing: {$existing->three_top}/{$existing->two_bottom}, New: {$threeTop}/{$twoBottom} — skipped",
                        null,
                        $existing->id
                    );
                } else {
                    $skippedCount++;
                }

                // ✅ FIX: ถึงผลจะมีอยู่แล้ว ก็ต้อง settle bets ที่ยัง pending อยู่
                if ($calculate) {
                    $pendingCount = \App\Models\Bet::where('lottery_type_id', $lotteryType->id)
                        ->where('status', 'pending')
                        ->whereDate('draw_date', $drawDate)
                        ->count();

                    if ($pendingCount > 0) {
                        $this->info("   🔄 พบ {$pendingCount} bets ที่ยัง pending — กำลัง settle...");
                        $settlement = \DB::transaction(function () use ($existing) {
                            return $this->settlementService->settleBets($existing);
                        });
                        $this->info("   → คำนวณผล: ถูก {$settlement['won']} จาก {$settlement['settled']} รายการ, จ่าย {$settlement['total_payout']} บาท");
                    }
                }

                continue;
            }

            // Save new result
            try {
                // ✅ SECURITY: Validate scraped data format
                if (!preg_match('/^\d{3}$/', $threeTop)) {
                    $this->warn("⚠️  {$lotteryName}: three_top '{$threeTop}' ไม่ใช่ตัวเลข 3 หลัก — ข้าม (อาจเป็นข้อมูลปลอม)");
                    Log::warning("VIP Stock suspicious data: {$lotteryName} three_top='{$threeTop}' — rejected");
                    ScraperLog::log($slug, $lotteryName, 'stocks-vip.com', 'rejected', "Invalid three_top: {$threeTop}", null, null);
                    $failedCount++;
                    continue;
                }
                if ($twoBottom && !preg_match('/^\d{2}$/', $twoBottom)) {
                    $this->warn("⚠️  {$lotteryName}: two_bottom '{$twoBottom}' ไม่ใช่ตัวเลข 2 หลัก — ข้าม");
                    Log::warning("VIP Stock suspicious data: {$lotteryName} two_bottom='{$twoBottom}' — rejected");
                    ScraperLog::log($slug, $lotteryName, 'stocks-vip.com', 'rejected', "Invalid two_bottom: {$twoBottom}", null, null);
                    $failedCount++;
                    continue;
                }

                $lotteryResult = LotteryResult::create([
                    'lottery_type_id' => $lotteryType->id,
                    'draw_date' => $drawDate,
                    'first_prize' => $threeTop,
                    'three_top' => $threeTop,
                    'two_top' => $twoTop ?: substr($threeTop, -2),
                    'two_bottom' => $twoBottom,
                    'details' => json_encode([
                        'source' => 'stocks-vip.com',
                        'scraped_at' => now()->toIso8601String(),
                        'server_ip' => request()->ip() ?? 'cli',
                    ]),
                ]);

                $this->info("✅ {$lotteryName}: {$threeTop} / {$twoTop} / {$twoBottom} ({$drawDate}) [ใหม่!]");
                $successCount++;

                // Calculate bet settlement
                if ($calculate) {
                    $settlement = \DB::transaction(function () use ($lotteryResult) {
                        return $this->settlementService->settleBets($lotteryResult);
                    });
                    $this->info("   → คำนวณผล: ถูก {$settlement['won']} จาก {$settlement['settled']} รายการ, จ่าย {$settlement['total_payout']} บาท");

                    // ✅ SECURITY: Anomaly Detection — flag users who win suspiciously often
                    if ($settlement['won'] > 0) {
                        $this->detectAnomalousWins($lotteryType->id, $drawDate, $lotteryName);
                    }
                }

                ScraperLog::log(
                    $slug,
                    $lotteryName,
                    'stocks-vip.com',
                    'success',
                    "Result: {$threeTop}/{$twoTop}/{$twoBottom}",
                    null,
                    $lotteryResult->id
                );

            } catch (\Exception $e) {
                $this->warn("❌ {$lotteryName}: " . $e->getMessage());
                $failedCount++;
                ScraperLog::log($slug, $lotteryName, 'stocks-vip.com', 'failed', $e->getMessage(), null, null);
            }
        }

        $this->info("📈 VIP Stocks: ✅ {$successCount} สำเร็จ, ⏭️  {$skippedCount} ข้าม, ❌ {$failedCount} ล้มเหลว");

        return Command::SUCCESS;
    }

    /**
     * ✅ SECURITY: Detect users who win suspiciously often on VIP stock lotteries
     * Log CRITICAL warning if a user wins more than 3 times in last 7 days
     */
    private function detectAnomalousWins(int $lotteryTypeId, string $drawDate, string $lotteryName): void
    {
        try {
            $sevenDaysAgo = Carbon::parse($drawDate)->subDays(7)->toDateString();

            // Find users who won bets on this lottery type in the last 7 days
            $suspiciousUsers = \App\Models\Bet::where('lottery_type_id', $lotteryTypeId)
                ->whereIn('status', ['won', 'paid'])
                ->where('draw_date', '>=', $sevenDaysAgo)
                ->where('draw_date', '<=', $drawDate)
                ->selectRaw('user_id, COUNT(*) as win_count, SUM(win_amount) as total_won, GROUP_CONCAT(DISTINCT number) as numbers')
                ->groupBy('user_id')
                ->having('win_count', '>=', 3)
                ->get();

            foreach ($suspiciousUsers as $sus) {
                $user = \App\Models\User::find($sus->user_id);
                $username = $user ? $user->username : "ID:{$sus->user_id}";

                Log::critical("🚨 ANOMALY DETECTED: User '{$username}' (ID:{$sus->user_id}) ถูกรางวัล {$sus->win_count} ครั้งใน 7 วัน " .
                    "หวย: {$lotteryName} | ได้เงิน: ฿" . number_format($sus->total_won, 2) .
                    " | เลขที่แทง: {$sus->numbers}");

                $this->warn("🚨 ANOMALY: User '{$username}' ถูกรางวัล {$sus->win_count} ครั้งใน 7 วัน (ได้ ฿" . number_format($sus->total_won) . ")");

                // Also log to scraper_logs for admin dashboard visibility
                ScraperLog::log(
                    'anomaly-detection',
                    $lotteryName,
                    'internal',
                    'warning',
                    "🚨 User '{$username}' (ID:{$sus->user_id}) won {$sus->win_count}x in 7 days, total ฿" . number_format($sus->total_won, 2) . " — numbers: {$sus->numbers}",
                    null,
                    null
                );
            }
        } catch (\Exception $e) {
            Log::warning("Anomaly detection error: " . $e->getMessage());
        }
    }
}
