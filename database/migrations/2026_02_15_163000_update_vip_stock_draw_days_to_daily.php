<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * แก้ draw_days ของหุ้น VIP ทุกตัวจาก จ-ศ เป็นทุกวัน
 * เพราะเว็บ stocks-vip.com ออกผลทุกวันรวมเสาร์-อาทิตย์
 */
return new class extends Migration {
    public function up(): void
    {
        // ทุกวัน: 0=อา, 1=จ, 2=อ, 3=พ, 4=พฤ, 5=ศ, 6=ส
        $dailyDays = json_encode(['0', '1', '2', '3', '4', '5', '6']);

        $vipSlugs = [
            'nikkei-morning-vip',
            'china-morning-vip',
            'hangseng-morning-vip',
            'taiwan-vip',
            'nikkei-afternoon-vip',
            'china-afternoon-vip',
            'hangseng-afternoon-vip',
            'singapore-vip',
            'india-vip',
            'egypt-vip',
            'uk-vip',
            'germany-vip',
            'russia-vip',
            'dowjones-vip',
        ];

        DB::table('lottery_types')
            ->whereIn('slug', $vipSlugs)
            ->update([
                'draw_days' => $dailyDays,
                'schedule_type' => 'daily',
                'updated_at' => now(),
            ]);
    }

    public function down(): void
    {
        // Revert to weekdays only
        $weekdaysDays = json_encode(['1', '2', '3', '4', '5']);

        $vipSlugs = [
            'nikkei-morning-vip',
            'china-morning-vip',
            'hangseng-morning-vip',
            'taiwan-vip',
            'nikkei-afternoon-vip',
            'china-afternoon-vip',
            'hangseng-afternoon-vip',
            'singapore-vip',
            'india-vip',
            'egypt-vip',
            'uk-vip',
            'germany-vip',
            'russia-vip',
            'dowjones-vip',
        ];

        DB::table('lottery_types')
            ->whereIn('slug', $vipSlugs)
            ->update([
                'draw_days' => $weekdaysDays,
                'schedule_type' => 'weekly',
                'updated_at' => now(),
            ]);
    }
};
