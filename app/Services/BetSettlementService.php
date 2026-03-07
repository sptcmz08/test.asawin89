<?php

namespace App\Services;

use App\Models\Bet;
use App\Models\BetSlip;
use App\Models\LotteryResult;
use App\Models\LotteryType;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BetSettlementService
{
    /**
     * Bet type ID mapping (matches frontend Bet.jsx BET_TYPES):
     *  1 = 2ตัวบน (2top)
     *  2 = 2ตัวล่าง (2bottom)
     *  3 = 3ตัวโต๊ด (3tod)
     *  4 = 3ตัวตรง (3straight)
     *  5 = วิ่งบน (run_top)
     *  6 = วิ่งล่าง (run_bottom)
     *  9 = 3ตัวล่าง (legacy, settlement only)
     * 10 = 4ตัวบน (legacy, settlement only)
     */

    /**
     * Settle all pending bets for a given lottery result.
     * Called after saving a result (manual or scraper).
     * 
     * NOTE: This method does NOT manage its own DB transaction.
     * The caller (e.g. calculateWinningBets) must wrap this in DB::transaction().
     */
    public function settleBets(LotteryResult $result, bool $ignoreDrawDate = false): array
    {
        $lotteryType = LotteryType::find($result->lottery_type_id);
        if (!$lotteryType) {
            Log::error("BetSettlement: LotteryType not found for ID {$result->lottery_type_id}");
            return ['settled' => 0, 'won' => 0, 'total_payout' => 0];
        }

        // Find all pending bets matching this lottery type
        // When $ignoreDrawDate = true (testing mode), match ALL pending bets regardless of draw_date
        $query = Bet::where('lottery_type_id', $result->lottery_type_id)
            ->where('status', 'pending');

        if (!$ignoreDrawDate) {
            $query->whereDate('draw_date', $result->draw_date);
        }

        $bets = $query->get();

        Log::info("BetSettlement: Looking for bets", [
            'lottery_type_id' => $result->lottery_type_id,
            'lottery_name' => $lotteryType->name,
            'draw_date' => $result->draw_date instanceof \Carbon\Carbon ? $result->draw_date->toDateString() : $result->draw_date,
            'result_three_top' => $result->three_top,
            'result_two_top' => $result->two_top,
            'result_two_bottom' => $result->two_bottom,
            'pending_bets_found' => $bets->count(),
        ]);

        if ($bets->isEmpty()) {
            Log::info("BetSettlement: No pending bets found for {$lotteryType->name} on " . ($result->draw_date instanceof \Carbon\Carbon ? $result->draw_date->toDateString() : $result->draw_date));
            return ['settled' => 0, 'won' => 0, 'total_payout' => 0];
        }

        $winCount = 0;
        $totalPayout = 0;

        foreach ($bets as $bet) {
            $isWin = $this->checkWin($bet, $result);

            Log::info("BetSettlement: Checking bet #{$bet->id}", [
                'number' => $bet->number,
                'bet_type_id' => $bet->bet_type_id,
                'amount' => $bet->amount,
                'is_win' => $isWin,
            ]);

            if ($isWin) {
                // Calculate win amount: amount * payout_rate (from bet) or from bet type payout
                $payoutRate = $bet->payout_rate ?: $this->getPayoutRate($bet, $lotteryType);
                $winAmount = $bet->amount * $payoutRate;

                // Set status to 'won' (pending admin approval)
                // Payout always goes to real credit (user.credit) regardless of credit_type
                // Bonus bets: staked from bonus_credit, but winnings go to real credit
                $bet->status = 'won';
                $bet->payout_amount = $winAmount;
                $bet->win_amount = $winAmount;
                $bet->save();

                Log::info("BetSettlement: Bet #{$bet->id} won (credit_type: " . ($bet->credit_type ?? 'real') . ") → payout {$winAmount} will go to real credit when admin pays");

                $winCount++;
                $totalPayout += $winAmount;
            } else {
                $bet->status = 'lost';
                $bet->payout_amount = 0;
                $bet->win_amount = 0;
                $bet->save();
            }
        }

        // Update bet slip statuses
        $slipIds = $bets->pluck('bet_slip_id')->unique()->filter();
        foreach ($slipIds as $slipId) {
            $slip = BetSlip::find($slipId);
            if ($slip) {
                $hasPaid = Bet::where('bet_slip_id', $slipId)->whereIn('status', ['won', 'paid'])->exists();
                $allSettled = !Bet::where('bet_slip_id', $slipId)->where('status', 'pending')->exists();

                if ($allSettled) {
                    $slip->status = $hasPaid ? 'won' : 'lost';
                    $slip->save();
                }
            }
        }

        Log::info("BetSettlement: Settled {$bets->count()} bets for {$lotteryType->name} (" . ($result->draw_date instanceof \Carbon\Carbon ? $result->draw_date->toDateString() : $result->draw_date) . "). Won: {$winCount}, Total payout: {$totalPayout}");

        return [
            'settled' => $bets->count(),
            'won' => $winCount,
            'total_payout' => $totalPayout,
        ];
    }

    /**
     * Check if a bet wins against the lottery result.
     */
    private function checkWin(Bet $bet, LotteryResult $result): bool
    {
        $betNumber = $bet->number;
        $betTypeId = (int) $bet->bet_type_id;

        // Extract result numbers
        $firstPrize = $result->first_prize;    // e.g. "123520" for thai, "520" for foreign
        $threeTop = $result->three_top ?: ($firstPrize ? substr($firstPrize, -3) : null);
        $twoTop = $result->two_top ?: ($firstPrize ? substr($firstPrize, -2) : null);
        $twoBottom = $result->two_bottom;
        $threeBottom = $result->three_bottom;

        switch ($betTypeId) {
            case 1: // 2ตัวบน
                return $betNumber === $twoTop;

            case 2: // 2ตัวล่าง
                return $betNumber === $twoBottom;

            case 3: // 3ตัวโต๊ด (any permutation)
                return $threeTop && $this->isPermutation($betNumber, $threeTop);

            case 4: // 3ตัวบน
                return $betNumber === $threeTop;

            case 5: // วิ่งบน (single digit appears in 3ตัวบน)
                return $threeTop && str_contains($threeTop, $betNumber);

            case 6: // วิ่งล่าง (single digit appears in 2ตัวล่าง)
                return $twoBottom && str_contains($twoBottom, $betNumber);

            case 9: // 3ตัวล่าง (อาจมีหลายค่า คั่นด้วย comma เช่น "123,456")
                if (!$threeBottom)
                    return false;
                $threeBottomValues = explode(',', $threeBottom);
                return in_array($betNumber, array_map('trim', $threeBottomValues));

            case 10: // 4ตัวบน
                return $betNumber === $firstPrize ||
                    ($firstPrize && strlen($firstPrize) > 4 && $betNumber === substr($firstPrize, -4));

            default:
                return false;
        }
    }

    /**
     * Get the payout rate for a bet type from the lottery type default rates.
     */
    private function getPayoutRate(Bet $bet, LotteryType $lotteryType): float
    {
        // Try to get from payout_rates table (global rates, not per lottery type)
        $rate = DB::table('payout_rates')
            ->where('bet_type_id', $bet->bet_type_id)
            ->value('payout_rate');

        if ($rate) {
            return (float) $rate;
        }

        // Default rates (fallback if DB has no record)
        $defaults = [
            1 => 90,    // 2ตัวบน
            2 => 90,    // 2ตัวล่าง
            3 => 150,   // 3ตัวโต๊ด
            4 => 900,   // 3ตัวบน
            5 => 2.4,   // วิ่งบน
            6 => 3.2,   // วิ่งล่าง
            9 => 900,   // 3ตัวล่าง
            10 => 3000, // 4ตัวบน
        ];

        return $defaults[$bet->bet_type_id] ?? 0;
    }

    /**
     * Check if two strings are permutations of each other.
     */
    private function isPermutation(string $a, string $b): bool
    {
        $arrA = str_split($a);
        $arrB = str_split($b);
        sort($arrA);
        sort($arrB);
        return $arrA === $arrB;
    }
}
