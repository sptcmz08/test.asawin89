<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\LotteryController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BetController;
use App\Http\Controllers\LotteryResultController;
use App\Http\Controllers\FinanceController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ReferralController;

// Public routes
Route::get('/', [LotteryController::class, 'index'])->name('home');

// กติกาการเล่น (public)
Route::get('/rules', function () {
    return \Inertia\Inertia::render('Rules');
})->name('rules');

// Guest routes (with rate limiting to prevent brute-force)
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:3,1');
});

// Register page accessible even when logged in (controller handles redirect)
// เพื่อให้ referral link ทำงานได้ — ถ้า login อยู่ controller จะ redirect กลับ
Route::get('/register', [AuthController::class, 'showRegister'])->name('register');


Route::match(['get', 'post'], '/logout', [AuthController::class, 'logout'])->name('logout');

// Authenticated routes
Route::middleware(['auth'])->group(function () {
    // Betting
    Route::get('/bet/{slug}', [BetController::class, 'show'])->name('bet.show');
    Route::get('/bets', [BetController::class, 'history'])->name('bets.history');

    // Financial
    Route::get('/deposit', [FinanceController::class, 'showDeposit'])->name('deposit');
    Route::get('/withdraw', [FinanceController::class, 'showWithdraw'])->name('withdraw');
    Route::get('/transactions', [FinanceController::class, 'transactions'])->name('transactions');

    // Profile
    Route::get('/profile', [ProfileController::class, 'show'])->name('profile');

    // Referral
    Route::get('/referral', [ReferralController::class, 'index'])->name('referral');
});

// Admin Routes (เฉพาะ role = admin เท่านั้น)
Route::middleware(['auth', 'admin'])->prefix('admin')->group(function () {
    // Dashboard Pages
    Route::get('/', [AdminController::class, 'dashboard'])->name('admin.dashboard');
    Route::get('/users', [AdminController::class, 'users'])->name('admin.users');
    Route::get('/bets', [AdminController::class, 'bets'])->name('admin.bets');
    Route::post('/bets/{slip}/cancel', [AdminController::class, 'cancelBetSlip'])->name('admin.bets.cancel');
    Route::get('/withdrawals', [AdminController::class, 'withdrawals'])->name('admin.withdrawals');
    Route::get('/payments', [AdminController::class, 'payments'])->name('admin.payments');
    Route::get('/lucky-numbers', [AdminController::class, 'luckyNumbers'])->name('admin.lucky-numbers');
    Route::get('/schedule', [AdminController::class, 'schedule'])->name('admin.schedule');
    Route::get('/lottery-results', [AdminController::class, 'lotteryResults'])->name('admin.lottery-results');
    Route::get('/payout-rates', [AdminController::class, 'payoutRates'])->name('admin.payout-rates');

    // Users API
    Route::post('/users/{id}/credit', [AdminController::class, 'addCredit']);
    Route::post('/users/{id}/deduct-credit', [AdminController::class, 'deductCredit']);
    Route::post('/users/{id}/bonus-credit', [AdminController::class, 'addBonusCredit']);
    Route::post('/users/{id}/toggle-ban', [AdminController::class, 'toggleBan']);
    Route::post('/users/{id}/reset-password', [AdminController::class, 'resetPassword']);

    // Withdrawals API
    Route::post('/withdrawals/{id}/approve', [AdminController::class, 'approveWithdrawal']);
    Route::post('/withdrawals/{id}/reject', [AdminController::class, 'rejectWithdrawal']);

    // Payments API
    Route::post('/payments/{id}/pay', [AdminController::class, 'payBet']);
    Route::post('/payments/pay-all', [AdminController::class, 'payAllBets']);

    // Lucky Numbers API
    Route::post('/lucky-numbers', [AdminController::class, 'storeLuckyNumber']);
    Route::delete('/lucky-numbers/{id}', [AdminController::class, 'deleteLuckyNumber']);

    // Lottery Types API
    Route::put('/lottery-types/{id}', [AdminController::class, 'updateLotteryType']);
    Route::post('/lottery-types/{id}/toggle', [AdminController::class, 'toggleLotteryType']);

    // Lottery Results API
    Route::post('/lottery-results/scrape', [AdminController::class, 'triggerScrape']);
    Route::post('/lottery-results/scrape-manycai', [AdminController::class, 'triggerManyCaiScrape']);
    Route::post('/lottery-results/manual', [AdminController::class, 'storeManualResult']);
    Route::put('/lottery-results/{id}', [AdminController::class, 'updateLotteryResult']);
    Route::delete('/lottery-results/{id}', [AdminController::class, 'deleteLotteryResult']);
    Route::delete('/lottery-results/logs/clear', [AdminController::class, 'clearScraperLogs']);

    // Payout Rates API
    Route::put('/payout-rates/{id}', [AdminController::class, 'updatePayoutRate']);

    // Bet Limits
    Route::get('/bet-limits', [AdminController::class, 'betLimits'])->name('admin.bet-limits');
    Route::post('/bet-limits', [AdminController::class, 'storeBetLimit']);
    Route::put('/bet-limits/{id}', [AdminController::class, 'updateBetLimit']);
    Route::delete('/bet-limits/{id}', [AdminController::class, 'deleteBetLimit']);

    // Settings
    Route::get('/settings', [AdminController::class, 'settings'])->name('admin.settings');
    Route::post('/settings', [AdminController::class, 'updateSettings']);
});

