<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Bet;
use App\Models\BetSlip;
use App\Models\LotteryResult;
use App\Models\Transaction;
use Illuminate\Support\Facades\DB;

class CleanTestData extends Command
{
    protected $signature = 'data:clean-test {--force : Skip confirmation}';
    protected $description = 'ลบข้อมูลทดสอบทั้งหมด (users ทดสอบ, bets, results สุ่ม)';

    public function handle()
    {
        if (!$this->option('force')) {
            if (!$this->confirm('⚠️ จะลบข้อมูลทดสอบทั้งหมด (users ทดสอบ, bets, lottery results) ยืนยันหรือไม่?')) {
                $this->info('ยกเลิก');
                return 0;
            }
        }

        $this->info('🧹 เริ่มลบข้อมูลทดสอบ...');

        DB::beginTransaction();
        try {
            // 1. ลบ test users (phone 081-089) และข้อมูลที่เกี่ยวข้อง
            $testPhones = [
                '0811111111', '0822222222', '0833333333', '0844444444', '0855555555',
                '0866666666', '0877777777', '0888888888', '0899999999', '0800000000',
            ];
            
            $testUsers = User::whereIn('phone', $testPhones)->where('role', '!=', 'admin')->get();
            $testUserIds = $testUsers->pluck('id')->toArray();
            
            if (!empty($testUserIds)) {
                // ลบ bets ของ test users
                $betCount = Bet::whereHas('slip', function ($q) use ($testUserIds) {
                    $q->whereIn('user_id', $testUserIds);
                })->count();
                Bet::whereHas('slip', function ($q) use ($testUserIds) {
                    $q->whereIn('user_id', $testUserIds);
                })->delete();
                
                // ลบ bet_slips ของ test users
                $slipCount = BetSlip::whereIn('user_id', $testUserIds)->count();
                BetSlip::whereIn('user_id', $testUserIds)->delete();
                
                // ลบ transactions ของ test users
                $txCount = Transaction::whereIn('user_id', $testUserIds)->count();
                Transaction::whereIn('user_id', $testUserIds)->delete();
                
                // ลบ test users
                User::whereIn('id', $testUserIds)->delete();
                
                $this->info("  ✅ ลบ users ทดสอบ: {$testUsers->count()} คน");
                $this->info("  ✅ ลบ bet slips: {$slipCount} รายการ");
                $this->info("  ✅ ลบ bets: {$betCount} รายการ");
                $this->info("  ✅ ลบ transactions: {$txCount} รายการ");
            } else {
                $this->info("  📦 ไม่พบ test users");
            }

            // 2. ลบผลรางวัลทั้งหมด (จะดึงผลจริงใหม่)
            $resultCount = LotteryResult::count();
            LotteryResult::query()->delete();
            $this->info("  ✅ ลบผลรางวัล: {$resultCount} รายการ");

            // 3. Reset bets ที่เหลือ (ของ demo user) เป็น pending เนื่องจากผลรางวัลถูกลบ
            $resetCount = Bet::where('status', '!=', 'pending')->update([
                'status' => 'pending',
                'payout_amount' => 0,
            ]);
            if ($resetCount > 0) {
                $this->info("  ✅ Reset bets เป็น pending: {$resetCount} รายการ");
            }

            // Reset bet slips status
            BetSlip::where('status', '!=', 'pending')->update(['status' => 'pending']);

            DB::commit();
            $this->info("\n🎉 ลบข้อมูลทดสอบเรียบร้อย!");
            $this->info("💡 รัน 'php artisan lottery:manycai --all --count=20' เพื่อดึงผลรางวัลจริงย้อนหลัง");
            
            return 0;
        } catch (\Exception $e) {
            DB::rollBack();
            $this->error('❌ Error: ' . $e->getMessage());
            return 1;
        }
    }
}
