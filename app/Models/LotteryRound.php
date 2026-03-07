<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LotteryRound extends Model
{
    protected $fillable = [
        'lottery_type_id',
        'draw_date',
        'open_time',
        'close_time',
        'status',
    ];

    public function lotteryType()
    {
        return $this->belongsTo(LotteryType::class);
    }

    public function results()
    {
        return $this->hasMany(LotteryResult::class);
    }

    public function bets()
    {
        return $this->hasMany(Bet::class);
    }
}
