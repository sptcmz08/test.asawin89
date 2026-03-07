<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\LotteryType;
use App\Models\LotteryResult;
use App\Models\ScraperLog;
use Carbon\Carbon;

/**
 * ManyCai HTTP Scraper - ไม่ต้องใช้ Puppeteer
 * ใช้ HTTP request โดยตรงสำหรับ Shared Hosting
 */
class ScrapeManyCaiHttp extends Command
{
    protected $signature = 'lottery:scrape-http 
                            {slug? : Lottery slug (hanoi, hanoi-vip, lao, lao-vip, lao-star)} 
                            {--all : Scrape all supported lottery types}';

    protected $description = 'Scrape lottery results using HTTP (no Puppeteer required)';

    // ManyCai API codes
    private $lotteryMapping = [
        'hanoi' => ['code' => 'YNHN', 'name' => 'หวยฮานอย'],
        'hanoi-vip' => ['code' => 'HNVIP', 'name' => 'หวยฮานอย VIP'],
        'hanoi-special' => ['code' => 'BFHN', 'name' => 'หวยฮานอยพิเศษ'],
        'lao' => ['code' => 'TLZC', 'name' => 'หวยลาวพัฒนา'],
        'lao-vip' => ['code' => 'ZCVIP', 'name' => 'หวยลาว VIP'],
        'lao-star' => ['code' => 'TYKC', 'name' => 'หวยลาวสตาร์'],
    ];

    public function handle()
    {
        $slug = $this->argument('slug');
        $scrapeAll = $this->option('all');

        if ($scrapeAll) {
            return $this->scrapeAll();
        }

        if (!$slug) {
            $this->info('Available lottery slugs:');
            foreach ($this->lotteryMapping as $s => $info) {
                $this->line("  {$s} => {$info['name']} ({$info['code']})");
            }
            return 0;
        }

        if (!isset($this->lotteryMapping[$slug])) {
            $this->error("Unknown slug: {$slug}");
            return 1;
        }

        return $this->scrapeOne($slug);
    }

    private function scrapeAll()
    {
        $this->info("Scraping all lottery types via HTTP...\n");

        $success = 0;
        $failed = 0;

        foreach ($this->lotteryMapping as $slug => $info) {
            $lotteryType = LotteryType::where('slug', $slug)->first();
            if (!$lotteryType || !$lotteryType->is_active) {
                $this->line("--- {$slug} (skipped: inactive) ---");
                continue;
            }

            $this->line("--- {$info['name']} ({$slug}) ---");
            $result = $this->scrapeOne($slug);

            if ($result === 0) {
                $success++;
            } else {
                $failed++;
            }

            $this->line('');
            sleep(1); // Rate limiting
        }

        $this->info("Done! Success: {$success}, Failed: {$failed}");
        return $failed > 0 ? 1 : 0;
    }

