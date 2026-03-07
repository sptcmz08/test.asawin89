<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\AdminLog;
use App\Models\Bet;
use App\Models\ScraperLog;
use App\Models\SpecialNumber;
use App\Models\LotteryType;
use App\Models\LotteryResult;
use App\Services\BetSettlementService;
use Carbon\Carbon;
use App\Models\User;

class AutoScrapeLottery extends Command
{
    protected $signature = 'lottery:auto-scrape 
                            {slug? : Specific lottery slug to scrape (optional)}
                            {--all : Scrape all lottery types}
                            {--calculate : Also calculate winning bets after scraping}';

    protected $description = 'Automatically scrape lottery results from ManyCai /Issue/draw';

    // Mapping ชื่อหวยภาษาไทย -> slug (ครบ 26 ประเภท)
    private $lotteryNameMappings = [
        // === หวยรัฐบาล/ออมทรัพย์ ===
        'หวยรัฐบาล' => 'thai',
        'สลากออมทรัพย์ ธ.ก.ส.' => 'baac',

        // === หวยลาว ===
        'หวยลาว' => 'lao',
        'หวยลาวพัฒนา' => 'lao',
        // 'หวยลาว VIP' => 'lao-vip', // ❌ ย้ายไปใช้ ScrapeLaoVip (laos-vip.com) แทน ManyCai
        // 'จับยี่กี VIP' => 'lao-vip', // ❌ จับยี่กี VIP เป็นหวยคนละตัวกับ หวยลาว VIP
        // 'ຫວຍລາວ VIP' => 'lao-vip', // ❌ ย้ายไปใช้ ScrapeLaoVip
        'หวยลาวสตาร์' => 'lao-star',
        'ลาวสตาร์' => 'lao-star',

        // === หวยฮานอย ===
        // 'หวยฮานอย' => 'hanoi', // ❌ ManyCai YNHN ไม่ใช่หวยฮานอยปกติ → ใช้ XSMB API แทน (ScrapeHanoiNormal)
        'หวยฮานอย VIP' => 'hanoi-vip',
        'หวยฮานอยพิเศษ' => 'hanoi-special',
        'ฮานอยพิเศษ' => 'hanoi-special',
        'ฮานอยเฉพาะกิจ' => 'hanoi-adhoc',

        // === หวยมาเลย์ ===
        // 'หวยมาเลย์' => 'malay', // ❌ ManyCai YNMA ไม่ใช่ Magnum 4D → ใช้ ScrapeMalayLottery (4dresult88.com) แทน

        // === หุ้นฮั่งเส็ง ===
        'หุ้นฮั่งเส็ง - รอบเช้า' => 'hangseng-morning',
        'หุ้นฮั่งเส็ง - รอบบ่าย' => 'hangseng-afternoon',

        // === หุ้นไต้หวัน ===
        'หุ้นไต้หวัน' => 'taiwan',

        // === นิเคอิ ===
        'นิเคอิ - รอบเช้า' => 'nikkei-morning',
        'นิเคอิ - รอบบ่าย' => 'nikkei-afternoon',

        // === หุ้นเกาหลี ===
        'หุ้นเกาหลี' => 'korea',

        // === หุ้นจีน ===
        'หุ้นจีน - รอบเช้า' => 'china-morning',
        'หุ้นจีน - รอบบ่าย' => 'china-afternoon',

        // === หุ้นสิงคโปร์ ===
        'หุ้นสิงคโปร์' => 'singapore',

        // === หุ้นไทย ===
        // ManyCai มีแค่ผลรอบเย็น (ปิด 16:30) — รอบเช้า (12:30) ใช้ ScrapeThaiStockMorning แยก
        'หุ้นไทย' => 'thai-stock',

        // === หุ้นอินเดีย ===
        'หุ้นอินเดีย' => 'india',

        // === หุ้นอียิปต์ ===
        'หุ้นอียิปต์' => 'egypt',

        // === หุ้นรัสเซีย ===
        'หุ้นรัสเซีย' => 'russia',

        // === หุ้นเยอรมัน ===
        'หุ้นเยอรมัน' => 'germany',

        // === หุ้นอังกฤษ ===
        'หุ้นอังกฤษ' => 'uk',

        // === หุ้นดาวโจนส์ ===
        'หุ้นดาวโจนส์' => 'dowjones',
    ];

    protected BetSettlementService $settlementService;

