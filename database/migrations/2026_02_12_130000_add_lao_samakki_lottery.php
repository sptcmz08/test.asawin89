<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Add ลาวสามัคคี (Lao Samakki) lottery type
 * ออกผลทุกวัน อ/พ/ศ/ส/อา ~20:30 น.
 * แหล่งดึง: laounion.com
 */
return new class extends Migration {
    public function up(): void
    {
        $exists = DB::table('lottery_types')->where('slug', 'lao-samakki')->exists();

        if (!$exists) {
            DB::table('lottery_types')->insert([
                'name' => 'ลาวสามัคคี',
                'slug' => 'lao-samakki',
                'category' => 'foreign',
                'description' => 'หวยลาวสามัคคี ออก อ/พ/ศ/ส/อา เวลา 20:30 น.',
                'draw_days' => json_encode(['0', '2', '3', '5', '6']),
                'draw_time' => '20:30',
                'close_before_minutes' => 30,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('lottery_types')->where('slug', 'lao-samakki')->delete();
    }
};
