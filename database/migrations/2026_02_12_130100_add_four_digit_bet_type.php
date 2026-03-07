<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use App\Models\LotteryType;

/**
 * เพิ่ม "4ตัวตรง" bet_type + lottery_types สำหรับชุด 4 ตัว
 * - bet_type_id = 10, name = "4ตัวตรง"
 * - lottery_types: hanoi-set4, lao-set4
 */
return new class extends Migration {
    public function up(): void
    {
        // 1. เพิ่ม 4ตัวตรง ใน payout_rates
        $exists = DB::table('payout_rates')->where('bet_type_id', 10)->exists();
        if (!$exists) {
            DB::table('payout_rates')->insert([
                'bet_type_id' => 10,
                'name' => '4ตัวตรง',
                'payout_rate' => 5000, // Default — admin ปรับเองทีหลัง
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 2. เพิ่ม lottery_types สำหรับชุด 4 ตัว
        $set4Types = [
            [
                'name' => 'ฮานอย ชุด 4 ตัว',
                'slug' => 'hanoi-set4',
                'category' => 'lottery',
                'description' => 'หวยฮานอยปกติ ชุด 4 ตัว — แทง 4 ตัวตรง',
                'draw_days' => json_encode(['0', '1', '2', '3', '4', '5', '6']),
                'draw_time' => '18:30',
                'close_before_minutes' => 15,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'ลาวพัฒนา ชุด 4 ตัว',
                'slug' => 'lao-set4',
                'category' => 'lottery',
                'description' => 'หวยลาวพัฒนา ชุด 4 ตัว — แทง 4 ตัวตรง',
                'draw_days' => json_encode(['1', '3', '5']),
                'draw_time' => '20:30',
                'close_before_minutes' => 30,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        foreach ($set4Types as $type) {
            $slugExists = DB::table('lottery_types')->where('slug', $type['slug'])->exists();
            if (!$slugExists) {
                DB::table('lottery_types')->insert($type);
            }
        }
    }

    public function down(): void
    {
        DB::table('payout_rates')->where('bet_type_id', 10)->delete();
        DB::table('lottery_types')->whereIn('slug', ['hanoi-set4', 'lao-set4'])->delete();
    }
};