    public function __construct(BetSettlementService $settlementService)
    {
        parent::__construct();
        $this->settlementService = $settlementService;
    }

    public function handle()
    {
        $slug = $this->argument('slug');
        $calculate = $this->option('calculate');

        $this->info('🎰 Starting auto-scrape at ' . now()->format('Y-m-d H:i:s'));
        $this->info('📍 Source: https://th.manycai.com/Issue/draw');

        // Call Node.js script
        $scriptPath = base_path('scripts/manycai_draw.js');

        if (!file_exists($scriptPath)) {
            $this->error("❌ Script not found: {$scriptPath}");
            ScraperLog::log('all', 'All', 'manycai-draw', 'failed', "Script not found: {$scriptPath}");
            return Command::FAILURE;
        }

        $this->info('🔄 Running Puppeteer scraper...');

        $output = shell_exec("cd " . base_path() . " && node \"{$scriptPath}\" 2>&1");

        if (empty($output)) {
            $this->error('❌ No output from scraper');
            ScraperLog::log('all', 'All', 'manycai-draw', 'failed', 'No output from Puppeteer script');
            return Command::FAILURE;
        }

        // Find JSON
        $jsonStart = strpos($output, '{');
        if ($jsonStart === false) {
            $this->error('❌ No JSON found');
            $this->line(substr($output, 0, 500));
            ScraperLog::log('all', 'All', 'manycai-draw', 'failed', 'No JSON in output', ['output' => substr($output, 0, 500)]);
            return Command::FAILURE;
        }

        $json = substr($output, $jsonStart);
        $data = json_decode($json, true);

        if (!$data || !isset($data['success'])) {
            $this->error('❌ Invalid JSON');
            ScraperLog::log('all', 'All', 'manycai-draw', 'failed', 'Invalid JSON response', ['json' => substr($json, 0, 500)]);
            return Command::FAILURE;
        }

        if (!$data['success']) {
            $this->error('❌ Scraper failed: ' . ($data['error'] ?? 'Unknown'));
            ScraperLog::log('all', 'All', 'manycai-draw', 'failed', 'Scraper returned failure: ' . ($data['error'] ?? 'Unknown'));
            return Command::FAILURE;
        }

        $results = $data['results'] ?? [];
        $this->info("📊 Found " . count($results) . " lottery results");

        $successCount = 0;
        $failedCount = 0;
        $skippedCount = 0;

        foreach ($results as $r) {
            $lotteryName = $r['lottery_name'] ?? '';
            $firstPrize = $r['first_prize'] ?? '';
            $drawDate = $r['draw_date'] ?? Carbon::today()->format('Y-m-d');

            $lotterySlug = $this->lotteryNameMappings[$lotteryName] ?? null;

            if (!$lotterySlug) {
                $this->warn("⚠️  ไม่พบ mapping: '{$lotteryName}' (ผล: {$firstPrize})");
                continue; // Skip unmapped
            }

            if ($slug && $lotterySlug !== $slug) {
                continue;
            }

            // Reject future dates
            if ($drawDate > Carbon::today()->format('Y-m-d')) {
                $this->warn("⚠️  {$lotteryName}: วันที่ {$drawDate} เป็นอนาคต → ข้าม");
                continue;
            }

            // Validate first_prize digit count (reject corrupt data)
            $maxDigits = [
                'thai' => 6,
                'baac' => 7,
                'gsb-1' => 7,
                'gsb-2' => 7,
                'lao' => 4,
                'lao-vip' => 5,
                'lao-star' => 5,
                'lao-samakki' => 5,
                'hanoi' => 4,
                'hanoi-vip' => 5,
                'hanoi-special' => 5,
                'hanoi-adhoc' => 5,
                'hanoi-redcross' => 5,
                'malay' => 4,
            ];
            if (isset($maxDigits[$lotterySlug]) && strlen($firstPrize) > $maxDigits[$lotterySlug]) {
                $this->warn("⚠️  {$lotteryName}: first_prize '{$firstPrize}' เกินจำนวนหลักที่คาดหวัง ({$maxDigits[$lotterySlug]}) → ข้าม");
                continue;
            }

            $lotteryType = LotteryType::where('slug', $lotterySlug)->first();
            if (!$lotteryType || !$lotteryType->is_active) {
                continue;
            }

            // ✅ FIX: ข้ามหวยที่ยังไม่ถึงเวลาออกผล — ป้องกันบันทึกผลเก่า/ค้าง
            if ($lotteryType->draw_time) {
                $now = Carbon::now('Asia/Bangkok');
                list($dh, $dm) = explode(':', $lotteryType->draw_time);
                $drawMoment = $now->copy()->setTime((int) $dh, (int) $dm, 0);

                // ให้เวลา buffer 5 นาทีหลังเวลาออก
                if ($now->lessThan($drawMoment->copy()->addMinutes(5))) {
                    $this->line("⏰ {$lotteryName}: ยังไม่ถึงเวลาออกผล ({$lotteryType->draw_time}) — ข้าม");
                    continue;
                }
            }

            // Check if exists
            $exists = LotteryResult::where('lottery_type_id', $lotteryType->id)
                ->where('draw_date', $drawDate)
                ->exists();

            if ($exists) {
                // ✅ FIX: ถึงผลจะมีอยู่แล้ว ก็ต้อง settle bets ที่ยัง pending อยู่
                if ($calculate) {
                    $pendingCount = \App\Models\Bet::where('lottery_type_id', $lotteryType->id)
                        ->where('status', 'pending')
                        ->whereDate('draw_date', $drawDate)
                        ->count();

                    if ($pendingCount > 0) {
                        $existingResult = LotteryResult::where('lottery_type_id', $lotteryType->id)
                            ->where('draw_date', $drawDate)
                            ->first();
                        $this->info("   🔄 {$lotteryName}: พบ {$pendingCount} bets pending — settle...");
                        $settlement = \DB::transaction(function () use ($existingResult) {
                            return $this->settlementService->settleBets($existingResult);
                        });
                        $this->info("   → ถูก {$settlement['won']} จาก {$settlement['settled']} รายการ, จ่าย {$settlement['total_payout']} บาท");
                    } else {
                        $this->line("⏭️  {$lotteryName}: มีผลวันที่ {$drawDate} แล้ว");
                    }
                } else {
                    $this->line("⏭️  {$lotteryName}: มีผลวันที่ {$drawDate} แล้ว");
                }
                $skippedCount++;
                continue;
            }

            // Save new
            try {
                $threeBottom = null;
                $twoBottom = !empty($r['two_bottom']) ? $r['two_bottom'] : '';

                // For Thai lottery: fetch 3 ตัวล่าง and 2 ตัวล่าง from Rayriffy API
                if ($lotterySlug === 'thai') {
                    $rayriffyData = $this->fetchThaiLotteryFromRayriffy();
                    if ($rayriffyData) {
                        $threeBottom = $rayriffyData['three_bottom'] ?? null;
                        $twoBottom = $rayriffyData['two_bottom'] ?? $twoBottom;
                        $this->info("   📡 Rayriffy: 3ล่าง={$threeBottom}, 2ล่าง={$twoBottom}");
                    }
                }

                $lotteryResult = LotteryResult::create([
                    'lottery_type_id' => $lotteryType->id,
                    'draw_date' => $drawDate,
                    'first_prize' => $firstPrize,
                    'two_top' => $r['two_top'] ?? substr($firstPrize, -2),
                    'three_top' => $r['three_top'] ?? substr($firstPrize, -3),
                    'two_bottom' => $twoBottom,
                    'three_bottom' => $threeBottom,
                    'details' => json_encode(['source' => 'manycai-draw+rayriffy', 'scraped_at' => now()->toIso8601String()]),
                ]);

                $this->info("✅ {$lotteryName}: {$firstPrize} ({$drawDate}) [ใหม่!]");
                $successCount++;

                // ใช้ BetSettlementService แทน local logic
                // (จ่ายเครดิต + บันทึก Transaction + อัพเดท BetSlip status อัตโนมัติ)
                if ($calculate) {
                    $settlement = \DB::transaction(function () use ($lotteryResult) {
                        return $this->settlementService->settleBets($lotteryResult);
                    });
                    $this->info("   → คำนวณผลรางวัล {$lotteryType->name}: ถูก {$settlement['won']} จาก {$settlement['settled']} รายการ, จ่าย {$settlement['total_payout']} บาท");

                    // ✅ SECURITY: Anomaly Detection — flag users who win suspiciously often
                    if ($settlement['won'] > 0) {
                        $this->detectAnomalousWins($lotteryType->id, $drawDate, $lotteryName);
                    }

                    // Auto-cleanup: ลบเลขอั้นทั้งหมดของหวยนี้หลังออกรางวัล
                    $expiredCount = SpecialNumber::where('lottery_type_id', $lotteryType->id)
                        ->delete();
                    if ($expiredCount > 0) {
                        $this->info("   🗑️ ลบเลขอั้น {$expiredCount} รายการ ({$lotteryType->name}) - ออกรางวัลแล้ว");
                    }
                }
            } catch (\Exception $e) {
                $this->warn("❌ {$lotteryName}: " . $e->getMessage());
                $failedCount++;
            }
        }

        // Log (silently fail if admin doesn't exist)
        try {
            AdminLog::create([
                'admin_id' => 1,
                'action' => 'auto_scrape',
                'description' => "Auto-scrape: ใหม่ {$successCount}, ข้าม {$skippedCount}, ล้มเหลว {$failedCount}",
                'ip_address' => request()->ip() ?? '127.0.0.1',
            ]);
        } catch (\Exception $e) {
            // Silently ignore if admin user doesn't exist
        }

        $this->info('');
        $this->info("📊 Done! New: {$successCount}, Skipped: {$skippedCount}, Failed: {$failedCount}");

        return Command::SUCCESS;
    }

