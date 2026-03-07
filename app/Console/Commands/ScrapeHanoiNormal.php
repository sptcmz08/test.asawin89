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
 * หวยฮานอยปกติ Scraper (XSMB - Xổ Số Miền Bắc / เวียดนามเหนือ)
 * ดึงเลขจาก az24.vn ผ่าน hanoi_normal_api.js (HTTP scraper — ไม่ต้องใช้ Puppeteer)
 * ⚠️ วันที่จาก az24.vn อาจผิด → script ใช้วันที่ ICT (Asia/Bangkok) แทน
 *
 * ข้อมูลที่ใช้:
 *   ĐB (Giải Đặc Biệt / Grand Prize) = เลข 5 ตัว → เอา 4 ตัวท้าย = first_prize
 *   G1 (Giải Nhất / First Prize)     = เลข 5 ตัว → เอา 2 ตัวท้าย = two_bottom
 */
class ScrapeHanoiNormal extends Command
{
    protected $signature = 'lottery:scrape-hanoi-normal
                            {--calculate : Also calculate winning bets after scraping}';

    protected $description = 'Scrape Hanoi Normal (XSMB) from az24.vn with ICT date';

    protected BetSettlementService $settlementService;

    public function __construct(BetSettlementService $settlementService)
    {
        parent::__construct();
        $this->settlementService = $settlementService;
    }

    public function handle()
    {
        $this->info('🇻🇳 Scraping หวยฮานอยปกติ (XSMB)...');

        try {
            $scriptPath = base_path('scripts/hanoi_normal_api.js');

            if (!file_exists($scriptPath)) {
                $this->error("❌ ไม่พบ script: {$scriptPath}");
                ScraperLog::log('hanoi', 'หวยฮานอยปกติ', 'xsmb-api', 'failed', 'Script not found', null, null);
                return Command::FAILURE;
            }

            $output = shell_exec("node \"{$scriptPath}\" 2>&1");

            if (!$output) {
                $this->error('❌ Script ไม่มี output');
                ScraperLog::log('hanoi', 'หวยฮานอยปกติ', 'xsmb-api', 'failed', 'No output from script', null, null);
                return Command::FAILURE;
            }

            // Extract JSON from output (stderr debug lines mixed with stdout JSON)
            $jsonLine = null;
            foreach (explode("\n", trim($output)) as $line) {
                $line = trim($line);
                if (str_starts_with($line, '{')) {
                    $jsonLine = $line;
                }
            }

            if (!$jsonLine) {
                $this->error('❌ ไม่พบ JSON ใน output: ' . substr($output, 0, 200));
                ScraperLog::log('hanoi', 'หวยฮานอยปกติ', 'xsmb-api', 'failed', 'No JSON in output', null, null);
                return Command::FAILURE;
            }

            $data = json_decode($jsonLine, true);
            $source = $data['source'] ?? 'xsmb-api';

            if (!$data || !$data['success']) {
                if (!empty($data['pending'])) {
                    $this->warn('⏳ ยังไม่มีผลรางวัล (รอออกผล)');
                    ScraperLog::log('hanoi', 'หวยฮานอยปกติ', $source, 'pending', $data['error'] ?? 'ยังไม่มีผล', null, null);
                    return Command::SUCCESS;
                }
                $this->error('❌ Script error: ' . ($data['error'] ?? 'Unknown'));
                ScraperLog::log('hanoi', 'หวยฮานอยปกติ', $source, 'failed', $data['error'] ?? 'Unknown', null, null);
                return Command::FAILURE;
            }

            $grandPrize = $data['grand_prize'];
            $g1 = $data['g1'] ?? null;
            $fourDigit = $data['four_digit'];
            $threeTop = $data['three_top'];
            $twoTop = $data['two_top'];
            $twoBottom = $data['two_bottom'] ?? '';
            $drawDate = $data['date'] ?? Carbon::today()->format('Y-m-d');

            // Get lottery type
            $lotteryType = LotteryType::where('slug', 'hanoi')->first();
            if (!$lotteryType) {
                $this->error("❌ ไม่พบ lottery type 'hanoi' ในฐานข้อมูล");
                return Command::FAILURE;
            }

            // Check duplicate
            $existing = LotteryResult::where('lottery_type_id', $lotteryType->id)
                ->where('draw_date', $drawDate)
                ->first();

            if ($existing) {
                if ($existing->first_prize !== $fourDigit) {
                    $existing->update([
                        'first_prize' => $fourDigit,
                        'three_top' => $threeTop,
                        'two_top' => $twoTop,
                        'two_bottom' => $twoBottom,
                        'details' => json_encode([
                            'source' => $source,
                            'grand_prize' => $grandPrize,
                            'g1' => $g1,
                            'updated_at' => now()->toIso8601String(),
                        ]),
                    ]);
                    $this->info("🔄 อัพเดทผล: {$fourDigit} (เดิม: {$existing->first_prize})");
                    ScraperLog::log('hanoi', 'หวยฮานอยปกติ', $source, 'updated', "อัพเดท {$existing->first_prize} → {$fourDigit}", null, $drawDate);
                } else {
                    $this->info("⏭️  มีผลวันที่ {$drawDate} แล้ว ({$fourDigit})");
                }
                return Command::SUCCESS;
            }

            // Save new result
            $lotteryResult = LotteryResult::create([
                'lottery_type_id' => $lotteryType->id,
                'draw_date' => $drawDate,
                'first_prize' => $fourDigit,
                'three_top' => $threeTop,
                'two_top' => $twoTop,
                'two_bottom' => $twoBottom,
                'details' => json_encode([
                    'source' => $source,
                    'grand_prize' => $grandPrize,
                    'g1' => $g1,
                    'scraped_at' => now()->toIso8601String(),
                ]),
            ]);

            $this->info("✅ บันทึกผล [{$source}]: {$fourDigit} ({$drawDate})");
            $this->info("   3ตัวบน: {$threeTop}, 2ตัวบน: {$twoTop}, 2ตัวล่าง: {$twoBottom}");
            ScraperLog::log('hanoi', 'หวยฮานอยปกติ', $source, 'success', "บันทึก {$fourDigit}", $lotteryResult->toArray(), $drawDate);

            if ($this->option('calculate')) {
                $settlement = \DB::transaction(function () use ($lotteryResult) {
                    return $this->settlementService->settleBets($lotteryResult);
                });
                $this->info("   → คำนวณผลรางวัล: ถูก {$settlement['won']} จาก {$settlement['settled']} รายการ, จ่าย {$settlement['total_payout']} บาท");
            }

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error('❌ Error: ' . $e->getMessage());
            Log::error('[ScrapeHanoiNormal] ' . $e->getMessage());
            ScraperLog::log('hanoi', 'หวยฮานอยปกติ', 'xsmb-api', 'failed', $e->getMessage(), null, null);
            return Command::FAILURE;
        }
    }
}
