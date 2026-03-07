<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $vipStocks = [
            // ===== หุ้นเอเชีย VIP (เช้า) =====
            [
                'name' => 'หุ้นนิเคอิเช้า VIP',
                'slug' => 'nikkei-morning-vip',
                'category' => 'stock-vip',
                'description' => 'Nikkei VIP Morning - ออก 09:05',
                'draw_days' => json_encode(['1', '2', '3', '4', '5']),
                'draw_time' => '09:05',
                'close_before_minutes' => 15,
                'is_active' => true,
            ],
            [
                'name' => 'หุ้นจีนเช้า VIP',
                'slug' => 'china-morning-vip',
                'category' => 'stock-vip',
                'description' => 'China VIP Morning - ออก 10:05',
                'draw_days' => json_encode(['1', '2', '3', '4', '5']),
                'draw_time' => '10:05',
                'close_before_minutes' => 15,
                'is_active' => true,
            ],
            [
                'name' => 'หุ้นฮั่งเส็งเช้า VIP',
                'slug' => 'hangseng-morning-vip',
                'category' => 'stock-vip',
                'description' => 'Hang Seng VIP Morning - ออก 10:35',
                'draw_days' => json_encode(['1', '2', '3', '4', '5']),
                'draw_time' => '10:35',
                'close_before_minutes' => 15,
                'is_active' => true,
            ],
            [
                'name' => 'หุ้นไต้หวัน VIP',
                'slug' => 'taiwan-vip',
                'category' => 'stock-vip',
                'description' => 'Taiwan VIP - ออก 11:35',
                'draw_days' => json_encode(['1', '2', '3', '4', '5']),
                'draw_time' => '11:35',
                'close_before_minutes' => 15,
                'is_active' => true,
            ],

            // ===== หุ้นเอเชีย VIP (บ่าย) =====
            [
                'name' => 'หุ้นนิเคอิบ่าย VIP',
                'slug' => 'nikkei-afternoon-vip',
                'category' => 'stock-vip',
                'description' => 'Nikkei VIP Afternoon - ออก 13:25',
                'draw_days' => json_encode(['1', '2', '3', '4', '5']),
                'draw_time' => '13:25',
                'close_before_minutes' => 15,
                'is_active' => true,
            ],
            [
                'name' => 'หุ้นจีนบ่าย VIP',
                'slug' => 'china-afternoon-vip',
                'category' => 'stock-vip',
                'description' => 'China VIP Afternoon - ออก 14:25',
                'draw_days' => json_encode(['1', '2', '3', '4', '5']),
                'draw_time' => '14:25',
                'close_before_minutes' => 15,
                'is_active' => true,
            ],
            [
                'name' => 'หุ้นฮั่งเส็งบ่าย VIP',
                'slug' => 'hangseng-afternoon-vip',
                'category' => 'stock-vip',
                'description' => 'Hang Seng VIP Afternoon - ออก 15:25',
                'draw_days' => json_encode(['1', '2', '3', '4', '5']),
                'draw_time' => '15:25',
                'close_before_minutes' => 15,
                'is_active' => true,
            ],

            // ===== หุ้น VIP (เย็น/ค่ำ) =====
            [
                'name' => 'หุ้นสิงคโปร์ VIP',
                'slug' => 'singapore-vip',
                'category' => 'stock-vip',
                'description' => 'Singapore VIP - ออก 17:05',
                'draw_days' => json_encode(['1', '2', '3', '4', '5']),
                'draw_time' => '17:05',
                'close_before_minutes' => 15,
                'is_active' => true,
            ],
            [
                'name' => 'หุ้นอินเดีย VIP',
                'slug' => 'india-vip',
                'category' => 'stock-vip',
                'description' => 'India VIP - ออก 17:30',
                'draw_days' => json_encode(['1', '2', '3', '4', '5']),
                'draw_time' => '17:30',
                'close_before_minutes' => 15,
                'is_active' => true,
            ],
            [
                'name' => 'หุ้นอียิปต์ VIP',
                'slug' => 'egypt-vip',
                'category' => 'stock-vip',
                'description' => 'Egypt VIP - ออก 18:40',
                'draw_days' => json_encode(['0', '1', '2', '3', '4']),
                'draw_time' => '18:40',
                'close_before_minutes' => 15,
                'is_active' => true,
            ],
            [
                'name' => 'หุ้นอังกฤษ VIP',
                'slug' => 'uk-vip',
                'category' => 'stock-vip',
                'description' => 'UK VIP - ออก 21:50',
                'draw_days' => json_encode(['1', '2', '3', '4', '5']),
                'draw_time' => '21:50',
                'close_before_minutes' => 15,
                'is_active' => true,
            ],
            [
                'name' => 'หุ้นเยอรมัน VIP',
                'slug' => 'germany-vip',
                'category' => 'stock-vip',
                'description' => 'Germany VIP - ออก 22:50',
                'draw_days' => json_encode(['1', '2', '3', '4', '5']),
                'draw_time' => '22:50',
                'close_before_minutes' => 15,
                'is_active' => true,
            ],
            [
                'name' => 'หุ้นรัสเซีย VIP',
                'slug' => 'russia-vip',
                'category' => 'stock-vip',
                'description' => 'Russia VIP - ออก 23:50',
                'draw_days' => json_encode(['1', '2', '3', '4', '5']),
                'draw_time' => '23:50',
                'close_before_minutes' => 15,
                'is_active' => true,
            ],
            [
                'name' => 'หุ้นดาวโจนส์ VIP',
                'slug' => 'dowjones-vip',
                'category' => 'stock-vip',
                'description' => 'Dow Jones VIP - ออก 00:30',
                'draw_days' => json_encode(['1', '2', '3', '4', '5']),
                'draw_time' => '00:30',
                'close_before_minutes' => 15,
                'is_active' => true,
            ],
        ];

        foreach ($vipStocks as $stock) {
            $exists = DB::table('lottery_types')->where('slug', $stock['slug'])->exists();
            if (!$exists) {
                DB::table('lottery_types')->insert(array_merge($stock, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ]));
            }
        }
    }

    public function down(): void
    {
        $slugs = [
            'nikkei-morning-vip', 'china-morning-vip', 'hangseng-morning-vip',
            'taiwan-vip', 'nikkei-afternoon-vip',
            'china-afternoon-vip', 'hangseng-afternoon-vip', 'singapore-vip',
            'india-vip', 'egypt-vip',
            'uk-vip', 'germany-vip', 'russia-vip', 'dowjones-vip',
        ];

        DB::table('lottery_types')->whereIn('slug', $slugs)->delete();
    }
};
