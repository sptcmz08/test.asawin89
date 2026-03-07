<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\LotteryScraperService;
use App\Services\BetSettlementService;
use App\Models\LotteryType;
use App\Models\LotteryResult;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ScrapeManyCai extends Command
{
    protected $signature = 'lottery:manycai 
                            {code? : ManyCai code (YNHN, HNVIP, BFHN, TLZC, ZCVIP, TGFC) or "ALL"} 
                            {--all : Scrape all lottery types}
                            {--count=1 : Number of results to fetch}
                            {--history : Use history scraper for bulk fetch (uses Puppeteer)}
                            {--pages=3 : Number of history pages to scrape (with --history)}';

    protected $description = 'Scrape lottery results from ManyCai';

    private $codeMapping = [
        'YNHN' => ['slug' => 'hanoi', 'name' => 'หวยฮานอย'],
        'HNVIP' => ['slug' => 'hanoi-vip', 'name' => 'หวยฮานอย VIP'],
        'BFHN' => ['slug' => 'hanoi-special', 'name' => 'หวยฮานอยพิเศษ'],
        'TLZC' => ['slug' => 'lao', 'name' => 'หวยลาวพัฒนา'],
        'ZCVIP' => ['slug' => 'lao-vip', 'name' => 'หวยลาว VIP'],
        'TGFC' => ['slug' => 'thai', 'name' => 'หวยไทย'],
    ];

    protected BetSettlementService $settlementService;

    public function __construct(BetSettlementService $settlementService)
    {
        parent::__construct();
        $this->settlementService = $settlementService;
    }

    public function handle(LotteryScraperService $scraper)
    {
        $code = $this->argument('code');
        $scrapeAll = $this->option('all') || $code === 'ALL';
        $useHistory = $this->option('history');
        $pages = (int) $this->option('pages');

        // History mode: use Puppeteer to scrape historical results
        if ($useHistory || $scrapeAll) {
            return $this->scrapeHistory($scraper, $scrapeAll ? 'ALL' : $code, $pages);
        }

        // Default: scrape today's results from /Issue/draw
        return $this->scrapeToday($scraper, $code);
    }

    /**
     * ดึงผลวันนี้จาก ManyCai /Issue/draw page
     */
    private function scrapeToday(LotteryScraperService $scraper, $code = null)
    {
        $this->info("Scraping today's results from ManyCai /Issue/draw...");

        $data = $scraper->scrapeFromManyCaiDraw();

        if (!$data || !$data['success'] || empty($data['results'])) {
            $this->error('❌ ไม่สามารถดึงข้อมูลได้: ' . ($data['error'] ?? 'Unknown error'));
            return 1;
        }

        $this->info("Found {$data['count']} lottery results");

        $savedCount = 0;
        $existsCount = 0;

        $nameMap = $scraper->getLotteryNameMappings();

        foreach ($data['results'] as $r) {
            $lotteryName = $r['lottery_name'] ?? '';
            $slug = $nameMap[$lotteryName] ?? null;

            if (!$slug) continue;

            // If specific code requested, filter
            if ($code) {
                $info = $this->codeMapping[$code] ?? null;
                if ($info && $info['slug'] !== $slug) continue;
            }

            $result = $scraper->saveResult(
                $slug,
                $r['draw_date'] ?? now()->toDateString(),
                [
                    'first_prize' => $r['first_prize'],
                    'three_top' => $r['three_top'] ?? substr($r['first_prize'], -3),
                    'two_top' => $r['two_top'] ?? substr($r['first_prize'], -2),
                    'two_bottom' => $r['two_bottom'] ?? substr($r['first_prize'], 0, 2),
                ]
            );

            if ($result && $result->wasRecentlyCreated) {
                $this->info("  ✅ {$lotteryName}: {$r['first_prize']} ({$r['draw_date']})");

                // ใช้ BetSettlementService (เพิ่มเครดิต + สร้าง Transaction + อัพเดท BetSlip อัตโนมัติ)
                $settlement = DB::transaction(function () use ($result) {
                    return $this->settlementService->settleBets($result);
                });

                if ($settlement['won'] > 0) {
                    $this->info("    💰 ถูก {$settlement['won']} จาก {$settlement['settled']} รายการ, จ่าย " . number_format($settlement['total_payout'], 2) . " บาท");
                }

                $savedCount++;
            } else {
                $existsCount++;
            }
        }

        $this->info("\nDone! Saved: {$savedCount}, Already existed: {$existsCount}");
        return 0;
    }

    /**
     * ดึงผลย้อนหลังจาก ManyCai /Issue/history ด้วย Puppeteer
     */
    private function scrapeHistory(LotteryScraperService $scraper, $code, $pages)
    {
        $scriptPath = base_path('scripts/manycai_history.js');

        if (!file_exists($scriptPath)) {
            $this->error("❌ Script not found: {$scriptPath}");
            $this->info("Install puppeteer: npm install puppeteer");
            return 1;
        }

        $codeArg = $code ?: 'ALL';
        $this->info("Scraping history from ManyCai (code={$codeArg}, pages={$pages})...");
        $this->info("⏳ กำลังเปิด browser (Puppeteer)... อาจใช้เวลาสักครู่\n");

        $output = shell_exec("node \"{$scriptPath}\" {$codeArg} {$pages} 2>&1");

        if (empty($output)) {
            $this->error('❌ No output from script');
            return 1;
        }

        // Find JSON in output
        $successPos = strrpos($output, '"success"');
        if ($successPos === false) {
            $this->error('❌ No JSON output found');
            $this->line(substr($output, -500));
            return 1;
        }
        $jsonStart = strrpos(substr($output, 0, $successPos), '{');

        if ($jsonStart === false) {
            $this->error('❌ Could not find JSON start');
            $this->line(substr($output, -500));
            return 1;
        }

        $json = substr($output, $jsonStart);
        $data = json_decode($json, true);

        if (!$data || !isset($data['success']) || !$data['success']) {
            $this->error('❌ Scraping failed: ' . ($data['error'] ?? 'Unknown'));
            return 1;
        }

        $this->info("Found {$data['count']} historical results\n");

        $savedCount = 0;
        $existsCount = 0;
        $failedCount = 0;
        $lastSlug = '';

        foreach ($data['results'] as $r) {
            $slug = $r['slug'] ?? null;
            if (!$slug) {
                $failedCount++;
                continue;
            }

            // Print header when slug changes
            if ($slug !== $lastSlug) {
                if ($lastSlug) $this->line('');
                $this->info("--- {$slug} ---");
                $lastSlug = $slug;
            }

            $result = $scraper->saveResult(
                $slug,
                $r['draw_date'],
                [
                    'first_prize' => $r['first_prize'],
                    'three_top' => $r['three_top'] ?? substr($r['first_prize'], -3),
                    'two_top' => $r['two_top'] ?? substr($r['first_prize'], -2),
                    'two_bottom' => $r['two_bottom'] ?? '',
                ]
            );

            if ($result && $result->wasRecentlyCreated) {
                $this->info("  ✅ {$r['first_prize']} ({$r['draw_date']})");

                // ใช้ BetSettlementService (เพิ่มเครดิต + สร้าง Transaction + อัพเดท BetSlip อัตโนมัติ)
                $settlement = DB::transaction(function () use ($result) {
                    return $this->settlementService->settleBets($result);
                });

                if ($settlement['won'] > 0) {
                    $this->info("    💰 ถูก {$settlement['won']} จาก {$settlement['settled']} รายการ, จ่าย " . number_format($settlement['total_payout'], 2) . " บาท");
                }

                $savedCount++;
            } else {
                $existsCount++;
            }
        }

        $this->line('');
        $this->info("🎉 Done! Saved: {$savedCount}, Already existed: {$existsCount}" . ($failedCount > 0 ? ", Failed: {$failedCount}" : ""));
        return 0;
    }
}
