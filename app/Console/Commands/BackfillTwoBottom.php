<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\LotteryType;
use App\Models\LotteryResult;
use Illuminate\Support\Facades\Log;

class BackfillTwoBottom extends Command
{
    protected $signature = 'lottery:backfill-two-bottom 
                            {slug? : Specific lottery slug (optional, backfill all if omitted)}
                            {--pages=3 : Number of history pages to scrape per lottery}
                            {--calculate : Re-calculate winning bets after backfill}';

    protected $description = 'Backfill missing two_bottom data from ManyCai history using Puppeteer';

    private $settlementService;

    public function __construct()
    {
        parent::__construct();
        $this->settlementService = app(\App\Services\BetSettlementService::class);
    }

    public function handle()
    {
        $slug = $this->argument('slug');
        $maxPages = $this->option('pages');
        $calculate = $this->option('calculate');

        $this->info('🔄 Starting two_bottom backfill...');

        // Get lottery types that need backfill
        $query = LotteryType::query();
        if ($slug) {
            $query->where('slug', $slug);
        }
        $lotteryTypes = $query->get();

        if ($lotteryTypes->isEmpty()) {
            $this->error('❌ No lottery types found');
            return Command::FAILURE;
        }

        // Find records with empty or null two_bottom
        $emptyCount = LotteryResult::where(function ($q) {
                $q->whereNull('two_bottom')->orWhere('two_bottom', '');
            })
            ->when($slug, function ($q) use ($slug) {
                $lotteryType = LotteryType::where('slug', $slug)->first();
                if ($lotteryType) {
                    $q->where('lottery_type_id', $lotteryType->id);
                }
            })
            ->count();

        $this->info("📊 Found {$emptyCount} records with empty two_bottom");

        if ($emptyCount === 0) {
            $this->info('✅ All records already have two_bottom data!');
            return Command::SUCCESS;
        }

        // Run manycai_history.js to get history data with codelist
        $scriptPath = base_path('scripts/manycai_history.js');

        if (!file_exists($scriptPath)) {
            $this->error("❌ Script not found: {$scriptPath}");
            return Command::FAILURE;
        }

        $updatedCount = 0;
        $failedCount = 0;

        // Process each lottery type
        foreach ($lotteryTypes as $lotteryType) {
            // Find the ManyCai code for this lottery type
            $code = $this->getManyCaiCode($lotteryType->slug);
            if (!$code) {
                $this->warn("⚠️ No ManyCai code for {$lotteryType->slug}, skipping...");
                continue;
            }

            // Check if this type has records needing backfill
            $needsBackfill = LotteryResult::where('lottery_type_id', $lotteryType->id)
                ->where(function ($q) {
                    $q->whereNull('two_bottom')->orWhere('two_bottom', '');
                })
                ->count();

            if ($needsBackfill === 0) {
                $this->line("  ⏩ {$lotteryType->name} ({$lotteryType->slug}): all records OK, skipping");
                continue;
            }

            $this->info("🔍 Scraping history for {$lotteryType->name} ({$code})...");

            // Run the history scraper — redirect stderr to temp file so it doesn't corrupt JSON stdout
            $stderrFile = tempnam(sys_get_temp_dir(), 'backfill_');
            $output = shell_exec("cd " . base_path() . " && node \"{$scriptPath}\" {$code} {$maxPages} 2>{$stderrFile}");

            // Log stderr for debugging
            if (file_exists($stderrFile)) {
                $stderr = file_get_contents($stderrFile);
                if ($stderr) {
                    $this->line("  📝 Scraper log: " . substr($stderr, 0, 200));
                }
                @unlink($stderrFile);
            }

            if (empty($output)) {
                $this->warn("  ❌ No output for {$lotteryType->slug}");
                $failedCount++;
                continue;
            }

            // Parse JSON output from manycai_history.js
            // Output format: {"success": true, "count": N, "results": [...]}
            $historyData = [];
            $decoded = json_decode(trim($output), true);

            if ($decoded && isset($decoded['success']) && $decoded['success'] && !empty($decoded['results'])) {
                // Standard format from manycai_history.js
                $historyData = $decoded['results'];
                $this->info("  📦 Got " . count($historyData) . " history records (JSON parsed OK)");
            } else {
                // Fallback: try line-by-line parsing
                $lines = explode("\n", trim($output));
                foreach ($lines as $line) {
                    $line = trim($line);
                    if (empty($line)) continue;

                    $lineDecoded = json_decode($line, true);
                    if ($lineDecoded && is_array($lineDecoded)) {
                        if (isset($lineDecoded['results'])) {
                            $historyData = array_merge($historyData, $lineDecoded['results']);
                        } elseif (isset($lineDecoded['slug'])) {
                            $historyData[] = $lineDecoded;
                        }
                    }
                }
            }

            if (empty($historyData)) {
                $this->warn("  ❌ Could not parse history for {$lotteryType->slug}");
                $this->warn("  📝 Raw output (first 300 chars): " . substr($output, 0, 300));
                $failedCount++;
                continue;
            }


            // Update existing DB records with two_bottom from history
            foreach ($historyData as $record) {
                $twoBottom = $record['two_bottom'] ?? '';
                $drawDate = $record['draw_date'] ?? null;

                if (empty($twoBottom) || empty($drawDate)) continue;

                // Only update records that have empty two_bottom
                $affected = LotteryResult::where('lottery_type_id', $lotteryType->id)
                    ->where('draw_date', $drawDate)
                    ->where(function ($q) {
                        $q->whereNull('two_bottom')->orWhere('two_bottom', '');
                    })
                    ->update(['two_bottom' => $twoBottom]);

                if ($affected > 0) {
                    $this->info("  ✅ Updated {$lotteryType->slug} {$drawDate}: two_bottom = {$twoBottom}");
                    $updatedCount += $affected;

                    // Re-calculate bets if requested
                    if ($calculate) {
                        $result = LotteryResult::where('lottery_type_id', $lotteryType->id)
                            ->where('draw_date', $drawDate)
                            ->first();

                        if ($result) {
                            try {
                                $settlement = \DB::transaction(function () use ($result) {
                                    return $this->settlementService->settleBets($result);
                                });
                                if ($settlement['settled'] > 0) {
                                    $this->info("     → Re-calculated: ถูก {$settlement['won']} จาก {$settlement['settled']} รายการ");
                                }
                            } catch (\Exception $e) {
                                $this->warn("     ❌ Settlement error: " . $e->getMessage());
                            }
                        }
                    }
                }
            }
        }

        $this->newLine();
        $this->info("📊 Backfill Summary:");
        $this->info("  ✅ Updated: {$updatedCount} records");
        $this->info("  ❌ Failed types: {$failedCount}");

        return Command::SUCCESS;
    }

    /**
     * Map lottery slug to ManyCai lottery code
     */
    private function getManyCaiCode(string $slug): ?string
    {
        $codeMap = [
            'hanoi' => 'YNHN',
            'hanoi-vip' => 'HNVIP',
            'hanoi-special' => 'BFHN',
            'hanoi-adhoc' => 'CQHN',
            'lao' => 'TLZC',
            'lao-vip' => 'ZCVIP',
            'malay' => 'YNMA',
            'hangseng-morning' => 'GSHKA',
            'hangseng-afternoon' => 'GSHKP',
            'nikkei-morning' => 'GSJPA',
            'nikkei-afternoon' => 'GSJPP',
            'korea' => 'GSKR',
            'china-morning' => 'GSCNA',
            'china-afternoon' => 'GSCNP',
            'taiwan' => 'GSTW',
            'singapore' => 'GSSG',
            'thai-stock' => 'GSTH',
            'india' => 'GSIN',
            'egypt' => 'GSEG',
            'russia' => 'GSRU',
            'germany' => 'GSDE',
            'uk' => 'GSUK',
            'dowjones' => 'GSUS',
        ];

        return $codeMap[$slug] ?? null;
    }
}
