<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use App\Models\LotteryType;

/**
 * Comprehensive update of ALL lottery schedules
 * Based on user-confirmed exact times
 */
return new class extends Migration {
    public function up(): void
    {
        // ===== หุ้นเอเชีย =====

        // นิเคอิ เช้า: ปิด 09:20, ออก 09:30 (close_before = 10)
        DB::table('lottery_types')->where('slug', 'nikkei-morning')
            ->update(['draw_time' => '09:30', 'close_before_minutes' => 10]);

        // จีน เช้า: ปิด 10:00, ออก 10:30 (close_before = 30)
        DB::table('lottery_types')->where('slug', 'china-morning')
            ->update(['draw_time' => '10:30', 'close_before_minutes' => 30]);

        // ฮั่งเส็ง เช้า: ปิด 10:50, ออก 11:10 (close_before = 20)
        DB::table('lottery_types')->where('slug', 'hangseng-morning')
            ->update(['draw_time' => '11:10', 'close_before_minutes' => 20]);

        // ไต้หวัน: ปิด 12:00, ออก 12:35 (close_before = 35)
        DB::table('lottery_types')->where('slug', 'taiwan')
            ->update(['draw_time' => '12:35', 'close_before_minutes' => 35]);

        // เกาหลี: ปิด 12:40, ออก 13:00 (close_before = 20)
        DB::table('lottery_types')->where('slug', 'korea')
            ->update(['draw_time' => '13:00', 'close_before_minutes' => 20]);

        // นิเคอิ บ่าย: ปิด 12:50, ออก 13:50 (close_before = 60)
        DB::table('lottery_types')->where('slug', 'nikkei-afternoon')
            ->update(['draw_time' => '13:50', 'close_before_minutes' => 60]);

        // จีน บ่าย: ปิด 13:30, ออก 14:00 (close_before = 30)
        DB::table('lottery_types')->where('slug', 'china-afternoon')
            ->update(['draw_time' => '14:00', 'close_before_minutes' => 30]);

        // ฮั่งเส็ง บ่าย: ปิด 14:50, ออก 15:10 (close_before = 20)
        DB::table('lottery_types')->where('slug', 'hangseng-afternoon')
            ->update(['draw_time' => '15:10', 'close_before_minutes' => 20]);

        // สิงคโปร์: ปิด 15:50, ออก 16:15 (close_before = 25)
        DB::table('lottery_types')->where('slug', 'singapore')
            ->update(['draw_time' => '16:15', 'close_before_minutes' => 25]);

        // ===== หุ้นไทย - แยกเป็น เช้า/เย็น =====

        // หุ้นไทย (เช้า) - สร้างใหม่: ปิด 12:00, ออก 12:30 (close_before = 30)
        LotteryType::firstOrCreate(
            ['slug' => 'thai-stock-morning'],
            [
                'name' => 'หุ้นไทย (เช้า)',
                'slug' => 'thai-stock-morning',
                'category' => 'stock',
                'description' => 'หุ้นไทย SET รอบเช้า',
                'draw_days' => json_encode(['1', '2', '3', '4', '5']),
                'draw_time' => '12:30',
                'close_before_minutes' => 30,
                'is_active' => true,
            ]
        );

        // หุ้นไทย (เย็น) - เปลี่ยนชื่อ: ปิด 16:20, ออก 16:50 (close_before = 30)
        DB::table('lottery_types')->where('slug', 'thai-stock')
            ->update([
                'name' => 'หุ้นไทย (เย็น)',
                'draw_time' => '16:50',
                'close_before_minutes' => 30,
            ]);

        // ===== หุ้นอื่นๆ =====

        // อินเดีย: ปิด 16:40, ออก 17:30 (close_before = 50)
        DB::table('lottery_types')->where('slug', 'india')
            ->update(['draw_time' => '17:30', 'close_before_minutes' => 50]);

        // อียิปต์: ปิด 18:00, ออก 20:00 (close_before = 120), อา.-พฤ.
        DB::table('lottery_types')->where('slug', 'egypt')
            ->update([
                'draw_time' => '20:00',
                'close_before_minutes' => 120,
                'draw_days' => json_encode(['0', '1', '2', '3', '4']),
            ]);

        // รัสเซีย: ปิด 22:00, ออก 22:50 (close_before = 50)
        DB::table('lottery_types')->where('slug', 'russia')
            ->update(['draw_time' => '22:50', 'close_before_minutes' => 50]);

        // อังกฤษ: ปิด 22:00, ออก 23:50 (close_before = 110)
        DB::table('lottery_types')->where('slug', 'uk')
            ->update(['draw_time' => '23:50', 'close_before_minutes' => 110]);

        // เยอรมัน: ปิด 22:00, ออก 23:50 (close_before = 110)
        DB::table('lottery_types')->where('slug', 'germany')
            ->update(['draw_time' => '23:50', 'close_before_minutes' => 110]);

        // ดาวโจนส์: ปิด 01:00, ออก 04:10 (close_before = 190)
        DB::table('lottery_types')->where('slug', 'dowjones')
            ->update(['draw_time' => '04:10', 'close_before_minutes' => 190]);

        // ===== หวยมาเลย์ =====
        // ปิด 18:00, ออก 18:30 (close_before = 30)
        DB::table('lottery_types')->where('slug', 'malay')
            ->update(['draw_time' => '18:30', 'close_before_minutes' => 30]);

        // ===== หวยออมสิน =====

        // ออมสิน 1 ปี: วันที่ 16, ปิด 10:00, ออก 10:30
        LotteryType::updateOrCreate(
            ['slug' => 'gsb-1'],
            [
                'name' => 'หวยออมสิน 1 ปี',
                'slug' => 'gsb-1',
                'category' => 'lottery',
                'description' => 'สลากออมสินพิเศษ 1 ปี',
                'draw_days' => json_encode(['16']),
                'draw_time' => '10:30',
                'close_before_minutes' => 30,
                'is_active' => true,
            ]
        );

        // ออมสิน 2 ปี: วันที่ 1, ปิด 10:00, ออก 10:30
        LotteryType::updateOrCreate(
            ['slug' => 'gsb-2'],
            [
                'name' => 'หวยออมสิน 2 ปี',
                'slug' => 'gsb-2',
                'category' => 'lottery',
                'description' => 'สลากออมสินพิเศษ 2 ปี',
                'draw_days' => json_encode(['1']),
                'draw_time' => '10:30',
                'close_before_minutes' => 30,
                'is_active' => true,
            ]
        );
    }

    public function down(): void
    {
        // Remove thai-stock-morning
        DB::table('lottery_types')->where('slug', 'thai-stock-morning')->delete();

        // Revert thai-stock name
        DB::table('lottery_types')->where('slug', 'thai-stock')
            ->update(['name' => 'หุ้นไทย', 'draw_time' => '16:30', 'close_before_minutes' => 5]);
    }
};
