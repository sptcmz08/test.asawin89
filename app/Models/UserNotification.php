<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserNotification extends Model
{
    protected $fillable = [
        'user_id',
        'title',
        'message',
        'type',
        'is_read',
    ];

    protected $casts = [
        'is_read' => 'boolean',
    ];

    /**
     * The user this notification belongs to
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Create a refund notification for auto-void
     */
    public static function notifyRefund(int $userId, string $lotteryName, string $betDate, float $amount, string $creditType = 'real'): self
    {
        $walletLabel = $creditType === 'bonus' ? 'โบนัสเครดิต' : 'เครดิต';
        return self::create([
            'user_id' => $userId,
            'title' => '⚠️ คืนเงินอัตโนมัติ',
            'message' => "หวย {$lotteryName} วันที่ {$betDate} ไม่มีผลออกรางวัล ระบบคืน{$walletLabel} ฿" . number_format($amount, 0) . " เข้ากระเป๋าเรียบร้อย",
            'type' => 'refund',
        ]);
    }
}
