<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BetLimit extends Model
{
    protected $fillable = [
        'lottery_type_id',
        'bet_type_id',
        'number',
        'max_per_bet',
        'max_per_number',
        'max_per_user_daily',
        'max_total_per_draw',
        'is_active',
        'description',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'max_per_bet' => 'decimal:2',
        'max_per_number' => 'decimal:2',
        'max_per_user_daily' => 'decimal:2',
        'max_total_per_draw' => 'decimal:2',
    ];

    /**
     * Relationship: Lottery Type
     */
    public function lotteryType()
    {
        return $this->belongsTo(LotteryType::class);
    }

    /**
     * Get applicable limit for a bet
     * Priority: specific number > specific bet type > specific lottery > global
     */
    public static function getApplicableLimit(
        ?int $lotteryTypeId = null,
        ?int $betTypeId = null,
        ?string $number = null
    ): ?self {
        // Try specific number first
        if ($number) {
            $limit = self::where('is_active', true)
                ->where('number', $number)
                ->where(function ($q) use ($lotteryTypeId) {
                    $q->where('lottery_type_id', $lotteryTypeId)
                        ->orWhereNull('lottery_type_id');
                })
                ->first();

            if ($limit)
                return $limit;
        }

        // Try specific bet type
        if ($betTypeId) {
            $limit = self::where('is_active', true)
                ->where('bet_type_id', $betTypeId)
                ->whereNull('number')
                ->where(function ($q) use ($lotteryTypeId) {
                    $q->where('lottery_type_id', $lotteryTypeId)
                        ->orWhereNull('lottery_type_id');
                })
                ->first();

            if ($limit)
                return $limit;
        }

        // Try specific lottery type
        if ($lotteryTypeId) {
            $limit = self::where('is_active', true)
                ->where('lottery_type_id', $lotteryTypeId)
                ->whereNull('bet_type_id')
                ->whereNull('number')
                ->first();

            if ($limit)
                return $limit;
        }

        // Return global limit
        return self::where('is_active', true)
            ->whereNull('lottery_type_id')
            ->whereNull('bet_type_id')
            ->whereNull('number')
            ->first();
    }

    /**
     * Check if a bet amount exceeds limits
     * Returns array with [valid => bool, message => string]
     */
    public static function checkBetLimit(
        float $amount,
        int $lotteryTypeId,
        int $betTypeId,
        string $number,
        int $userId,
        string $drawDate
    ): array {
        $limit = self::getApplicableLimit($lotteryTypeId, $betTypeId, $number);

        if (!$limit) {
            return ['valid' => true, 'message' => null];
        }

        // Check max per bet
        if ($limit->max_per_bet && $amount > $limit->max_per_bet) {
            return [
                'valid' => false,
                'message' => "จำนวนเงินเกินวงเงิน ({$limit->max_per_bet} บาท/ครั้ง)"
            ];
        }

        // Check max per number
        if ($limit->max_per_number) {
            $currentTotal = Bet::where('lottery_type_id', $lotteryTypeId)
                ->where('number', $number)
                ->whereDate('draw_date', $drawDate)
                ->where('status', 'pending')
                ->sum('amount');

            if (($currentTotal + $amount) > $limit->max_per_number) {
                return [
                    'valid' => false,
                    'message' => "เลข {$number} เกินวงเงินรับแทง ({$limit->max_per_number} บาท)"
                ];
            }
        }

        // Check max per user daily
        if ($limit->max_per_user_daily) {
            $userDailyTotal = Bet::where('user_id', $userId)
                ->whereDate('created_at', now()->toDateString())
                ->sum('amount');

            if (($userDailyTotal + $amount) > $limit->max_per_user_daily) {
                return [
                    'valid' => false,
                    'message' => "เกินวงเงินแทงรายวัน ({$limit->max_per_user_daily} บาท/วัน)"
                ];
            }
        }

        // Check max total per draw
        if ($limit->max_total_per_draw) {
            $drawTotal = Bet::where('lottery_type_id', $lotteryTypeId)
                ->whereDate('draw_date', $drawDate)
                ->where('status', 'pending')
                ->sum('amount');

            if (($drawTotal + $amount) > $limit->max_total_per_draw) {
                return [
                    'valid' => false,
                    'message' => "เกินวงเงินรับแทงงวดนี้"
                ];
            }
        }

        return ['valid' => true, 'message' => null];
    }
}
