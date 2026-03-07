<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SpecialNumber extends Model
{
    protected $fillable = [
        'lottery_type_id',
        'bet_type_id',
        'number',
        'is_special',
        'is_forbidden',
        'payout_rate',
        'start_date',
        'end_date',
    ];

    protected $casts = [
        'is_special' => 'boolean',
        'is_forbidden' => 'boolean',
        'payout_rate' => 'decimal:2',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function lotteryType()
    {
        return $this->belongsTo(LotteryType::class);
    }
}
