<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Bet;
use App\Models\BetSlip;
use App\Models\Withdrawal;
use App\Models\Transaction;
use App\Models\LotteryType;
use App\Models\LotteryResult;
use App\Models\ScraperLog;
use App\Models\SpecialNumber;
use App\Models\AdminLog;
use App\Models\PayoutRate;
use App\Models\BetLimit;
use App\Services\LotteryScheduleService;
use App\Services\LotteryScraperService;
use App\Services\BetSettlementService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;
use Inertia\Inertia;

class AdminController extends Controller
{
    protected $scheduleService;
    protected $settlementService;

    public function __construct(LotteryScheduleService $scheduleService, BetSettlementService $settlementService)
    {
        $this->scheduleService = $scheduleService;
        $this->settlementService = $settlementService;
    }

    /**
     * Admin Dashboard
     */
    public function dashboard()
    {
        $today = now()->toDateString();
        $thisMonth = now()->startOfMonth();
        $lastMonth = now()->subMonth()->startOfMonth();
        $lastMonthEnd = now()->subMonth()->endOfMonth();

        // =============================================
        // Basic stats
        // =============================================
        $stats = [
            'totalUsers' => User::count(),
            'totalBets' => Bet::count(),
            'pendingWithdrawals' => Withdrawal::where('status', 'pending')->count(),
        ];

        // =============================================
        // TODAY's stats
        // คำนวณจาก: bets.created_at = today, transactions.created_at = today
        // =============================================
        // ยอดแทงวันนี้ = SUM(bets.amount) WHERE created_at = today
        $stats['todayBets'] = Bet::whereDate('created_at', $today)->sum('amount');
        // ยอดจ่ายรางวัลวันนี้ = SUM(bets.win_amount) WHERE status IN (won,paid) AND created_at = today
        $stats['todayPayouts'] = Bet::whereDate('created_at', $today)
            ->whereIn('status', ['won', 'paid'])->sum('win_amount');
        // กำไร/ขาดทุนหวยวันนี้ = ยอดแทง - ยอดจ่ายรางวัล
        $stats['todayProfit'] = $stats['todayBets'] - $stats['todayPayouts'];
        // ยอดฝากวันนี้ = SUM(transactions.amount) WHERE type='deposit' AND created_at = today
        $stats['todayDeposits'] = Transaction::whereDate('created_at', $today)
            ->where('type', 'deposit')->sum('amount');
        // ยอดถอนวันนี้ = SUM(ABS(transactions.amount)) WHERE type='withdraw' AND created_at = today
        $stats['todayWithdrawals'] = Transaction::whereDate('created_at', $today)
            ->where('type', 'withdraw')->sum(DB::raw('ABS(amount)'));
        // สถิติถูก/ไม่ถูก/รอผลวันนี้
        $stats['todayWins'] = Bet::whereDate('created_at', $today)->whereIn('status', ['won', 'paid'])->count();
        $stats['todayLosses'] = Bet::whereDate('created_at', $today)->where('status', 'lost')->count();
        $stats['todayPending'] = Bet::whereDate('created_at', $today)->where('status', 'pending')->count();

        // =============================================
        // THIS MONTH stats
        // คำนวณจาก: created_at >= วันที่ 1 ของเดือนนี้
        // =============================================
        // ยอดแทงเดือนนี้ = SUM(bets.amount) WHERE created_at >= 1st of month
        $stats['monthlyBets'] = Bet::where('created_at', '>=', $thisMonth)->sum('amount');
        // ยอดจ่ายรางวัลเดือนนี้ = SUM(bets.win_amount) WHERE status IN (won,paid)
        $stats['monthlyPayouts'] = Bet::where('created_at', '>=', $thisMonth)
            ->whereIn('status', ['won', 'paid'])->sum('win_amount');
        // กำไร/ขาดทุนหวยเดือนนี้ = ยอดแทง - ยอดจ่ายรางวัล
        $stats['monthlyProfit'] = $stats['monthlyBets'] - $stats['monthlyPayouts'];
        // ยอดฝากเดือนนี้ = SUM(transactions.amount) WHERE type='deposit'
        $stats['monthlyDeposits'] = Transaction::where('created_at', '>=', $thisMonth)
            ->where('type', 'deposit')->sum('amount');
        // ยอดถอนเดือนนี้ = SUM(ABS(transactions.amount)) WHERE type='withdraw'
        $stats['monthlyWithdrawals'] = Transaction::where('created_at', '>=', $thisMonth)
            ->where('type', 'withdraw')->sum(DB::raw('ABS(amount)'));

        // =============================================
        // LAST MONTH comparison
        // คำนวณจาก: created_at BETWEEN วันที่ 1 เดือนก่อน AND สิ้นเดือนก่อน
        // =============================================
        $lastMonthBets = Bet::whereBetween('created_at', [$lastMonth, $lastMonthEnd])->sum('amount');
        $lastMonthPayouts = Bet::whereBetween('created_at', [$lastMonth, $lastMonthEnd])
            ->whereIn('status', ['won', 'paid'])->sum('win_amount');
        $stats['lastMonthBets'] = $lastMonthBets;
        $stats['lastMonthProfit'] = $lastMonthBets - $lastMonthPayouts;
        $stats['lastMonthDeposits'] = Transaction::whereBetween('created_at', [$lastMonth, $lastMonthEnd])
            ->where('type', 'deposit')->sum('amount');
        $stats['lastMonthWithdrawals'] = Transaction::whereBetween('created_at', [$lastMonth, $lastMonthEnd])
            ->where('type', 'withdraw')->sum(DB::raw('ABS(amount)'));

        // =============================================
        // ALL-TIME totals
        // คำนวณจาก: ข้อมูลทั้งหมดในตาราง
        // =============================================
        // ยอดแทงทั้งหมด = SUM(bets.amount)
        $stats['allTimeBets'] = Bet::sum('amount');
        // ยอดจ่ายรางวัลทั้งหมด = SUM(bets.win_amount) WHERE status IN (won,paid)
        $stats['allTimePayouts'] = Bet::whereIn('status', ['won', 'paid'])->sum('win_amount');
        // กำไรสุทธิ = ยอดแทง - ยอดจ่ายรางวัล
        $stats['allTimeProfit'] = $stats['allTimeBets'] - $stats['allTimePayouts'];
        // ยอดฝากทั้งหมด = SUM(transactions.amount) WHERE type='deposit'
        $stats['allTimeDeposits'] = Transaction::where('type', 'deposit')->sum('amount');
        // ยอดถอนทั้งหมด = SUM(ABS(transactions.amount)) WHERE type='withdraw'
        $stats['allTimeWithdrawals'] = Transaction::where('type', 'withdraw')->sum(DB::raw('ABS(amount)'));

        // =============================================
        // Other dashboard data
        // =============================================
        // Top 10 most bet numbers today
        $stats['topNumbers'] = Bet::whereDate('created_at', $today)
            ->select('number', DB::raw('SUM(amount) as total_amount'), DB::raw('COUNT(*) as bet_count'))
            ->groupBy('number')
            ->orderByDesc('total_amount')
            ->limit(10)
            ->get();

        // Recent admin activities
        $stats['recentLogs'] = AdminLog::with('admin')
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        // Scraper health check for dashboard alert
        $lastSuccess = ScraperLog::where('status', 'success')->latest()->first();
        $consecutiveFailures = 0;
        if ($lastSuccess) {
            $consecutiveFailures = ScraperLog::where('status', 'failed')
                ->where('created_at', '>', $lastSuccess->created_at)
                ->count();
        } else {
            $consecutiveFailures = ScraperLog::where('status', 'failed')->count();
        }
        $stats['scraperAlert'] = [
            'consecutiveFailures' => $consecutiveFailures,
            'lastSuccess' => $lastSuccess?->created_at?->diffForHumans(),
        ];

        return Inertia::render('Admin/Dashboard', ['stats' => $stats]);
    }

