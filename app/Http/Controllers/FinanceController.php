<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Transaction;
use App\Models\Withdrawal;
use App\Models\Deposit;
use App\Models\BankAccount;
use App\Services\EasySlipService;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class FinanceController extends Controller
{

    /**
     * Show deposit page
     */
    public function showDeposit()
    {
        $recentDeposits = Deposit::where('user_id', auth()->id())
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return Inertia::render('Deposit', [
            'recentDeposits' => $recentDeposits,
            'promptPayId' => Setting::get('promptpay_id', config('services.promptpay.id')),
            'bankInfo' => [
                'bankName' => Setting::get('bank_name', config('services.bank_account.bank_name')),
                'accountNumber' => Setting::get('bank_account_number', config('services.bank_account.account_number')),
                'accountName' => Setting::get('bank_account_name', config('services.bank_account.account_name')),
            ],
            'depositPromptpayEnabled' => Setting::get('deposit_promptpay_enabled', '1') === '1',
            'depositBankEnabled' => Setting::get('deposit_bank_enabled', '1') === '1',
        ]);
    }



    /**
     * Verify deposit via slip image (EasySlip API)
     */
    public function verifySlipDeposit(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'กรุณาเข้าสู่ระบบก่อน'], 401);
        }

        $request->validate([
            'amount' => 'required|numeric|min:1|max:100000',
            'slip_image' => 'required|string', // base64 image
        ]);

        $amount = floatval($request->amount);
        $base64Image = $request->slip_image;

        // Remove data:image prefix if present
        if (str_contains($base64Image, ',')) {
            $base64Image = explode(',', $base64Image, 2)[1];
        }

        try {
            $easySlip = new EasySlipService();

            // 1. Verify slip with EasySlip API
            $result = $easySlip->verifySlip($base64Image);

            if (!$result['success']) {
                return response()->json([
                    'success' => false,
                    'error' => $result['error'] ?? 'ไม่สามารถตรวจสอบสลิปได้',
                ], 400);
            }

            $slipData = $result['data'];

            // 2. Validate transaction details
            $validation = $easySlip->validateTransaction($slipData, $amount);

            if (!$validation['valid']) {
                return response()->json([
                    'success' => false,
                    'error' => $validation['error'],
                ], 400);
            }

            // 3. Check for duplicate slip (transRef)
            $transRef = $slipData['transRef'];
            $existingDeposit = Deposit::where('slip_ref', $transRef)->first();

            if ($existingDeposit) {
                return response()->json([
                    'success' => false,
                    'error' => 'สลิปนี้ถูกใช้ฝากเงินแล้ว',
                ], 400);
            }

            // 4. Check slip age (max 30 minutes to prevent reuse of old slips)
            $slipDate = $slipData['date'] ?? null;
            if ($slipDate) {
                try {
                    $slipTime = \Carbon\Carbon::parse($slipDate);
                    $minutesAgo = $slipTime->diffInMinutes(now(), false);

                    if ($minutesAgo > 30) {
                        \Log::warning("Expired slip rejected", [
                            'user_id' => $user->id,
                            'transRef' => $transRef,
                            'slip_date' => $slipDate,
                            'minutes_ago' => $minutesAgo,
                        ]);
                        return response()->json([
                            'success' => false,
                            'error' => 'สลิปหมดอายุ กรุณาโอนเงินใหม่ (สลิปต้องไม่เกิน 30 นาที)',
                        ], 400);
                    }

                    if ($minutesAgo < -5) {
                        // Slip date is in the future (more than 5 min tolerance) — suspicious
                        \Log::warning("Future-dated slip rejected", [
                            'user_id' => $user->id,
                            'transRef' => $transRef,
                            'slip_date' => $slipDate,
                        ]);
                        return response()->json([
                            'success' => false,
                            'error' => 'วันเวลาในสลิปไม่ถูกต้อง',
                        ], 400);
                    }
                } catch (\Exception $e) {
                    \Log::warning("Could not parse slip date: {$slipDate}", ['error' => $e->getMessage()]);
                    // If we can't parse the date, still allow (don't block valid deposits)
                }
            }

            // 5. All checks passed — credit the user
            return DB::transaction(function () use ($user, $amount, $transRef, $slipData) {
                $deposit = Deposit::create([
                    'user_id' => $user->id,
                    'amount' => $amount,
                    'transaction_ref' => 'SLIP-' . strtoupper(\Illuminate\Support\Str::random(12)),
                    'slip_ref' => $transRef,
                    'slip_data' => $slipData['raw'] ?? $slipData,
                    'gateway_mode' => 'easyslip',
                    'status' => 'completed',
                    'completed_at' => now(),
                ]);

                // Lock user row to prevent race condition
                $user = User::where('id', $user->id)->lockForUpdate()->first();
                $user->increment('credit', $amount);
                $user->refresh();

                Transaction::create([
                    'user_id' => $user->id,
                    'type' => 'deposit',
                    'amount' => $amount,
                    'balance_after' => $user->credit,
                    'description' => 'เติมเงินผ่านสลิปโอนเงิน (EasySlip)',
                ]);

                \Log::info("Slip deposit success: User #{$user->id}, amount: {$amount}, transRef: {$transRef}");

                return response()->json([
                    'success' => true,
                    'new_balance' => $user->credit,
                    'deposit' => $deposit,
                    'message' => 'เติมเครดิตสำเร็จ!',
                ]);
            });

        } catch (\Exception $e) {
            \Log::error("Slip deposit error for user {$user->id}: " . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json([
                'success' => false,
                'error' => 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
            ], 500);
        }
    }

    /**
     * Show withdraw page
     */
    public function showWithdraw(Request $request)
    {
        $user = $request->user();

        // ดึงบัญชีธนาคารที่ลงทะเบียนมา (ไม่ให้เลือก)
        $bankAccount = BankAccount::where('user_id', $user->id)
            ->where('is_default', true)
            ->first();

        // Fallback: ถ้าไม่มี is_default ให้ดึงบัญชีแรกที่มี
        if (!$bankAccount) {
            $bankAccount = BankAccount::where('user_id', $user->id)->first();
        }

        $pendingWithdrawals = Withdrawal::where('user_id', $user->id)
            ->where('status', 'pending')
            ->orderBy('created_at', 'desc')
            ->get();

        $recentWithdrawals = Withdrawal::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return Inertia::render('Withdraw', [
            'bankAccount' => $bankAccount,
            'pendingWithdrawals' => $pendingWithdrawals,
            'recentWithdrawals' => $recentWithdrawals,
        ]);
    }

    /**
     * Handle withdrawal — ถอนไปบัญชีที่ลงทะเบียนมาอัตโนมัติ
     */
    public function withdraw(Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric|min:100',
        ]);

        $amount = $request->amount;

        try {
            return DB::transaction(function () use ($request, $amount) {
                // Lock user row to prevent concurrent withdrawals
                $user = User::where('id', $request->user()->id)->lockForUpdate()->first();

                // ดึงบัญชีที่ลงทะเบียนมา
                $bankAccount = BankAccount::where('user_id', $user->id)
                    ->where('is_default', true)
                    ->first();

                // Fallback: ถ้าไม่มี is_default ให้ดึงบัญชีแรกที่มี
                if (!$bankAccount) {
                    $bankAccount = BankAccount::where('user_id', $user->id)->first();
                }

                if (!$bankAccount) {
                    return response()->json(['error' => 'ไม่พบบัญชีธนาคาร กรุณาติดต่อแอดมิน'], 400);
                }

                // Check credit (re-check after lock — another transaction may have deducted)
                if ($amount > $user->credit) {
                    return response()->json(['error' => 'ยอดเงินไม่เพียงพอ'], 400);
                }

                // Check for pending withdrawals (ป้องกันยื่นซ้ำ)
                $pendingCount = Withdrawal::where('user_id', $user->id)
                    ->where('status', 'pending')
                    ->count();
                if ($pendingCount >= 3) {
                    return response()->json(['error' => 'คุณมีรายการถอนรอดำเนินการ 3 รายการแล้ว กรุณารอให้ดำเนินการก่อน'], 400);
                }

                // Deduct credit ทันที
                $user->decrement('credit', $amount);
                $user->refresh();

                // Safety guard: credit should never go negative
                if ($user->credit < 0) {
                    throw new \Exception('ยอดเงินไม่เพียงพอ (race condition detected)');
                }

                // สร้าง withdrawal record (รอแอดมินอนุมัติ)
                $withdrawal = Withdrawal::create([
                    'user_id' => $user->id,
                    'bank_account_id' => $bankAccount->id,
                    'amount' => $amount,
                    'status' => 'pending',
                ]);

                // Record transaction
                Transaction::create([
                    'user_id' => $user->id,
                    'type' => 'withdraw',
                    'amount' => -$amount,
                    'balance_after' => $user->credit,
                    'description' => 'ถอนเงิน (รอดำเนินการ)',
                ]);

                return response()->json([
                    'success' => true,
                    'new_balance' => $user->credit,
                    'withdrawal' => $withdrawal,
                    'gateway_status' => 'pending',
                ]);
            });

        } catch (\Exception $e) {
            \Log::error('Withdraw error for user #' . $request->user()->id . ': ' . $e->getMessage());
            return response()->json(['error' => 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'], 500);
        }
    }

    /**
     * Show transactions history
     */
    public function transactions(Request $request)
    {
        $user = $request->user();

        $transactions = Transaction::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return Inertia::render('Transactions', [
            'transactions' => $transactions,
        ]);
    }
}
