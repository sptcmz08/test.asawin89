<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use App\Models\LotteryType;
use App\Models\LotteryResult;

/**
 * Backfill historical lottery results from ManyCai via Puppeteer
 */
class BackfillLotteryResults extends Command
{
    protected $signature = 'lottery:backfill
                            {code? : ManyCai lottery code (e.g. YNHN, TLZC) or ALL}
                            {--pages=5 : Max number of history pages to scrape}';

    protected $description = 'Backfill historical lottery results from ManyCai using Puppeteer';

    // slug mapping for ManyCai codes
    private $codeToSlug = [
        'YNHN' => 'hanoi',
        'HNVIP' => 'hanoi-vip',
        'BFHN' => 'hanoi-special',
        'TLZC' => 'lao',
        'ZCVIP' => 'lao-vip',
        'GSHKA' => 'hangseng-morning',
        'GSHKP' => 'hangseng-afternoon',
        'GSJPA' => 'nikkei-morning',
        'GSJPP' => 'nikkei-afternoon',
        'GSKR' => 'korea',
        'GSCNA' => 'china-morning',
        'GSCNP' => 'china-afternoon',
        'GSTW' => 'taiwan',
        'GSSG' => 'singapore',
        'GSTH' => 'thai-stock',
        'GSIN' => 'india',
        'GSEG' => 'egypt',
        'GSRU' => 'russia',
        'GSDE' => 'germany',
        'GSUK' => 'uk',
        'GSUS' => 'dowjones',
    ];

    public function handle()
    {
        $code = $this->argument('code') ?? 'ALL';
        $pages = $this->option('pages');

        $scriptPath = base_path('scripts/manycai_history.js');
        if (!file_exists($scriptPath)) {
            $this->error("Script not found: {$scriptPath}");
            return 1;
        }

        $this->info("=== Backfilling lottery results (max {$pages} pages per lottery) ===\n");
        $this->info("Running Puppeteer script... This may take a while.\n");

        $cmd = "node \"{$scriptPath}\" {$code} {$pages} 2>&1";
        $output = shell_exec($cmd);

        if (empty($output)) {
            $this->error("No output from Puppeteer script");
            return 1;
        }

        // Find JSON in output (skip stderr lines)
        $jsonStart = strrpos($output, '{"success"');
        if ($jsonStart === false) {
            $this->error("No JSON found in output:");
            $this->line(substr($output, -1000));
            return 1;
        }

        $json = substr($output, $jsonStart);
        $data = json_decode($json, true);

        if (!$data || !$data['success']) {
            $this->error("Script failed: " . ($data['error'] ?? 'unknown error'));
            return 1;
        }

        $this->info("Script returned {$data['count']} results. Saving to database...\n");

        $saved = 0;
        $skipped = 0;
        $slugCounts = [];

        foreach ($data['results'] as $r) {
            $slug = $r['slug'] ?? null;
            if (!$slug)
                continue;

            // Handle thai-stock morning/afternoon by time if needed
            $lotteryType = LotteryType::where('slug', $slug)->first();
            if (!$lotteryType) {
                $skipped++;
                continue;
            }

            LotteryResult::updateOrCreate(
                [
                    'lottery_type_id' => $lotteryType->id,
                    'draw_date' => $r['draw_date'],
                ],
                [
                    'first_prize' => $r['first_prize'],
                    'two_top' => $r['two_top'] ?? substr($r['first_prize'], -2),
                    'three_top' => $r['three_top'] ?? substr($r['first_prize'], -3),
                    'two_bottom' => $r['two_bottom'] ?? '',
                    'details' => json_encode([
                        'source' => 'manycai-backfill',
                        'scraped_at' => now()->toIso8601String(),
                    ]),
                ]
            );

            $saved++;
            $slugCounts[$slug] = ($slugCounts[$slug] ?? 0) + 1;
        }

        $this->info("\n=== Results ===");
        foreach ($slugCounts as $slug => $count) {
            $this->line("  {$slug}: {$count} results saved");
        }
        $this->info("\nTotal saved: {$saved}, Skipped: {$skipped}");

        return 0;
    }
}
