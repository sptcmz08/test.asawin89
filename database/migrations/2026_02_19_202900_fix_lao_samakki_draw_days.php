<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Fix หวยลาวสามัคคี draw_days
 * ออกผลทุกวัน 20:30 น. (ยืนยันจาก public-api.laounion.com)
 * เดิมตั้งไว้แค่ อา/อ/พ/ศ/ส — ขาด จ และ พฤ
 */
return new class extends Migration {
    public function up(): void
    {
        DB::table('lottery_types')
            ->where('slug', 'lao-samakki')
            ->update([
                'draw_days' => json_encode(['0', '1', '2', '3', '4', '5', '6']),
            ]);
    }

    public function down(): void
    {
        DB::table('lottery_types')
            ->where('slug', 'lao-samakki')
            ->update([
                'draw_days' => json_encode(['0', '2', '3', '5', '6']),
            ]);
    }
};