    private function scrapeOne($slug)
    {
        $info = $this->lotteryMapping[$slug];
        $code = $info['code'];
        $name = $info['name'];

        $this->info("Fetching {$name} ({$code})...");

        try {
            $result = $this->fetchFromManyCai($code);

            if (!$result || empty($result['first_prize'])) {
                $this->error("  ❌ No result found");
                ScraperLog::log($slug, $name, 'manycai-http', 'failed', 'ไม่พบข้อมูล', null, null);
                return 1;
            }

            // Get lottery type
            $lotteryType = LotteryType::where('slug', $slug)->first();
            if (!$lotteryType) {
                $this->error("  ❌ Lottery type not found in database");
                return 1;
            }

            // Save to database
            $drawDate = $result['draw_date'] ?? Carbon::today()->format('Y-m-d');

            // ✅ SECURITY: ไม่ใช้ updateOrCreate เพื่อป้องกันการทับผลเดิม
            $existing = LotteryResult::where('lottery_type_id', $lotteryType->id)
                ->where('draw_date', $drawDate)
                ->first();

            if ($existing) {
                // ตรวจสอบว่าผลตรงกันหรือไม่
                $newThreeTop = $result['three_top'] ?? substr($result['first_prize'], -3);
                if ($existing->three_top !== $newThreeTop) {
                    $this->warn("  ⚠️  Mismatch: existing={$existing->three_top}, new={$newThreeTop} — ไม่ทับผลเดิม!");
                    Log::warning("[ScrapeHTTP] {$slug}: Result mismatch — existing={$existing->three_top}, new={$newThreeTop} — NOT overwriting");
                    ScraperLog::log(
                        $slug,
                        $name,
                        'manycai-http',
                        'mismatch',
                        "Existing: {$existing->three_top}, New: {$newThreeTop} — skipped",
                        null,
                        $drawDate
                    );
                } else {
                    $this->info("  ⏭️  Already exists: {$result['first_prize']} ({$drawDate})");
                }
                return 0;
            }

            // Create new result (never overwrite)
            $lotteryResult = LotteryResult::create([
                'lottery_type_id' => $lotteryType->id,
                'draw_date' => $drawDate,
                'first_prize' => $result['first_prize'],
                'two_top' => $result['two_top'] ?? substr($result['first_prize'], -2),
                'three_top' => $result['three_top'] ?? substr($result['first_prize'], -3),
                'two_bottom' => $result['two_bottom'] ?? '',
                'details' => json_encode(['source' => 'manycai-http', 'scraped_at' => now()->toIso8601String()]),
            ]);

            $this->info("  ✅ Saved: {$result['first_prize']} ({$drawDate})");

            // Log success
            ScraperLog::log(
                $slug,
                $name,
                'manycai-http',
                'success',
                "บันทึกผล {$result['first_prize']}",
                $lotteryResult->toArray(),
                $drawDate
            );

            return 0;

        } catch (\Exception $e) {
            $this->error("  ❌ Error: " . $e->getMessage());
            Log::error("[ScrapeHTTP] {$slug}: " . $e->getMessage());
            ScraperLog::log($slug, $name, 'manycai-http', 'failed', $e->getMessage(), null, null);
            return 1;
        }
    }

    /**
     * Fetch lottery result from ManyCai website via HTTP
     * ใช้ regex parse HTML แทน Puppeteer
     */
    private function fetchFromManyCai($lotteryCode)
    {
        $url = "https://th.manycai.com/Issue/history?lottername={$lotteryCode}";

        $response = Http::withHeaders([
            'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language' => 'th-TH,th;q=0.9,en;q=0.8',
            'Referer' => 'https://th.manycai.com/',
        ])->timeout(30)->get($url);

        if (!$response->successful()) {
            throw new \Exception("HTTP request failed: " . $response->status());
        }

        $html = $response->body();

        // Parse table rows using regex
        // Looking for first data row in table
        // Pattern: <tr><td>123456</td><td>...</td><td>2026-01-29 19:30:00</td></tr>

        // Extract table body
        preg_match_all('/<tr[^>]*>\s*<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>([^<]*)<\/td>\s*<td[^>]*>([^<]*)<\/td>/si', $html, $matches, PREG_SET_ORDER);

        if (empty($matches)) {
            Log::warning("[ScrapeHTTP] No table rows found for {$lotteryCode}");
            return null;
        }

        // Skip header row, get first data row
        $dataRowIndex = 0;
        foreach ($matches as $index => $match) {
            $firstCell = trim($match[1]);
            // Check if first cell is a valid lottery number (3-6 digits)
            if (preg_match('/^\d{3,6}$/', $firstCell)) {
                $dataRowIndex = $index;
                break;
            }
        }

        $dataRow = $matches[$dataRowIndex] ?? null;
        if (!$dataRow) {
            return null;
        }

        $firstPrize = trim($dataRow[1]);
        $dateText = trim($dataRow[2]);
        $datetime = trim($dataRow[3]);

        // Validate first prize format
        if (!preg_match('/^\d{3,6}$/', $firstPrize)) {
            return null;
        }

        // Extract date from datetime (2026-01-29 19:30:00 -> 2026-01-29)
        $drawDate = null;
        if (preg_match('/(\d{4}-\d{2}-\d{2})/', $datetime, $dateMatch)) {
            $drawDate = $dateMatch[1];
        }

        return [
            'first_prize' => $firstPrize,
            'two_top' => substr($firstPrize, -2),
            'three_top' => substr($firstPrize, -3),
            'two_bottom' => strlen($firstPrize) >= 4 ? substr($firstPrize, 0, 2) : '', // 4+ หลัก: 2ตัวล่าง = 2หลักแรก, 3 หลัก: ต้องดึงจาก codelist
            'draw_date' => $drawDate ?? Carbon::today()->format('Y-m-d'),
            'date_thai' => $dateText,
        ];
    }
}
