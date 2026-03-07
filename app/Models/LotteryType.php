<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LotteryType extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'category',
        'description',
        'draw_days',
        'schedule_type',
        'draw_time',
        'open_time',
        'close_time',
        'close_before_minutes',
        'reopen_buffer_minutes',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function rounds()
    {
        return $this->hasMany(LotteryRound::class);
    }
}
