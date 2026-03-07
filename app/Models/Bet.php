<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Bet extends Model
{
    protected $fillable = [
        'bet_slip_id',
        'user_id',
        'lottery_type_id',
        'bet_type_id',
        'number',
        'amount',
        'payout_rate',
        'draw_date',
        'status',
        'payout_amount',
        'win_amount',
        'is_special',
    ];

    protected $casts = [
        'draw_date' => 'date',
        'amount' => 'decimal:2',
        'payout_rate' => 'decimal:2',
        'payout_amount' => 'decimal:2',
        'is_special' => 'boolean',
    ];

    public function slip()
    {
        return $this->belongsTo(BetSlip::class, 'bet_slip_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function lotteryType()
    {
        return $this->belongsTo(LotteryType::class);
    }
}