    /**
     * ✅ SECURITY: Detect users who win suspiciously often
     * Log CRITICAL warning if a user wins more than 3 times in last 7 days
     */
    private function detectAnomalousWins(int $lotteryTypeId, string $drawDate, string $lotteryName): void
    {
        try {
            $sevenDaysAgo = Carbon::parse($drawDate)->subDays(7)->toDateString();

            $suspiciousUsers = Bet::where('lottery_type_id', $lotteryTypeId)
                ->whereIn('status', ['won', 'paid'])
                ->where('draw_date', '>=', $sevenDaysAgo)
                ->where('draw_date', '<=', $drawDate)
                ->selectRaw('user_id, COUNT(*) as win_count, SUM(win_amount) as total_won, GROUP_CONCAT(DISTINCT number) as numbers')
                ->groupBy('user_id')
                ->having('win_count', '>=', 3)
                ->get();

            foreach ($suspiciousUsers as $sus) {
                $user = User::find($sus->user_id);
                $username = $user ? $user->username : "ID:{$sus->user_id}";

                Log::critical("🚨 ANOMALY DETECTED: User '{$username}' (ID:{$sus->user_id}) ถูกรางวัล {$sus->win_count} ครั้งใน 7 วัน " .
                    "หวย: {$lotteryName} | ได้เงิน: ฿" . number_format($sus->total_won, 2) .
                    " | เลขที่แทง: {$sus->numbers}");

                $this->warn("🚨 ANOMALY: User '{$username}' ถูกรางวัล {$sus->win_count} ครั้งใน 7 วัน (ได้ ฿" . number_format($sus->total_won) . ")");
            }
        } catch (\Exception $e) {
            Log::warning("Anomaly detection error: " . $e->getMessage());
        }
    }

