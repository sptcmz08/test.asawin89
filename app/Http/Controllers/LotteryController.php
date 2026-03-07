<?php

namespace App\Http\Controllers;

use App\Models\LotteryType;
use App\Models\LotteryResult;
use App\Services\LotteryScheduleService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class LotteryController extends Controller
{
    protected $scheduleService;

    public function __construct(LotteryScheduleService $scheduleService)
    {
        $this->scheduleService = $scheduleService;
    }

    public function index()
    {
        $lotteryTypes = LotteryType::where('is_active', true)
            ->orWhereNull('is_active')
            ->get();

        // Fetch latest result per lottery type (one query, N+1 safe)
        $latestResults = LotteryResult::whereIn('lottery_type_id', $lotteryTypes->pluck('id'))
            ->orderByDesc('draw_date')
            ->orderByDesc('id')
            ->get()
            ->unique('lottery_type_id')
            ->keyBy('lottery_type_id');

        $lotteries = $lotteryTypes->map(function ($lottery) use ($latestResults) {
                $schedule = $this->scheduleService->getSchedule($lottery->slug);
                $result = $latestResults->get($lottery->id);

                return [
                    'id' => $lottery->id,
                    'name' => $lottery->name,
                    'slug' => $lottery->slug,
                    'category' => $lottery->category,
                    'description' => $lottery->description,
                    'draw_days' => $lottery->draw_days,
                    'draw_time_str' => $lottery->draw_time,
                    // Schedule data
                    'draw_time' => $schedule['draw_time']->toIso8601String(),
                    'close_time' => $schedule['close_time']->toIso8601String(),
                    'status' => $schedule['status'],
                    'schedule_desc' => $schedule['desc'],
                    'next_draw_date' => $schedule['next_draw_date'] ?? $schedule['draw_time']->format('Y-m-d'),
                    'next_draw_day' => $schedule['draw_time']->locale('th')->dayName,
                    'next_draw_time_formatted' => $schedule['draw_time']->format('H:i'),
                    'next_open_day' => isset($schedule['open_time']) ? $schedule['open_time']->locale('th')->dayName : null,
                    'next_open_time' => isset($schedule['open_time']) ? $schedule['open_time']->format('H:i') : null,
                    // Colors for UI
                    'color' => $this->getColorForSlug($lottery->slug),
                    // Latest result
                    'latest_result' => $result ? [
                        'draw_date' => $result->draw_date->format('d/m/Y'),
                        'three_top' => $result->three_top,
                        'two_top' => $result->two_top,
                        'two_bottom' => $result->two_bottom,
                    ] : null,
                ];
            });

        return Inertia::render('Welcome', [
            'lotteries' => $lotteries,
            'serverTime' => now()->toIso8601String(),
        ]);
    }

    private function getColorForSlug($slug)
    {
        return match (true) {
            $slug === 'thai' => 'from-red-600 via-blue-800 to-blue-900',
            $slug === 'baac' => 'from-green-600 to-green-800',
            in_array($slug, ['gsb-1', 'gsb-2']) => 'from-pink-500 to-rose-700',
            $slug === 'lao' => 'from-blue-700 to-blue-900',
            $slug === 'lao-vip' => 'from-red-600 to-blue-800',
            $slug === 'lao-star' => 'from-indigo-600 to-indigo-900',
            $slug === 'lao-samakki' => 'from-blue-600 to-cyan-800',
            $slug === 'hanoi' => 'from-red-600 to-yellow-600',
            $slug === 'hanoi-special' => 'from-red-700 to-red-900',
            $slug === 'hanoi-vip' => 'from-yellow-500 to-red-600',
            $slug === 'hanoi-redcross' => 'from-red-600 to-rose-800',
            in_array($slug, ['hanoi-set4', 'lao-set4']) => 'from-amber-600 to-orange-800',
            $slug === 'malay' => 'from-blue-800 to-red-700',
            str_ends_with($slug, '-vip') => 'from-purple-700 to-violet-900',
            str_starts_with($slug, 'nikkei') => 'from-red-700 to-red-900',
            str_starts_with($slug, 'china') => 'from-red-600 to-yellow-700',
            str_starts_with($slug, 'hangseng') => 'from-teal-700 to-emerald-900',
            default => 'from-gray-700 to-gray-900',
        };
    }
}
