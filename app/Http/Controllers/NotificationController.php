<?php

namespace App\Http\Controllers;

use App\Models\UserNotification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * GET /api/notifications — ดึง notifications ของ user ล่าสุด 20 รายการ
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['notifications' => [], 'unread_count' => 0]);
        }

        $notifications = UserNotification::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        $unreadCount = UserNotification::where('user_id', $user->id)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * POST /api/notifications/mark-read — อ่านทั้งหมดหรือเฉพาะ ID
     */
    public function markRead(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false], 401);
        }

        if ($request->id) {
            // Mark specific notification as read
            UserNotification::where('id', $request->id)
                ->where('user_id', $user->id)
                ->update(['is_read' => true]);
        } else {
            // Mark all as read
            UserNotification::where('user_id', $user->id)
                ->where('is_read', false)
                ->update(['is_read' => true]);
        }

        return response()->json(['success' => true]);
    }
}
