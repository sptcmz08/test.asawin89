<?php

namespace App\Http\Controllers;

use App\Models\LotteryType;
use App\Models\Bet;
use App\Models\BetSlip;
use App\Models\BetLimit;
use App\Models\User;
use App\Models\Transaction;
use App\Models\SpecialNumber;
use App\Models\PayoutRate;
use App\Models\ReferralCommission;
use App\Models\Setting;
use App\Services\LotteryScheduleService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class BetController extends Controller
{
    protected $scheduleService;

    public function __construct(LotteryScheduleService $scheduleService)
    {
        $this->scheduleService = $scheduleService;
    }

    /**
     * Show betting page for a specific lottery
     */
    public function show($slug)
    {
        $lottery = LotteryType::where('slug', $slug)->firstOrFail();
        $schedule = $this->scheduleService->getSchedule($slug);

        // Get special and forbidden numbers (ไม่ใช้ date filter — ลบอัตโนมัติหลังออกรางวัล)
        $specialNumbers = SpecialNumber::where('lottery_type_id', $lottery->id)
            ->where('is_special', true)
            ->get(['number', 'bet_type_id', 'payout_rate']);

        $forbiddenNumbers = SpecialNumber::where('lottery_type_id', $lottery->id)
            ->where('is_forbidden', true)
            ->get(['number', 'bet_type_id']);

        return Inertia::render('Lottery/Bet', [
            'lottery' => [
                'id' => $lottery->id,
                'name' => $lottery->name,
                'slug' => $lottery->slug,
                'category' => $lottery->category,
                'description' => $lottery->description,
                'draw_days' => $lottery->draw_days,
                'draw_time_str' => $lottery->draw_time,
                'close_before_minutes' => $lottery->close_before_minutes,
                'draw_time' => $schedule['draw_time']->toIso8601String(),
                'close_time' => $schedule['close_time']->toIso8601String(),
                'status' => $schedule['status'],
            ],
            'specialNumbers' => $specialNumbers,
            'forbiddenNumbers' => $forbiddenNumbers,
            'payoutRates' => PayoutRate::getRatesMap(),
        ]);
    }

    /**
     * Submit bets via API
     */
    public function store(Request $request)
    {
        $request->validate([
            'lottery_slug' => 'required|string',
            'slip_name' => 'nullable|string|max:100',
            'credit_type' => 'nullable|in:real,bonus',
            'bets' => 'required|array|min:1',
            'bets.*.type_id' => 'required|integer',
            'bets.*.number' => 'required|string',
            'bets.*.amount' => 'required|numeric|min:1',
        ]);

        $creditType = $request->input('credit_type', 'real'); // 'real' or 'bonus'

        $user = $request->user();
        $lotteryType = LotteryType::where('slug', $request->lottery_slug)->first();

        if (!$lotteryType) {
            return response()->json(['error' => 'ไม่พบประเภทหวย'], 400);
        }

        // Check if lottery is active
        if (!$lotteryType->is_active) {
            return response()->json(['error' => 'หวยนี้ปิดรับแทงชั่วคราว'], 400);
        }

        // Valid bet type IDs and their expected number digit counts
        $validBetTypes = [
            1 => 2,  // 2ตัวบน
            2 => 2,  // 2ตัวล่าง
            3 => 3,  // 3ตัวโต๊ด
            4 => 3,  // 3ตัวตรง
            5 => 1,  // วิ่งบน
            6 => 1,  // วิ่งล่าง
        ];

        // Validate bet types and number format
        foreach ($request->bets as $i => $betData) {
            $typeId = (int) $betData['type_id'];
            if (!isset($validBetTypes[$typeId])) {
                return response()->json(['error' => "ประเภทการแทงไม่ถูกต้อง (type_id: {$typeId})"], 400);
            }
            $expectedDigits = $validBetTypes[$typeId];
            if (!preg_match('/^\d{' . $expectedDigits . '}$/', $betData['number'])) {
                return response()->json(['error' => "เลข {$betData['number']} ต้องเป็นตัวเลข {$expectedDigits} หลัก"], 400);
            }
        }

        // Check if user is banned
        if ($user->is_banned) {
            return response()->json(['error' => 'บัญชีของท่านถูกระงับ ไม่สามารถแทงได้'], 403);
        }

        // Check betting time
        $schedule = $this->scheduleService->getSchedule($request->lottery_slug);
        if ($schedule['status'] === 'closed') {
            return response()->json(['error' => 'หมดเวลาแทงแล้ว'], 400);
        }

        // Calculate total
        $totalAmount = collect($request->bets)->sum('amount');

        // Check balance based on credit type
        $availableBalance = $creditType === 'bonus' ? $user->bonus_credit : $user->credit;
        if ($availableBalance < $totalAmount) {
            $label = $creditType === 'bonus' ? 'โบนัสเครดิต' : 'เครดิต';
            return response()->json(['error' => "{$label}ไม่เพียงพอ"], 400);
        }

        try {
            DB::beginTransaction();

            // Lock user row to prevent concurrent credit operations (race condition)
            $user = User::where('id', $user->id)->lockForUpdate()->first();

            // Re-check credit after acquiring lock (another transaction may have deducted)
            $availableAfterLock = $creditType === 'bonus' ? $user->bonus_credit : $user->credit;
            if ($availableAfterLock < $totalAmount) {
                DB::rollBack();
                $label = $creditType === 'bonus' ? 'โบนัสเครดิต' : 'เครดิต';
                return response()->json(['error' => "{$label}ไม่เพียงพอ"], 400);
            }

            // Create bet slip
            $slip = BetSlip::create([
                'user_id' => $user->id,
                'lottery_type_id' => $lotteryType->id,
                'slip_name' => $request->slip_name ?: 'โพย ' . now()->format('d/m/Y H:i'),
                'draw_date' => $schedule['draw_time']->toDateString(),
                'total_amount' => $totalAmount,
                'status' => 'pending',
                'credit_type' => $creditType,
            ]);

            // Get special numbers with payout rates (เลขอั้น)
            // ไม่ใช้ date filter แล้ว — ลบอัตโนมัติหลังออกรางวัล
            $specialNumbersWithRates = SpecialNumber::where('lottery_type_id', $lotteryType->id)
                ->where('is_special', true)
                ->get()
                ->mapWithKeys(function ($sn) {
                    // Key = "number|bet_type_id" for bet-type-specific, or "number|" for all types
                    return [($sn->number . '|' . ($sn->bet_type_id ?? '')) => $sn->payout_rate];
                })
                ->toArray();

            // Get forbidden numbers (เลขอั้นห้ามแทง)
            $forbiddenNumbers = SpecialNumber::where('lottery_type_id', $lotteryType->id)
                ->where('is_forbidden', true)
                ->get();

            // Check for forbidden numbers in submitted bets
            foreach ($request->bets as $betData) {
                $betTypeId = (int) $betData['type_id'];
                $isForbidden = $forbiddenNumbers->contains(function ($fn) use ($betData, $betTypeId) {
                    if ($fn->number !== $betData['number'])
                        return false;
                    // Match if bet_type_id is null (applies to all) or matches specific bet type
                    return $fn->bet_type_id === null || $fn->bet_type_id === $betTypeId;
                });

                if ($isForbidden) {
                    DB::rollBack();
                    return response()->json([
                        'error' => "เลข {$betData['number']} เป็นเลขห้ามแทง"
                    ], 400);
                }
            }

            // Get current payout rates for this lottery type (lock rate at bet time)
            $payoutRatesMap = PayoutRate::getRatesMap();

            // Default rates (fallback if not in DB)
            $defaultRates = [
                1 => 90,    // 2ตัวบน
                2 => 90,    // 2ตัวล่าง
                3 => 150,   // 3ตัวโต๊ด
                4 => 900,   // 3ตัวบน
                5 => 2.4,   // วิ่งบน
                6 => 3.2,   // วิ่งล่าง
                9 => 900,   // 3ตัวล่าง
                10 => 3000, // 4ตัวบน
            ];

            // Create bets
            foreach ($request->bets as $betData) {
                // Check bet limits
                $limitCheck = BetLimit::checkBetLimit(
                    (float) $betData['amount'],
                    $lotteryType->id,
                    (int) $betData['type_id'],
                    $betData['number'],
                    $user->id,
                    $schedule['draw_time']->toDateString()
                );

                if (!$limitCheck['valid']) {
                    DB::rollBack();
                    return response()->json(['error' => $limitCheck['message']], 400);
                }

                // Determine payout rate (lock at bet time)
                $betTypeId = (int) $betData['type_id'];

                // Check for special number: bet-type-specific first, then global
                $specificKey = $betData['number'] . '|' . $betTypeId;
                $globalKey = $betData['number'] . '|';
                $isSpecial = isset($specialNumbersWithRates[$specificKey]) || isset($specialNumbersWithRates[$globalKey]);

                // อัตราจ่ายปกติ (จาก DB หรือ default)
                $normalRate = $payoutRatesMap[$betTypeId] ?? $defaultRates[$betTypeId] ?? 0;

                if ($isSpecial) {
                    // เลขอั้น → payout_rate เก็บเป็น % (เช่น 50 = จ่าย 50% ของ rate ปกติ)
                    // ใช้ rate เฉพาะ bet type ก่อน ถ้าไม่มีใช้ global
                    $specialPercent = $specialNumbersWithRates[$specificKey] ?? $specialNumbersWithRates[$globalKey] ?? 50;
                    $specialPercent = $specialPercent ?: 50;
                    $payoutRate = $normalRate * ($specialPercent / 100);
                } else {
                    // เลขปกติ → ใช้ rate เต็ม
                    $payoutRate = $normalRate;
                }

                Bet::create([
                    'bet_slip_id' => $slip->id,
                    'user_id' => $user->id,
                    'lottery_type_id' => $lotteryType->id,
                    'bet_type_id' => $betTypeId,
                    'number' => $betData['number'],
                    'amount' => $betData['amount'],
                    'payout_rate' => $payoutRate,
                    'draw_date' => $schedule['draw_time']->toDateString(),
                    'status' => 'pending',
                    'credit_type' => $creditType,
                    'is_special' => $isSpecial,
                    'bet_ip' => $request->ip(),
                ]);
            }

            // Deduct correct wallet (user row is already locked via lockForUpdate)
            if ($creditType === 'bonus') {
                $user->decrement('bonus_credit', $totalAmount);
            } else {
                $user->decrement('credit', $totalAmount);
            }
            $user->refresh();

            // Safety guard: balance should never go negative
            $balanceAfterDeduct = $creditType === 'bonus' ? $user->bonus_credit : $user->credit;
            if ($balanceAfterDeduct < 0) {
                DB::rollBack();
                \Log::error("Credit went negative for user #{$user->id} after bet deduction (type: {$creditType})");
                return response()->json(['error' => 'เครดิตไม่เพียงพอ'], 400);
            }

            // Record transaction
            $txType = $creditType === 'bonus' ? 'bonus_bet' : 'bet';
            $txDescription = $creditType === 'bonus'
                ? "แทงหวย {$lotteryType->name} (โบนัสเครดิต) - {$slip->slip_name}"
                : "แทงหวย {$lotteryType->name} - {$slip->slip_name}";

            Transaction::create([
                'user_id' => $user->id,
                'type' => $txType,
                'amount' => -$totalAmount,
                'balance_after' => $creditType === 'bonus' ? $user->bonus_credit : $user->credit,
                'description' => $txDescription,
                'reference_type' => $creditType,
            ]);

            DB::commit();

            // === Referral Commission (only on real credit bets) ===
            // === Referral Commission (only on real credit bets, not bonus) ===
            try {
                if ($user->referred_by && $creditType === 'real') {
                    $commissionRatePercent = (float) Setting::get('referral_commission_rate', '8');
                    $commissionRate = $commissionRatePercent / 100; // 1% => 0.01
                    $commissionAmount = round($totalAmount * $commissionRate, 2);

                    if ($commissionAmount > 0) {
                        DB::beginTransaction();

                        $referrer = User::where('id', $user->referred_by)->lockForUpdate()->first();
                        if ($referrer) {
                            // Create commission record (use first bet of the slip)
                            $firstBet = Bet::where('bet_slip_id', $slip->id)->first();
                            ReferralCommission::create([
                                'referrer_id' => $referrer->id,
                                'bet_user_id' => $user->id,
                                'bet_id' => $firstBet->id,
                                'bet_amount' => $totalAmount,
                                'commission_rate' => $commissionRate,
                                'commission_amount' => $commissionAmount,
                            ]);

                            // Credit referrer
                            $referrer->increment('credit', $commissionAmount);
                            $referrer->refresh();

                            // Transaction record
                            Transaction::create([
                                'user_id' => $referrer->id,
                                'type' => 'referral_commission',
                                'amount' => $commissionAmount,
                                'balance_after' => $referrer->credit,
                                'description' => "ค่าคอมแนะนำเพื่อน ({$user->username} แทง ฿" . number_format($totalAmount) . ")",
                            ]);
                        }

                        DB::commit();
                    }
                }
            } catch (\Exception $e) {
                DB::rollBack();
                \Log::warning("Referral commission failed for user #{$user->id}: " . $e->getMessage());
            }

            return response()->json([
                'success' => true,
                'slip_id' => $slip->id,
                'count' => count($request->bets),
                'total_amount' => $totalAmount,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Bet submission error for user #' . $request->user()->id . ': ' . $e->getMessage());
            return response()->json(['error' => 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'], 500);
        }
    }

    /**
     * Get user's bet history with date range and daily summary
     */
    public function history(Request $request)
    {
        $user = $request->user();
        $from = $request->get('from', now()->subDays(30)->toDateString());
        $to = $request->get('to', now()->toDateString());

        $slips = BetSlip::where('user_id', $user->id)
            ->with(['lotteryType', 'bets'])
            ->whereDate('created_at', '>=', $from)
            ->whereDate('created_at', '<=', $to)
            ->orderBy('created_at', 'desc')
            ->get();

        // Overall summary
        $totalPlayed = $slips->sum('total_amount');
        $pendingAmount = $slips->where('status', 'pending')->sum('total_amount');
        $wonPayout = $slips->flatMap->bets->whereIn('status', ['won', 'paid'])->sum('win_amount');
        $lostAmount = $slips->flatMap->bets->where('status', 'lost')->sum('amount');

        // Daily summary with lottery type breakdown
        $dailySummary = $slips->groupBy(fn($s) => $s->created_at->format('Y-m-d'))
            ->map(function ($daySlips, $date) {
                $dayBets = $daySlips->flatMap->bets;
                $totalPlayed = $dayBets->sum('amount');
                $pending = $dayBets->where('status', 'pending')->sum('amount');
                $wonPayout = $dayBets->whereIn('status', ['won', 'paid'])->sum('win_amount');
                $lostAmount = $dayBets->where('status', 'lost')->sum('amount');

                // Group by lottery type
                $lotteryBreakdown = $daySlips->groupBy('lottery_type_id')
                    ->map(function ($typeSlips) {
                    $typeBets = $typeSlips->flatMap->bets;
                    $lotteryType = $typeSlips->first()->lotteryType;
                    $typeWon = $typeBets->whereIn('status', ['won', 'paid'])->sum('win_amount');
                    $typeLost = $typeBets->where('status', 'lost')->sum('amount');
                    return [
                        'lottery_type_id' => $lotteryType->id ?? null,
                        'name' => $lotteryType->name ?? '-',
                        'slug' => $lotteryType->slug ?? '-',
                        'bet_count' => $typeBets->count(),
                        'total_played' => round($typeBets->sum('amount'), 2),
                        'pending' => round($typeBets->where('status', 'pending')->sum('amount'), 2),
                        'payout' => round($typeWon, 2),
                        'win_loss' => round($typeLost - $typeWon, 2),
                    ];
                })->values()->toArray();

                return [
                    'date' => $date,
                    'total_played' => round($totalPlayed, 2),
                    'pending' => round($pending, 2),
                    'win_loss' => round($lostAmount - $wonPayout, 2),
                    'payout' => round($wonPayout, 2),
                    'lottery_breakdown' => $lotteryBreakdown,
                ];
            })->values();

        return Inertia::render('BetHistory', [
            'slips' => $slips,
            'dailySummary' => $dailySummary,
            'overallSummary' => [
                'total_played' => round($totalPlayed, 2),
                'pending' => round($pendingAmount, 2),
                'win_loss' => round($lostAmount - $wonPayout, 2),
                'payout' => round($wonPayout, 2),
            ],
            'filters' => ['from' => $from, 'to' => $to],
        ]);
    }
}
