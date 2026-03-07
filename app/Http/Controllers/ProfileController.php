<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\BankAccount;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class ProfileController extends Controller
{
    /**
     * Show profile page
     */
    public function show(Request $request)
    {
        $user = $request->user();
        $bankAccounts = BankAccount::where('user_id', $user->id)->get();

        return Inertia::render('Profile', [
            'bankAccounts' => $bankAccounts,
        ]);
    }

    /**
     * Add bank account — ปิดการใช้งาน (ข้อมูลบัญชีล็อคตอนสมัคร)
     */
    public function addBankAccount(Request $request)
    {
        return response()->json([
            'success' => false,
            'message' => 'ไม่สามารถเพิ่มบัญชีธนาคารได้ ข้อมูลบัญชีถูกล็อคตอนสมัครสมาชิก',
        ], 403);
    }

    /**
     * Delete bank account — ปิดการใช้งาน (ข้อมูลบัญชีล็อคตอนสมัคร)
     */
    public function deleteBankAccount(Request $request, $id)
    {
        return response()->json([
            'success' => false,
            'message' => 'ไม่สามารถลบบัญชีธนาคารได้ ข้อมูลบัญชีถูกล็อคตอนสมัครสมาชิก',
        ], 403);
    }

    /**
     * Change password
     */
    public function changePassword(Request $request)
    {
        try {
            $request->validate([
                'current_password' => 'required|string',
                'new_password' => 'required|string|min:8',
            ]);

            $user = $request->user();

            if (!Hash::check($request->current_password, $user->password)) {
                return response()->json(['error' => 'รหัสผ่านปัจจุบันไม่ถูกต้อง'], 400);
            }

            $user->password = Hash::make($request->new_password);
            $user->save();

            return response()->json(['success' => true]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}

