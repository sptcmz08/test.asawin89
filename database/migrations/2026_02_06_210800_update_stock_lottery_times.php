<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Update stock lottery draw times to match actual market close times
 * Times include ~30 min delay from ManyCai
 */
return new class extends Migration {
    public function up(): void
    {
        $updates = [
            // Japan Nikkei - Market closes 09:00/12:30, results ~09:30/13:00
            'nikkei-morning' => ['draw_time' => '10:00', 'close_before_minutes' => 30],
            'nikkei-afternoon' => ['draw_time' => '13:30', 'close_before_minutes' => 30],

            // Hong Kong Hang Seng - Market closes 10:30/15:00, results ~11:00/15:30
            'hangseng-morning' => ['draw_time' => '11:30', 'close_before_minutes' => 30],
            'hangseng-afternoon' => ['draw_time' => '15:30', 'close_before_minutes' => 30],

            // Taiwan - Market closes 12:30, results ~13:00
            'taiwan' => ['draw_time' => '13:00', 'close_before_minutes' => 30],

            // Korea - Market closes 13:30, results ~14:00
            'korea' => ['draw_time' => '14:00', 'close_before_minutes' => 30],

            // China - Market closes 09:30/13:00, results ~10:05/13:45
            'china-morning' => ['draw_time' => '10:35', 'close_before_minutes' => 30],
            'china-afternoon' => ['draw_time' => '14:15', 'close_before_minutes' => 30],

            // Singapore - Market closes 16:00, results ~16:30
            'singapore' => ['draw_time' => '16:30', 'close_before_minutes' => 30],

            // Thailand SET - Market closes 16:30, results ~17:00 (already correct)
            'thai-stock' => ['draw_time' => '17:00', 'close_before_minutes' => 30],

            // India BSE - Market closes 18:00, results ~18:30
            'india' => ['draw_time' => '18:30', 'close_before_minutes' => 30],

            // Egypt EGX - Market closes ~19:15, results ~19:45
            'egypt' => ['draw_time' => '19:45', 'close_before_minutes' => 30],

            // Russia MOEX - Market closes 23:50, results ~00:20
            'russia' => ['draw_time' => '00:20', 'close_before_minutes' => 30],

            // Germany DAX - Market closes 22:30 (winter 23:30), results ~23:00
            'germany' => ['draw_time' => '23:00', 'close_before_minutes' => 30],

            // UK FTSE - Market closes 22:30 (winter 23:30), results ~23:00
            'uk' => ['draw_time' => '23:00', 'close_before_minutes' => 30],

            // US Dow Jones - Market closes 03:00 (winter 04:00), results ~04:30
            'dowjones' => ['draw_time' => '04:30', 'close_before_minutes' => 30],
        ];

        foreach ($updates as $slug => $data) {
            DB::table('lottery_types')
                ->where('slug', $slug)
                ->update($data);
        }
    }

    public function down(): void
    {
        // Revert to original times
        $originals = [
            'nikkei-morning' => '11:00',
            'nikkei-afternoon' => '15:00',
            'hangseng-morning' => '12:00',
            'hangseng-afternoon' => '16:00',
            'taiwan' => '14:00',
            'korea' => '15:30',
            'china-morning' => '11:30',
            'china-afternoon' => '15:00',
            'singapore' => '17:00',
            'thai-stock' => '16:30',
            'india' => '18:00',
            'egypt' => '19:00',
            'russia' => '21:00',
            'germany' => '22:00',
            'uk' => '22:30',
            'dowjones' => '01:00',
        ];

        foreach ($originals as $slug => $time) {
            DB::table('lottery_types')
                ->where('slug', $slug)
                ->update(['draw_time' => $time, 'close_before_minutes' => 5]);
        }
    }
};
