<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\AdminLog;
use App\Models\LotteryType;
use App\Models\LotteryResult;
use App\Services\BetSettlementService;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ScrapeGSBLottery extends Command
{
    protected $signature = 'lottery:scrape-gsb
                            {type? : 1year or 2year (default: auto based on date)}
                            {--calculate : Also calculate winning bets after scraping}';

    protected $description = 'Scrape GSB (ออมสิน) lottery results from psc.gsb.or.th';

    protected BetSettlementService $settlementService;

    public function __construct(BetSettlementService $settlementService)
    {
        parent::__construct();
        $this->settlementService = $settlementService;
    }

    public function handle()
    {
        $type = $this->argument('type');
        $calculate = $this->option('calculate');
        $today = Carbon::now('Asia/Bangkok');

        // Auto-detect which type to scrape based on draw day
        // ออมสิน 1 ปี ออกวันที่ 16, ออมสิน 2 ปี ออกวันที่ 1
        $typesToScrape = [];
        if ($type) {
            $typesToScrape[] = $type;
        } else {
            $day = $today->day;
            if ($day === 1)
                $typesToScrape[] = '2year';
            if ($day === 16)
                $typesToScrape[] = '1year';
            // If not draw day, scrape whichever is more recent
            if (empty($typesToScrape)) {
                $typesToScrape = ['1year', '2year'];
            }
        }

        $this->info('🏦 Scraping GSB lottery: ' . implode(', ', $typesToScrape));

        // Build Node.js command
        $scriptPath = base_path('scripts/gsb_scrape.js');
        if (!file_exists($scriptPath)) {
            $this->error("❌ Script not found: {$scriptPath}");
            return Command::FAILURE;
        }

        foreach ($typesToScrape as $gsbType) {
            $this->scrapeType($gsbType, $scriptPath, $calculate);
        }

        return Command::SUCCESS;
    }

    private function scrapeType(string $gsbType, string $scriptPath, bool $calculate)
    {
        $this->info("🔄 Scraping ออมสิน {$gsbType}...");

        $output = shell_exec("cd " . base_path() . " && node \"{$scriptPath}\" {$gsbType} 2>&1");

        if (empty($output)) {
            $this->error("❌ No output from scraper for {$gsbType}");
            return;
        }

        // Find JSON
        $jsonStart = strpos($output, '{');
        if ($jsonStart === false) {
            $this->error('❌ No JSON found');
            $this->line(substr($output, 0, 500));
            return;
        }

        $json = substr($output, $jsonStart);
        $data = json_decode($json, true);

        if (!$data || !($data['success'] ?? false)) {
            $this->error('❌ Scraper failed');
            return;
        }

        $results = $data['results'] ?? [];

        foreach ($results as $r) {
            $slug = $r['slug'] ?? null;
            $drawDate = $r['draw_date'] ?? null;
            $firstPrize = $r['first_prize'] ?? '';

            if (!$slug || !$drawDate || !$firstPrize) {
                $this->warn("⚠️  Missing data for {$gsbType}");
                continue;
            }

            $lotteryType = LotteryType::where('slug', $slug)->first();
            if (!$lotteryType) {
                $this->warn("⚠️  ไม่พบ lottery type: {$slug}");
                continue;
            }

            // Check if already exists
            $exists = LotteryResult::where('lottery_type_id', $lotteryType->id)
                ->where('draw_date', $drawDate)
                ->exists();

            if ($exists) {
                $this->warn("⏭️  {$r['lottery_name']}: มีผลวันที่ {$drawDate} แล้ว");
                continue;
            }

            // Save result
            $lotteryResult = LotteryResult::create([
                'lottery_type_id' => $lotteryType->id,
                'draw_date' => $drawDate,
                'first_prize' => $firstPrize,
                'three_top' => $r['three_top'] ?? substr($firstPrize, -3),
                'two_top' => $r['two_top'] ?? substr($firstPrize, -2),
                'two_bottom' => !empty($r['two_bottom']) ? $r['two_bottom'] : '',
                'details' => json_encode([
                    'source' => 'gsb-psc',
                    'second_prize' => $r['second_prize'] ?? '',
                    'scraped_at' => now()->toIso8601String(),
                ]),
            ]);

            $this->info("✅ {$r['lottery_name']}: {$firstPrize} (3บน={$r['three_top']}, 2บน={$r['two_top']}, 2ล่าง={$r['two_bottom']}) [{$drawDate}]");

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
                    'action' => 'scrape_gsb',
                    'description' => "GSB: {$r['lottery_name']} {$firstPrize} ({$drawDate})",
                    'ip_address' => '127.0.0.1',
                ]);
            } catch (\Exception $e) { /* silently ignore */
            }
        }
    }
}