    /**
     * Users Management
     */
    public function users(Request $request)
    {
        $query = User::orderBy('id', 'asc');

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('username', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $users = $query->paginate(25)->withQueryString();
        return Inertia::render('Admin/Users', [
            'users' => $users,
            'filters' => ['search' => $search ?? ''],
        ]);
    }

    public function addCredit(Request $request, $userId)
    {
        try {
            $request->validate(['amount' => 'required|numeric|min:1']);

            return DB::transaction(function () use ($request, $userId) {
                // Lock user row to prevent race condition
                $user = User::where('id', $userId)->lockForUpdate()->firstOrFail();
                $oldCredit = $user->credit;
                $user->increment('credit', (float) $request->amount);
                $user->refresh();

                Transaction::create([
                    'user_id' => $user->id,
                    'type' => 'adjustment',
                    'amount' => $request->amount,
                    'balance_after' => $user->credit,
                    'description' => 'Admin เพิ่มเครดิต',
                ]);

                // Audit log
                AdminLog::log(
                    'add_credit',
                    "เพิ่มเครดิต {$request->amount} บาท ให้ {$user->name}",
                    'User',
                    $user->id,
                    ['credit' => $oldCredit],
                    ['credit' => $user->credit]
                );

                return response()->json(['success' => true]);
            });
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * เพิ่มโบนัสเครดิต (โปรโมชั่น) — ใช้แทงได้ ถอนไม่ได้
     * ถ้าถูกรางวัล payout ไปที่ credit จริงอัตโนมัติ
     */
    public function addBonusCredit(Request $request, $userId)
    {
        try {
            $request->validate([
                'amount' => 'required|numeric|min:1',
                'note' => 'nullable|string|max:255',
            ]);

            return DB::transaction(function () use ($request, $userId) {
                $user = User::where('id', $userId)->lockForUpdate()->firstOrFail();
                $oldBonus = $user->bonus_credit;
                $amount = (float) $request->amount;
                $note = $request->note ?: 'โปรโมชั่น Admin เพิ่มโบนัสเครดิต';

                $user->increment('bonus_credit', $amount);
                $user->refresh();

                Transaction::create([
                    'user_id' => $user->id,
                    'type' => 'bonus',
                    'amount' => $amount,
                    'balance_after' => $user->bonus_credit,
                    'description' => "Admin เพิ่มโบนัสเครดิต: {$note}",
                    'reference_type' => 'bonus',
                ]);

                AdminLog::log(
                    'add_bonus_credit',
                    "เพิ่มโบนัสเครดิต {$amount} บาท ให้ {$user->name} — {$note}",
                    'User',
                    $user->id,
                    ['bonus_credit' => $oldBonus],
                    ['bonus_credit' => $user->bonus_credit]
                );

                return response()->json([
                    'success' => true,
                    'new_bonus_credit' => $user->bonus_credit,
                ]);
            });
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * ปรับลดเครดิต — ต้องมีหมายเหตุเสมอ
     */
    public function deductCredit(Request $request, $userId)
    {
        try {
            $request->validate([
                'amount' => 'required|numeric|min:1',
                'note' => 'required|string|max:255',
            ]);

            return DB::transaction(function () use ($request, $userId) {
                $user = User::where('id', $userId)->lockForUpdate()->firstOrFail();
                $oldCredit = $user->credit;
                $amount = (float) $request->amount;

                if ($user->credit < $amount) {
                    return response()->json([
                        'success' => false,
                        'message' => "เครดิตไม่พอ (คงเหลือ ฿" . number_format($user->credit, 2) . ")",
                    ], 400);
                }

                $user->decrement('credit', $amount);
                $user->refresh();

                Transaction::create([
                    'user_id' => $user->id,
                    'type' => 'adjustment',
                    'amount' => -$amount,
                    'balance_after' => $user->credit,
                    'description' => 'Admin ปรับลดเครดิต: ' . $request->note,
                ]);

                AdminLog::log(
                    'deduct_credit',
                    "ปรับลดเครดิต {$amount} บาท จาก {$user->name} — {$request->note}",
                    'User',
                    $user->id,
                    ['credit' => $oldCredit],
                    ['credit' => $user->credit]
                );

                return response()->json(['success' => true]);
            });
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function toggleBan($userId)
    {
        try {
            $user = User::findOrFail($userId);
            $wasBanned = $user->is_banned;
            $user->is_banned = !$user->is_banned;
            $user->save();

            // Audit log
            AdminLog::log(
                'ban_user',
                $user->is_banned ? "แบน {$user->name}" : "ปลดแบน {$user->name}",
                'User',
                $user->id,
                ['is_banned' => $wasBanned],
                ['is_banned' => $user->is_banned]
            );

            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function resetPassword(Request $request, $userId)
    {
        try {
            $user = User::findOrFail($userId);

            // ใช้ password จาก request หรือสุ่มใหม่ (ขั้นต่ำ 8 ตัวอักษร)
            $newPassword = $request->input('password');
            if (!$newPassword || strlen($newPassword) < 8) {
                $newPassword = substr(str_shuffle('abcdefghijkmnpqrstuvwxyz23456789ABCDEFGHJKLMNPQRSTUVWXYZ'), 0, 10);
            }

            $user->password = bcrypt($newPassword);
            $user->save();

            // Audit log (ถ้าตารางมีอยู่)
            try {
                AdminLog::log(
                    'reset_password',
                    "รีเซ็ตรหัสผ่าน {$user->name}",
                    'User',
                    $user->id
                );
            } catch (\Exception $e) {
                // ข้ามถ้า admin_logs table ยังไม่มี
            }

            return response()->json([
                'success' => true,
                'new_password' => $newPassword,
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Bets Management - By Lottery Type with Slip Details
     */
    public function bets(Request $request)
    {
        $from = $request->get('from', now()->toDateString());
        $to = $request->get('to', now()->toDateString());

        $slips = BetSlip::with(['user', 'lotteryType', 'bets'])
            ->where(function ($q) use ($from, $to) {
                $q->where(function ($q2) use ($from, $to) {
                    $q2->whereDate('draw_date', '>=', $from)
                        ->whereDate('draw_date', '<=', $to);
                })->orWhere(function ($q2) use ($from, $to) {
                    $q2->whereDate('created_at', '>=', $from)
                        ->whereDate('created_at', '<=', $to);
                });
            })
            ->orderBy('created_at', 'desc')
            ->get();

        // Overall summary
        $allBets = $slips->flatMap->bets;
        $overallSummary = [
            'total_bet' => round($slips->sum('total_amount'), 2),
            'total_to_pay' => round($allBets->whereIn('status', ['won'])->sum('win_amount'), 2),
            'total_paid' => round($allBets->where('status', 'paid')->sum('win_amount'), 2),
        ];

        $lotteryTypes = LotteryType::orderBy('name')->get();

        return Inertia::render('Admin/Bets', [
            'slips' => $slips,
            'overallSummary' => $overallSummary,
            'lotteryTypes' => $lotteryTypes,
            'filters' => ['from' => $from, 'to' => $to],
        ]);
    }

    /**
     * Withdrawals Management
     */
    public function withdrawals()
    {
        $withdrawals = Withdrawal::with(['user', 'bankAccount'])
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return Inertia::render('Admin/Withdrawals', ['withdrawals' => $withdrawals]);
    }

    public function approveWithdrawal($id)
    {
        try {
            return DB::transaction(function () use ($id) {
                $withdrawal = Withdrawal::lockForUpdate()->findOrFail($id);

                // Status guard: only pending withdrawals can be approved
                if ($withdrawal->status !== 'pending') {
                    return response()->json(['success' => false, 'message' => 'รายการนี้ดำเนินการไปแล้ว'], 400);
                }

                $withdrawal->status = 'approved';
                $withdrawal->processed_at = now();
                $withdrawal->save();

                // Audit log
                AdminLog::log(
                    'approve_withdrawal',
                    "อนุมัติถอนเงิน {$withdrawal->amount} บาท ของ User #{$withdrawal->user_id}",
                    'Withdrawal',
                    $withdrawal->id
                );

                return response()->json(['success' => true]);
            });
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function rejectWithdrawal(Request $request, $id)
    {
        try {
            return DB::transaction(function () use ($request, $id) {
                $withdrawal = Withdrawal::lockForUpdate()->findOrFail($id);

                // Status guard: only pending withdrawals can be rejected
                // CRITICAL: Without this, rejecting an already-rejected withdrawal would double-refund credit
                if ($withdrawal->status !== 'pending') {
                    return response()->json(['success' => false, 'message' => 'รายการนี้ดำเนินการไปแล้ว'], 400);
                }

                $withdrawal->status = 'rejected';
                $withdrawal->admin_note = $request->reason;
                $withdrawal->processed_at = now();
                $withdrawal->save();

                // Refund credit (lock user row to prevent race condition)
                $user = User::where('id', $withdrawal->user_id)->lockForUpdate()->first();
                $user->increment('credit', (float) $withdrawal->amount);
                $user->refresh();

                Transaction::create([
                    'user_id' => $withdrawal->user_id,
                    'type' => 'refund',
                    'amount' => $withdrawal->amount,
                    'balance_after' => $user->credit,
                    'description' => 'คืนเงินถอน: ' . $request->reason,
                ]);

                // Audit log
                AdminLog::log(
                    'reject_withdrawal',
                    "ปฏิเสธถอนเงิน {$withdrawal->amount} บาท ของ User #{$withdrawal->user_id}: {$request->reason}",
                    'Withdrawal',
                    $withdrawal->id
                );

                return response()->json(['success' => true]);
            });
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Payments Management
     */
    public function payments()
    {
        $winningBets = Bet::with(['user', 'lotteryType'])
            ->whereIn('status', ['won', 'paid'])
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        $summary = [
            'pendingAmount' => Bet::where('status', 'won')->sum('win_amount'),
            'pendingCount' => Bet::where('status', 'won')->count(),
            'paidTodayAmount' => Bet::where('status', 'paid')
                ->whereDate('updated_at', now()->toDateString())
                ->sum('win_amount'),
            'totalPaid' => Bet::where('status', 'paid')->sum('win_amount'),
        ];

        return Inertia::render('Admin/Payments', [
            'winningBets' => $winningBets,
            'summary' => $summary,
        ]);
    }

    public function payBet($betId)
    {
        try {
            return DB::transaction(function () use ($betId) {
                $bet = Bet::with('lotteryType')->findOrFail($betId);

                if ($bet->status !== 'won') {
                    return response()->json(['error' => 'Bet is not in won status'], 400);
                }

                $winAmount = (float) $bet->win_amount;

                // Credit the user (lock row to prevent race condition)
                $user = User::where('id', $bet->user_id)->lockForUpdate()->first();
                if (!$user) {
                    return response()->json(['error' => 'User not found'], 404);
                }

                $user->increment('credit', $winAmount);
                $user->refresh();

                // Log transaction
                Transaction::create([
                    'user_id' => $user->id,
                    'type' => 'win_payout',
                    'amount' => $winAmount,
                    'balance_after' => $user->credit,
                    'description' => "ถูกรางวัล " . ($bet->lotteryType->name ?? '') . " เลข {$bet->number} จ่าย " . number_format($winAmount, 2),
                ]);

                // Update bet status
                $bet->status = 'paid';
                $bet->save();

                // Audit log
                AdminLog::log(
                    'payout',
                    "จ่ายเงินรางวัล ฿" . number_format($winAmount, 2) . " ให้ {$user->name} (เลข {$bet->number})",
                );

                return response()->json(['success' => true, 'win_amount' => $winAmount]);
            });
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function payAllBets()
    {
        try {
            return DB::transaction(function () {
                $bets = Bet::with('lotteryType')->where('status', 'won')->get();

                if ($bets->isEmpty()) {
                    return response()->json(['success' => true, 'count' => 0, 'message' => 'ไม่มีรายการรอจ่าย']);
                }

                $totalPayout = 0;

                foreach ($bets as $bet) {
                    $winAmount = (float) $bet->win_amount;

                    // Credit the user (lock row to prevent race condition)
                    $user = User::where('id', $bet->user_id)->lockForUpdate()->first();
                    if ($user) {
                        $user->increment('credit', $winAmount);
                        $user->refresh();

                        // Log transaction
                        Transaction::create([
                            'user_id' => $user->id,
                            'type' => 'win_payout',
                            'amount' => $winAmount,
                            'balance_after' => $user->credit,
                            'description' => "ถูกรางวัล " . ($bet->lotteryType->name ?? '') . " เลข {$bet->number} จ่าย " . number_format($winAmount, 2),
                        ]);
                    }

                    // Update bet status
                    $bet->status = 'paid';
                    $bet->save();

                    $totalPayout += $winAmount;
                }

                // Audit log
                AdminLog::log(
                    'payout',
                    "จ่ายเงินรางวัลทั้งหมด {$bets->count()} รายการ รวม ฿" . number_format($totalPayout, 2),
                );

                return response()->json(['success' => true, 'count' => $bets->count(), 'total' => $totalPayout]);
            });
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Lucky Numbers Management
     */
    public function luckyNumbers()
    {
        $luckyNumbers = SpecialNumber::with('lotteryType')
            ->orderBy('created_at', 'desc')
            ->get();

        $lotteryTypes = LotteryType::where('is_active', true)->get();

        $betTypeNames = [
            1 => '2ตัวบน',
            2 => '2ตัวล่าง',
            3 => '3ตัวโต๊ด',
            4 => '3ตัวบน',
            5 => 'วิ่งบน',
            6 => 'วิ่งล่าง',
            9 => '3ตัวล่าง',
            10 => '4ตัวบน',
        ];

        return Inertia::render('Admin/LuckyNumbers', [
            'luckyNumbers' => $luckyNumbers,
            'lotteryTypes' => $lotteryTypes,
            'betTypeNames' => $betTypeNames,
        ]);
    }

    public function storeLuckyNumber(Request $request)
    {
        try {
            $request->validate([
                'lottery_type_id' => 'required|exists:lottery_types,id',
                'number' => 'required|string',
                'bet_type_id' => 'nullable|integer',
            ]);

            SpecialNumber::create([
                'lottery_type_id' => $request->lottery_type_id,
                'bet_type_id' => $request->bet_type_id ?: null,
                'number' => $request->number,
                'is_special' => $request->is_special ?? false,
                'is_forbidden' => $request->is_forbidden ?? false,
                'payout_rate' => $request->payout_rate,
                'start_date' => now()->toDateString(),
                'end_date' => null,
            ]);

            return response()->json(['success' => true]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['success' => false, 'message' => 'Validation error', 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function deleteLuckyNumber($id)
    {
        try {
            SpecialNumber::findOrFail($id)->delete();
            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Schedule Management
     */
    public function schedule()
    {
        $lotteryTypes = LotteryType::all();

        // Get upcoming rounds
        $rounds = [];
        foreach ($lotteryTypes as $lottery) {
            $schedule = $this->scheduleService->getSchedule($lottery->slug);
            $rounds[] = [
                'lottery_name' => $lottery->name,
                'draw_date' => $schedule['draw_time']->format('d/m/Y H:i'),
                'close_time' => $schedule['close_time']->format('H:i'),
                'status' => $schedule['status'],
            ];
        }

        return Inertia::render('Admin/Schedule', [
            'lotteryTypes' => $lotteryTypes,
            'rounds' => $rounds,
        ]);
    }

    public function updateLotteryType(Request $request, $id)
    {
        try {
            $request->validate([
                'name' => 'sometimes|string|max:255',
                'draw_days' => 'sometimes|string|max:255',
                'draw_time' => 'sometimes|string|max:10',
                'open_time' => 'sometimes|nullable|string|max:10',
                'close_time' => 'sometimes|nullable|string|max:10',
                'close_before_minutes' => 'sometimes|integer|min:0|max:1440',
                'reopen_buffer_minutes' => 'sometimes|integer|min:0|max:1440',
                'schedule_type' => 'sometimes|string|in:daily,specific_days,interval',
                'is_active' => 'sometimes|boolean',
            ]);

            $lottery = LotteryType::findOrFail($id);
            $lottery->update($request->only([
                'name',
                'draw_days',
                'draw_time',
                'open_time',
                'close_time',
                'close_before_minutes',
                'reopen_buffer_minutes',
                'schedule_type',
                'is_active'
            ]));

            return response()->json(['success' => true]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(['success' => false, 'errors' => $e->errors()], 422);
        } catch (\Exception $e) {
            \Log::error('Update lottery type error: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'เกิดข้อผิดพลาด'], 500);
        }
    }

    public function toggleLotteryType($id)
    {
        try {
            $lottery = LotteryType::findOrFail($id);
            $lottery->is_active = !$lottery->is_active;
            $lottery->save();

            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Lottery Results Management
     */
    public function lotteryResults()
    {
        $lotteryTypes = LotteryType::where('is_active', true)->get();

        // ดึงผลรางวัลล่าสุด 2 งวด ต่อ หวยแต่ละประเภท
        $recentResults = collect();
        foreach ($lotteryTypes as $type) {
            $results = LotteryResult::with('lotteryType')
                ->where('lottery_type_id', $type->id)
                ->orderBy('draw_date', 'desc')
                ->take(2)
                ->get();
            $recentResults = $recentResults->merge($results);
        }
        // เรียงตามวันที่ล่าสุดก่อน
        $recentResults = $recentResults->sortByDesc('draw_date')->values();

        $scraperLogs = ScraperLog::orderBy('created_at', 'desc')
            ->take(50)
            ->get();

        $failedLogs = ScraperLog::where('status', 'failed')
            ->where('created_at', '>=', now()->subHours(24))
            ->get();

        return Inertia::render('Admin/LotteryResults', [
            'lotteryTypes' => $lotteryTypes,
            'recentResults' => $recentResults,
            'scraperLogs' => $scraperLogs,
            'failedLogs' => $failedLogs,
        ]);
    }

    public function triggerScrape(Request $request)
    {
        $slug = $request->input('slug', 'all');
        $useFallback = $request->input('use_fallback', false);
        $source = $request->input('source'); // manycai, sanook, raakaadee

        try {
            if ($useFallback && $source) {
                // Use fallback command with specific source
                if ($slug === 'all') {
                    $args = ['--all' => true];
                } else {
                    $args = ['slug' => $slug];
                }
                $args['--source'] = $source;
                Artisan::call('lottery:scrape-fallback', $args);
            } else {
                // Use HTTP scraper (ไม่ต้องใช้ Puppeteer)
                if ($slug === 'all') {
                    Artisan::call('lottery:scrape-http', ['--all' => true]);
                } else {
                    Artisan::call('lottery:scrape-http', ['slug' => $slug]);
                }
            }

            return response()->json([
                'success' => true,
                'output' => Artisan::output(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * ดึงผลหวยย้อนหลังจาก ManyCai (ใช้ HTTP scraper)
     */
    public function triggerManyCaiScrape(Request $request, LotteryScraperService $scraper)
    {
        $code = $request->input('code', 'all');
        $count = $request->input('count', 5);

        // Code mapping
        $codeMapping = [
            'BFHN' => 'หวยฮานอยพิเศษ',
            'HNVIP' => 'หวยฮานอย VIP',
            'YNHN' => 'หวยฮานอย',
            'TLZC' => 'หวยลาวพัฒนา',
            'ZCVIP' => 'หวยลาว VIP',
            'TGFC' => 'หวยไทย',
        ];

        try {
            $results = [];
            $successCount = 0;
            $failedCount = 0;

            if ($code === 'all') {
                // Scrape all lottery types using HTTP
                $allResults = $scraper->scrapeAllHttpOnly();

                foreach ($allResults as $r) {
                    $results[] = $r;
                    if ($r['success']) {
                        $successCount++;
                        // Calculate winning bets for this result
                        if (isset($r['result'])) {
                            $this->calculateWinningBets(
                                $r['result']->lottery_type_id,
                                $r['result']->draw_date,
                                $r['result']
                            );
                        }
                    } else {
                        $failedCount++;
                    }
                }
            } else {
                // Scrape specific code
                if (!isset($codeMapping[$code])) {
                    return response()->json([
                        'success' => false,
                        'error' => "Unknown code: {$code}",
                    ], 400);
                }

                $result = $scraper->scrapeHttpOnly($code);
                $results[] = [
                    'code' => $code,
                    'name' => $codeMapping[$code],
                    'success' => $result['success'],
                    'first_prize' => $result['first_prize'] ?? null,
                    'error' => $result['error'] ?? null,
                ];

                if ($result['success']) {
                    $successCount++;
                    // Calculate winning bets
                    if (isset($result['result'])) {
                        $this->calculateWinningBets(
                            $result['result']->lottery_type_id,
                            $result['result']->draw_date,
                            $result['result']
                        );
                    }
                } else {
                    $failedCount++;
                }
            }

            // Build output message
            $output = $code === 'all'
                ? "Scraping all lottery types from ManyCai (last {$count} results)...\n\n"
                : "Scraping {$codeMapping[$code]}...\n\n";

            foreach ($results as $r) {
                $output .= "--- {$r['name']} ({$r['code']}) ---\n";
                if ($r['success']) {
                    $output .= "✅ บันทึก: {$r['first_prize']}\n\n";
                } else {
                    $output .= "❌ Failed: {$r['error']}\n\n";
                }
            }

            $output .= "Done! Success: {$successCount}, Failed: {$failedCount}";

            // Audit log
            AdminLog::log(
                'scrape',
                "ดึงผลหวย {$code} - สำเร็จ: {$successCount}, ล้มเหลว: {$failedCount}",
            );

            return response()->json([
                'success' => true,
                'message' => "ดึงข้อมูลสำเร็จ: {$successCount}, ล้มเหลว: {$failedCount}",
                'output' => $output,
                'results' => $results,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function storeManualResult(Request $request)
    {
        try {
            $request->validate([
                'lottery_type_id' => 'required|exists:lottery_types,id',
                'draw_date' => 'required|date',
                'first_prize' => 'nullable|string',
                'two_top' => 'nullable|string',
                'two_bottom' => 'nullable|string',
                'three_top' => 'nullable|string',
                'three_bottom' => 'nullable|string',
                'three_front' => 'nullable|string',
            ]);

            $lottery = LotteryType::findOrFail($request->lottery_type_id);

            // Check if result exists
            $existing = LotteryResult::where('lottery_type_id', $lottery->id)
                ->whereDate('draw_date', $request->draw_date)
                ->first();

            $fp = $request->first_prize;
            $threeTop = $request->three_top ?: ($fp ? substr($fp, -3) : null);
            $twoTop = $request->two_top ?: ($fp ? substr($fp, -2) : ($threeTop ? substr($threeTop, -2) : null));
            $resultData = [
                'first_prize' => $fp ?: $threeTop,  // ถ้าไม่มี first_prize ใช้ three_top แทน (หวยหุ้น)
                'two_top' => $twoTop,
                'two_bottom' => $request->two_bottom ?: null,
                'three_top' => $threeTop,
                'three_bottom' => $request->three_bottom ?: null,
                'three_front' => $request->three_front ?: ($fp ? substr($fp, 0, 3) : null),
            ];

            if ($existing) {
                // Update existing
                $existing->update($resultData);
                $result = $existing;
            } else {
                // Create new
                $result = LotteryResult::create(array_merge([
                    'lottery_type_id' => $lottery->id,
                    'draw_date' => $request->draw_date,
                ], $resultData));
            }

            // Log the manual entry (wrapped in try-catch to prevent breaking)
            try {
                ScraperLog::log(
                    $lottery->slug,
                    $lottery->name,
                    'manual',
                    'success',
                    'บันทึกผลหวยด้วยมือ',
                    $result->toArray(),
                    $request->draw_date
                );
            } catch (\Exception $e) {
                // Ignore log errors
            }

            // Calculate winning bets
            $calcStats = $this->calculateWinningBets($lottery->id, $request->draw_date, $result);

            return response()->json([
                'success' => true,
                'result' => $result,
                'calc_stats' => $calcStats,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * คำนวณผลรางวัล — ใช้ BetSettlementService เป็น single source of truth
     * ครอบด้วย DB::transaction เพื่อป้องกัน partial update
     */
    protected function calculateWinningBets($lotteryTypeId, $drawDate, $result)
    {
        \Log::info("calculateWinningBets called", [
            'lottery_type_id' => $lotteryTypeId,
            'draw_date' => $drawDate,
            'result_id' => $result->id,
            'first_prize' => $result->first_prize,
            'three_top' => $result->three_top,
            'two_top' => $result->two_top,
            'two_bottom' => $result->two_bottom,
        ]);

        return DB::transaction(function () use ($result) {
            $settlement = $this->settlementService->settleBets($result, true); // true = ignore draw_date (testing mode)

            \Log::info("Settlement result", $settlement);

            return [
                'total_bets' => $settlement['settled'],
                'win_count' => $settlement['won'],
                'total_payout' => $settlement['total_payout'],
            ];
        });
    }

    public function clearScraperLogs()
    {
        ScraperLog::where('created_at', '<', now()->subDays(7))->delete();
        return response()->json(['success' => true]);
    }

    /**
     * Update existing lottery result and recalculate bets
     */
    public function updateLotteryResult(Request $request, $resultId)
    {
        try {
            $request->validate([
                'first_prize' => 'required|string',
                'two_top' => 'nullable|string',
                'two_bottom' => 'nullable|string',
                'three_top' => 'nullable|string',
                'three_bottom' => 'nullable|string',
            ]);

            // Wrap entire reset → update → recalculate in a single transaction
            return DB::transaction(function () use ($request, $resultId) {
                $result = LotteryResult::findOrFail($resultId);

                // Step 1: Reset all calculated bets (คืนเงิน ถ้าจ่ายไปแล้ว)
                $resetStats = $this->resetCalculatedBets($result);

                // Step 2: Update the result with new numbers
                $result->update([
                    'first_prize' => $request->first_prize,
                    'two_top' => $request->two_top ?? substr($request->first_prize, -2),
                    'two_bottom' => $request->two_bottom,
                    'three_top' => $request->three_top ?? substr($request->first_prize, -3),
                    'three_bottom' => $request->three_bottom,
                ]);

                // Step 3: Recalculate all bets
                $calcStats = $this->recalculateBets($result);

                // Log the update
                try {
                    ScraperLog::log(
                        $result->lotteryType->slug ?? 'unknown',
                        $result->lotteryType->name ?? 'Unknown',
                        'manual_update',
                        'success',
                        'แก้ไขผลหวยและคำนวณใหม่',
                        [
                            'result' => $result->toArray(),
                            'reset_stats' => $resetStats,
                            'calc_stats' => $calcStats,
                        ],
                        $result->draw_date
                    );
                } catch (\Exception $e) {
                    // Ignore log errors
                }

                return response()->json([
                    'success' => true,
                    'result' => $result,
                    'reset_stats' => $resetStats,
                    'calc_stats' => $calcStats,
                ]);
            });
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Reset all calculated bets for a result back to pending
     * Also refund credit if bets were already paid
     */
    protected function resetCalculatedBets($result)
    {
        $stats = [
            'reset_count' => 0,
            'refunded_count' => 0,
            'refunded_amount' => 0,
        ];

        // Find all bets for this lottery type AND specific draw date that have been calculated
        // filter ตาม draw_date เพื่อไม่ให้กระทบบิลงวดอื่นที่คำนวณเสร็จแล้ว
        $bets = Bet::where('lottery_type_id', $result->lottery_type_id)
            ->whereIn('status', ['won', 'lost', 'paid'])
            ->whereDate('draw_date', $result->draw_date)
            ->get();

        foreach ($bets as $bet) {
            // If bet was won or paid, refund the user (deduct from credit)
            if (in_array($bet->status, ['won', 'paid']) && $bet->win_amount > 0) {
                $user = $bet->user;
                $originalWinAmount = $bet->win_amount;
                $refundAmount = $originalWinAmount;

                // Safeguard: Don't let credit go negative — only deduct what user actually has
                if ($user->credit < $refundAmount) {
                    $refundAmount = max(0, (float) $user->credit);
                    $shortfall = $originalWinAmount - $refundAmount;

                    \Log::warning("Credit shortfall during prize clawback: User #{$user->id} ({$user->username}) " .
                        "has ฿" . number_format($user->credit, 2) . " but prize was ฿" . number_format($originalWinAmount, 2) .
                        " — deducting ฿" . number_format($refundAmount, 2) . ", shortfall ฿" . number_format($shortfall, 2) .
                        " (Bet #{$bet->id}, เลข {$bet->number})");
                }

                if ($refundAmount > 0) {
                    // Lock user row before deducting
                    $user = User::where('id', $user->id)->lockForUpdate()->first();
                    $user->decrement('credit', $refundAmount);
                    $user->refresh();

                    // Record only the ACTUAL deducted amount (not the full prize)
                    Transaction::create([
                        'user_id' => $user->id,
                        'type' => 'adjustment',
                        'amount' => -$refundAmount,
                        'balance_after' => $user->credit,
                        'description' => "หักคืนรางวัล (แก้ไขผลหวย) เลข {$bet->number}" .
                            ($refundAmount < $originalWinAmount
                                ? " (หักได้ ฿" . number_format($refundAmount, 2) . " จาก ฿" . number_format($originalWinAmount, 2) . ")"
                                : ""),
                    ]);
                } else {
                    // User has 0 credit — log but don't create misleading transaction
                    \Log::info("Prize clawback skipped (no credit): User #{$user->id} ({$user->username}) " .
                        "Bet #{$bet->id} เลข {$bet->number} prize ฿" . number_format($originalWinAmount, 2));
                }

                $stats['refunded_count']++;
                $stats['refunded_amount'] += $refundAmount;
            }

            // Reset bet status to pending
            $bet->status = 'pending';
            $bet->win_amount = 0;
            $bet->payout_amount = 0;
            $bet->save();

            $stats['reset_count']++;
        }

        // Reset bet slip statuses
        $slipIds = $bets->pluck('bet_slip_id')->unique()->filter();
        foreach ($slipIds as $slipId) {
            $slip = BetSlip::find($slipId);
            if ($slip) {
                $slip->status = 'pending';
                $slip->save();
            }
        }

        return $stats;
    }

    /**
     * Recalculate all pending bets for a result
     */
    protected function recalculateBets($result)
    {
        return $this->calculateWinningBets(
            $result->lottery_type_id,
            $result->draw_date,
            $result
        );
    }

    /**
     * Delete lottery result and reset all bets
     */
    public function deleteLotteryResult($resultId)
    {
        try {
            return DB::transaction(function () use ($resultId) {
                $result = LotteryResult::findOrFail($resultId);

                // Reset all calculated bets first
                $resetStats = $this->resetCalculatedBets($result);

                // Delete the result
                $result->delete();

                return response()->json([
                    'success' => true,
                    'reset_stats' => $resetStats,
                ]);
            });
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    // Payout Rates Management
    public function payoutRates()
    {
        $rates = PayoutRate::orderBy('bet_type_id')->get();
        return Inertia::render('Admin/PayoutRates', [
            'rates' => $rates,
        ]);
    }

    public function updatePayoutRate(Request $request, $id)
    {
        try {
            $request->validate([
                'payout_rate' => 'required|numeric|min:0',
            ]);

            $rate = PayoutRate::findOrFail($id);
            $oldRate = $rate->payout_rate;
            $rate->update(['payout_rate' => $request->payout_rate]);

            AdminLog::log('update_payout_rate', "แก้ไขอัตราจ่าย {$rate->name}: {$oldRate} → {$request->payout_rate}");

            return response()->json([
                'success' => true,
                'message' => "อัปเดตอัตราจ่าย {$rate->name} สำเร็จ ({$oldRate} → {$request->payout_rate})",
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'เกิดข้อผิดพลาด: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Settings page
     */
    public function settings()
    {
        $keys = ['promptpay_id', 'bank_name', 'bank_account_number', 'bank_account_name', 'referral_commission_rate', 'referral_min_withdraw', 'deposit_promptpay_enabled', 'deposit_bank_enabled', 'line_contact_id', 'line_backup_id', 'line_contact_message', 'line_promotions'];
        $settings = \App\Models\Setting::getMany($keys);

        // Fallback to .env values if DB is empty
        $settings['promptpay_id'] = $settings['promptpay_id'] ?? config('services.promptpay.id', '');
        $settings['bank_name'] = $settings['bank_name'] ?? config('services.bank_account.bank_name', '');
        $settings['bank_account_number'] = $settings['bank_account_number'] ?? config('services.bank_account.account_number', '');
        $settings['bank_account_name'] = $settings['bank_account_name'] ?? config('services.bank_account.account_name', '');
        $settings['referral_commission_rate'] = $settings['referral_commission_rate'] ?? '8';
        $settings['referral_min_withdraw'] = $settings['referral_min_withdraw'] ?? '500';
        $settings['deposit_promptpay_enabled'] = $settings['deposit_promptpay_enabled'] ?? '1';
        $settings['deposit_bank_enabled'] = $settings['deposit_bank_enabled'] ?? '1';
        $settings['line_contact_id'] = $settings['line_contact_id'] ?? '@042jhjrk';
        $settings['line_backup_id'] = $settings['line_backup_id'] ?? '@042jhjrk';
        $settings['line_contact_message'] = $settings['line_contact_message'] ?? '';
        $settings['line_promotions'] = $settings['line_promotions'] ?? '';

        return Inertia::render('Admin/Settings', [
            'settings' => $settings,
        ]);
    }

    /**
     * Update settings
     */
    public function updateSettings(Request $request)
    {
        try {
            $allowed = ['promptpay_id', 'bank_name', 'bank_account_number', 'bank_account_name', 'referral_commission_rate', 'referral_min_withdraw', 'deposit_promptpay_enabled', 'deposit_bank_enabled', 'line_contact_id', 'line_backup_id', 'line_contact_message', 'line_promotions'];
            $data = $request->input('settings', []);

            $toSave = [];
            foreach ($allowed as $key) {
                if (array_key_exists($key, $data)) {
                    $toSave[$key] = $data[$key] ?? '';
                }
            }

            if (empty($toSave)) {
                return response()->json([
                    'success' => false,
                    'error' => 'ไม่มีข้อมูลที่จะบันทึก',
                ], 400);
            }

            \App\Models\Setting::setMany($toSave);

            return response()->json([
                'success' => true,
                'message' => 'บันทึกการตั้งค่าเรียบร้อย',
            ]);
        } catch (\Exception $e) {
            \Log::error('updateSettings error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'เกิดข้อผิดพลาด: ' . $e->getMessage(),
            ], 500);
        }
    }

    // =====================================================
    // BET LIMITS (วงเงินรับแทง)
    // =====================================================

    public function betLimits()
    {
        $limits = BetLimit::with('lotteryType')
            ->orderBy('lottery_type_id')
            ->orderBy('bet_type_id')
            ->orderBy('number')
            ->get();

        $lotteryTypes = LotteryType::orderBy('name')->get(['id', 'name', 'slug']);

        $betTypeNames = [
            1 => '2ตัวบน',
            2 => '2ตัวล่าง',
            3 => '3ตัวโต๊ด',
            4 => '3ตัวบน',
            5 => 'วิ่งบน',
            6 => 'วิ่งล่าง',
            9 => '3ตัวล่าง',
            10 => '4ตัวบน',
        ];

        return \Inertia\Inertia::render('Admin/BetLimits', [
            'limits' => $limits,
            'lotteryTypes' => $lotteryTypes,
            'betTypeNames' => $betTypeNames,
        ]);
    }

    public function storeBetLimit(Request $request)
    {
        try {
            $request->validate([
                'lottery_type_id' => 'nullable|exists:lottery_types,id',
                'bet_type_id' => 'nullable|integer',
                'number' => 'nullable|string|max:10',
                'max_per_bet' => 'nullable|numeric|min:0',
                'max_per_number' => 'nullable|numeric|min:0',
                'max_per_user_daily' => 'nullable|numeric|min:0',
                'max_total_per_draw' => 'nullable|numeric|min:0',
                'description' => 'nullable|string',
            ]);

            $limit = BetLimit::create([
                'lottery_type_id' => $request->lottery_type_id ?: null,
                'bet_type_id' => $request->bet_type_id ?: null,
                'number' => $request->number ?: null,
                'max_per_bet' => $request->max_per_bet ?: null,
                'max_per_number' => $request->max_per_number ?: null,
                'max_per_user_daily' => $request->max_per_user_daily ?: null,
                'max_total_per_draw' => $request->max_total_per_draw ?: null,
                'is_active' => true,
                'description' => $request->description,
            ]);

            return response()->json(['success' => true, 'limit' => $limit]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function updateBetLimit(Request $request, $id)
    {
        try {
            $limit = BetLimit::findOrFail($id);

            $request->validate([
                'lottery_type_id' => 'nullable|exists:lottery_types,id',
                'bet_type_id' => 'nullable|integer',
                'number' => 'nullable|string|max:10',
                'max_per_bet' => 'nullable|numeric|min:0',
                'max_per_number' => 'nullable|numeric|min:0',
                'max_per_user_daily' => 'nullable|numeric|min:0',
                'max_total_per_draw' => 'nullable|numeric|min:0',
                'is_active' => 'boolean',
                'description' => 'nullable|string',
            ]);

            $limit->update([
                'lottery_type_id' => $request->lottery_type_id ?: null,
                'bet_type_id' => $request->bet_type_id ?: null,
                'number' => $request->number ?: null,
                'max_per_bet' => $request->max_per_bet ?: null,
                'max_per_number' => $request->max_per_number ?: null,
                'max_per_user_daily' => $request->max_per_user_daily ?: null,
                'max_total_per_draw' => $request->max_total_per_draw ?: null,
                'is_active' => $request->has('is_active') ? $request->is_active : $limit->is_active,
                'description' => $request->description,
            ]);

            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function deleteBetLimit($id)
    {
        try {
            $limit = BetLimit::findOrFail($id);
            $limit->delete();
            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}