// API Routes
Route::prefix('api')->group(function () {
    // Public lottery results
    Route::get('/lottery-results', [LotteryResultController::class, 'latest'])->name('api.results.latest');
    Route::get('/lottery-results/check', [LotteryResultController::class, 'checkReward'])->name('api.results.check');
    Route::get('/lottery-results/history', [LotteryResultController::class, 'history'])->name('api.results.history');
    Route::get('/lottery-results/available-dates', [LotteryResultController::class, 'availableDates'])->name('api.results.dates');

    // Protected routes (with rate limiting)
    Route::middleware(['auth'])->group(function () {
        Route::post('/bets', [BetController::class, 'store'])->name('api.bets.store')->middleware('throttle:30,1');
        Route::post('/deposit/verify-slip', [FinanceController::class, 'verifySlipDeposit'])->name('api.deposit.verify-slip')->middleware('throttle:5,1');
        Route::post('/deposit/dev', [FinanceController::class, 'devDeposit'])->name('api.deposit.dev')->middleware('throttle:10,1');
        Route::post('/withdraw', [FinanceController::class, 'withdraw'])->name('api.withdraw')->middleware('throttle:5,1');

        // Profile APIs
        Route::post('/profile/bank-accounts', [ProfileController::class, 'addBankAccount']);
        Route::delete('/profile/bank-accounts/{id}', [ProfileController::class, 'deleteBankAccount']);
        Route::post('/profile/password', [ProfileController::class, 'changePassword'])->middleware('throttle:3,1');

        // Notifications API
        Route::get('/notifications', [\App\Http\Controllers\NotificationController::class, 'index'])->name('api.notifications');
        Route::post('/notifications/mark-read', [\App\Http\Controllers\NotificationController::class, 'markRead'])->name('api.notifications.mark-read');
    });

    // Admin-only API routes
    Route::middleware(['auth', 'admin'])->group(function () {
        Route::post('/lottery-results/fetch', [LotteryResultController::class, 'fetch'])->name('api.results.fetch');
    });
});

// LINE OA Webhook
Route::post('/webhook/line', [\App\Http\Controllers\LineWebhookController::class, 'handle']);

// =====================================================
// CRON Routes (สำหรับ Plesk Shared Hosting)
// =====================================================
// ใช้งาน: เรียก URL พร้อม secret key ผ่าน cron-job.org หรือ Plesk Scheduled Tasks
// ตัวอย่าง: curl "https://yourdomain.com/cron/scrape?secret=YOUR_SECRET_KEY"
// =====================================================

Route::prefix('cron')->group(function () {

    // ดึงผลหวยล่าสุดจาก ManyCai /Issue/draw
    // เรียก URL นี้เมื่อต้องการ scrape ทันที
    Route::get('/scrape', function () {
        $secret = env('CRON_SECRET');
        if (!$secret || !hash_equals($secret, (string) request()->query('secret', ''))) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        \Artisan::call('lottery:auto-scrape', ['--all' => true, '--calculate' => true]);
        return response()->json([
            'success' => true,
            'message' => 'Scrape completed',
            'output' => \Artisan::output(),
            'timestamp' => now()->toIso8601String(),
        ]);
    });

    // ดึงผลหวยย้อนหลัง (รันวันละครั้ง)
    Route::get('/scrape-history', function () {
        $secret = env('CRON_SECRET');
        if (!$secret || !hash_equals($secret, (string) request()->query('secret', ''))) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $count = request()->query('count', 10);
        \Artisan::call('lottery:manycai', ['--all' => true, '--count' => (int) $count]);
        return response()->json([
            'success' => true,
            'message' => "Scraped {$count} results",
            'output' => \Artisan::output(),
            'timestamp' => now()->toIso8601String(),
        ]);
    });

    // Health check (ต้องใช้ secret เพื่อป้องกันข้อมูล internal รั่ว)
    Route::get('/health', function () {
        $secret = env('CRON_SECRET');
        if (!$secret || !hash_equals($secret, (string) request()->query('secret', ''))) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        // Check recent scraper failures (last 6 hours)
        $recentFailures = \App\Models\ScraperLog::where('status', 'failed')
            ->where('created_at', '>=', now()->subHours(6))
            ->count();

        $lastSuccess = \App\Models\ScraperLog::where('status', 'success')
            ->latest()
            ->first();

        // Count consecutive failures (since last success)
        $consecutiveFailures = 0;
        if ($lastSuccess) {
            $consecutiveFailures = \App\Models\ScraperLog::where('status', 'failed')
                ->where('created_at', '>', $lastSuccess->created_at)
                ->count();
        } else {
            $consecutiveFailures = \App\Models\ScraperLog::where('status', 'failed')->count();
        }

        // Check if last scrape was too long ago (no results in 2 hours)
        $lastResult = \App\Models\LotteryResult::latest('created_at')->first();
        $hoursSinceLastResult = $lastResult ? now()->diffInHours($lastResult->created_at) : null;

        $warnings = [];
        if ($consecutiveFailures >= 3) {
            $warnings[] = "⚠️ Scraper failed {$consecutiveFailures} times consecutively";
        }
        if ($recentFailures >= 5) {
            $warnings[] = "⚠️ {$recentFailures} scraper failures in last 6 hours";
        }

        return response()->json([
            'status' => count($warnings) > 0 ? 'warning' : 'ok',
            'timestamp' => now()->toIso8601String(),
            'scraper' => [
                'recent_failures_6h' => $recentFailures,
                'consecutive_failures' => $consecutiveFailures,
                'last_success' => $lastSuccess?->created_at?->toIso8601String(),
                'last_result' => $lastResult?->created_at?->toIso8601String(),
                'hours_since_last_result' => $hoursSinceLastResult,
            ],
            'warnings' => $warnings,
        ]);
    });
});