    /**
     * Fetch Thai government lottery results from Rayriffy API
     * Returns: three_bottom (3 ตัวล่าง), two_bottom (2 ตัวล่าง)
     */
    private function fetchThaiLotteryFromRayriffy()
    {
        try {
            $response = Http::timeout(10)->get('https://lotto.api.rayriffy.com/latest');

            if (!$response->successful()) {
                $this->warn('   ⚠️ Rayriffy API failed: HTTP ' . $response->status());
                return null;
            }

            $data = $response->json();
            if (($data['status'] ?? '') !== 'success') {
                $this->warn('   ⚠️ Rayriffy API: status not success');
                return null;
            }

            $runningNumbers = $data['response']['runningNumbers'] ?? [];
            $threeBottom = null;
            $twoBottom = null;

            foreach ($runningNumbers as $rn) {
                if ($rn['id'] === 'runningNumberBackThree') {
                    // 3 ตัวล่าง - may have multiple numbers, join with comma
                    $threeBottom = implode(',', $rn['number'] ?? []);
                }
                if ($rn['id'] === 'runningNumberBackTwo') {
                    // 2 ตัวล่าง
                    $twoBottom = $rn['number'][0] ?? null;
                }
            }

            return [
                'three_bottom' => $threeBottom,
                'two_bottom' => $twoBottom,
            ];
        } catch (\Exception $e) {
            $this->warn('   ⚠️ Rayriffy API error: ' . $e->getMessage());
            return null;
        }
    }
}
