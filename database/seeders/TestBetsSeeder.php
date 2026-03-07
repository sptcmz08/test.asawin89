<?php

namespace Database\Seeders;

use App\Models\Bet;
use App\Models\BetSlip;
use App\Models\LotteryType;
use App\Models\User;
use Illuminate\Database\Seeder;

class TestBetsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // หา lottery type ของหวยไทย
        $thaiLottery = LotteryType::where('slug', 'thai')->first();

        if (!$thaiLottery) {
            $this->command->error('ไม่พบหวยไทยในระบบ');
            return;
        }

        // หา user ที่มีอยู่หรือสร้างใหม่
        $user = User::first();

        if (!$user) {
            $this->command->error('ไม่พบ user ในระบบ');
            return;
        }

        // กำหนดวันที่ออกรางวัล (1 กุมภาพันธ์ 2569)
        $drawDate = '2026-02-01';

        // สร้าง Bet Slip
        $slip = BetSlip::create([
            'user_id' => $user->id,
            'lottery_type_id' => $thaiLottery->id,
            'slip_name' => 'โพยทดสอบ หวยไทย',
            'draw_date' => $drawDate,
            'total_amount' => 1200, // จะคำนวณใหม่
            'status' => 'pending',
        ]);

        // รายการแทงทดสอบ
        $testBets = [
            // 3 ตัวบน (bet_type_id = 4)
            ['type_id' => 4, 'number' => '123', 'amount' => 100],
            ['type_id' => 4, 'number' => '456', 'amount' => 50],
            ['type_id' => 4, 'number' => '789', 'amount' => 50],

            // 3 ตัวโต๊ด (bet_type_id = 3)
            ['type_id' => 3, 'number' => '123', 'amount' => 100],
            ['type_id' => 3, 'number' => '555', 'amount' => 50],

            // 2 ตัวบน (bet_type_id = 1)
            ['type_id' => 1, 'number' => '23', 'amount' => 100],
            ['type_id' => 1, 'number' => '56', 'amount' => 100],
            ['type_id' => 1, 'number' => '89', 'amount' => 50],
            ['type_id' => 1, 'number' => '00', 'amount' => 50],

            // 2 ตัวล่าง (bet_type_id = 2)
            ['type_id' => 2, 'number' => '23', 'amount' => 100],
            ['type_id' => 2, 'number' => '45', 'amount' => 100],
            ['type_id' => 2, 'number' => '67', 'amount' => 50],

            // 3 ตัวล่าง (bet_type_id = 9)
            ['type_id' => 9, 'number' => '234', 'amount' => 100],
            ['type_id' => 9, 'number' => '567', 'amount' => 100],
        ];

        $totalAmount = 0;

        foreach ($testBets as $betData) {
            Bet::create([
                'bet_slip_id' => $slip->id,
                'user_id' => $user->id,
                'lottery_type_id' => $thaiLottery->id,
                'bet_type_id' => $betData['type_id'],
                'number' => $betData['number'],
                'amount' => $betData['amount'],
                'draw_date' => $drawDate,
                'status' => 'pending',
            ]);
            $totalAmount += $betData['amount'];
        }

        // อัพเดท total amount
        $slip->update(['total_amount' => $totalAmount]);

        $this->command->info("สร้าง {$slip->slip_name} สำเร็จ!");
        $this->command->info("จำนวน " . count($testBets) . " รายการ ยอดรวม ฿{$totalAmount}");
        $this->command->info("วันออกรางวัล: {$drawDate}");
    }
}
