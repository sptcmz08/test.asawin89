<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('lottery_types', function (Blueprint $table) {
            if (!Schema::hasColumn('lottery_types', 'open_time')) {
                $table->string('open_time', 5)->nullable()->after('draw_time');
            }
            if (!Schema::hasColumn('lottery_types', 'close_time')) {
                $table->string('close_time', 5)->nullable()->after('open_time');
            }
        });

        // ===== หุ้นปกติ: เปิด 01:00, ปิดตามเดิม =====
        $stocks = [
            'nikkei-morning' => ['open' => '01:00', 'close' => '09:20'],
            'china-morning' => ['open' => '01:00', 'close' => '10:00'],
            'hangseng-morning' => ['open' => '01:00', 'close' => '10:50'],
            'taiwan' => ['open' => '01:00', 'close' => '12:00'],
            'thai-stock-morning' => ['open' => '01:00', 'close' => '12:00'],
            'korea' => ['open' => '01:00', 'close' => '12:40'],
            'nikkei-afternoon' => ['open' => '01:00', 'close' => '12:30'],
            'china-afternoon' => ['open' => '01:00', 'close' => '13:30'],
            'hangseng-afternoon' => ['open' => '01:00', 'close' => '14:50'],
            'singapore' => ['open' => '01:00', 'close' => '15:50'],
            'thai-stock' => ['open' => '01:00', 'close' => '16:20'],
            'india' => ['open' => '01:00', 'close' => '16:40'],
            'egypt' => ['open' => '01:00', 'close' => '18:00'],
            'russia' => ['open' => '01:00', 'close' => '22:00'],
            'uk' => ['open' => '01:00', 'close' => '22:00'],
            'germany' => ['open' => '01:00', 'close' => '22:00'],
            'dowjones' => ['open' => '01:00', 'close' => '01:00'],
        ];

        // ===== หุ้น VIP: เปิด 01:00, ปิดตามเดิม =====
        $stockVips = [
            'nikkei-morning-vip' => ['open' => '01:00', 'close' => '08:50'],
            'china-morning-vip' => ['open' => '01:00', 'close' => '09:50'],
            'hangseng-morning-vip' => ['open' => '01:00', 'close' => '10:20'],
            'taiwan-vip' => ['open' => '01:00', 'close' => '11:20'],
            'nikkei-afternoon-vip' => ['open' => '01:00', 'close' => '13:10'],
            'china-afternoon-vip' => ['open' => '01:00', 'close' => '14:10'],
            'hangseng-afternoon-vip' => ['open' => '01:00', 'close' => '15:10'],
            'singapore-vip' => ['open' => '01:00', 'close' => '16:50'],
            'india-vip' => ['open' => '01:00', 'close' => '17:15'],
            'egypt-vip' => ['open' => '01:00', 'close' => '18:25'],
            'uk-vip' => ['open' => '01:00', 'close' => '21:35'],
            'germany-vip' => ['open' => '01:00', 'close' => '22:35'],
            'russia-vip' => ['open' => '01:00', 'close' => '23:35'],
            'dowjones-vip' => ['open' => '01:00', 'close' => '00:15'],
        ];

        // ===== หวยฮานอย/ลาว (daily): เปิด = ออกผล + 1 ชม. =====
        $dailyLotteries = [
            'hanoi' => ['open' => '19:00', 'close' => '17:30'],  // draw 18:00
            'hanoi-special' => ['open' => '18:00', 'close' => '16:30'],  // draw 17:00
            'hanoi-vip' => ['open' => '20:00', 'close' => '18:30'],  // draw 19:00
            'hanoi-adhoc' => ['open' => '17:30', 'close' => '16:15'],  // draw 16:30
            'hanoi-redcross' => ['open' => '17:30', 'close' => '15:30'],  // draw 16:30
            'lao-vip' => ['open' => '22:30', 'close' => '21:00'],  // draw 21:30
            'lao-star' => ['open' => '16:30', 'close' => '15:00'],  // draw 15:30
        ];

        // ===== หวยลาว (weekly): เปิด = ออกผล + 1 ชม. =====
        $weeklyLotteries = [
            'lao' => ['open' => '21:00', 'close' => '19:30'],  // draw 20:00
            'lao-samakki' => ['open' => '21:30', 'close' => '20:00'],  // draw 20:30
            'malay' => ['open' => '19:30', 'close' => '18:00'],  // draw 18:30
        ];

        // ===== หวยรัฐ (monthly): เปิด 12:00 (วันถัดไปหลังออก) =====
        $monthlyLotteries = [
            'thai' => ['open' => '12:00', 'close' => '14:30'],  // draw 15:30
            'baac' => ['open' => '12:00', 'close' => '14:00'],  // draw 14:30
            'gsb-1' => ['open' => '12:00', 'close' => '10:00'],  // draw 10:30
            'gsb-2' => ['open' => '12:00', 'close' => '10:00'],  // draw 10:30
        ];

        // Apply all updates
        $allUpdates = array_merge($stocks, $stockVips, $dailyLotteries, $weeklyLotteries, $monthlyLotteries);
        foreach ($allUpdates as $slug => $times) {
            DB::table('lottery_types')->where('slug', $slug)->update([
                'open_time' => $times['open'],
                'close_time' => $times['close'],
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('lottery_types', function (Blueprint $table) {
            if (Schema::hasColumn('lottery_types', 'open_time')) {
                $table->dropColumn('open_time');
            }
            if (Schema::hasColumn('lottery_types', 'close_time')) {
                $table->dropColumn('close_time');
            }
        });
    }
};
