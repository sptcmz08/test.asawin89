<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\AdminLog;
use App\Models\Bet;
use App\Models\BetSlip;
use App\Models\LotteryResult;
use App\Models\LotteryType;
use App\Models\ScraperLog;
use App\Models\Transaction;
use App\Models\User;
use Carbon\Carbon;

/**
 * AutoVoidExpiredBets
 *
 * ตรวจสอบ bets ที่ยัง "pending" แต่ผ่าน deadline มาแล้วและไม่มีผล lottery
 * → void + คืน credit ให้ user อัตโนมัติ
 *
 * Usage:
 *   php artisan lottery:auto-void-expired           (run normally)
 *   php artisan lottery:auto-void-expired --dry-run (แสดงผลโดยไม่บันทึก)
 */
class AutoVoidExpiredBets extends Command
{
    protected $signature = 'lottery:auto-void-expired
                            {--dry-run : Show what would be voided without actually doing it}';

    protected $description = 'Void pending bets when lottery draw deadline has passed with no result';

    /**
     * Deadline config: หวยแต่ละตัว void กี่ชั่วโมงหลังเวลาออก
     * Format: slug => [ 'draw_hour' => H, 'draw_minute' => M, 'void_after_hours' => N ]
     *
     * draw_hour/draw_minute = เวลาที่ควรออกผล (เวลาไทย)
     * void_after_hours      = หากผ่านไปเท่านี้ชั่วโมงแล้วยังไม่มีผล → void
     */
    private array $deadlineConfig = [
        'hanoi' => ['draw_hour' => 18, 'draw_minute' => 30, 'void_after_hours' => 3.5],
        'hanoi-vip' => ['draw_hour' => 19, 'draw_minute' => 30, 'void_after_hours' => 3.5],
        'hanoi-special' => ['draw_hour' => 17, 'draw_minute' => 30, 'void_after_hours' => 3.5],
        'hanoi-adhoc' => ['draw_hour' => 16, 'draw_minute' => 30, 'void_after_hours' => 3.5],
        'hanoi-redcross' => ['draw_hour' => 16, 'draw_minute' => 30, 'void_after_hours' => 3.5],
        'lao' => ['draw_hour' => 20, 'draw_minute' => 30, 'void_after_hours' => 3],
        'lao-vip' => ['draw_hour' => 21, 'draw_minute' => 30, 'void_after_hours' => 3],
        'lao-samakki' => ['draw_hour' => 20, 'draw_minute' => 30, 'void_after_hours' => 3],
        'lao-star' => ['draw_hour' => 15, 'draw_minute' => 30, 'void_after_hours' => 3],
        'malay' => ['draw_hour' => 18, 'draw_minute' => 30, 'void_after_hours' => 3],
        'thai' => ['draw_hour' => 15, 'draw_minute' => 00, 'void_after_hours' => 4],
        'egypt' => ['draw_hour' => 20, 'draw_minute' => 00, 'void_after_hours' => 3],
        // Stock lotteries: void หลัง 5 ชั่วโมง
        'nikkei-morning' => ['draw_hour' => 9, 'draw_minute' => 30, 'void_after_hours' => 5],
        'nikkei-afternoon' => ['draw_hour' => 13, 'draw_minute' => 00, 'void_after_hours' => 5],
        'china-morning' => ['draw_hour' => 10, 'draw_minute' => 30, 'void_after_hours' => 5],
        'china-afternoon' => ['draw_hour' => 14, 'draw_minute' => 00, 'void_after_hours' => 5],
        'hangseng-morning' => ['draw_hour' => 11, 'draw_minute' => 10, 'void_after_hours' => 5],
        'hangseng-afternoon' => ['draw_hour' => 15, 'draw_minute' => 10, 'void_after_hours' => 5],
        'taiwan' => ['draw_hour' => 12, 'draw_minute' => 35, 'void_after_hours' => 5],
        'korea' => ['draw_hour' => 13, 'draw_minute' => 00, 'void_after_hours' => 5],
        'singapore' => ['draw_hour' => 16, 'draw_minute' => 15, 'void_after_hours' => 5],
        'thai-stock' => ['draw_hour' => 16, 'draw_minute' => 50, 'void_after_hours' => 5],
        'india' => ['draw_hour' => 17, 'draw_minute' => 30, 'void_after_hours' => 5],
        'russia' => ['draw_hour' => 22, 'draw_minute' => 50, 'void_after_hours' => 5],
        'germany' => ['draw_hour' => 23, 'draw_minute' => 50, 'void_after_hours' => 5],
        'uk' => ['draw_hour' => 23, 'draw_minute' => 50, 'void_after_hours' => 5],
        'dowjones' => ['draw_hour' => 4, 'draw_minute' => 10, 'void_after_hours' => 5],
    ];

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');
        $now = Carbon::now('Asia/Bangkok');
        $today = $now->toDateString();

        $this->info(($dryRun ? '[DRY-RUN] ' : '') . "🔍 Auto-Void Check — {$now->format('Y-m-d H:i')} (Bangkok)");

        $totalVoided = 0;
        $totalRefunded = 0;
        $lotteryLog = [];

