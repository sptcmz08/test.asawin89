<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Fix stock lottery draw times to match EXACT actual times
 */
return new class extends Migration {
    public function up(): void
    {
        $updates = [
            // Japan Nikkei - เวลาจริง
            'nikkei-morning' => ['draw_time' => '09:30', 'close_before_minutes' => 30],
            'nikkei-afternoon' => ['draw_time' => '13:00', 'close_before_minutes' => 30],

            // Hong Kong Hang Seng - เวลาจริง
            'hangseng-morning' => ['draw_time' => '11:00', 'close_before_minutes' => 30],
            'hangseng-afternoon' => ['draw_time' => '15:00', 'close_before_minutes' => 30],

            // Taiwan - เวลาจริง
            'taiwan' => ['draw_time' => '12:30', 'close_before_minutes' => 30],

            // Korea - เวลาจริง
            'korea' => ['draw_time' => '13:30', 'close_before_minutes' => 30],

            // China - เวลาจริง
            'china-morning' => ['draw_time' => '10:05', 'close_before_minutes' => 30],
            'china-afternoon' => ['draw_time' => '13:45', 'close_before_minutes' => 30],

            // Singapore - เวลาจริง
            'singapore' => ['draw_time' => '16:00', 'close_before_minutes' => 30],

            // Thailand SET - ถูกต้องอยู่แล้ว
            'thai-stock' => ['draw_time' => '16:30', 'close_before_minutes' => 30],

            // India BSE - เวลาจริง
            'india' => ['draw_time' => '18:30', 'close_before_minutes' => 30],

            // Egypt EGX - เวลาจริง
            'egypt' => ['draw_time' => '19:15', 'close_before_minutes' => 30],

            // Russia MOEX - เวลาจริง
            'russia' => ['draw_time' => '23:50', 'close_before_minutes' => 30],

            // Germany DAX - เวลาจริง (ช่วงกลาง)
            'germany' => ['draw_time' => '23:00', 'close_before_minutes' => 30],

            // UK FTSE - เวลาจริง (ช่วงกลาง)
            'uk' => ['draw_time' => '23:00', 'close_before_minutes' => 30],

            // US Dow Jones - เวลาจริง
            'dowjones' => ['draw_time' => '04:00', 'close_before_minutes' => 30],
        ];

        foreach ($updates as $slug => $data) {
            DB::table('lottery_types')
                ->where('slug', $slug)
                ->update($data);
        }
    }

    public function down(): void
    {
        // No rollback needed - previous migration handles it
    }
};
