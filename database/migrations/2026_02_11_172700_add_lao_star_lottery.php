<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Add ลาวสตาร์ (Lao Star) lottery type
 * ออกผลทุกวัน ~15:30 น.
 * ประเภทแทง: 3ตัวบน, 2ตัวบน, 2ตัวล่าง, วิ่ง (เหมือนลาวอื่นๆ)
 */
return new class extends Migration {
    public function up(): void
    {
        // Check if already exists
        $exists = DB::table('lottery_types')->where('slug', 'lao-star')->exists();

        if (!$exists) {
            DB::table('lottery_types')->insert([
                'name' => 'ลาวสตาร์',
                'slug' => 'lao-star',
                'category' => 'foreign',
                'description' => 'หวยลาวสตาร์ ออกทุกวัน เวลา 15:30 น.',
                'draw_days' => 'daily',
                'draw_time' => '15:30',
                'close_before_minutes' => 30,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('lottery_types')->where('slug', 'lao-star')->delete();
    }
};
