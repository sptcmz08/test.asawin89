<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use App\Models\AdminLog;
use App\Models\LotteryType;
use App\Models\LotteryResult;
use App\Services\BetSettlementService;
use Carbon\Carbon;

class ScrapeThaiLotteryRayriffy extends Command
{
    protected $signature = 'lottery:scrape-thai
                            {--calculate : Also calculate winning bets after scraping}';

    protected $description = 'Scrape Thai government lottery results from Rayriffy API (runs on 1st and 16th)';

    protected BetSettlementService $settlementService;

    public function __construct(BetSettlementService $settlementService)
    {
        parent::__construct();
        $this->settlementService = $settlementService;
    }

    public function handle()
    {
        $calculate = $this->option('calculate');

        $this->info('🇹🇭 Fetching Thai lottery from Rayriffy API...');
        $this->info('📍 Source: https://lotto.api.rayriffy.com/latest');

        try {
            $response = Http::timeout(15)->get('https://lotto.api.rayriffy.com/latest');

            if (!$response->successful()) {
                $this->error('❌ API failed: HTTP ' . $response->status());
                return Command::FAILURE;
            }

            $data = $response->json();

            if (($data['status'] ?? '') !== 'success') {
                $this->error('❌ API status: ' . ($data['status'] ?? 'unknown'));
                return Command::FAILURE;
            }

            $apiResponse = $data['response'] ?? [];

            // Parse draw date from Thai date string
            $drawDate = $this->parseThaiDate($apiResponse['date'] ?? '');
            if (!$drawDate) {
                $this->error('❌ Cannot parse date: ' . ($apiResponse['date'] ?? 'null'));
                return Command::FAILURE;
            }

            $this->info("📅 งวดวันที่: {$apiResponse['date']} ({$drawDate})");

            // Extract prizes
            $prizes = $apiResponse['prizes'] ?? [];
            $runningNumbers = $apiResponse['runningNumbers'] ?? [];

            // First prize (รางวัลที่ 1)
            $firstPrize = null;
            foreach ($prizes as $prize) {
                if ($prize['id'] === 'prizeFirst') {
                    $firstPrize = $prize['number'][0] ?? null;
                    break;
                }
            }

            if (!$firstPrize) {
                $this->error('❌ ไม่พบรางวัลที่ 1');
                return Command::FAILURE;
            }

            // Running numbers
            $threeTop = substr($firstPrize, -3);
            $twoTop = substr($firstPrize, -2);
            $threeBottom = null;
            $twoBottom = null;

            foreach ($runningNumbers as $rn) {
                switch ($rn['id']) {
                    case 'runningNumberBackThree':
                        $threeBottom = implode(',', $rn['number'] ?? []);
                        break;
                    case 'runningNumberBackTwo':
                        $twoBottom = $rn['number'][0] ?? null;
                        break;
                }
            }

            $this->info("🏆 รางวัลที่ 1: {$firstPrize}");
            $this->info("   3 ตัวบน: {$threeTop}");
            $this->info("   2 ตัวบน: {$twoTop}");
            $this->info("   3 ตัวล่าง: {$threeBottom}");
            $this->info("   2 ตัวล่าง: {$twoBottom}");

            // Find lottery type
            $lotteryType = LotteryType::where('slug', 'thai')->first();
            if (!$lotteryType) {
                $this->error('❌ ไม่พบ lottery type: thai');
                return Command::FAILURE;
            }

            // Check if already exists
            $exists = LotteryResult::where('lottery_type_id', $lotteryType->id)
                ->where('draw_date', $drawDate)
                ->exists();

            if ($exists) {
                $this->warn("⏭️  หวยรัฐบาล: มีผลวันที่ {$drawDate} แล้ว");
                return Command::SUCCESS;
            }

            // Save result
            $lotteryResult = LotteryResult::create([
                'lottery_type_id' => $lotteryType->id,
                'draw_date' => $drawDate,
                'first_prize' => $firstPrize,
                'three_top' => $threeTop,
                'two_top' => $twoTop,
                'three_bottom' => $threeBottom,
                'two_bottom' => $twoBottom,
                'details' => json_encode([
                    'source' => 'rayriffy',
                    'endpoint' => $apiResponse['endpoint'] ?? null,
                    'scraped_at' => now()->toIso8601String(),
                ]),
            ]);

            $this->info("✅ บันทึกผลหวยรัฐบาล สำเร็จ!");

            // ใช้ BetSettlementService (เพิ่มเครดิต + สร้าง Transaction + อัพเดท BetSlip อัตโนมัติ)
            if ($calculate) {
                $settlement = DB::transaction(function () use ($lotteryResult) {
                    return $this->settlementService->settleBets($lotteryResult);
                });
                $this->info("   → คำนวณผลรางวัล: ถูก {$settlement['won']} จาก {$settlement['settled']} รายการ, จ่าย " . number_format($settlement['total_payout'], 2) . " บาท");
            }

            // Log
            try {
                AdminLog::create([
                    'admin_id' => 1,
                    'action' => 'scrape_thai_rayriffy',
                    'description' => "Rayriffy: หวยรัฐบาล {$firstPrize} ({$drawDate})",
                    'ip_address' => '127.0.0.1',
                ]);
            } catch (\Exception $e) { /* silently ignore */
            }

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error('❌ Error: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }

    private function parseThaiDate(string $dateStr): ?string
    {
        $thaiMonths = [
            'มกราคม' => '01',
            'กุมภาพันธ์' => '02',
            'มีนาคม' => '03',
            'เมษายน' => '04',
            'พฤษภาคม' => '05',
            'มิถุนายน' => '06',
            'กรกฎาคม' => '07',
            'สิงหาคม' => '08',
            'กันยายน' => '09',
            'ตุลาคม' => '10',
            'พฤศจิกายน' => '11',
            'ธันวาคม' => '12',
        ];

        if (preg_match('/(\d{1,2})\s+(\S+)\s+(\d{4})/', $dateStr, $m)) {
            $day = str_pad($m[1], 2, '0', STR_PAD_LEFT);
            $month = $thaiMonths[$m[2]] ?? null;
            $year = (int) $m[3];

            if (!$month)
                return null;
            if ($year > 2500)
                $year -= 543;

            return "{$year}-{$month}-{$day}";
        }

        return null;
    }
}
