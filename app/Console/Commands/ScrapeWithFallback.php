<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\LotteryScraperService;
use App\Models\ScraperLog;
use App\Models\LotteryType;
use Carbon\Carbon;

class ScrapeWithFallback extends Command
{
    protected $signature = 'lottery:scrape-fallback 
                            {slug? : Lottery slug (hanoi, hanoi-vip, lao, lao-vip, thai)} 
                            {--all : Scrape all lottery types with fallback}
                            {--source= : Force specific source (manycai, sanook, raakaadee)}';

    protected $description = 'Scrape lottery results with fallback sources (ManyCai -> Sanook -> Raakaadee)';

    private $slugs = ['hanoi', 'hanoi-vip', 'hanoi-special', 'lao', 'lao-vip', 'thai'];

    public function handle(LotteryScraperService $scraper)
    {
        $slug = $this->argument('slug');
        $scrapeAll = $this->option('all');
        $forcedSource = $this->option('source');

        if ($scrapeAll) {
            return $this->scrapeAllWithFallback($scraper, $forcedSource);
        }

        if (!$slug) {
            $this->info('Available lottery slugs:');
            foreach ($this->slugs as $s) {
                $sources = $scraper->getFallbackSources($s);
                $this->line("  {$s} => Fallbacks: " . (count($sources) > 0 ? implode(', ', $sources) : 'none'));
            }
            return 0;
        }

        if (!in_array($slug, $this->slugs)) {
            $this->error("Unknown slug: {$slug}");
            $this->line("Available: " . implode(', ', $this->slugs));
            return 1;
        }

        return $this->scrapeOneWithFallback($scraper, $slug, $forcedSource);
    }

    private function scrapeOneWithFallback($scraper, $slug, $forcedSource = null)
    {
        $lotteryType = LotteryType::where('slug', $slug)->first();
        $name = $lotteryType?->name ?? $slug;
        $date = Carbon::today()->format('Y-m-d');

        $this->info("Scraping {$name} with fallback...");

        if ($forcedSource) {
            // Use forced source
            $this->info("  Using forced source: {$forcedSource}");

            if ($forcedSource === 'manycai') {
                $codeMapping = $scraper->getManyCaiCodeMapping();
                $code = $codeMapping[$slug] ?? null;
                if ($code) {
                    $result = $scraper->scrapeAndSaveFromManyCai($slug, $date, $code);
                    if ($result) {
                        $this->info("  ✅ Success from {$forcedSource}");
                        ScraperLog::log($slug, $name, $forcedSource, 'success', "บันทึกผล {$result->first_prize}", $result->toArray(), $result->draw_date);
                        return 0;
                    }
                }
            } else {
                $fallbackResult = $scraper->scrapeFromFallback($forcedSource, $slug);
                if ($fallbackResult && $fallbackResult['success'] && !empty($fallbackResult['results'])) {
                    $r = $fallbackResult['results'][0];
                    $data = [
                        'first_prize' => $r['first_prize'],
                        'two_top' => $r['two_top'] ?? substr($r['first_prize'], -2),
                        'three_top' => $r['three_top'] ?? substr($r['first_prize'], -3),
                        'two_bottom' => $r['two_bottom'] ?? '',
                    ];
                    $saved = $scraper->saveResult($slug, $r['draw_date'] ?? $date, $data, ['source' => $forcedSource]);
                    if ($saved) {
                        $this->info("  ✅ Success from {$forcedSource}");
                        ScraperLog::log($slug, $name, $forcedSource, 'success', "บันทึกผล {$saved->first_prize}", $saved->toArray(), $saved->draw_date);
                        return 0;
                    }
                }
            }

            $this->error("  ❌ Failed from {$forcedSource}");
            ScraperLog::log($slug, $name, $forcedSource, 'failed', "ดึงผลไม่สำเร็จจาก {$forcedSource}", null, null);
            return 1;
        }

        // Use automatic fallback
        $result = $scraper->scrapeWithFallback($slug, $date);

        if ($result['success']) {
            $this->info("  ✅ Success from {$result['source']}");
            $savedResult = $result['result'];
            ScraperLog::log(
                $slug,
                $name,
                $result['source'],
                'success',
                "บันทึกผล {$savedResult->first_prize} (fallback)",
                $savedResult->toArray(),
                $savedResult->draw_date
            );
            return 0;
        }

        $this->error("  ❌ All sources failed");
        $fallbacks = $scraper->getFallbackSources($slug);
        $sources = ['manycai'];
        if ($fallbacks) {
            $sources = array_merge($sources, $fallbacks);
        }
        ScraperLog::log(
            $slug,
            $name,
            'all',
            'failed',
            "ดึงผลไม่สำเร็จจากทุกแหล่ง: " . implode(', ', $sources),
            null,
            null
        );
        return 1;
    }

    private function scrapeAllWithFallback($scraper, $forcedSource = null)
    {
        $this->info("Scraping all lottery types with fallback...\n");

        $success = 0;
        $failed = 0;

        foreach ($this->slugs as $slug) {
            $lotteryType = LotteryType::where('slug', $slug)->first();
            if (!$lotteryType || !$lotteryType->is_active) {
                $this->line("--- {$slug} (skipped: inactive) ---");
                continue;
            }

            $this->line("--- {$lotteryType->name} ({$slug}) ---");

            $exitCode = $this->scrapeOneWithFallback($scraper, $slug, $forcedSource);

            if ($exitCode === 0) {
                $success++;
            } else {
                $failed++;
            }

            $this->line('');
        }

        $this->info("Done! Success: {$success}, Failed: {$failed}");
        return $failed > 0 ? 1 : 0;
    }
}
