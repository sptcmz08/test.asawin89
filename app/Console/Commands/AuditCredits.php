<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Transaction;
use App\Models\AdminLog;
use App\Models\Bet;
use App\Models\BetSlip;
use App\Models\Deposit;
use App\Models\Withdrawal;
use Illuminate\Support\Facades\DB;

class AuditCredits extends Command
{
    protected $signature = 'audit:credits
        {--user= : ตรวจสอบเฉพาะ user_id}
        {--days=7 : จำนวนวันย้อนหลังที่จะตรวจสอบ}
        {--fix : แสดงยอดที่ควรเป็นจริง (ไม่แก้ไขอัตโนมัติ)}';

    protected $description = 'ตรวจสอบความถูกต้องของเครดิตลูกค้า — หาจุดที่เครดิตหายหรือไม่ตรง';

    public function handle()
    {
        $days = (int) $this->option('days');
        $specificUserId = $this->option('user');
        $showFix = $this->option('fix');

        $this->info("=== 🔍 CREDIT AUDIT REPORT ===");
        $this->info("วันที่ตรวจ: " . now()->format('Y-m-d H:i:s'));
        $this->info("ย้อนหลัง: {$days} วัน");
        $this->newLine();

        // ============================
        // 1. ตรวจ Balance Integrity
        // ============================
        $this->info("━━━ 1. ตรวจยอดเครดิตจาก Transactions vs ยอดจริง ━━━");

        $query = User::query();
        if ($specificUserId) {
            $query->where('id', $specificUserId);
        }

        $users = $query->orderBy('id')->get();
        $discrepancies = [];

        foreach ($users as $user) {
            // คำนวณยอดเครดิตที่ "ควรจะเป็น" จาก transactions
            $calculatedBalance = Transaction::where('user_id', $user->id)
                ->where('type', '!=', 'bonus_bet') // ไม่รวม bonus transactions
                ->where('reference_type', '!=', 'bonus')
                ->sum('amount');

            // อีกวิธี: ดูจาก balance_after ของ transaction ล่าสุด
            $lastTransaction = Transaction::where('user_id', $user->id)
                ->where('type', '!=', 'bonus_bet')
                ->where('reference_type', '!=', 'bonus')
                ->orderBy('id', 'desc')
                ->first();

            $lastBalanceAfter = $lastTransaction ? (float) $lastTransaction->balance_after : 0;

            $actualCredit = (float) $user->credit;
            $diff = round($actualCredit - $lastBalanceAfter, 2);

            if (abs($diff) > 0.01 && $lastTransaction) {
                $discrepancies[] = [
                    'user_id' => $user->id,
                    'username' => $user->username,
                    'actual_credit' => $actualCredit,
                    'last_tx_balance' => $lastBalanceAfter,
                    'difference' => $diff,
                    'last_tx_date' => $lastTransaction->created_at->format('Y-m-d H:i:s'),
                    'last_tx_type' => $lastTransaction->type,
                ];
            }
        }

        if (empty($discrepancies)) {
            $this->info("  ✅ ไม่พบความคลาดเคลื่อน (ยอดเครดิตตรงกับ transaction ล่าสุดทุกคน)");
        } else {
            $this->warn("  ⚠️ พบ " . count($discrepancies) . " ราย ที่ยอดเครดิตไม่ตรงกับ transaction ล่าสุด:");
            $headers = ['User ID', 'Username', 'เครดิตจริง', 'Last TX Balance', 'ส่วนต่าง', 'Last TX Date', 'TX Type'];
            $this->table($headers, array_map(function ($d) {
                return [
                    $d['user_id'],
                    $d['username'],
                    number_format($d['actual_credit'], 2),
                    number_format($d['last_tx_balance'], 2),
                    ($d['difference'] >= 0 ? '+' : '') . number_format($d['difference'], 2),
                    $d['last_tx_date'],
                    $d['last_tx_type'],
                ];
            }, $discrepancies));
        }

        $this->newLine();

        // ============================
        // 2. ตรวจลูกค้าที่ balance ลดฮวบ (> 100 บาท) โดยไม่มี transaction อธิบาย
        // ============================
        $this->info("━━━ 2. ตรวจ Ghost Deductions (เครดิตหายโดยไม่มี transaction) ━━━");

        $ghostCount = 0;
        $since = now()->subDays($days);

        $usersToCheck = $specificUserId ? User::where('id', $specificUserId)->get() : User::all();

        foreach ($usersToCheck as $user) {
            $transactions = Transaction::where('user_id', $user->id)
                ->where('created_at', '>=', $since)
                ->orderBy('id', 'asc')
                ->get();

            if ($transactions->count() < 2) continue;

            $prevBalance = null;
            foreach ($transactions as $i => $tx) {
                if ($prevBalance !== null) {
                    $expectedBalance = $prevBalance + (float)$tx->amount;
                    $actualBalance = (float)$tx->balance_after;
                    $gap = round($actualBalance - $expectedBalance, 2);

                    // ถ้า gap เยอะเกินไป = มีบางอย่างแก้ไข balance โดยไม่ผ่าน transaction
                    if (abs($gap) > 1) {
                        $ghostCount++;
                        $this->warn("  ⚠️ User #{$user->id} ({$user->username}): Gap = {$gap} บาท");
                        $this->line("     TX #{$tx->id} [{$tx->type}] amount={$tx->amount} expected_balance={$expectedBalance} actual_balance={$actualBalance}");
                        $this->line("     เวลา: {$tx->created_at} — {$tx->description}");
                    }
                }
                $prevBalance = (float)$tx->balance_after;
            }
        }

        if ($ghostCount === 0) {
            $this->info("  ✅ ไม่พบ ghost deductions (ทุก transaction ต่อเนื่องกันปกติ)");
        }

        $this->newLine();

        // ============================
        // 3. ตรวจ Admin Actions ที่เกี่ยวกับเครดิต
        // ============================
        $this->info("━━━ 3. Admin Actions ที่เกี่ยวกับเครดิต (ย้อนหลัง {$days} วัน) ━━━");

        $adminActions = AdminLog::whereIn('action', ['add_credit', 'deduct_credit', 'add_bonus_credit', 'payout', 'reset_bets'])
            ->where('created_at', '>=', $since)
            ->orderBy('created_at', 'desc')
            ->get();

        if ($adminActions->isEmpty()) {
            $this->info("  ไม่มี admin actions ที่เกี่ยวกับเครดิต");
        } else {
            $this->info("  พบ {$adminActions->count()} รายการ:");
            foreach ($adminActions as $log) {
                $adminName = $log->admin ? $log->admin->name : "Admin #{$log->admin_id}";
                $this->line("  [{$log->created_at}] {$adminName}: [{$log->action}] {$log->description}");
                if ($log->before_data || $log->after_data) {
                    $this->line("     Before: " . json_encode($log->before_data) . " → After: " . json_encode($log->after_data));
                }
                $this->line("     IP: {$log->ip_address}");
            }
        }

        $this->newLine();

        // ============================
        // 4. ตรวจ Suspicious Activity
        // ============================
        $this->info("━━━ 4. Suspicious Activity (ย้อนหลัง {$days} วัน) ━━━");

        // 4a. Bets ที่ถูกหักเครดิตแต่ไม่มี bet_slip
        $orphanBets = Bet::whereNull('bet_slip_id')
            ->where('created_at', '>=', $since)
            ->count();
        $this->line("  Orphan bets (ไม่มี slip): {$orphanBets}");

        // 4b. Withdrawals ที่ rejected แต่ไม่ได้ refund
        $rejectedWithdrawals = Withdrawal::where('status', 'rejected')
            ->where('created_at', '>=', $since)
            ->get();

        $missingRefunds = 0;
        foreach ($rejectedWithdrawals as $w) {
            $refundExists = Transaction::where('user_id', $w->user_id)
                ->where('type', 'refund')
                ->where('amount', $w->amount)
                ->where('created_at', '>=', $w->created_at)
                ->exists();

            if (!$refundExists) {
                $missingRefunds++;
                $this->warn("  ⚠️ Withdrawal #{$w->id} rejected (฿{$w->amount}) แต่ไม่พบ refund transaction — User #{$w->user_id}");
            }
        }
        if ($missingRefunds === 0) {
            $this->line("  ✅ Rejected withdrawals ทั้งหมดมี refund ครบ");
        }

        // 4c. Double deposits (ฝากซ้ำจากสลิปเดียวกัน?)
        $duplicateSlips = Deposit::where('created_at', '>=', $since)
            ->select('slip_ref', DB::raw('COUNT(*) as cnt'))
            ->whereNotNull('slip_ref')
            ->groupBy('slip_ref')
            ->having('cnt', '>', 1)
            ->get();

        if ($duplicateSlips->isNotEmpty()) {
            $this->warn("  ⚠️ พบ duplicate slip references:");
            foreach ($duplicateSlips as $dup) {
                $this->line("     slip_ref={$dup->slip_ref} used {$dup->cnt} times");
            }
        } else {
            $this->line("  ✅ ไม่พบ duplicate slip references");
        }

        // 4d. Users ที่ credit เป็นลบ
        $negativeCredit = User::where('credit', '<', 0)->get();
        if ($negativeCredit->isNotEmpty()) {
            $this->error("  🔴 Users ที่ credit ติดลบ:");
            foreach ($negativeCredit as $u) {
                $this->line("     User #{$u->id} ({$u->username}): ฿{$u->credit}");
            }
        } else {
            $this->line("  ✅ ไม่มี user ที่ credit ติดลบ");
        }

        $this->newLine();

        // ============================
        // 5. ตรวจ Pending Bets ค้าง (แทงแล้วหักเงินแต่ยังไม่ settle)
        // ============================
        $this->info("━━━ 5. Pending Bets ค้าง (เก่ากว่า 24 ชม.) ━━━");

        $stalePending = Bet::where('status', 'pending')
            ->where('created_at', '<', now()->subHours(24))
            ->select('lottery_type_id', 'draw_date', DB::raw('COUNT(*) as cnt'), DB::raw('SUM(amount) as total_amount'))
            ->groupBy('lottery_type_id', 'draw_date')
            ->get();

        if ($stalePending->isNotEmpty()) {
            $this->warn("  ⚠️ Bets pending นานเกิน 24 ชม. (เงินถูกหักแล้วแต่ยังไม่ตัดผล):");
            foreach ($stalePending as $sp) {
                $lotteryName = \App\Models\LotteryType::find($sp->lottery_type_id)?->name ?? "ID #{$sp->lottery_type_id}";
                $this->line("     {$lotteryName} draw:{$sp->draw_date} — {$sp->cnt} bets (฿" . number_format($sp->total_amount, 2) . ")");
            }
            $this->warn("  💡 นี่อาจเป็นสาเหตุที่เครดิตลูกค้า \"หาย\" — เงินถูกหักแล้วแต่ยังไม่ settle ผลหวย");
        } else {
            $this->info("  ✅ ไม่มี pending bets ค้าง");
        }

        $this->newLine();

        // ============================
        // 6. สรุปยอดล่าสุดของ user ที่มีปัญหา (ถ้าระบุ --user)
        // ============================
        if ($specificUserId) {
            $user = User::find($specificUserId);
            if ($user) {
                $this->info("━━━ 6. Timeline ของ User #{$user->id} ({$user->username}) ━━━");
                $this->line("  เครดิตปัจจุบัน: ฿" . number_format($user->credit, 2));
                $this->line("  โบนัสเครดิต: ฿" . number_format($user->bonus_credit, 2));
                $this->line("  สถานะแบน: " . ($user->is_banned ? '❌ ถูกแบน' : '✅ ปกติ'));
                $this->newLine();

                $this->line("  Transactions ล่าสุด 30 รายการ:");
                $txs = Transaction::where('user_id', $user->id)
                    ->orderBy('id', 'desc')
                    ->limit(30)
                    ->get()
                    ->reverse();

                $rows = [];
                foreach ($txs as $tx) {
                    $rows[] = [
                        $tx->id,
                        $tx->created_at->format('m-d H:i'),
                        $tx->type,
                        ($tx->amount >= 0 ? '+' : '') . number_format($tx->amount, 2),
                        number_format($tx->balance_after, 2),
                        mb_substr($tx->description, 0, 40),
                    ];
                }
                $this->table(['TX#', 'Date', 'Type', 'Amount', 'Balance', 'Description'], $rows);

                // Pending bets ของ user นี้
                $pendingBets = Bet::where('user_id', $user->id)
                    ->where('status', 'pending')
                    ->get();

                if ($pendingBets->isNotEmpty()) {
                    $this->warn("  ⚠️ Pending bets: {$pendingBets->count()} รายการ (฿" . number_format($pendingBets->sum('amount'), 2) . ")");
                }
            }
        }

        $this->newLine();
        $this->info("=== AUDIT COMPLETE ===");

        return 0;
    }
}
