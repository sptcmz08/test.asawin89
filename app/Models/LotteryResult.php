<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LotteryResult extends Model
{
    protected $table = 'lottery_results';
    
    protected $fillable = [
        'lottery_type_id',
        'draw_date',
        'first_prize',
        'two_top',
        'two_bottom',
        'three_top',
        'three_bottom',
        'three_front',
        'details',
        'raw_data',
    ];

    protected $casts = [
        'draw_date' => 'date',
        'raw_data' => 'array',
        'details' => 'array',
    ];

    public function lotteryType()
    {
        return $this->belongsTo(LotteryType::class);
    }
}
