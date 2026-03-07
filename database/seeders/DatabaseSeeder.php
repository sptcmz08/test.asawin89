<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\LotteryType;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create Admin User
        User::updateOrCreate(
            ['username' => 'admin'],
            [
                'name' => 'Admin',
                'phone' => '0800000000',
                'email' => 'admin@smlotto.com',
                'password' => bcrypt('admin1234'),
                'credit' => 0,
                'role' => 'admin',
            ]
        );

        // Create Demo User
        User::updateOrCreate(
            ['username' => 'user'],
            [
                'name' => 'Demo User',
                'phone' => '0812345678',
                'email' => 'user@example.com',
                'password' => bcrypt('password'),
                'credit' => 50000.00,
                'role' => 'user',
            ]
        );

        // Seed Lottery Types with full details
        $types = [
            // Thai Government Lotteries
            [
                'name' => 'รัฐบาลไทย',
                'slug' => 'thai',
                'category' => 'government',
                'description' => 'หวยรัฐบาลไทย ออกวันที่ 1 และ 16 ของทุกเดือน เวลา 15:30 น. มีรางวัลที่ 1 (6 หลัก), 3 ตัวบน, 3 ตัวล่าง, 2 ตัวบน, 2 ตัวล่าง',
                'draw_days' => '1,16', // Day of month
                'draw_time' => '15:30',
                'close_before_minutes' => 60,
                'is_active' => true,
            ],
            [
                'name' => 'ธกส',
                'slug' => 'baac',
                'category' => 'government',
                'description' => 'สลากธนาคารเพื่อการเกษตร (ธกส) ออกวันที่ 1 และ 16 ของทุกเดือน เวลา 09:30 น. รางวัลที่ 1 (6 หลัก)',
                'draw_days' => '16',
                'draw_time' => '09:30',
                'close_before_minutes' => 30,
                'is_active' => true,
            ],
            [
                'name' => 'ออมสิน 1 ปี',
                'slug' => 'gsb-1',
                'category' => 'government',
                'description' => 'สลากออมสินพิเศษ 1 ปี ออกวันที่ 1 และ 16 ของทุกเดือน เวลา 10:00 น. มีรางวัลมากมาย',
                'draw_days' => '1,16',
                'draw_time' => '10:00',
                'close_before_minutes' => 30,
                'is_active' => true,
            ],
            [
                'name' => 'ออมสิน 2 ปี',
                'slug' => 'gsb-2',
                'category' => 'government',
                'description' => 'สลากออมสินพิเศษ 2 ปี ออกวันที่ 1 และ 16 ของทุกเดือน เวลา 10:00 น. มีรางวัลมากมาย',
                'draw_days' => '1,16',
                'draw_time' => '10:00',
                'close_before_minutes' => 30,
                'is_active' => true,
            ],

            // Lao Lotteries
            [
                'name' => 'ลาวพัฒนา',
                'slug' => 'lao',
                'category' => 'foreign',
                'description' => 'หวยลาวพัฒนา ออกทุกวัน จันทร์, พุธ, ศุกร์ เวลา 20:00 น. มี 6 หลัก, 3 ตัวบน, 3 ตัวล่าง, 2 ตัวบน, 2 ตัวล่าง',
                'draw_days' => 'mon,wed,fri',
                'draw_time' => '20:00',
                'close_before_minutes' => 30,
                'is_active' => true,
            ],
            [
                'name' => 'ลาวVIP',
                'slug' => 'lao-vip',
                'category' => 'foreign',
                'description' => 'หวยลาวVIP ออกทุกวัน เวลา 21:00 น. จ่ายสูงกว่าหวยลาวปกติ',
                'draw_days' => 'daily',
                'draw_time' => '21:30',
                'close_before_minutes' => 30,
                'is_active' => true,
            ],
            [
                'name' => 'ลาวสตาร์',
                'slug' => 'lao-star',
                'category' => 'foreign',
                'description' => 'หวยลาวสตาร์ ออกทุกวัน เวลา 15:30 น.',
                'draw_days' => 'daily',
                'draw_time' => '15:30',
                'close_before_minutes' => 30,
                'is_active' => true,
            ],

            // Vietnam (Hanoi) Lotteries
            [
                'name' => 'ฮานอย',
                'slug' => 'hanoi',
                'category' => 'foreign',
                'description' => 'หวยฮานอยปกติ ออกทุกวัน เวลา 18:00 น. (เวลาเวียดนาม) ผลมาจากหวยมิน Bắc ของเวียดนาม มีรางวัลพิเศษ 5+1 หลัก',
                'draw_days' => 'daily',
                'draw_time' => '18:00',
                'close_before_minutes' => 30,
                'is_active' => true,
            ],
            [
                'name' => 'ฮานอยพิเศษ',
                'slug' => 'hanoi-special',
                'category' => 'foreign',
                'description' => 'หวยฮานอยพิเศษ ออกทุกวัน เวลา 17:00 น. จ่ายสูงกว่าหวยฮานอยปกติ',
                'draw_days' => 'daily',
                'draw_time' => '17:00',
                'close_before_minutes' => 30,
                'is_active' => true,
            ],
            [
                'name' => 'ฮานอยVIP',
                'slug' => 'hanoi-vip',
                'category' => 'foreign',
                'description' => 'หวยฮานอย VIP ออกทุกวัน เวลา 19:00 น. จ่ายสูงที่สุดในหมวดหวยฮานอย',
                'draw_days' => 'daily',
                'draw_time' => '19:00',
                'close_before_minutes' => 30,
                'is_active' => true,
            ],

            // Malaysia Lottery - DISABLED
            [
                'name' => 'มาเลย์',
                'slug' => 'malay',
                'category' => 'foreign',
                'description' => 'หวยมาเลเซีย (4D) - ปิดใช้งาน',
                'draw_days' => 'wed,sat,sun',
                'draw_time' => '18:00',
                'close_before_minutes' => 30,
                'is_active' => false,
            ],
        ];

        foreach ($types as $type) {
            LotteryType::updateOrCreate(['slug' => $type['slug']], $type);
        }

        // Delete Yi Ki if exists
        LotteryType::where('slug', 'yiki')->delete();
        LotteryType::where('slug', 'gsb')->delete(); // Remove old GSB, replaced with gsb-1 and gsb-2
    }
}
