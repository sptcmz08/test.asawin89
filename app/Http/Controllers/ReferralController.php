<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\ReferralCommission;
use App\Models\Setting;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ReferralController extends Controller
{
    /**
     * Referral page — show link, stats, commission history
     */
    public function index(Request $request)
    {
        $user = $request->user();

        // Stats
        $totalReferrals = User::where('referred_by', $user->id)->count();
        $totalCommission = ReferralCommission::where('referrer_id', $user->id)
            ->sum('commission_amount');

        // Commission history (latest 50)
        $commissions = ReferralCommission::where('referrer_id', $user->id)
            ->with('betUser:id,name,username')
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get()
            ->map(function ($c) {
                return [
                    'id' => $c->id,
                    'bet_user_name' => $c->betUser->name ?? '-',
                    'bet_amount' => $c->bet_amount,
                    'commission_rate' => $c->commission_rate * 100, // convert to %
                    'commission_amount' => $c->commission_amount,
                    'created_at' => $c->created_at->format('d/m/Y H:i'),
                ];
            });

        // Referral list
        $referrals = User::where('referred_by', $user->id)
            ->select('id', 'name', 'username', 'created_at')
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get()
            ->map(function ($r) {
                return [
                    'id' => $r->id,
                    'name' => $r->name,
                    'username' => $r->username,
                    'joined_at' => $r->created_at->format('d/m/Y H:i'),
                ];
            });

        $commissionRate = (float) Setting::get('referral_commission_rate', '8');

        return Inertia::render('Referral', [
            'referralCode' => $user->referral_code,
            'stats' => [
                'total_referrals' => $totalReferrals,
                'total_commission' => round($totalCommission, 2),
                'commission_rate' => $commissionRate,
            ],
            'commissions' => $commissions,
            'referrals' => $referrals,
        ]);
    }
}
