<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\LotteryType;
use App\Models\LotteryResult;
use App\Models\ScraperLog;
use App\Services\BetSettlementService;
use Carbon\Carbon;

/**
 * หวยฮานอยกาชาด Scraper
 * ดึงผลจาก xosoredcross.com API
 * ออกทุกวัน 16:30 น.
 * 
 * API: https://api.xosoredcross.com/result
 * API (ย้อนหลัง): https://api.xosoredcross.com/result/{YYYY-MM-DD}
 * 
 * ข้อมูลที่ใช้:
 *   prize_1st (Đặc biệt) = เลข 5 ตัว → เอา 4 ตัวท้าย = first_prize
 *   prize_2nd (Giải nhất) = เลข 5 ตัว → เอา 2 ตัวท้าย = two_bottom
 */
class ScrapeHanoiRedCross extends Command
{
    protected $signature = 'lottery:scrape-hanoi-redcross
                            {--calculate : Also calculate winning bets after scraping}';

    protected $description = 'Scrape Hanoi Red Cross lottery results from xosoredcross.com API';

    protected BetSettlementService $settlementService;

    public function __construct(BetSettlementService $settlementService)
    {
        parent::__construct();
        $this->settlementService = $settlementService;
    }

    public function handle()
    {
        $this->info('🏥 Scraping หวยฮานอยกาชาด (xosoredcross.com)...');

        try {
            $response = Http::withHeaders([
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept' => 'application/json',
            ])->timeout(15)->get('https://api.xosoredcross.com/result');

            if (!$response->successful()) {
                $this->error("❌ HTTP Error: " . $response->status());
                ScraperLog::log('hanoi-redcross', 'หวยฮานอยกาชาด', 'xosoredcross-api', 'failed', "HTTP " . $response->status(), null, null);
                return Command::FAILURE;
            }

            $data = $response->json();

            if (!$data || $data['status'] !== 'success' || empty($data['data'])) {
                $this->error("❌ API returned invalid response");
                ScraperLog::log('hanoi-redcross', 'หวยฮานอยกาชาด', 'xosoredcross-api', 'failed', 'Invalid response', $data, null);
                return Command::FAILURE;
            }

            $resultData = $data['data'];
            $results = $resultData['results'] ?? [];

            // prize_1st = Đặc biệt (Grand Prize) - เลข 5 ตัว
            $grandPrize = $results['prize_1st'] ?? null;
            // prize_2nd = Giải nhất (First Prize) - เลข 5 ตัว
            $firstPrizeG1 = $results['prize_2nd'] ?? null;

            if (!$grandPrize) {
                $this->warn("⏳ ยังไม่มีผลรางวัล (รอออกผล 16:30)");
                ScraperLog::log('hanoi-redcross', 'หวยฮานอยกาชาด', 'xosoredcross-api', 'pending', 'ยังไม่มีผล prize_1st', null, null);
                return Command::SUCCESS;
            }

            // Parse date from API
            $drawDate = $resultData['lotto_date'] ?? Carbon::today()->format('Y-m-d');

            // Reject future dates
            if ($drawDate > Carbon::today()->format('Y-m-d')) {
                $this->warn("⚠️  วันที่ {$drawDate} เป็นอนาคต → ข้าม");
                return Command::SUCCESS;
            }

            // Extract numbers (same pattern as ScrapeHanoiNormal)
            // เลข 4 ตัว = 4 ตัวท้ายของ prize_1st
            $fourDigit = substr($grandPrize, -4);
            // 3 ตัวบน = 3 ตัวท้ายของ prize_1st
            $threeTop = substr($grandPrize, -3);
            // 2 ตัวบน = 2 ตัวท้ายของ prize_1st
            $twoTop = substr($grandPrize, -2);
            // 2 ตัวล่าง = 2 ตัวท้ายของ prize_2nd (Giải nhất)
            $twoBottom = $firstPrizeG1 ? substr($firstPrizeG1, -2) : '';

            // Get lottery type
            $lotteryType = LotteryType::where('slug', 'hanoi-redcross')->first();
            if (!$lotteryType) {
                $this->error("❌ ไม่พบ lottery type 'hanoi-redcross' ในฐานข้อมูล");
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
                            'source' => 'xosoredcross-api',
                            'grand_prize' => $grandPrize,
                            'g1' => $firstPrizeG1,
                            'all_results' => $results,
                            'updated_at' => now()->toIso8601String(),
                        ]),
                    ]);
                    $this->info("🔄 อัพเดทผล: {$fourDigit} (เดิม: {$existing->first_prize})");
                    ScraperLog::log('hanoi-redcross', 'หวยฮานอยกาชาด', 'xosoredcross-api', 'updated', "อัพเดท {$existing->first_prize} → {$fourDigit}", null, $drawDate);
                } else {
                    $this->info("⏭️  มีผลวันที่ {$drawDate} แล้ว (ตรงกัน: {$fourDigit})");
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
                    'source' => 'xosoredcross-api',
                    'grand_prize' => $grandPrize,
                    'g1' => $firstPrizeG1,
                    'all_results' => $results,
                    'scraped_at' => now()->toIso8601String(),
                ]),
            ]);

            $this->info("✅ บันทึกผล: {$fourDigit} ({$drawDate})");
            $this->info("   3ตัวบน: {$threeTop}, 2ตัวบน: {$twoTop}, 2ตัวล่าง: {$twoBottom}");

            // Log success
            ScraperLog::log('hanoi-redcross', 'หวยฮานอยกาชาด', 'xosoredcross-api', 'success', "บันทึกผล {$fourDigit}", $lotteryResult->toArray(), $drawDate);

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
            Log::error('[ScrapeHanoiRedCross] ' . $e->getMessage());
            ScraperLog::log('hanoi-redcross', 'หวยฮานอยกาชาด', 'xosoredcross-api', 'failed', $e->getMessage(), null, null);
            return Command::FAILURE;
        }
    }
}
