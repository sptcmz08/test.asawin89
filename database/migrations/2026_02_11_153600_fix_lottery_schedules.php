<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Fix lottery schedule discrepancies based on verified real-world data
 * 
 * 1. อียิปต์: draw_days อา-พฤ → จ-พฤ (ตลาดอียิปต์ไม่เปิดวันอาทิตย์)
 * 2. ฮานอยเฉพาะกิจ: draw_time 18:30 → 16:30 (ออกจริง 16:00-16:30)
 * 3. ลาว VIP: draw_time 21:00 → 21:30
 * 4. ธ.ก.ส.: draw_days 1,16 → 16 เท่านั้น (ม.ค. = 17)
 * 5. นิเคอิ บ่าย: draw_time 13:50 → 13:00 (ตลาดปิด 13:00 เวลาไทย)
 */
return new class extends Migration {
    public function up(): void
    {
        // 1. อียิปต์: จ-พฤ (ไม่มีวันอาทิตย์ - ตลาดอียิปต์หยุดศุกร์+เสาร์)
        DB::table('lottery_types')->where('slug', 'egypt')
            ->update([
                'draw_days' => json_encode(['1', '2', '3', '4']),
            ]);

        // 2. ฮานอยเฉพาะกิจ: ออกจริง 16:30 น. ไม่ใช่ 18:30
        DB::table('lottery_types')->where('slug', 'hanoi-adhoc')
            ->update([
                'draw_time' => '16:30',
                'close_before_minutes' => 15,
            ]);

        // 3. ลาว VIP: ออกจริง 21:30 น.
        DB::table('lottery_types')->where('slug', 'lao-vip')
            ->update([
                'draw_time' => '21:30',
                'close_before_minutes' => 30,
            ]);

        // 4. ธ.ก.ส.: ออกวันที่ 16 เท่านั้น (ไม่มีวันที่ 1)
        DB::table('lottery_types')->where('slug', 'baac')
            ->update([
                'draw_days' => json_encode(['16']),
            ]);

        // 5. นิเคอิ บ่าย: ตลาดปิด 13:00 (เวลาไทย)
        DB::table('lottery_types')->where('slug', 'nikkei-afternoon')
            ->update([
                'draw_time' => '13:00',
                'close_before_minutes' => 30,
            ]);
    }

    public function down(): void
    {
        DB::table('lottery_types')->where('slug', 'egypt')
            ->update(['draw_days' => json_encode(['0', '1', '2', '3', '4'])]);

        DB::table('lottery_types')->where('slug', 'hanoi-adhoc')
            ->update(['draw_time' => '18:30', 'close_before_minutes' => 15]);

        DB::table('lottery_types')->where('slug', 'lao-vip')
            ->update(['draw_time' => '21:00', 'close_before_minutes' => 30]);

        DB::table('lottery_types')->where('slug', 'baac')
            ->update(['draw_days' => json_encode(['1', '16'])]);

        DB::table('lottery_types')->where('slug', 'nikkei-afternoon')
            ->update(['draw_time' => '13:50', 'close_before_minutes' => 60]);
    }
};
