<?php

namespace Database\Seeders;

use App\Models\Bet;
use App\Models\BetSlip;
use App\Models\LotteryResult;
use App\Models\LotteryType;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class FullTestDataSeeder extends Seeder
{
    /**
     * สร้างข้อมูลทดสอบเต็มรูปแบบ:
     * - 10 users พร้อมเครดิต
     * - ฝาก/ถอนเงินทุก user
     * - แทงหวยทุกประเภท ทุกหวย
     * - ออกผลรางวัลและ settle (บางรายการถูก บางรายการไม่ถูก)
     */
    public function run(): void
    {
        $today = now()->toDateString();
        $yesterday = now()->subDay()->toDateString();

        // =============================================
        // 1. สร้าง Users 10 คน
        // =============================================
        $users = [];
        $userNames = [
            ['name' => 'สมชาย ทดสอบ', 'phone' => '0811111111', 'email' => 'somchai@test.com'],
            ['name' => 'สมหญิง ใจดี', 'phone' => '0822222222', 'email' => 'somying@test.com'],
            ['name' => 'วิชัย เศรษฐี', 'phone' => '0833333333', 'email' => 'wichai@test.com'],
            ['name' => 'มานี รักเสี่ยง', 'phone' => '0844444444', 'email' => 'manee@test.com'],
            ['name' => 'ปิยะ โชคดี', 'phone' => '0855555555', 'email' => 'piya@test.com'],
            ['name' => 'รัตนา มั่งมี', 'phone' => '0866666666', 'email' => 'rattana@test.com'],
            ['name' => 'สุวิทย์ นำโชค', 'phone' => '0877777777', 'email' => 'suwit@test.com'],
            ['name' => 'พรทิพย์ ร่ำรวย', 'phone' => '0888888888', 'email' => 'porntip@test.com'],
            ['name' => 'อนุชา พารวย', 'phone' => '0899999999', 'email' => 'anucha@test.com'],
            ['name' => 'ณัฐพล ดวงดี', 'phone' => '0800000000', 'email' => 'nattapon@test.com'],
        ];

        foreach ($userNames as $i => $data) {
            $user = User::firstOrCreate(
                ['phone' => $data['phone']],
                [
                    'name' => $data['name'],
                    'email' => $data['email'],
                    'password' => Hash::make('123456'),
                    'credit' => 0,
                    'role' => 'user',
                ]
            );
            $users[] = $user;
            $this->command->info("✅ User: {$user->name} ({$user->phone})");
        }

        // =============================================
        // 2. สร้างรายการฝาก/ถอนทุก user
        // =============================================
        $depositAmounts = [1000, 2000, 5000, 3000, 1500, 10000, 500, 8000, 4000, 2500];
        $withdrawAmounts = [500, 0, 1000, 0, 300, 2000, 0, 1500, 0, 500]; // 0 = ไม่ถอน

        foreach ($users as $i => $user) {
            $depositAmt = $depositAmounts[$i];

            // ฝากเงิน
            $user->increment('credit', $depositAmt);
            Transaction::create([
                'user_id' => $user->id,
                'type' => 'deposit',
                'amount' => $depositAmt,
                'balance_after' => $user->credit,
                'description' => 'ฝากเงินทดสอบ',
            ]);

            // ฝากอีกครั้ง (เมื่อวาน) เพื่อทดสอบรายเดือน
            $user->increment('credit', $depositAmt * 2);
            Transaction::create([
                'user_id' => $user->id,
                'type' => 'deposit',
                'amount' => $depositAmt * 2,
                'balance_after' => $user->credit,
                'description' => 'ฝากเงินทดสอบ เมื่อวาน',
                'created_at' => now()->subDay(),
            ]);

            // ถอนเงิน
            $withdrawAmt = $withdrawAmounts[$i];
            if ($withdrawAmt > 0) {
                $user->decrement('credit', $withdrawAmt);
                Transaction::create([
                    'user_id' => $user->id,
                    'type' => 'withdraw',
                    'amount' => -$withdrawAmt, // ถอนเป็นค่าลบ
                    'balance_after' => $user->credit,
                    'description' => 'ถอนเงินทดสอบ',
                ]);
            }

            $this->command->info("  💰 {$user->name}: ฝาก ฿" . number_format($depositAmt + $depositAmt * 2) . " ถอน ฿" . number_format($withdrawAmt));
        }

        // =============================================
        // 3. ดึงหวยทุกประเภท
        // =============================================
        $lotteryTypes = LotteryType::all();

        if ($lotteryTypes->isEmpty()) {
            $this->command->error('❌ ไม่พบหวยในระบบ กรุณารัน migration ก่อน');
            return;
        }

        $this->command->info("\n🎰 พบหวย {$lotteryTypes->count()} ประเภท");

        // Bet type definitions
        // bet_type_id => [name, number_digits, payout_rate]
        $betTypes = [
            1 => ['name' => '2ตัวบน', 'digits' => 2],
            2 => ['name' => '2ตัวล่าง', 'digits' => 2],
            3 => ['name' => '3ตัวโต๊ด', 'digits' => 3],
            4 => ['name' => '3ตัวบน', 'digits' => 3],
            5 => ['name' => 'วิ่งบน', 'digits' => 1],
            6 => ['name' => 'วิ่งล่าง', 'digits' => 1],
            9 => ['name' => '3ตัวล่าง', 'digits' => 3],
        ];

        // Malay lottery also has 4ตัวบน
        $malayBetTypes = $betTypes + [
            10 => ['name' => '4ตัวบน', 'digits' => 4],
        ];

        // =============================================
        // 4. สร้างผลรางวัลและบิลแทงสำหรับทุกหวย
        // =============================================
        $totalBets = 0;
        $totalWon = 0;

        foreach ($lotteryTypes as $lottery) {
            $isToday = rand(0, 1); // สุ่มว่าออกวันนี้หรือเมื่อวาน
            $drawDate = $isToday ? $today : $yesterday;

            // สร้างผลรางวัล
            $firstPrize = str_pad(rand(0, 999999), 6, '0', STR_PAD_LEFT);
            $threeTop = substr($firstPrize, -3);
            $twoTop = substr($firstPrize, -2);
            $twoBottom = str_pad(rand(0, 99), 2, '0', STR_PAD_LEFT);
            $threeBottom = str_pad(rand(0, 999), 3, '0', STR_PAD_LEFT);

            // สร้าง result
            $result = LotteryResult::updateOrCreate(
                [
                    'lottery_type_id' => $lottery->id,
                    'draw_date' => $drawDate,
                ],
                [
                    'first_prize' => $firstPrize,
                    'two_top' => $twoTop,
                    'two_bottom' => $twoBottom,
                    'three_top' => $threeTop,
                    'three_bottom' => $threeBottom,
                ]
            );

            $this->command->info("\n🎯 {$lottery->name} (วันที่ {$drawDate})");
            $this->command->info("   ผล: บน3={$threeTop} บน2={$twoTop} ล่าง2={$twoBottom} ล่าง3={$threeBottom}");

            // กำหนด bet types สำหรับหวยนี้
            $currentBetTypes = ($lottery->slug === 'malay') ? $malayBetTypes : $betTypes;

            // สร้างบิลแทงจาก users สุ่ม (3-5 คน ต่อหวย)
            $numBettors = rand(3, 5);
            $bettors = collect($users)->random($numBettors);

            foreach ($bettors as $user) {
                $slip = BetSlip::create([
                    'user_id' => $user->id,
                    'lottery_type_id' => $lottery->id,
                    'slip_name' => "โพย {$lottery->name}",
                    'draw_date' => $drawDate,
                    'total_amount' => 0,
                    'status' => 'pending',
                ]);

                $slipTotal = 0;
                $slipBetCount = 0;

                foreach ($currentBetTypes as $typeId => $betType) {
                    // สุ่ม 1-3 เลขต่อประเภท
                    $numBets = rand(1, 2);
                    for ($b = 0; $b < $numBets; $b++) {
                        $digits = $betType['digits'];
                        $maxNum = pow(10, $digits) - 1;

                        // สุ่มเลข — บางครั้งให้ตรงกับผลรางวัลเพื่อให้มีคนถูก
                        $shouldWin = rand(1, 100) <= 15; // 15% chance to pick winning number

                        if ($shouldWin) {
                            switch ($typeId) {
                                case 1: $number = $twoTop; break;
                                case 2: $number = $twoBottom; break;
                                case 3: // โต๊ด - ใช้เลข permutation ของ 3ตัวบน
                                    $chars = str_split($threeTop);
                                    shuffle($chars);
                                    $number = implode('', $chars);
                                    break;
                                case 4: $number = $threeTop; break;
                                case 5: $number = substr($threeTop, rand(0, 2), 1); break;
                                case 6: $number = substr($twoBottom, rand(0, 1), 1); break;
                                case 9: $number = $threeBottom; break;
                                case 10: $number = substr($firstPrize, -4); break;
                                default: $number = str_pad(rand(0, $maxNum), $digits, '0', STR_PAD_LEFT);
                            }
                        } else {
                            $number = str_pad(rand(0, $maxNum), $digits, '0', STR_PAD_LEFT);
                        }

                        $amount = [10, 20, 50, 100, 200, 500][rand(0, 5)];

                        // ตรวจว่ามีเครดิตพอไหม
                        if ($user->credit < $amount) {
                            continue;
                        }

                        // หักเครดิต
                        $user->decrement('credit', $amount);

                        Bet::create([
                            'bet_slip_id' => $slip->id,
                            'user_id' => $user->id,
                            'lottery_type_id' => $lottery->id,
                            'bet_type_id' => $typeId,
                            'number' => $number,
                            'amount' => $amount,
                            'draw_date' => $drawDate,
                            'status' => 'pending',
                        ]);

                        $slipTotal += $amount;
                        $slipBetCount++;
                        $totalBets++;
                    }
                }

                $slip->update(['total_amount' => $slipTotal]);
            }

            // =============================================
            // 5. Settle bets สำหรับหวยนี้
            // =============================================
            $pendingBets = Bet::where('lottery_type_id', $lottery->id)
                ->where('draw_date', $drawDate)
                ->where('status', 'pending')
                ->get();

            $wonCount = 0;

            foreach ($pendingBets as $bet) {
                $win = $this->checkWin($bet, $result);

                if ($win) {
                    $payoutRate = $this->getPayoutRate($bet->bet_type_id);
                    $winAmount = $bet->amount * $payoutRate;

                    $bet->update([
                        'status' => 'paid',
                        'win_amount' => $winAmount,
                        'payout_rate' => $payoutRate,
                    ]);

                    // เพิ่มเครดิต
                    $betUser = User::find($bet->user_id);
                    $betUser->increment('credit', $winAmount);

                    Transaction::create([
                        'user_id' => $bet->user_id,
                        'type' => 'deposit',
                        'amount' => $winAmount,
                        'balance_after' => $betUser->credit,
                        'description' => "ถูกรางวัล {$lottery->name} เลข {$bet->number}",
                    ]);

                    $wonCount++;
                    $totalWon++;
                } else {
                    $bet->update(['status' => 'lost']);
                }
            }

            // Update slip statuses
            $slips = BetSlip::where('lottery_type_id', $lottery->id)
                ->where('draw_date', $drawDate)
                ->get();
            foreach ($slips as $slip) {
                $hasPaid = $slip->bets()->where('status', 'paid')->exists();
                $slip->update(['status' => $hasPaid ? 'paid' : 'lost']);
            }

            $this->command->info("   📊 แทง {$pendingBets->count()} รายการ / ถูก {$wonCount} รายการ");
        }

        // =============================================
        // Summary
        // =============================================
        $this->command->newLine();
        $this->command->info("╔═══════════════════════════════════════╗");
        $this->command->info("║     ✅ สร้างข้อมูลทดสอบเสร็จสิ้น     ║");
        $this->command->info("╠═══════════════════════════════════════╣");
        $this->command->info("║ 👥 Users: " . count($users));
        $this->command->info("║ 🎰 หวย: {$lotteryTypes->count()} ประเภท");
        $this->command->info("║ 🎫 แทงทั้งหมด: {$totalBets} รายการ");
        $this->command->info("║ 🏆 ถูกรางวัล: {$totalWon} รายการ");
        $this->command->info("╚═══════════════════════════════════════╝");
    }

    /**
     * ตรวจว่าถูกรางวัลไหม (simplified version for seeding)
     */
    private function checkWin(Bet $bet, LotteryResult $result): bool
    {
        $betNumber = $bet->number;
        $betTypeId = (int) $bet->bet_type_id;

        $firstPrize = $result->first_prize;
        $threeTop = $result->three_top ?: ($firstPrize ? substr($firstPrize, -3) : null);
        $twoTop = $result->two_top ?: ($firstPrize ? substr($firstPrize, -2) : null);
        $twoBottom = $result->two_bottom;
        $threeBottom = $result->three_bottom;

        switch ($betTypeId) {
            case 1: return $betNumber === $twoTop;
            case 2: return $betNumber === $twoBottom;
            case 3: // 3ตัวโต๊ด
                if (!$threeTop) return false;
                $a = str_split($betNumber); $b = str_split($threeTop);
                sort($a); sort($b);
                return $a === $b;
            case 4: return $betNumber === $threeTop;
            case 5: return $threeTop && str_contains($threeTop, $betNumber);
            case 6: return $twoBottom && str_contains($twoBottom, $betNumber);
            case 9:
                if (!$threeBottom) return false;
                $values = explode(',', $threeBottom);
                return in_array($betNumber, array_map('trim', $values));
            case 10:
                return $betNumber === $firstPrize ||
                    ($firstPrize && strlen($firstPrize) > 4 && $betNumber === substr($firstPrize, -4));
            default: return false;
        }
    }

    /**
     * Get default payout rate
     */
    private function getPayoutRate(int $betTypeId): float
    {
        return match ($betTypeId) {
            1 => 90,    // 2ตัวบน
            2 => 90,    // 2ตัวล่าง
            3 => 150,   // 3ตัวโต๊ด
            4 => 900,   // 3ตัวบน
            5 => 2.4,   // วิ่งบน
            6 => 3.2,   // วิ่งล่าง
            9 => 900,   // 3ตัวล่าง
            10 => 3000, // 4ตัวบน
            default => 0,
        };
    }
}
