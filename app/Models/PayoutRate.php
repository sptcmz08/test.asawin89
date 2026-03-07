<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PayoutRate extends Model
{
    protected $fillable = ['bet_type_id', 'name', 'payout_rate'];

    protected $casts = [
        'payout_rate' => 'float',
    ];

    /**
     * Get all payout rates as [bet_type_id => payout_rate] array
     */
    public static function getRatesMap(): array
    {
        return static::pluck('payout_rate', 'bet_type_id')->toArray();
    }
}
