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
 * หวยลาวสามัคคี Scraper
 * ดึงผลจาก laounion.com ผ่าน Puppeteer (Vue.js SPA)
 * ออก อ/พ/ศ/ส/อา ~20:30 น.
 */
class ScrapeLaoSamakki extends Command
{
    protected $signature = 'lottery:scrape-lao-samakki
                            {--calculate : Also calculate winning bets after scraping}';

    protected $description = 'Scrape Lao Samakki lottery results from laounion.com';

    protected BetSettlementService $settlementService;

    public function __construct(BetSettlementService $settlementService)
    {
        parent::__construct();
        $this->settlementService = $settlementService;
    }

    public function handle()
    {
        $this->info('🤝 Scraping หวยลาวสามัคคี...');

        try {
            // Try new lightweight API script first, fallback to Puppeteer
            $apiScript = base_path('scripts/laounion_api.js');
            $puppeteerScript = base_path('scripts/laounion_draw.js');

            if (file_exists($apiScript)) {
                $scriptPath = $apiScript;
                $this->info('📡 ใช้ Public API scraper');
            } elseif (file_exists($puppeteerScript)) {
                $scriptPath = $puppeteerScript;
                $this->warn('⚠️  ใช้ Puppeteer scraper (fallback)');
            } else {
                $this->error('❌ ไม่พบ script');
                return Command::FAILURE;
            }

            $command = "cd " . base_path() . " && node \"{$scriptPath}\" 2>&1";
            $output = shell_exec($command);

            if (empty($output)) {
                $this->error("❌ No output from Puppeteer script");
                ScraperLog::log('lao-samakki', 'ลาวสามัคคี', 'laounion-puppeteer', 'failed', 'No output', null, null);
                return Command::FAILURE;
            }

            // Extract JSON from output (ignore stderr lines)
            $json = null;
            $lines = explode("\n", $output);
            foreach ($lines as $line) {
                $line = trim($line);
                if (empty($line))
                    continue;
                // Skip stderr lines (prefixed with [LaoSamakki])
                if (str_starts_with($line, '[LaoSamakki]'))
                    continue;
                // Try to parse as JSON
                $decoded = json_decode($line, true);
                if ($decoded !== null) {
                    $json = $decoded;
                    break;
                }
            }

            if (!$json) {
                $this->error("❌ Could not parse JSON from output");
                $this->line("Raw output: " . substr($output, 0, 500));
                ScraperLog::log('lao-samakki', 'ลาวสามัคคี', 'laounion-puppeteer', 'failed', 'JSON parse error', ['raw' => substr($output, 0, 500)], null);
                return Command::FAILURE;
            }

            if (!$json['success'] || !$json['results']) {
                $this->warn("⏳ ยังไม่มีผลรางวัล: " . ($json['error'] ?? 'unknown'));
                ScraperLog::log('lao-samakki', 'ลาวสามัคคี', 'laounion-puppeteer', 'pending', $json['error'] ?? 'No results', null, null);
                return Command::SUCCESS;
            }

            $result = $json['results'];

            // Get lottery type
            $lotteryType = LotteryType::where('slug', 'lao-samakki')->first();
            if (!$lotteryType) {
                $this->error("❌ ไม่พบ lottery type 'lao-samakki' ในฐานข้อมูล (กรุณา run migration ก่อน)");
                return Command::FAILURE;
            }

            $drawDate = $result['draw_date'] ?? Carbon::today()->format('Y-m-d');

            // Check duplicate
            $exists = LotteryResult::where('lottery_type_id', $lotteryType->id)
                ->where('draw_date', $drawDate)
                ->exists();

            if ($exists) {
                $this->info("⏭️  มีผลวันที่ {$drawDate} แล้ว — ข้ามบันทึก");
                return Command::SUCCESS;
            }

            // Save result
            $lotteryResult = LotteryResult::create([
                'lottery_type_id' => $lotteryType->id,
                'draw_date' => $drawDate,
                'first_prize' => $result['digit5'] ?? $result['first_prize'] ?? '',
                'three_top' => $result['three_top'] ?? '',
                'two_top' => $result['two_top'] ?? '',
                'two_bottom' => $result['two_bottom'] ?? '',
                'details' => json_encode([
                    'source' => 'laounion-puppeteer',
                    'digit5' => $result['digit5'] ?? '',
                    'digit4' => $result['digit4'] ?? '',
                    'scraped_at' => now()->toIso8601String(),
                ]),
            ]);

            $this->info("✅ บันทึกผล: " . ($result['digit5'] ?? '') . " ({$drawDate})");
            $this->info("   3ตัวบน: " . ($result['three_top'] ?? '') . ", 2ตัวบน: " . ($result['two_top'] ?? '') . ", 2ตัวล่าง: " . ($result['two_bottom'] ?? ''));

            // Log success
            ScraperLog::log('lao-samakki', 'ลาวสามัคคี', 'laounion-puppeteer', 'success', 'บันทึกผล ' . ($result['digit5'] ?? ''), $lotteryResult->toArray(), $drawDate);

            // Calculate winning bets if requested
            if ($this->option('calculate')) {
                $settlement = \DB::transaction(function () use ($lotteryResult) {
                    return $this->settlementService->settleBets($lotteryResult);
                });
                $this->info("   → คำนวณผลรางวัล: ถูก {$settlement['won']} จาก {$settlement['settled']} รายการ, จ่าย {$settlement['total_payout']} บาท");
            }

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error("❌ Error: " . $e->getMessage());
            Log::error('[ScrapeLaoSamakki] ' . $e->getMessage());
            ScraperLog::log('lao-samakki', 'ลาวสามัคคี', 'laounion-puppeteer', 'failed', $e->getMessage(), null, null);
            return Command::FAILURE;
        }
    }
}
