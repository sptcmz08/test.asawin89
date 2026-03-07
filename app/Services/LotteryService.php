<?php

namespace App\Services;

use App\Models\Bet;
use App\Models\LotteryResult;
use App\Models\LotteryRound;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LotteryService
{
    /**
     * Process all pending bets for a specific lottery round.
     */
    public function processRoundRewards(LotteryRound $round)
    {
        $result = $round->result;
        if (!$result) {
            Log::error("Attempted to process round {$round->id} without results.");
            return;
        }

        DB::beginTransaction();
        try {
            $bets = Bet::where('lottery_round_id', $round->id)
                       ->where('status', 'pending')
                       ->lockForUpdate() // Prevent race conditions
                       ->get();

            foreach ($bets as $bet) {
                $isWin = $this->checkWin($bet, $result);

                if ($isWin) {
                    $winAmount = $bet->amount * $bet->payout_rate;
                    
                    // Update Bet
                    $bet->update([
                        'status' => 'won',
                        'win_amount' => $winAmount
                    ]);

                    // Update User Balance (lock row to prevent race condition)
                    $user = User::where('id', $bet->user_id)->lockForUpdate()->first();
                    $user->increment('credit', $winAmount);
                    $user->refresh();

                    // Log Transaction
                    Transaction::create([
                        'user_id' => $user->id,
                        'type' => 'win_payout',
                        'amount' => $winAmount,
                        'balance_after' => $user->credit,
                        'status' => 'completed',
                        'remark' => "Win Bet #{$bet->id} ({$bet->bet_type}: {$bet->number})"
                    ]);
                } else {
                    $bet->update(['status' => 'lost']);
                }
            }

            // Mark round as processed
            $round->update(['status' => 'processed']);
            
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error processing round {$round->id}: " . $e->getMessage());
        }
    }

    /**
     * Check if a single bet is a winner.
     */
    private function checkWin(Bet $bet, LotteryResult $result): bool
    {
        switch ($bet->bet_type) {
            case '3top': // 3 ตัวบน
                return $this->check3Digits($bet->number, $result->top_three);
            
            case '2top': // 2 ตัวบน
                return $bet->number === $result->top_two;

            case '2bottom': // 2 ตัวล่าง
                return $bet->number === $result->bottom_two;

            case '3tod': // 3 ตัวโต๊ด (Any order of 3 digits)
                return $this->checkTod($bet->number, $result->top_three);

            case 'run_top': // วิ่งบน (Any digit exists in top 3)
                // Logic: Check if $bet->number (single digit) exists in $result->top_three
                 return str_contains($result->top_three, $bet->number);

            case 'run_bottom': // วิ่งล่าง
                 return str_contains($result->bottom_two, $bet->number);
            
            default:
                return false;
        }
    }

    private function check3Digits($betNumber, $resultNumber)
    {
        return $betNumber === $resultNumber;
    }

    private function checkTod($betNumber, $resultNumber)
    {
        // Sort digits of both numbers and compare
        $betParts = str_split($betNumber);
        sort($betParts);
        
        $resultParts = str_split($resultNumber);
        sort($resultParts);

        return $betParts === $resultParts;
    }
}
