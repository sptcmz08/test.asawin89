<?php

namespace App\Http\Controllers;

use App\Models\LotteryType;
use App\Models\LotteryResult;
use App\Services\LotteryResultService;
use App\Services\BetSettlementService;
use Illuminate\Http\Request;

class LotteryResultController extends Controller
{
    protected LotteryResultService $resultService;
    protected BetSettlementService $settlementService;

    public function __construct(LotteryResultService $resultService, BetSettlementService $settlementService)
    {
        $this->resultService = $resultService;
        $this->settlementService = $settlementService;
    }

    /**
     * Get latest results for all lotteries (API endpoint)
     */
    public function latest()
    {
        $lotteries = LotteryType::where('is_active', true)->get();
        $results = [];

        foreach ($lotteries as $lottery) {
            // Try to get from database first
            $dbResult = LotteryResult::where('lottery_type_id', $lottery->id)
                ->orderBy('draw_date', 'desc')
                ->first();

            // Always include lottery type - show placeholder if no result
            $results[$lottery->slug] = [
                'name' => $lottery->name,
                'first_prize' => $dbResult ? $dbResult->first_prize : '-',
                'two_top' => $dbResult ? $dbResult->two_top : null,
                'two_bottom' => $dbResult ? $dbResult->two_bottom : null,
                'three_top' => $dbResult ? $dbResult->three_top : null,
                'draw_date' => $dbResult ? $dbResult->draw_date->toDateString() : null,
            ];
        }

        return response()->json([
            'results' => $results,
            'fetched_at' => now()->toIso8601String(),
        ])->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->header('Pragma', 'no-cache')
            ->header('Expires', '0');
    }

    /**
     * Fetch fresh results from API (can be called manually or by cron)
     */
    public function fetch(Request $request)
    {
        $slug = $request->input('slug');

        if ($slug) {
            $result = $this->resultService->fetchResult($slug);
            return response()->json(['result' => $result]);
        }

        // Fetch all
        $results = [];
        $slugs = ['thai', 'hanoi', 'lao', 'malay'];

        foreach ($slugs as $s) {
            $results[$s] = $this->resultService->fetchResult($s);
        }

        return response()->json(['results' => $results]);
    }

    /**
     * Store fetched result to database and settle bets
     */
    public function store(Request $request)
    {
        $request->validate([
            'lottery_type_id' => 'required|exists:lottery_types,id',
            'draw_date' => 'required|date',
            'first_prize' => 'nullable|string',
            'two_top' => 'nullable|string',
            'two_bottom' => 'nullable|string',
            'three_top' => 'nullable|string',
            'three_bottom' => 'nullable|string',
        ]);

        $result = LotteryResult::updateOrCreate(
            [
                'lottery_type_id' => $request->lottery_type_id,
                'draw_date' => $request->draw_date,
            ],
            $request->only([
                'first_prize',
                'two_top',
                'two_bottom',
                'three_top',
                'three_bottom'
            ])
        );

        // Auto-settle pending bets for this result
        $settlement = \DB::transaction(function () use ($result) {
            return $this->settlementService->settleBets($result);
        });

        return response()->json([
            'success' => true,
            'result' => $result,
            'settlement' => $settlement,
        ]);
    }
    /**
     * Check reward for specific date and lottery
     */
    public function checkReward(Request $request)
    {
        $request->validate([
            'slug' => 'required|string',
            'date' => 'nullable|date',
        ]);

        $lottery = LotteryType::where('slug', $request->slug)->firstOrFail();

        $query = LotteryResult::where('lottery_type_id', $lottery->id);

        if ($request->date) {
            $query->whereDate('draw_date', $request->date);
        } else {
            $query->orderBy('draw_date', 'desc');
        }

        $result = $query->first();

        if (!$result) {
            return response()->json(['result' => null]);
        }

        return response()->json(['result' => $result]);
    }

    public function history(Request $request)
    {
        $request->validate([
            'slug' => 'required|string',
            'limit' => 'integer|min:1|max:20',
        ]);

        $lottery = LotteryType::where('slug', $request->slug)->firstOrFail();
        $limit = $request->limit ?? 5;

        $results = LotteryResult::where('lottery_type_id', $lottery->id)
            ->orderBy('draw_date', 'desc')
            ->limit($limit)
            ->get();

        // Map to plain arrays to bypass model date cast UTC serialization
        $formatted = $results->map(function ($r) {
            return [
                'first_prize' => $r->first_prize,
                'three_top' => $r->three_top,
                'two_top' => $r->two_top,
                'two_bottom' => $r->two_bottom,
                'draw_date' => $r->draw_date->format('Y-m-d'),
            ];
        });

        return response()->json(['results' => $formatted]);
    }

    /**
     * Get available draw dates for a lottery type (for dropdown)
     */
    public function availableDates(Request $request)
    {
        $request->validate([
            'slug' => 'required|string',
        ]);

        $lottery = LotteryType::where('slug', $request->slug)->firstOrFail();

        $dates = LotteryResult::where('lottery_type_id', $lottery->id)
            ->orderBy('draw_date', 'desc')
            ->limit(20)
            ->pluck('draw_date')
            ->map(fn($d) => $d->format('Y-m-d'));

        return response()->json(['dates' => $dates]);
    }

}
