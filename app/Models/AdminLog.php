<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdminLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'admin_id',
        'action',
        'model_type',
        'model_id',
        'before_data',
        'after_data',
        'description',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'before_data' => 'array',
        'after_data' => 'array',
        'created_at' => 'datetime',
    ];

    /**
     * Relationship: Admin who performed the action
     */
    public function admin()
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    /**
     * Get the related model if it exists
     */
    public function subject()
    {
        if ($this->model_type && $this->model_id) {
            $modelClass = "App\\Models\\{$this->model_type}";
            if (class_exists($modelClass)) {
                return $modelClass::find($this->model_id);
            }
        }
        return null;
    }

    /**
     * Log an admin action - Static helper
     */
    public static function log(
        string $action,
        ?string $description = null,
        ?string $modelType = null,
        ?int $modelId = null,
        ?array $beforeData = null,
        ?array $afterData = null
    ): self {
        return self::create([
            'admin_id' => auth()->id(),
            'action' => $action,
            'model_type' => $modelType,
            'model_id' => $modelId,
            'before_data' => $beforeData,
            'after_data' => $afterData,
            'description' => $description,
            'ip_address' => request()->ip(),
            'user_agent' => substr(request()->userAgent() ?? '', 0, 255),
        ]);
    }

    /**
     * Scope: Filter by action type
     */
    public function scopeAction($query, string $action)
    {
        return $query->where('action', $action);
    }

    /**
     * Scope: Filter by date range
     */
    public function scopeBetweenDates($query, $from, $to)
    {
        return $query->whereBetween('created_at', [$from, $to]);
    }

    /**
     * Get action label in Thai
     */
    public function getActionLabelAttribute(): string
    {
        return match ($this->action) {
            'create' => 'สร้าง',
            'update' => 'แก้ไข',
            'delete' => 'ลบ',
            'scrape' => 'ดึงผลหวย',
            'payout' => 'จ่ายเงิน',
            'add_credit' => 'เพิ่มเครดิต',
            'ban_user' => 'แบน/ปลดแบน',
            'reset_bets' => 'รีเซ็ตเดิมพัน',
            'login' => 'เข้าสู่ระบบ',
            default => $this->action,
        };
    }
}
