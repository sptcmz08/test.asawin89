<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Fix stock lottery draw times - USER CONFIRMED TIMES
 */
return new class extends Migration {
    public function up(): void
    {
        $updates = [
            // จีน - เวลาจริงจาก user
            'china-morning' => ['draw_time' => '10:30', 'close_before_minutes' => 30],
            'china-afternoon' => ['draw_time' => '14:00', 'close_before_minutes' => 30],

            // หุ้นไทย SET - เวลาจริงจาก user
            'thai-stock' => ['draw_time' => '17:00', 'close_before_minutes' => 30],

            // อินเดีย - เวลาจริงจาก user
            'india' => ['draw_time' => '17:00', 'close_before_minutes' => 30],

            // อียิปต์ - เวลาจริงจาก user
            'egypt' => ['draw_time' => '18:00', 'close_before_minutes' => 30],

            // เยอรมัน - เวลาจริงจาก user
            'germany' => ['draw_time' => '22:00', 'close_before_minutes' => 30],

            // อังกฤษ - เวลาจริงจาก user
            'uk' => ['draw_time' => '22:00', 'close_before_minutes' => 30],

            // รัสเซีย - เวลาจริงจาก user
            'russia' => ['draw_time' => '22:00', 'close_before_minutes' => 30],

            // ดาวโจนส์ - เวลาจริงจาก user
            'dowjones' => ['draw_time' => '01:00', 'close_before_minutes' => 30],
        ];

        foreach ($updates as $slug => $data) {
            DB::table('lottery_types')
                ->where('slug', $slug)
                ->update($data);
        }
    }

    public function down(): void
    {
        // No rollback needed
    }
};
