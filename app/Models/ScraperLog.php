<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ScraperLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'lottery_slug',
        'lottery_name',
        'source',
        'status',
        'message',
        'data',
        'draw_date',
    ];

    protected $casts = [
        'data' => 'array',
        'draw_date' => 'date',
    ];

    // Scopes
    public function scopeRecent($query, $limit = 50)
    {
        return $query->orderBy('created_at', 'desc')->limit($limit);
    }

    public function scopeFailed($query)
    {
        return $query->where('status', 'failed');
    }

    public function scopeSuccess($query)
    {
        return $query->where('status', 'success');
    }

    public function scopeForLottery($query, $slug)
    {
        return $query->where('lottery_slug', $slug);
    }

    // Helper to create log
    public static function log($slug, $name, $source, $status, $message = null, $data = null, $drawDate = null)
    {
        return self::create([
            'lottery_slug' => $slug,
            'lottery_name' => $name,
            'source' => $source,
            'status' => $status,
            'message' => $message,
            'data' => $data,
            'draw_date' => $drawDate,
        ]);
    }
}
