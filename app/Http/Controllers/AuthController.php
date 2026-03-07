<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class AuthController extends Controller
{
    public function showLogin()
    {
        return Inertia::render('Auth/Login');
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'username' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        if (Auth::attempt($credentials)) {
            $request->session()->regenerate();

            // Check if user is admin
            if (Auth::user()->role === 'admin') {
                return redirect()->route('admin.dashboard');
            }

            // Redirect to home or intended page
            return redirect()->intended(route('home'));
        }

        return back()->withErrors([
            'username' => 'The provided credentials do not match our records.',
        ]);
    }

    public function showRegister()
    {
        // ถ้ามี ?ref= ใน URL ใช้ค่านั้น, ถ้าไม่มีดึงจาก session (ที่ middleware เก็บไว้)
        $ref = request()->query('ref') ?: session('referral_code', '');

        // ถ้า user login อยู่แล้ว ให้ redirect กลับหน้าแรก
        if (Auth::check()) {
            return redirect('/');
        }

        return Inertia::render('Auth/Register', [
            'referral_code' => $ref,
        ]);
    }

    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:users',
            'phone' => 'required|string|max:20',
            'password' => 'required|string|confirmed|min:8',
            'bank_name' => 'required|string|in:KBANK,KTB,BBL,SCB,TTB,GSB,BAY,BAAC,PROMPTPAY',
            'bank_account_number' => 'required|string|max:20',
            'bank_account_name' => 'required|string|max:255',
        ]);

        $user = \DB::transaction(function () use ($request) {
            // Look up referrer by referral code
            $referrerId = null;
            if ($request->referral_code) {
                $referrer = \App\Models\User::where('referral_code', $request->referral_code)->first();
                if ($referrer) {
                    $referrerId = $referrer->id;
                }
            }

            $user = \App\Models\User::create([
                'name' => $request->name,
                'username' => $request->username,
                'phone' => $request->phone,
                'email' => $request->username . '@local.com',
                'password' => bcrypt($request->password),
                'credit' => 0,
                'referred_by' => $referrerId,
            ]);

            // Set role explicitly (not in $fillable for security)
            $user->role = 'user';
            $user->save();

            // สร้างบัญชีธนาคาร (ล็อคถาวร ไม่สามารถเปลี่ยนได้หลังสมัคร)
            \App\Models\BankAccount::create([
                'user_id' => $user->id,
                'bank_name' => $request->bank_name,
                'account_number' => $request->bank_account_number,
                'account_name' => $request->bank_account_name,
                'is_default' => true,
            ]);

            return $user;
        });

        // ลบ referral code จาก session หลังสมัครสำเร็จ
        session()->forget('referral_code');

        Auth::login($user);
        $request->session()->regenerate();

        return redirect(route('home'));
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return redirect('/');
    }
}
