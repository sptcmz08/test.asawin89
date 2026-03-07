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
 * หวยลาวสตาร์ Scraper
 * ดึงผลจาก api.laostars.com (ไม่ต้อง auth)
 * ออกทุกวัน ~15:30-15:45 น.
 */
class ScrapeLaoStar extends Command
{
    protected $signature = 'lottery:scrape-lao-star
                            {--calculate : Also calculate winning bets after scraping}';

    protected $description = 'Scrape Lao Star lottery results from api.laostars.com';

    protected BetSettlementService $settlementService;

    public function __construct(BetSettlementService $settlementService)
    {
        parent::__construct();
        $this->settlementService = $settlementService;
    }

    public function handle()
    {
        $this->info('🌟 Scraping หวยลาวสตาร์...');

        try {
            $response = Http::withHeaders([
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept' => 'application/json',
                'Referer' => 'https://laostars.com/',
            ])->timeout(15)->get('https://api.laostars.com/result');

            if (!$response->successful()) {
                $this->error("❌ HTTP Error: " . $response->status());
                ScraperLog::log('lao-star', 'หวยลาวสตาร์', 'laostars-api', 'failed', "HTTP " . $response->status(), null, null);
                return Command::FAILURE;
            }

            $data = $response->json();

            if (($data['status'] ?? '') !== 'success') {
                $this->error("❌ API returned non-success status");
                ScraperLog::log('lao-star', 'หวยลาวสตาร์', 'laostars-api', 'failed', 'API status not success', $data, null);
                return Command::FAILURE;
            }

            $results = $data['data']['results'] ?? null;
            $drawDate = $data['data']['lotto_date'] ?? Carbon::today()->format('Y-m-d');

            if (!$results || empty($results['digit3'])) {
                $this->warn("⏳ ยังไม่มีผลรางวัล (รอออกผล)");
                ScraperLog::log('lao-star', 'หวยลาวสตาร์', 'laostars-api', 'pending', 'ยังไม่มีผล', null, $drawDate);
                return Command::SUCCESS;
            }

            // Get lottery type
            $lotteryType = LotteryType::where('slug', 'lao-star')->first();
            if (!$lotteryType) {
                $this->error("❌ ไม่พบ lottery type 'lao-star' ในฐานข้อมูล (กรุณา run migration ก่อน)");
                return Command::FAILURE;
            }

            // Check duplicate
            $exists = LotteryResult::where('lottery_type_id', $lotteryType->id)
                ->where('draw_date', $drawDate)
                ->exists();

            if ($exists) {
                $this->info("⏭️  มีผลวันที่ {$drawDate} แล้ว — ข้ามบันทึก");
                return Command::SUCCESS;
            }

            // Extract results
            $digit5 = $results['digit5'] ?? '';    // e.g. "04199"
            $digit3 = $results['digit3'] ?? '';    // e.g. "199"  (3 ตัวบน)
            $digit2Top = $results['digit2_top'] ?? '';  // e.g. "99" (2 ตัวบน)
            $digit2Bottom = $results['digit2_bottom'] ?? ''; // e.g. "04" (2 ตัวล่าง)

            // Save to database
            $lotteryResult = LotteryResult::create([
                'lottery_type_id' => $lotteryType->id,
                'draw_date' => $drawDate,
                'first_prize' => $digit5,
                'three_top' => $digit3,
                'two_top' => $digit2Top,
                'two_bottom' => $digit2Bottom,
                'details' => json_encode([
                    'source' => 'laostars-api',
                    'digit4' => $results['digit4'] ?? '',
                    'scraped_at' => now()->toIso8601String(),
                ]),
            ]);

            $this->info("✅ บันทึกผล: {$digit5} ({$drawDate})");
            $this->info("   3ตัวบน: {$digit3}, 2ตัวบน: {$digit2Top}, 2ตัวล่าง: {$digit2Bottom}");

            // Log success
            ScraperLog::log('lao-star', 'หวยลาวสตาร์', 'laostars-api', 'success', "บันทึกผล {$digit5}", $lotteryResult->toArray(), $drawDate);

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
            Log::error('[ScrapeLaoStar] ' . $e->getMessage());
            ScraperLog::log('lao-star', 'หวยลาวสตาร์', 'laostars-api', 'failed', $e->getMessage(), null, null);
            return Command::FAILURE;
        }
    }
}
