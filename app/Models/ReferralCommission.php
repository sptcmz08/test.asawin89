<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReferralCommission extends Model
{
    protected $fillable = [
        'referrer_id',
        'bet_user_id',
        'bet_id',
        'bet_amount',
        'commission_rate',
        'commission_amount',
    ];

    protected $casts = [
        'bet_amount' => 'decimal:2',
        'commission_rate' => 'decimal:4',
        'commission_amount' => 'decimal:2',
    ];

    public function referrer()
    {
        return $this->belongsTo(User::class, 'referrer_id');
    }

    public function betUser()
    {
        return $this->belongsTo(User::class, 'bet_user_id');
    }

    public function bet()
    {
        return $this->belongsTo(Bet::class);
    }
}
