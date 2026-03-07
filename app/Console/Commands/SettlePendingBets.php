<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Bet;
use App\Models\LotteryResult;
use App\Models\LotteryType;
use App\Services\BetSettlementService;
use Carbon\Carbon;

/**
 * Settlement Sweep — ตรวจและ settle bets ที่มีผลแล้วแต่ยังค้าง pending
 * 
 * ป้องกันกรณี scraper บันทึกผลสำเร็จแต่ settlement ล้มเหลว
 * รันทุกชั่วโมง เป็น safety net
 */
class SettlePendingBets extends Command
{
    protected $signature = 'lottery:settle-pending
                            {--days=2 : Check pending bets within N days}';

    protected $description = 'Settle any pending bets that have results but were not settled yet';

    protected BetSettlementService $settlementService;

    public function __construct(BetSettlementService $settlementService)
    {
        parent::__construct();
        $this->settlementService = $settlementService;
    }

    public function handle()
    {
        $days = (int) $this->option('days');
        $since = Carbon::today()->subDays($days);

        $this->info("🔄 Checking for unsettled bets since {$since->format('Y-m-d')}...");

        // Find lottery types that have pending bets AND have results
        $pendingGroups = Bet::where('status', 'pending')
            ->where('draw_date', '>=', $since)
            ->selectRaw('lottery_type_id, DATE(draw_date) as draw_day, COUNT(*) as bet_count')
            ->groupBy('lottery_type_id', 'draw_day')
            ->get();

        $totalSettled = 0;
        $totalWon = 0;
        $totalPayout = 0;

        foreach ($pendingGroups as $group) {
            // Check if result exists for this lottery + draw date
            $result = LotteryResult::where('lottery_type_id', $group->lottery_type_id)
                ->whereDate('draw_date', $group->draw_day)
                ->first();

            if (!$result) {
                continue; // No result yet — skip
            }

            $lotteryType = LotteryType::find($group->lottery_type_id);
            $lotteryName = $lotteryType ? $lotteryType->name : "ID:{$group->lottery_type_id}";

            $this->info("📊 {$lotteryName} ({$group->draw_day}): {$group->bet_count} pending bets — settling...");

            try {
                $settlement = \DB::transaction(function () use ($result) {
                    return $this->settlementService->settleBets($result);
                });

                $this->info("   ✅ ถูก {$settlement['won']} จาก {$settlement['settled']} รายการ, จ่าย ฿" . number_format($settlement['total_payout'], 2));

                $totalSettled += $settlement['settled'];
                $totalWon += $settlement['won'];
                $totalPayout += $settlement['total_payout'];
            } catch (\Exception $e) {
                $this->error("   ❌ Settlement failed: " . $e->getMessage());
                \Log::error("SettlePendingBets failed for {$lotteryName} ({$group->draw_day}): " . $e->getMessage());
            }
        }

        if ($totalSettled > 0) {
            $this->info("🎯 Total: settled {$totalSettled} bets, won {$totalWon}, payout ฿" . number_format($totalPayout, 2));
        } else {
            $this->info("✅ No pending bets found — all settled!");
        }

        return Command::SUCCESS;
    }
}
