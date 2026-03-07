<?php

use Illuminate\Database\Migrations\Migration;
use App\Models\LotteryType;

return new class extends Migration {
    public function up(): void
    {
        // Original lotteries that might be missing
        $originalLotteries = [
            [
                'name' => 'หวยรัฐบาล',
                'slug' => 'thai',
                'category' => 'lottery',
                'description' => 'หวยรัฐบาลไทย งวด 1 และ 16',
                'draw_days' => json_encode(['1', '16']),
                'draw_time' => '16:30',
                'close_before_minutes' => 60,
                'is_active' => true,
            ],
            [
                'name' => 'หวยลาว',
                'slug' => 'lao',
                'category' => 'lottery',
                'description' => 'หวยลาวพัฒนา จ/พ/ศ',
                'draw_days' => json_encode(['1', '3', '5']),
                'draw_time' => '20:30',
                'close_before_minutes' => 30,
                'is_active' => true,
            ],
            [
                'name' => 'หวยลาว VIP',
                'slug' => 'lao-vip',
                'category' => 'lottery',
                'description' => 'หวยลาว VIP ทุกวัน',
                'draw_days' => json_encode(['0', '1', '2', '3', '4', '5', '6']),
                'draw_time' => '21:00',
                'close_before_minutes' => 60,
                'is_active' => true,
            ],
            [
                'name' => 'หวยฮานอย',
                'slug' => 'hanoi',
                'category' => 'lottery',
                'description' => 'หวยฮานอย ทุกวัน',
                'draw_days' => json_encode(['0', '1', '2', '3', '4', '5', '6']),
                'draw_time' => '18:30',
                'close_before_minutes' => 60,
                'is_active' => true,
            ],
            [
                'name' => 'หวยฮานอย VIP',
                'slug' => 'hanoi-vip',
                'category' => 'lottery',
                'description' => 'หวยฮานอย VIP ทุกวัน',
                'draw_days' => json_encode(['0', '1', '2', '3', '4', '5', '6']),
                'draw_time' => '19:30',
                'close_before_minutes' => 60,
                'is_active' => true,
            ],
            [
                'name' => 'หวยฮานอยพิเศษ',
                'slug' => 'hanoi-special',
                'category' => 'lottery',
                'description' => 'หวยฮานอยพิเศษ ทุกวัน',
                'draw_days' => json_encode(['0', '1', '2', '3', '4', '5', '6']),
                'draw_time' => '17:30',
                'close_before_minutes' => 60,
                'is_active' => true,
            ],
        ];

        foreach ($originalLotteries as $lottery) {
            LotteryType::updateOrCreate(
                ['slug' => $lottery['slug']],
                $lottery
            );
        }
    }

    public function down(): void
    {
        // Do nothing on rollback
    }
};
