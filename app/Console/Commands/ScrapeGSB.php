<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\LotteryScraperService;
use App\Models\LotteryType;

class ScrapeGSB extends Command
{
    protected $signature = 'lottery:gsb 
                            {type? : "1year" or "2year" (default: both)}
                            {date? : Draw date in ddMMyyyy format (default: auto)}';

    protected $description = 'ดึงผลสลากออมสินจาก psc.gsb.or.th';

    public function handle(LotteryScraperService $scraper)
    {
        $type = $this->argument('type');
        $date = $this->argument('date');

        $scriptPath = base_path('scripts/gsb_scrape.js');

        if (!file_exists($scriptPath)) {
            $this->error("❌ Script not found: {$scriptPath}");
            return 1;
        }

        $args = '';
        if ($type) $args .= " {$type}";
        if ($date) $args .= " {$date}";

        $this->info("⏳ กำลังดึงผลสลากออมสิน...");

        $output = shell_exec("node \"{$scriptPath}\"{$args} 2>&1");

        if (empty($output)) {
            $this->error('❌ No output from script');
            return 1;
        }

        // Find JSON - handle both minified and pretty-printed
        // Look for "success" key and walk backwards to find opening {
        $successPos = strrpos($output, '"success"');
        if ($successPos === false) {
            $this->error('❌ No JSON output');
            $this->line(substr($output, -500));
            return 1;
        }
        // Find the { before "success"
        $jsonStart = strrpos(substr($output, 0, $successPos), '{');
        if ($jsonStart === false) {
            $this->error('❌ Could not find JSON start');
            $this->line(substr($output, -500));
            return 1;
        }

        $data = json_decode(substr($output, $jsonStart), true);

        if (!$data || !$data['success'] || empty($data['results'])) {
            $this->error('❌ ไม่พบผลรางวัล');
            return 1;
        }

        $savedCount = 0;
        foreach ($data['results'] as $r) {
            $result = $scraper->saveResult(
                $r['slug'],
                $r['draw_date'],
                [
                    'first_prize' => $r['first_prize'],
                    'three_top' => $r['three_top'] ?? substr($r['first_prize'], -3),
                    'two_top' => $r['two_top'] ?? substr($r['first_prize'], -2),
                    'two_bottom' => $r['two_bottom'] ?? '',
                ]
            );

            if ($result) {
                $this->info("  ✅ {$r['lottery_name']}: {$r['first_prize']} ({$r['draw_date']})");
                $savedCount++;
            }
        }

        $this->info("\n🎉 Done! Saved: {$savedCount} results");
        return 0;
    }
}
