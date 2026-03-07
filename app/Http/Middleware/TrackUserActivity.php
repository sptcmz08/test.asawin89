<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Track user activity (IP, last login) and enforce bans
 */
class TrackUserActivity
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return $next($request);
        }

        // ✅ SECURITY: Block banned users
        if ($user->is_banned) {
            \Illuminate\Support\Facades\Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')
                ->withErrors(['username' => 'บัญชีของท่านถูกระงับ กรุณาติดต่อแอดมิน']);
        }

        // Track IP and last activity (throttle to once per 5 minutes)
        $lastTracked = session('last_ip_tracked', 0);
        if (time() - $lastTracked > 300) {
            $user->timestamps = false; // Don't trigger updated_at
            $user->update([
                'last_login_ip' => $request->ip(),
                'last_login_at' => now(),
            ]);
            session(['last_ip_tracked' => time()]);
        }

        return $next($request);
    }
}
