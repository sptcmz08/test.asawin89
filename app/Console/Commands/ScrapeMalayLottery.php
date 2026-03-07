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
 * หวยมาเลย์ Scraper (Magnum 4D)
 * ดึงผลจาก 4dresult88.com/api ด้วย HTTP GET + parse HTML
 * ออกวัน พ. ส. อา. เวลา 18:30 น. (Malaysia Time)
 * 
 * HTML Element IDs:
 *   mdd  = Draw date (e.g. "14-02-2026 (Sat)")
 *   mdn  = Draw number (e.g. "327/26")
 *   mp1  = 1st Prize (เลข 4 ตัว = first_prize)
 *   mp2  = 2nd Prize
 *   mp3  = 3rd Prize
 */
class ScrapeMalayLottery extends Command
{
    protected $signature = 'lottery:scrape-malay
                            {--calculate : Also calculate winning bets after scraping}';

    protected $description = 'Scrape Magnum 4D (Malaysia) lottery results from 4dresult88.com';

    protected BetSettlementService $settlementService;

    public function __construct(BetSettlementService $settlementService)
    {
        parent::__construct();
        $this->settlementService = $settlementService;
    }

    public function handle()
    {
        $this->info('🇲🇾 Scraping หวยมาเลย์ Magnum 4D (4dresult88.com)...');

        try {
            $response = Http::withHeaders([
                'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept' => 'text/html',
            ])->timeout(15)->get('https://www.4dresult88.com/api');

            if (!$response->successful()) {
                $this->error("❌ HTTP Error: " . $response->status());
                ScraperLog::log('malay', 'หวยมาเลย์', '4dresult88', 'failed', "HTTP " . $response->status(), null, null);
                return Command::FAILURE;
            }

            $html = $response->body();

            if (empty($html)) {
                $this->error("❌ Empty response from 4dresult88.com");
                ScraperLog::log('malay', 'หวยมาเลย์', '4dresult88', 'failed', 'Empty response', null, null);
                return Command::FAILURE;
            }

            // Parse Magnum 4D 1st Prize (id="mp1")
            $firstPrize = $this->extractById($html, 'mp1');
            // Parse draw date (id="mdd")
            $drawDateRaw = $this->extractById($html, 'mdd');

            if (!$firstPrize || !preg_match('/^\d{4}$/', $firstPrize)) {
                $this->warn("⏳ ยังไม่มีผลรางวัล Magnum 4D (firstPrize='{$firstPrize}')");
                ScraperLog::log('malay', 'หวยมาเลย์', '4dresult88', 'pending', "ยังไม่มีผล mp1='{$firstPrize}'", null, null);
                return Command::SUCCESS;
            }

            // Parse date: "14-02-2026 (Sat)" -> "2026-02-14"
            $drawDate = $this->parseDrawDate($drawDateRaw);
            if (!$drawDate) {
                $this->error("❌ ไม่สามารถ parse วันที่: '{$drawDateRaw}'");
                ScraperLog::log('malay', 'หวยมาเลย์', '4dresult88', 'failed', "Cannot parse date: {$drawDateRaw}", null, null);
                return Command::FAILURE;
            }

            // Reject future dates
            if ($drawDate > Carbon::today()->format('Y-m-d')) {
                $this->warn("⚠️  วันที่ {$drawDate} เป็นอนาคต → ข้าม");
                return Command::SUCCESS;
            }

            // Extract numbers
            // เลข 4 ตัว = first_prize (Magnum 4D is already 4 digits)
            $threeTop = substr($firstPrize, -3);   // 3 ตัวบน = 3 ตัวท้าย
            $twoTop = substr($firstPrize, -2);      // 2 ตัวบน = 2 ตัวท้าย
            $twoBottom = substr($firstPrize, 0, 2);  // 2 ตัวล่าง = 2 ตัวหน้า

            $this->info("   📋 Draw date: {$drawDate}");
            $this->info("   🎰 1st Prize: {$firstPrize}");

            // Get lottery type
            $lotteryType = LotteryType::where('slug', 'malay')->first();
            if (!$lotteryType) {
                $this->error("❌ ไม่พบ lottery type 'malay' ในฐานข้อมูล");
                return Command::FAILURE;
            }

            // Check duplicate
            $existing = LotteryResult::where('lottery_type_id', $lotteryType->id)
                ->where('draw_date', $drawDate)
                ->first();

            if ($existing) {
                if ($existing->first_prize !== $firstPrize) {
                    $existing->update([
                        'first_prize' => $firstPrize,
                        'three_top' => $threeTop,
                        'two_top' => $twoTop,
                        'two_bottom' => $twoBottom,
                        'details' => json_encode([
                            'source' => '4dresult88-magnum4d',
                            'draw_date_raw' => $drawDateRaw,
                            'updated_at' => now()->toIso8601String(),
                        ]),
                    ]);
                    $this->info("🔄 อัพเดทผล: {$firstPrize} (เดิม: {$existing->first_prize})");
                    ScraperLog::log('malay', 'หวยมาเลย์', '4dresult88', 'success', "อัพเดท {$existing->first_prize} → {$firstPrize}", null, $drawDate);
                } else {
                    $this->info("⏭️  มีผลวันที่ {$drawDate} แล้ว (ตรงกัน: {$firstPrize})");
                }
                return Command::SUCCESS;
            }

            // Save new result
            $lotteryResult = LotteryResult::create([
                'lottery_type_id' => $lotteryType->id,
                'draw_date' => $drawDate,
                'first_prize' => $firstPrize,
                'three_top' => $threeTop,
                'two_top' => $twoTop,
                'two_bottom' => $twoBottom,
                'details' => json_encode([
                    'source' => '4dresult88-magnum4d',
                    'draw_date_raw' => $drawDateRaw,
                    'scraped_at' => now()->toIso8601String(),
                ]),
            ]);

            $this->info("✅ บันทึกผล Magnum 4D: {$firstPrize} ({$drawDate})");
            $this->info("   3ตัวบน: {$threeTop}, 2ตัวบน: {$twoTop}, 2ตัวล่าง: {$twoBottom}");

            // Log success
            ScraperLog::log('malay', 'หวยมาเลย์', '4dresult88', 'success', "บันทึกผล Magnum 4D {$firstPrize}", $lotteryResult->toArray(), $drawDate);

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
            Log::error('[ScrapeMalayLottery] ' . $e->getMessage());
            ScraperLog::log('malay', 'หวยมาเลย์', '4dresult88', 'failed', $e->getMessage(), null, null);
            return Command::FAILURE;
        }
    }

    /**
     * Extract text content from HTML element by its ID
     * e.g. <td id="mp1">0185</td> → "0185"
     */
    private function extractById(string $html, string $id): ?string
    {
        // Match <tag id="xxx">content</tag> or <tag id="xxx" ...>content</tag>
        if (preg_match('/<[^>]+id=["\']' . preg_quote($id, '/') . '["\'][^>]*>(.*?)<\/[^>]+>/s', $html, $matches)) {
            $content = strip_tags(trim($matches[1]));
            return trim($content);
        }
        return null;
    }

    /**
     * Parse draw date from "14-02-2026 (Sat)" format to "2026-02-14"
     */
    private function parseDrawDate(?string $dateStr): ?string
    {
        if (!$dateStr)
            return null;

        // Match "DD-MM-YYYY" pattern
        if (preg_match('/(\d{2})-(\d{2})-(\d{4})/', $dateStr, $matches)) {
            return "{$matches[3]}-{$matches[2]}-{$matches[1]}";
        }

        return null;
    }
}
