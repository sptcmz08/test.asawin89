<?php

use Illuminate\Database\Migrations\Migration;
use App\Models\LotteryType;

return new class extends Migration {
    public function up(): void
    {
        LotteryType::firstOrCreate(
            ['slug' => 'hanoi-redcross'],
            [
                'name' => 'หวยฮานอยกาชาด',
                'slug' => 'hanoi-redcross',
                'category' => 'lottery',
                'description' => 'หวยฮานอยกาชาด ออกทุกวัน 16:30',
                'draw_days' => json_encode(['0', '1', '2', '3', '4', '5', '6']),
                'draw_time' => '16:30',
                'close_before_minutes' => 60,
                'is_active' => true,
            ]
        );
    }

    public function down(): void
    {
        LotteryType::where('slug', 'hanoi-redcross')->delete();
    }
};
