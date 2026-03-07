<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Bet;
use App\Models\User;
use App\Models\AdminLog;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

/**
 * 🚨 Anomaly Detection — ตรวจจับ users ที่ถูกรางวัลผิดปกติ
 * 
 * เกณฑ์ตรวจจับ:
 * 1. Win rate > 50% ใน 7 วัน (ปกติ ~5-15%)
 * 2. ถูก 3ตัวตรง ≥ 2 ครั้งใน 7 วัน
 * 3. ถูกรางวัลหลายหวยต่างประเภท ≥ 3 ประเภท/สัปดาห์
 * 4. Total payout / Total bet ratio > 10x
 */
class DetectAnomalousWins extends Command
{
    protected $signature = 'security:detect-anomalies
                            {--days=7 : Check within N days}
                            {--auto-flag : Auto-flag suspicious users as high risk}';

    protected $description = 'Detect users with suspicious winning patterns';

    public function handle()
    {
        $days = (int) $this->option('days');
        $autoFlag = $this->option('auto-flag');
        $since = Carbon::today()->subDays($days)->toDateString();

        $this->info("🔍 Scanning for anomalous wins since {$since}...\n");

        // Get all users who have won in the period
        $winners = Bet::whereIn('status', ['won', 'paid'])
            ->where('draw_date', '>=', $since)
            ->selectRaw('user_id, 
                COUNT(*) as win_count, 
                SUM(win_amount) as total_won, 
                SUM(amount) as total_bet,
                COUNT(DISTINCT lottery_type_id) as lottery_types_count,
                SUM(CASE WHEN bet_type_id = 4 THEN 1 ELSE 0 END) as three_top_wins,
                GROUP_CONCAT(DISTINCT number ORDER BY number) as numbers')
            ->groupBy('user_id')
            ->get();

        // Also get total bets (including losses) for win rate calculation
        $totalBets = Bet::where('draw_date', '>=', $since)
            ->whereIn('status', ['won', 'paid', 'lost'])
            ->selectRaw('user_id, COUNT(*) as total_bets, SUM(amount) as total_wagered')
            ->groupBy('user_id')
            ->pluck('total_bets', 'user_id')
            ->toArray();

        $totalWagered = Bet::where('draw_date', '>=', $since)
            ->whereIn('status', ['won', 'paid', 'lost'])
            ->selectRaw('user_id, SUM(amount) as total_wagered')
            ->groupBy('user_id')
            ->pluck('total_wagered', 'user_id')
            ->toArray();

        $flagged = 0;

        foreach ($winners as $w) {
            $userId = $w->user_id;
            $userTotalBets = $totalBets[$userId] ?? $w->win_count;
            $userTotalWagered = $totalWagered[$userId] ?? $w->total_bet;
            $winRate = $userTotalBets > 0 ? round(($w->win_count / $userTotalBets) * 100, 1) : 0;
            $payoutRatio = $userTotalWagered > 0 ? round($w->total_won / $userTotalWagered, 1) : 0;

            $flags = [];

            // Check 1: Win rate > 50%
            if ($winRate > 50 && $w->win_count >= 3) {
                $flags[] = "Win rate: {$winRate}% ({$w->win_count}/{$userTotalBets})";
            }

            // Check 2: Multiple 3ตัวตรง wins
            if ($w->three_top_wins >= 2) {
                $flags[] = "3ตัวตรง ถูก {$w->three_top_wins} ครั้ง";
            }

            // Check 3: Wins across many lottery types
            if ($w->lottery_types_count >= 3) {
                $flags[] = "ถูก {$w->lottery_types_count} หวยต่างประเภท";
            }

            // Check 4: Extreme payout ratio
            if ($payoutRatio > 10 && $w->total_won > 500) {
                $flags[] = "Payout ratio: {$payoutRatio}x (bet: ฿{$userTotalWagered}, won: ฿" . number_format($w->total_won) . ")";
            }

            if (empty($flags))
                continue;

            $user = User::find($userId);
            $username = $user ? $user->username : "ID:{$userId}";
            $phone = $user ? $user->phone : '?';
            $currentRisk = $user ? $user->risk_level : 'normal';

            $this->warn("🚨 User: {$username} (ID:{$userId}, Tel: {$phone})");
            $this->line("   Current risk: {$currentRisk}");
            foreach ($flags as $f) {
                $this->line("   ⚠️  {$f}");
            }
            $this->line("   Numbers: {$w->numbers}");
            $this->line('');

            // Log to laravel.log
            Log::critical("🚨 ANOMALY: User '{$username}' (ID:{$userId}) — " . implode(', ', $flags));

            // Auto-flag if requested
            if ($autoFlag && $user && $user->risk_level !== 'banned') {
                $newLevel = count($flags) >= 3 ? 'high' : 'watch';

                if ($currentRisk !== $newLevel && $currentRisk !== 'high' && $currentRisk !== 'banned') {
                    $user->update(['risk_level' => $newLevel]);
                    $this->info("   → Risk level: {$currentRisk} → {$newLevel}");

                    // Log to AdminLog
                    try {
                        AdminLog::create([
                            'admin_id' => 1,
                            'action' => 'risk_flag',
                            'model_type' => 'User',
                            'model_id' => $userId,
                            'description' => "Auto-flagged: " . implode(', ', $flags),
                            'ip_address' => '127.0.0.1',
                        ]);
                    } catch (\Exception $e) {
                        // ignore
                    }
                }
            }

            $flagged++;
        }

        if ($flagged > 0) {
            $this->info("\n🚨 Total flagged users: {$flagged}");
        } else {
            $this->info("✅ No anomalies detected!");
        }

        return Command::SUCCESS;
    }
}