        foreach ($this->deadlineConfig as $slug => $config) {
            $lotteryType = LotteryType::where('slug', $slug)->first();
            if (!$lotteryType || !$lotteryType->is_active) {
                continue;
            }

            // Determine the draw date: for lotteries that draw past midnight (dowjones), check yesterday
            $drawHour = $config['draw_hour'];
            $drawMinute = $config['draw_minute'];
            $voidAfterHours = $config['void_after_hours'];

            // The draw time today (Bangkok)
            $drawTime = Carbon::today('Asia/Bangkok')->setHour($drawHour)->setMinute($drawMinute)->setSecond(0);

            // If draw is very early (e.g. 04:10 dowjones), it belongs to "yesterday's" betting date
            $betDate = ($drawHour < 6)
                ? Carbon::yesterday('Asia/Bangkok')->toDateString()
                : $today;

            // Void deadline = draw_time + void_after_hours (adjusted to bet date)
            $voidDeadline = Carbon::today('Asia/Bangkok')
                ->setHour($drawHour)
                ->setMinute($drawMinute)
                ->addHours($voidAfterHours);

            // If we haven't passed the void deadline yet, skip
            if ($now->lessThan($voidDeadline)) {
                continue;
            }

            // Check if a result already exists for this date
            $resultExists = LotteryResult::where('lottery_type_id', $lotteryType->id)
                ->where('draw_date', $betDate)
                ->exists();

            if ($resultExists) {
                continue; // Lottery drew normally, no void needed
            }

            // Find all pending bets for this lottery on this date
            $pendingBets = Bet::where('lottery_type_id', $lotteryType->id)
                ->where('status', 'pending')
                ->whereDate('draw_date', $betDate)
                ->get();

            if ($pendingBets->isEmpty()) {
                continue;
            }

            $voidCount = $pendingBets->count();
            $voidAmount = $pendingBets->sum('amount');

            $this->warn("⚠️  {$lotteryType->name} [{$slug}] — {$voidCount} bets pending ({$voidAmount} บาท) — ผ่าน deadline แล้ว → VOID");

            if ($dryRun) {
                $totalVoided += $voidCount;
                $totalRefunded += $voidAmount;
                continue;
            }

            // === Execute void with DB transaction ===
            try {
                DB::transaction(function () use ($pendingBets, $lotteryType, $betDate, $voidAmount) {
                    // 1. Group bets by user for credit refund
                    $byUser = $pendingBets->groupBy('user_id');

                    foreach ($byUser as $userId => $userBets) {
                        $user = User::lockForUpdate()->find($userId);
                        if (!$user)
                            continue;

                        // Group by credit_type to refund to correct wallet
                        $realRefund = $userBets->where('credit_type', 'real')->sum('amount');
                        $bonusRefund = $userBets->where('credit_type', 'bonus')->sum('amount');

                        // 2a. Refund real credit
                        if ($realRefund > 0) {
                            $user->increment('credit', $realRefund);
                            $user->refresh();
                            Transaction::create([
                                'user_id' => $userId,
                                'type' => 'refund',
                                'amount' => $realRefund,
                                'balance_after' => $user->credit,
                                'description' => "คืนเงิน (หวยไม่ออกผล): {$lotteryType->name} วันที่ {$betDate}",
                                'reference_type' => 'auto_void',
                            ]);
                            // Notify user about real credit refund
                            \App\Models\UserNotification::notifyRefund($userId, $lotteryType->name, $betDate, $realRefund, 'real');
                        }

                        // 2b. Refund bonus credit
                        if ($bonusRefund > 0) {
                            $user->increment('bonus_credit', $bonusRefund);
                            $user->refresh();
                            Transaction::create([
                                'user_id' => $userId,
                                'type' => 'bonus',
                                'amount' => $bonusRefund,
                                'balance_after' => $user->bonus_credit,
                                'description' => "คืนโบนัส (หวยไม่ออกผล): {$lotteryType->name} วันที่ {$betDate}",
                                'reference_type' => 'auto_void_bonus',
                            ]);
                            // Notify user about bonus credit refund
                            \App\Models\UserNotification::notifyRefund($userId, $lotteryType->name, $betDate, $bonusRefund, 'bonus');
                        }
                    }

                    // 4. Void all bets
                    $betIds = $pendingBets->pluck('id');
                    Bet::whereIn('id', $betIds)->update(['status' => 'voided']);

                    // 5. Update BetSlip status
                    $slipIds = $pendingBets->pluck('bet_slip_id')->unique()->filter();
                    foreach ($slipIds as $slipId) {
                        $allVoided = !Bet::where('bet_slip_id', $slipId)
                            ->whereNotIn('status', ['voided', 'won', 'lost', 'paid'])
                            ->exists();
                        if ($allVoided) {
                            BetSlip::where('id', $slipId)->update(['status' => 'voided']);
                        }
                    }
                });

                // 6. Log for admin
                $voidCount = $pendingBets->count();
                AdminLog::log(
                    'auto_void',
                    "⚠️ AUTO-VOID: {$lotteryType->name} วันที่ {$betDate} — Void {$voidCount} bets, คืนเงิน {$voidAmount} บาท (ไม่มีผลหวยออก)"
                );

                ScraperLog::log(
                    $slug,
                    $lotteryType->name,
                    'auto-void',
                    'voided',
                    "Void {$voidCount} bets คืน {$voidAmount} บาท — ผ่าน deadline ไม่มีผลออก",
                    null,
                    $betDate
                );

                $this->info("   ✅ Voided {$voidCount} bets, คืน {$voidAmount} บาทให้ user");
                $totalVoided += $voidCount;
                $totalRefunded += $voidAmount;
                $lotteryLog[] = "{$lotteryType->name}: {$voidCount} bets / {$voidAmount} บาท";

            } catch (\Exception $e) {
                $this->error("   ❌ Error voiding {$lotteryType->name}: " . $e->getMessage());
                Log::error("[AutoVoidExpiredBets] {$slug}: " . $e->getMessage());
            }
        }

        if ($totalVoided === 0) {
            $this->info('✅ ไม่มี bets ที่ต้อง void');
        } else {
            $this->info('');
            $this->info("📊 สรุป: Voided {$totalVoided} bets, คืนเงิน {$totalRefunded} บาท");
            foreach ($lotteryLog as $l) {
                $this->line("   → {$l}");
            }
        }

        return Command::SUCCESS;
    }
}
