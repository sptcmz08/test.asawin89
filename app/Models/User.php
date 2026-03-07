<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'username',
        'phone',
        'email',
        'password',
        // 'credit' — ห้ามอยู่ใน fillable! ใช้ increment()/decrement() เท่านั้น
        // 'bonus_credit' — ห้ามอยู่ใน fillable! ใช้ increment()/decrement() เท่านั้น
        'line_id',
        'referral_code',
        'referred_by',
        // Security fields
        'is_banned',
        'banned_reason',
        'banned_at',
        'last_login_ip',
        'last_login_at',
        'risk_level',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_banned' => 'boolean',
            'banned_at' => 'datetime',
            'last_login_at' => 'datetime',
        ];
    }

    /**
     * Boot the model — auto-generate referral code on creating
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($user) {
            if (empty($user->referral_code)) {
                do {
                    $code = strtoupper(Str::random(8));
                } while (static::where('referral_code', $code)->exists());
                $user->referral_code = $code;
            }
        });
    }

    // =============================================
    // Security Methods
    // =============================================

    /**
     * Ban this user
     */
    public function ban(string $reason = 'ตรวจพบพฤติกรรมผิดปกติ'): void
    {
        $this->update([
            'is_banned' => true,
            'banned_reason' => $reason,
            'banned_at' => now(),
            'risk_level' => 'banned',
        ]);

        \Log::warning("🚫 User BANNED: {$this->username} (ID:{$this->id}) — {$reason}");
    }

    /**
     * Unban this user
     */
    public function unban(): void
    {
        $this->update([
            'is_banned' => false,
            'banned_reason' => null,
            'banned_at' => null,
            'risk_level' => 'normal',
        ]);
    }

    // =============================================
    // Relationships
    // =============================================

    /**
     * The user who referred this user
     */
    public function referrer()
    {
        return $this->belongsTo(User::class, 'referred_by');
    }

    /**
     * Users referred by this user
     */
    public function referrals()
    {
        return $this->hasMany(User::class, 'referred_by');
    }

    /**
     * Commissions earned from referrals
     */
    public function referralCommissions()
    {
        return $this->hasMany(ReferralCommission::class, 'referrer_id');
    }
}
