<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\LotteryScraperService;
use Carbon\Carbon;

class ScrapeLotteryResults extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'lottery:scrape {slug? : valid slugs: thai, lao, hanoi} {date? : YYYY-MM-DD}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Scrape lottery results from Sanook.com';

    /**
     * Execute the console command.
     */
    public function handle(LotteryScraperService $scraper)
    {
        $slug = $this->argument('slug');
        $date = $this->argument('date') ?? Carbon::now()->format('Y-m-d');

        $this->info("Scraping results for date: {$date}...");

        if ($slug) {
            $this->info("Target: {$slug}");
            $result = $scraper->scrape($slug, $date);
            if ($result) {
                $this->info("Success! Result saved for {$slug}.");
                $this->line("First Prize: " . $result->first_prize);
            } else {
                $this->error("Failed to scrape or no data found for {$slug}.");
            }
        } else {
            $this->info("Target: All types");
            $results = $scraper->scrape(null, $date);
            foreach ($results as $key => $res) {
                if ($res) {
                    $this->info("{$key}: Success");
                } else {
                    $this->warn("{$key}: Failed/Skipped");
                }
            }
        }

        return 0;
    }
}
