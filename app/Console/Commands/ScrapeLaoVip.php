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
 * หวยลาว VIP Scraper
 * ดึงผลจาก laos-vip.com (ใช้ Puppeteer)
 * ออกทุกวัน ~21:30 น.
 */
class ScrapeLaoVip extends Command
{
    protected $signature = 'lottery:scrape-lao-vip
                            {--calculate : Also calculate winning bets after scraping}';

    protected $description = 'Scrape Lao VIP lottery results from laos-vip.com';

    protected BetSettlementService $settlementService;

    public function __construct(BetSettlementService $settlementService)
    {
        parent::__construct();
        $this->settlementService = $settlementService;
    }

    public function handle()
    {
        $this->info('🇱🇦 Scraping หวยลาว VIP จาก laos-vip.com...');

        $lotteryType = LotteryType::where('slug', 'lao-vip')->first();
        if (!$lotteryType) {
            $this->error("❌ ไม่พบ lottery type 'lao-vip' ในฐานข้อมูล");
            return Command::FAILURE;
        }

        try {
            // Try new lightweight API script first, fallback to Puppeteer
            $apiScript = base_path('scripts/laos_vip_api.js');
            $puppeteerScript = base_path('scripts/laos_vip_draw.js');

            if (file_exists($apiScript)) {
                $scriptPath = $apiScript;
                $this->info('📡 ใช้ Public API scraper (app.all123th.com)');
            } elseif (file_exists($puppeteerScript)) {
                $scriptPath = $puppeteerScript;
                $this->warn('⚠️  ใช้ Puppeteer scraper (fallback)');
            } else {
                $this->error('❌ ไม่พบ script');
                ScraperLog::log('lao-vip', 'หวยลาว VIP', 'laos-vip.com', 'failed', "Script not found");
                return Command::FAILURE;
            }

            $output = shell_exec("cd " . base_path() . " && node \"{$scriptPath}\" 2>/dev/null");

            if (empty($output)) {
                $this->error('❌ No output from scraper');
                ScraperLog::log('lao-vip', 'หวยลาว VIP', 'laos-vip.com', 'failed', 'No output from scraper');
                return Command::FAILURE;
            }

            // Find JSON in output
            $jsonStart = strpos($output, '{');
            if ($jsonStart === false) {
                $this->error('❌ No JSON found in output');
                $this->line(substr($output, 0, 500));
                ScraperLog::log('lao-vip', 'หวยลาว VIP', 'laos-vip.com', 'failed', 'No JSON in output');
                return Command::FAILURE;
            }

            $json = substr($output, $jsonStart);
            $data = json_decode($json, true);

            if (!$data) {
                $this->error('❌ Invalid JSON');
                ScraperLog::log('lao-vip', 'หวยลาว VIP', 'laos-vip.com', 'failed', 'Invalid JSON');
                return Command::FAILURE;
            }

            if (!($data['success'] ?? false)) {
                $error = $data['error'] ?? 'Unknown error';
                $this->warn("⏳ {$error}");
                ScraperLog::log('lao-vip', 'หวยลาว VIP', 'laos-vip.com', 'pending', $error);
                return Command::SUCCESS;
            }

            $results = $data['results'] ?? [];
            // draw_date can be in results[] (API script) or in data root (Puppeteer script)
            $drawDate = $results['draw_date'] ?? $data['draw_date'] ?? Carbon::today('Asia/Bangkok')->format('Y-m-d');

            // Validate digit5
            $digit5 = $results['digit5'] ?? '';
            if (strlen($digit5) !== 5) {
                $this->warn("⚠️ digit5 ไม่ถูกต้อง: '{$digit5}' (ต้อง 5 หลัก)");
                ScraperLog::log('lao-vip', 'หวยลาว VIP', 'laos-vip.com', 'failed', "Invalid digit5: {$digit5}");
                return Command::FAILURE;
            }

            // Reject future dates
            if ($drawDate > Carbon::today('Asia/Bangkok')->format('Y-m-d')) {
                $this->warn("⚠️ วันที่ {$drawDate} เป็นอนาคต → ข้าม");
                return Command::SUCCESS;
            }

            // Check duplicate
            $exists = LotteryResult::where('lottery_type_id', $lotteryType->id)
                ->where('draw_date', $drawDate)
                ->exists();

            if ($exists) {
                $this->info("⏭️  มีผลวันที่ {$drawDate} แล้ว — ข้ามบันทึก");
                return Command::SUCCESS;
            }

            // Save result — support both old (Puppeteer) and new (API) field names
            $digit3 = $results['three_top'] ?? $results['digit3'] ?? substr($digit5, -3);
            $digit2Top = $results['two_top'] ?? $results['digit2_top'] ?? substr($digit5, -2);
            $digit2Bottom = $results['two_bottom'] ?? $results['digit2_bottom'] ?? substr($digit5, 0, 2);

            $lotteryResult = LotteryResult::create([
                'lottery_type_id' => $lotteryType->id,
                'draw_date' => $drawDate,
                'first_prize' => $digit5,
                'three_top' => $digit3,
                'two_top' => $digit2Top,
                'two_bottom' => $digit2Bottom,
                'details' => json_encode([
                    'source' => 'laos-vip.com',
                    'digit4' => $results['digit4'] ?? substr($digit5, -4),
                    'scraped_at' => now()->toIso8601String(),
                ]),
            ]);

            $this->info("✅ บันทึกผล: {$digit5} ({$drawDate})");
            $this->info("   3ตัวบน: {$digit3}, 2ตัวบน: {$digit2Top}, 2ตัวล่าง: {$digit2Bottom}");

            ScraperLog::log(
                'lao-vip',
                'หวยลาว VIP',
                'laos-vip.com',
                'success',
                "Result: {$digit5} / {$digit3} / {$digit2Top} / {$digit2Bottom}",
                null,
                $drawDate
            );

            // Calculate winning bets
            if ($this->option('calculate')) {
                $settlement = \DB::transaction(function () use ($lotteryResult) {
                    return $this->settlementService->settleBets($lotteryResult);
                });
                $this->info("   → คำนวณผลรางวัล: ถูก {$settlement['won']} จาก {$settlement['settled']} รายการ, จ่าย {$settlement['total_payout']} บาท");
            }

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error("❌ Error: " . $e->getMessage());
            Log::error('[ScrapeLaoVip] ' . $e->getMessage());
            ScraperLog::log('lao-vip', 'หวยลาว VIP', 'laos-vip.com', 'failed', $e->getMessage());
            return Command::FAILURE;
        }
    }
}
