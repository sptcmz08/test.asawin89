<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\LotteryType;
use App\Models\LotteryResult;
use App\Models\ScraperLog;
use App\Services\BetSettlementService;
use Illuminate\Support\Facades\Log;

class ScrapeRaakaadee extends Command
{
    protected $signature = 'lottery:scrape-raakaadee
                            {--slug= : Filter specific lottery slug}
                            {--url= : Specific raakaadee.com URL to scrape}
                            {--calculate : Auto-settle bets}
                            {--debug : Show debug output}';

    protected $description = 'ดึงผลหวยจาก raakaadee.com ด้วย Camoufox (bypass Cloudflare)';

    private $settlementService;

    public function __construct(BetSettlementService $settlementService)
    {
        parent::__construct();
        $this->settlementService = $settlementService;
    }

    public function handle()
    {
        $slug = $this->option('slug');
        $url = $this->option('url');
        $calculate = $this->option('calculate');
        $debug = $this->option('debug');

        $this->info('🌐 Starting Raakaadee.com scraper (Camoufox)...');

        // Build command — use .venv/bin/python for virtual environment
        $scriptPath = base_path('scripts/scrape_raakaadee.py');
        $pythonPath = base_path('.venv/bin/python');
        if (!file_exists($pythonPath)) {
            $pythonPath = 'python3'; // fallback
            $this->warn('⚠️  .venv not found, using system python3');
        }
        $cmd = "{$pythonPath} {$scriptPath}";
        if ($debug) $cmd .= ' --debug';
        if ($slug) $cmd .= " --slug={$slug}";
        if ($url) $cmd .= " --url=" . escapeshellarg($url);

        // Execute Python script
        $this->info("Running: {$cmd}");

        $output = null;
        $exitCode = null;

        // Redirect stderr to a temp file for logging
        $stderrFile = tempnam(sys_get_temp_dir(), 'raakaadee_');
        exec("{$cmd} 2>{$stderrFile}", $output, $exitCode);

        // Show stderr output
        $stderr = file_get_contents($stderrFile);
        @unlink($stderrFile);

        if ($debug && $stderr) {
            foreach (explode("\n", $stderr) as $line) {
                if (trim($line)) $this->comment("  [PY] {$line}");
            }
        }

        // Parse JSON from stdout
        $jsonOutput = implode("\n", $output);
        $data = json_decode($jsonOutput, true);

        if (!$data || !$data['success']) {
            $error = $data['error'] ?? 'Unknown error (no JSON output)';
            $this->error("❌ Scraper failed: {$error}");

            // Check if camoufox is installed
            if (str_contains($error, 'camoufox not installed')) {
                $this->warn('');
                $this->warn('📦 To install Camoufox:');
                $this->warn('   pip install camoufox[geoip]');
                $this->warn('   camoufox fetch');
                $this->warn('');
            }

            ScraperLog::log($slug ?? 'all', 'raakaadee', 'raakaadee.com', 'failed', $error, null, null);
            return 1;
        }

        $results = $data['results'] ?? [];
        $count = count($results);
        $this->info("📊 Received {$count} results from raakaadee.com");

        $successCount = 0;
        $skippedCount = 0;
        $failedCount = 0;

        foreach ($results as $r) {
            $slug = $r['slug'] ?? null;
            $lotteryName = $r['lottery_name'] ?? $slug;
            $threeTop = $r['three_top'] ?? null;
            $twoBottom = $r['two_bottom'] ?? null;
            $twoTop = $r['two_top'] ?? ($threeTop ? substr($threeTop, -2) : null);
            $drawDate = $r['draw_date'] ?? now()->format('Y-m-d');

            if (!$slug || !$threeTop) {
                $this->warn("⚠️  Missing slug or result data — skipping");
                $skippedCount++;
                continue;
            }

            // Find lottery type
            $lotteryType = LotteryType::where('slug', $slug)->first();
            if (!$lotteryType) {
                $this->warn("⚠️  {$lotteryName}: ไม่พบ slug '{$slug}' ในระบบ — ข้าม");
                $skippedCount++;
                continue;
            }

            // Check if result already exists
            $existing = LotteryResult::where('lottery_type_id', $lotteryType->id)
                ->whereDate('draw_date', $drawDate)
                ->first();

            if ($existing) {
                $this->comment("⏭️  {$lotteryName}: มีผลอยู่แล้ว ({$existing->three_top}/{$existing->two_bottom})");

                // Still settle pending bets
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

                $skippedCount++;
                continue;
            }

            // Validate data format
            if (!preg_match('/^\d{3}$/', $threeTop)) {
                $this->warn("⚠️  {$lotteryName}: three_top '{$threeTop}' ไม่ใช่ตัวเลข 3 หลัก — ข้าม");
                ScraperLog::log($slug, $lotteryName, 'raakaadee.com', 'rejected', "Invalid three_top: {$threeTop}", null, null);
                $failedCount++;
                continue;
            }
            if ($twoBottom && !preg_match('/^\d{2}$/', $twoBottom)) {
                $this->warn("⚠️  {$lotteryName}: two_bottom '{$twoBottom}' ไม่ใช่ตัวเลข 2 หลัก — ข้าม");
                ScraperLog::log($slug, $lotteryName, 'raakaadee.com', 'rejected', "Invalid two_bottom: {$twoBottom}", null, null);
                $failedCount++;
                continue;
            }

            // Save result
            try {
                $lotteryResult = LotteryResult::create([
                    'lottery_type_id' => $lotteryType->id,
                    'draw_date' => $drawDate,
                    'first_prize' => $threeTop,
                    'three_top' => $threeTop,
                    'two_top' => $twoTop ?: substr($threeTop, -2),
                    'two_bottom' => $twoBottom,
                    'details' => json_encode([
                        'source' => 'raakaadee.com',
                        'scraped_at' => now()->toIso8601String(),
                    ]),
                ]);

                $this->info("✅ {$lotteryName}: {$threeTop} / {$twoTop} / {$twoBottom} ({$drawDate}) [ใหม่!]");
                $successCount++;

                // Settle bets
                if ($calculate) {
                    $settlement = \DB::transaction(function () use ($lotteryResult) {
                        return $this->settlementService->settleBets($lotteryResult);
                    });
                    $this->info("   → คำนวณผล: ถูก {$settlement['won']} จาก {$settlement['settled']} รายการ, จ่าย {$settlement['total_payout']} บาท");

                    // Anomaly detection
                    if ($settlement['won'] > 0) {
                        $this->detectAnomalousWins($lotteryType->id, $drawDate, $lotteryName);
                    }
                }

                ScraperLog::log($slug, $lotteryName, 'raakaadee.com', 'success', "Result: {$threeTop}/{$twoTop}/{$twoBottom}", null, $lotteryResult->id);

            } catch (\Exception $e) {
                $this->warn("❌ {$lotteryName}: " . $e->getMessage());
                $failedCount++;
                ScraperLog::log($slug, $lotteryName, 'raakaadee.com', 'failed', $e->getMessage(), null, null);
            }
        }

        $this->info("📈 Raakaadee: ✅ {$successCount} สำเร็จ, ⏭️  {$skippedCount} ข้าม, ❌ {$failedCount} ล้มเหลว");
        return 0;
    }

    /**
     * Detect anomalous wins (same pattern as ScrapeStockVip)
     */
    private function detectAnomalousWins($lotteryTypeId, $drawDate, $lotteryName)
    {
        $recentWins = \App\Models\Bet::where('status', 'won')
            ->where('lottery_type_id', $lotteryTypeId)
            ->where('draw_date', '>=', now()->subDays(7)->format('Y-m-d'))
            ->selectRaw('user_id, COUNT(*) as win_count, SUM(payout) as total_payout')
            ->groupBy('user_id')
            ->having('win_count', '>=', 5)
            ->get();

        foreach ($recentWins as $win) {
            Log::warning("🚨 ANOMALY: User #{$win->user_id} won {$win->win_count} times in {$lotteryName} (7 days), payout: {$win->total_payout} บาท");
            $this->warn("🚨 ANOMALY: User #{$win->user_id} ถูก {$win->win_count} ครั้งใน 7 วัน ({$lotteryName}), จ่าย {$win->total_payout} บาท");
        }
    }
}
