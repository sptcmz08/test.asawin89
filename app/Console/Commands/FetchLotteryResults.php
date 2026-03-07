<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\LotteryResultService;
use App\Models\LotteryType;
use App\Models\LotteryRound;
use App\Models\LotteryResult;

class FetchLotteryResults extends Command
{
    protected $signature = 'lottery:fetch {--type= : Specific lottery type slug} {--test : Test API connections only}';
    protected $description = 'Fetch lottery results from external APIs';

    protected LotteryResultService $resultService;

    public function __construct(LotteryResultService $resultService)
    {
        parent::__construct();
        $this->resultService = $resultService;
    }

    public function handle()
    {
        if ($this->option('test')) {
            return $this->testConnections();
        }

        $type = $this->option('type');
        
        if ($type) {
            $this->fetchForType($type);
        } else {
            $this->fetchAll();
        }

        return 0;
    }

    private function testConnections()
    {
        $this->info('Testing API connections...');
        $this->newLine();
        
        $results = $this->resultService->testAllConnections();
        
        foreach ($results as $slug => $status) {
            $icon = $status['status'] === 'success' ? '✓' : '✗';
            $color = $status['status'] === 'success' ? 'green' : 'red';
            
            $this->line("<fg={$color}>{$icon}</> {$slug}: {$status['status']}");
        }

        $this->newLine();
        $this->info('Test complete.');
        
        return 0;
    }

    private function fetchAll()
    {
        $types = LotteryType::all();
        
        $this->info("Fetching results for {$types->count()} lottery types...");
        
        foreach ($types as $type) {
            $this->fetchForType($type->slug);
        }
    }

    private function fetchForType(string $slug)
    {
        $this->line("Fetching: {$slug}...");
        
        $result = $this->resultService->fetchResult($slug);
        
        if (!$result) {
            $this->error("  Failed to fetch results for {$slug}");
            return;
        }

        if (empty($result['results'])) {
            $this->warn("  No results available for {$slug}");
            return;
        }

        // Store in database
        $this->storeResult($slug, $result);
        
        $this->info("  ✓ Successfully fetched {$slug}");
    }

    private function storeResult(string $slug, array $data)
    {
        $lotteryType = LotteryType::where('slug', $slug)->first();
        
        if (!$lotteryType) {
            $this->error("  Lottery type not found: {$slug}");
            return;
        }

        // Find or create round
        $round = LotteryRound::firstOrCreate([
            'lottery_type_id' => $lotteryType->id,
            'draw_date' => $data['draw_date'],
        ], [
            'status' => 'completed',
        ]);

        // Store results
        if (!empty($data['results'])) {
            foreach ($data['results'] as $key => $value) {
                if ($value === null) continue;
                
                // Handle arrays (like multiple prizes)
                $values = is_array($value) ? $value : [$value];
                
                foreach ($values as $v) {
                    LotteryResult::updateOrCreate([
                        'lottery_round_id' => $round->id,
                        'result_type' => $key,
                        'number' => is_string($v) ? $v : json_encode($v),
                    ]);
                }
            }
        }

        $round->update(['status' => 'completed']);
    }
}
