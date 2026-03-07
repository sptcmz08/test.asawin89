<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BetSlip extends Model
{
    protected $fillable = [
        'user_id',
        'lottery_type_id',
        'slip_name',
        'draw_date',
        'total_amount',
        'status',
    ];

    protected $casts = [
        'draw_date' => 'date',
        'total_amount' => 'decimal:2',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function lotteryType()
    {
        return $this->belongsTo(LotteryType::class);
    }

    public function bets()
    {
        return $this->hasMany(Bet::class);
    }
}
