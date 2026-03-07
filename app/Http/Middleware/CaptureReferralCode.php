<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * จับ referral code จาก URL (?ref=XXXX) แล้วเก็บไว้ใน session
 * เพื่อไม่ให้หายเมื่อผู้ใช้คลิกเมนูอื่นๆ
 */
class CaptureReferralCode
{
    public function handle(Request $request, Closure $next)
    {
        // ถ้ามี ?ref= ใน URL ให้เก็บลง session
        if ($request->has('ref') && $request->query('ref')) {
            session(['referral_code' => $request->query('ref')]);
        }

        return $next($request);
    }
}
