<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\LotteryType;

return new class extends Migration {
    public function up(): void
    {
        $lotteries = [
            // ===== หวย (lottery) =====
            [
                'name' => 'สลากออมทรัพย์ ธ.ก.ส.',
                'slug' => 'baac',
                'category' => 'lottery',
                'description' => 'สลากออมทรัพย์ธนาคารเพื่อการเกษตร',
                'draw_days' => json_encode(['1', '16']),
                'draw_time' => '14:30',
                'close_before_minutes' => 30,
                'is_active' => true,
            ],
            [
                'name' => 'หวยมาเลย์',
                'slug' => 'malay',
                'category' => 'lottery',
                'description' => 'หวยมาเลเซีย',
                'draw_days' => json_encode(['3', '6', '0']),
                'draw_time' => '19:00',
                'close_before_minutes' => 30,
                'is_active' => true,
            ],
            [
                'name' => 'ฮานอยเฉพาะกิจ',
                'slug' => 'hanoi-adhoc',
                'category' => 'lottery',
                'description' => 'หวยฮานอยเฉพาะกิจ',
                'draw_days' => json_encode(['1', '2', '3', '4', '5', '6', '0']),
                'draw_time' => '18:30',
                'close_before_minutes' => 15,
                'is_active' => true,
            ],

            // ===== หวยหุ้น (stock) =====
            [
                'name' => 'หุ้นฮั่งเส็ง เช้า',
                'slug' => 'hangseng-morning',
                'category' => 'stock',
                'description' => 'หุ้นฮ่องกง รอบเช้า',
                'draw_days' => json_encode(['1', '2', '3', '4', '5']),
                'draw_time' => '12:00',
                'close_before_minutes' => 5,
                'is_active' => true,
            ],
            [
                'name' => 'หุ้นฮั่งเส็ง บ่าย',
                'slug' => 'hangseng-afternoon',
                'category' => 'stock',
                'description' => 'หุ้นฮ่องกง รอบบ่าย',
                'draw_days' => json_encode(['1', '2', '3', '4', '5']),
                'draw_time' => '16:00',
                'close_before_minutes' => 5,
                'is_active' => true,
            ],
            [
                'name' => 'หุ้นไต้หวัน',
                'slug' => 'taiwan',
                'category' => 'stock',
                'description' => 'หุ้นไต้หวัน',
                'draw_days' => json_encode(['1', '2', '3', '4', '5']),
                'draw_time' => '14:00',
                'close_before_minutes' => 5,
                'is_active' => true,
            ],
            [
                'name' => 'นิเคอิ เช้า',
                'slug' => 'nikkei-morning',
                'category' => 'stock',
                'description' => 'หุ้นญี่ปุ่น รอบเช้า',
                'draw_days' => json_encode(['1', '2', '3', '4', '5']),
                'draw_time' => '11:00',
                'close_before_minutes' => 5,
                'is_active' => true,
            ],
            [
                'name' => 'นิเคอิ บ่าย',
                'slug' => 'nikkei-afternoon',
                'category' => 'stock',
                'description' => 'หุ้นญี่ปุ่น รอบบ่าย',
                'draw_days' => json_encode(['1', '2', '3', '4', '5']),
                'draw_time' => '15:00',
                'close_before_minutes' => 5,
                'is_active' => true,
            ],
            [
                'name' => 'หุ้นเกาหลี',
                'slug' => 'korea',
                'category' => 'stock',
                'description' => 'หุ้นเกาหลีใต้',
                'draw_days' => json_encode(['1', '2', '3', '4', '5']),
                'draw_time' => '15:30',
                'close_before_minutes' => 5,
                'is_active' => true,
            ],
            [
                'name' => 'หุ้นจีน เช้า',
                'slug' => 'china-morning',
                'category' => 'stock',
                'description' => 'หุ้นจีน รอบเช้า',
                'draw_days' => json_encode(['1', '2', '3', '4', '5']),
                'draw_time' => '11:30',
                'close_before_minutes' => 5,
                'is_active' => true,
            ],
            [
                'name' => 'หุ้นจีน บ่าย',
                'slug' => 'china-afternoon',
                'category' => 'stock',
                'description' => 'หุ้นจีน รอบบ่าย',
                'draw_days' => json_encode(['1', '2', '3', '4', '5']),
                'draw_time' => '15:00',
                'close_before_minutes' => 5,
                'is_active' => true,
            ],
            [
                'name' => 'หุ้นสิงคโปร์',
                'slug' => 'singapore',
                'category' => 'stock',
                'description' => 'หุ้นสิงคโปร์',
                'draw_days' => json_encode(['1', '2', '3', '4', '5']),
                'draw_time' => '17:00',
                'close_before_minutes' => 5,
                'is_active' => true,
            ],
            [
                'name' => 'หุ้นไทย',
                'slug' => 'thai-stock',
                'category' => 'stock',
                'description' => 'หุ้นไทย SET',
                'draw_days' => json_encode(['1', '2', '3', '4', '5']),
                'draw_time' => '16:30',
                'close_before_minutes' => 5,
                'is_active' => true,
            ],
            [
                'name' => 'หุ้นอินเดีย',
                'slug' => 'india',
                'category' => 'stock',
                'description' => 'หุ้นอินเดีย Sensex',
                'draw_days' => json_encode(['1', '2', '3', '4', '5']),
                'draw_time' => '18:00',
                'close_before_minutes' => 5,
                'is_active' => true,
            ],
            [
                'name' => 'หุ้นอียิปต์',
                'slug' => 'egypt',
                'category' => 'stock',
                'description' => 'หุ้นอียิปต์',
                'draw_days' => json_encode(['0', '1', '2', '3', '4']),
                'draw_time' => '19:00',
                'close_before_minutes' => 5,
                'is_active' => true,
            ],
            [
                'name' => 'หุ้นรัสเซีย',
                'slug' => 'russia',
                'category' => 'stock',
                'description' => 'หุ้นรัสเซีย',
                'draw_days' => json_encode(['1', '2', '3', '4', '5']),
                'draw_time' => '21:00',
                'close_before_minutes' => 5,
                'is_active' => true,
            ],
            [
                'name' => 'หุ้นเยอรมัน',
                'slug' => 'germany',
                'category' => 'stock',
                'description' => 'หุ้นเยอรมัน DAX',
                'draw_days' => json_encode(['1', '2', '3', '4', '5']),
                'draw_time' => '22:00',
                'close_before_minutes' => 5,
                'is_active' => true,
            ],
            [
                'name' => 'หุ้นอังกฤษ',
                'slug' => 'uk',
                'category' => 'stock',
                'description' => 'หุ้นอังกฤษ FTSE',
                'draw_days' => json_encode(['1', '2', '3', '4', '5']),
                'draw_time' => '22:30',
                'close_before_minutes' => 5,
                'is_active' => true,
            ],
            [
                'name' => 'หุ้นดาวโจนส์',
                'slug' => 'dowjones',
                'category' => 'stock',
                'description' => 'หุ้นอเมริกา Dow Jones',
                'draw_days' => json_encode(['1', '2', '3', '4', '5']),
                'draw_time' => '01:00',
                'close_before_minutes' => 5,
                'is_active' => true,
            ],
        ];

        foreach ($lotteries as $lottery) {
            LotteryType::firstOrCreate(
                ['slug' => $lottery['slug']],
                $lottery
            );
        }

        // Update existing lottery categories
        LotteryType::where('slug', 'thai')->update(['category' => 'lottery']);
        LotteryType::where('slug', 'lao')->update(['category' => 'lottery']);
        LotteryType::where('slug', 'lao-vip')->update(['category' => 'lottery']);
        LotteryType::where('slug', 'hanoi')->update(['category' => 'lottery']);
        LotteryType::where('slug', 'hanoi-vip')->update(['category' => 'lottery']);
        LotteryType::where('slug', 'hanoi-special')->update(['category' => 'lottery']);
    }

    public function down(): void
    {
        $slugs = [
            'baac',
            'malay',
            'hanoi-adhoc',
            'hangseng-morning',
            'hangseng-afternoon',
            'taiwan',
            'nikkei-morning',
            'nikkei-afternoon',
            'korea',
            'china-morning',
            'china-afternoon',
            'singapore',
            'thai-stock',
            'india',
            'egypt',
            'russia',
            'germany',
            'uk',
            'dowjones'
        ];

        LotteryType::whereIn('slug', $slugs)->delete();
    }
};
