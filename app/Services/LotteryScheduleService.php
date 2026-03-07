<?php

namespace App\Services;

use Carbon\Carbon;
use App\Models\LotteryType;

class LotteryScheduleService
{
    public function __construct()
    {
        Carbon::setLocale('th');
    }

    /**
     * Get scheduling info for a given lottery slug.
     * Uses open_time / close_time / draw_time from the database.
     */
    public function getSchedule(string $slug)
    {
        $now = Carbon::now('Asia/Bangkok');
        $lottery = LotteryType::where('slug', $slug)->first();

        if (!$lottery || !$lottery->draw_time) {
            return [
                'draw_time' => $now->copy()->endOfDay(),
                'close_time' => $now->copy()->endOfDay(),
                'status' => 'closed',
                'desc' => '-',
            ];
        }

        $scheduleType = $lottery->schedule_type ?? 'weekly';

        return match ($scheduleType) {
            'monthly' => $this->getMonthlySchedule($now, $lottery),
            'daily' => $this->getDailySchedule($now, $lottery),
            default => $this->getWeeklySchedule($now, $lottery),
        };
    }

    /**
     * Parse time fields from lottery record.
     * Returns [todayDraw, todayOpen, todayClose] as Carbon objects for today.
     */
    private function parseTimes(Carbon $now, LotteryType $lottery)
    {
        list($drawH, $drawM) = explode(':', $lottery->draw_time);
        $drawH = (int) $drawH;
        $drawM = (int) $drawM;

        $todayDraw = $now->copy()->setTime($drawH, $drawM, 0);

        // close_time: use DB field, fallback to draw_time - close_before_minutes
        if ($lottery->close_time) {
            list($ch, $cm) = explode(':', $lottery->close_time);
            $todayClose = $now->copy()->setTime((int) $ch, (int) $cm, 0);
        } else {
            $closeBefore = $lottery->close_before_minutes ?? 30;
            $todayClose = $todayDraw->copy()->subMinutes($closeBefore);
        }

        // open_time: use DB field, fallback to draw_time + reopen_buffer_minutes
        if ($lottery->open_time) {
            list($oh, $om) = explode(':', $lottery->open_time);
            $todayOpen = $now->copy()->setTime((int) $oh, (int) $om, 0);
        } else {
            $reopenBuffer = $lottery->reopen_buffer_minutes ?? 30;
            $todayOpen = $todayDraw->copy()->addMinutes($reopenBuffer);
        }

        return [$todayDraw, $todayOpen, $todayClose];
    }

    /**
     * Compare open/close as minutes-since-midnight.
     * Returns true if open_time < close_time (same-day window).
     */
    private function isOpenBeforeClose(Carbon $open, Carbon $close): bool
    {
        $openMinutes = $open->hour * 60 + $open->minute;
        $closeMinutes = $close->hour * 60 + $close->minute;
        return $openMinutes < $closeMinutes;
    }

    // ========== MONTHLY SCHEDULE (Thai lottery, GSB, BAAC) ==========

    private function getMonthlySchedule(Carbon $now, LotteryType $lottery)
    {
        $drawDays = json_decode($lottery->draw_days, true) ?? [];
        $drawDays = array_map('intval', $drawDays);
        sort($drawDays);

        list($drawH, $drawM) = explode(':', $lottery->draw_time);
        $drawH = (int) $drawH;
        $drawM = (int) $drawM;

        [$todayDraw, $todayOpen, $todayClose] = $this->parseTimes($now, $lottery);

        // Build candidate draw dates (prev month + this month + next month)
        $candidates = [];
        $prevMonth = $now->copy()->subMonth();
        foreach ($drawDays as $day) {
            $maxDay = $prevMonth->copy()->endOfMonth()->day;
            if ($day <= $maxDay) {
                $candidates[] = Carbon::create($prevMonth->year, $prevMonth->month, $day, $drawH, $drawM, 0, 'Asia/Bangkok');
            }
        }
        foreach ($drawDays as $day) {
            $maxDay = $now->copy()->endOfMonth()->day;
            if ($day <= $maxDay) {
                $candidates[] = Carbon::create($now->year, $now->month, $day, $drawH, $drawM, 0, 'Asia/Bangkok');
            }
        }
        $nextMonth = $now->copy()->addMonth();
        foreach ($drawDays as $day) {
            $maxDay = $nextMonth->copy()->endOfMonth()->day;
            if ($day <= $maxDay) {
                $candidates[] = Carbon::create($nextMonth->year, $nextMonth->month, $day, $drawH, $drawM, 0, 'Asia/Bangkok');
            }
        }

        // Find the draw this bet belongs to (first where close hasn't passed)
        // Also track previous draw for computing open_time
        $drawTime = null;
        $prevDraw = null;
        foreach ($candidates as $date) {
            $candidateClose = $date->copy()->setTime($todayClose->hour, $todayClose->minute, 0);
            if ($now->lessThan($candidateClose)) {
                $drawTime = $date;
                break;
            }
            $prevDraw = $date;
        }

        if (!$drawTime) {
            $drawTime = end($candidates);
        }

        $closeTime = $drawTime->copy()->setTime($todayClose->hour, $todayClose->minute, 0);

        // Open time: day after previous draw at open_time
        // e.g. draw Feb 16 → open Feb 17 12:00 → close Mar 1 14:30
        if ($prevDraw) {
            $openTime = $prevDraw->copy()->addDay()->setTime($todayOpen->hour, $todayOpen->minute, 0);
        } else {
            // No previous draw (very first period) — open far back
            $openTime = $drawTime->copy()->subDays(15)->setTime($todayOpen->hour, $todayOpen->minute, 0);
        }

        // Status
        if ($now->greaterThanOrEqualTo($openTime) && $now->lessThan($closeTime)) {
            $status = 'open';
        } else {
            $status = 'closed';
        }

        $desc = 'วันที่ ' . implode(', ', $drawDays);

        return [
            'draw_time' => $drawTime,
            'close_time' => $closeTime,
            'open_time' => $openTime,
            'status' => $status,
            'desc' => $desc,
            'next_draw_date' => $drawTime->format('Y-m-d'),
        ];
    }

    // ========== DAILY SCHEDULE (Hanoi, Lao VIP, Lao Star, etc.) ==========

    private function getDailySchedule(Carbon $now, LotteryType $lottery)
    {
        [$todayDraw, $todayOpen, $todayClose] = $this->parseTimes($now, $lottery);

        // Determine which draw this bet belongs to:
        // Before close_time → draw_date = today
        // After close_time → draw_date = tomorrow
        if ($now->lessThan($todayClose)) {
            $drawTime = $todayDraw;
        } else {
            $drawTime = $todayDraw->copy()->addDay();
        }

        $closeTime = $drawTime->copy()->setTime($todayClose->hour, $todayClose->minute, 0);
        // If draw is tomorrow, close is also tomorrow
        if ($drawTime->isAfter($todayDraw)) {
            $closeTime = $todayClose->copy()->addDay();
        }

        // Open time for current draw
        // For daily, "previous draw day" = yesterday (since every day is a draw day)
        $openTime = $drawTime->copy()->setTime($todayOpen->hour, $todayOpen->minute, 0);
        // If open > close (overnight window), open is on the previous day
        if ($openTime->greaterThanOrEqualTo($closeTime)) {
            $openTime->subDay();
        }

        // Status: open only between open_time and close_time
        if ($now->greaterThanOrEqualTo($openTime) && $now->lessThan($closeTime)) {
            $status = 'open';
        } else {
            $status = 'closed';
        }

        return [
            'draw_time' => $drawTime,
            'close_time' => $closeTime,
            'open_time' => $openTime,
            'status' => $status,
            'desc' => 'ทุกวัน',
            'next_draw_date' => $drawTime->format('Y-m-d'),
        ];
    }

    // ========== WEEKLY SCHEDULE (Stocks, Lao, Malay, etc.) ==========

    private function getWeeklySchedule(Carbon $now, LotteryType $lottery)
    {
        $drawDays = json_decode($lottery->draw_days, true) ?? [];
        $drawDays = array_map('intval', $drawDays);

        // Handle "daily" string for lao-star backward compat
        if (empty($drawDays) && $lottery->draw_days === 'daily') {
            $drawDays = [0, 1, 2, 3, 4, 5, 6];
        }

        [$todayDraw, $todayOpen, $todayClose] = $this->parseTimes($now, $lottery);
        $isDrawDay = in_array($now->dayOfWeek, $drawDays);

        list($drawH, $drawM) = explode(':', $lottery->draw_time);
        $drawH = (int) $drawH;
        $drawM = (int) $drawM;

        // Find which draw this bet belongs to:
        // If today is draw day AND now < close_time → today's draw
        // Otherwise → find next draw day
        if ($isDrawDay && $now->lessThan($todayClose)) {
            $drawDateTime = $todayDraw;
        } elseif ($isDrawDay && $now->greaterThanOrEqualTo($todayClose)) {
            $drawDateTime = $this->findNextDrawDay($now, $drawDays, $drawH, $drawM);
        } else {
            $drawDateTime = $this->findNextDrawDay($now->copy()->subDay(), $drawDays, $drawH, $drawM);
        }

        // close_time is on the draw day itself
        $closeTime = $drawDateTime->copy()->setTime($todayClose->hour, $todayClose->minute, 0);

        // open_time depends on whether open < close or open > close:
        if ($this->isOpenBeforeClose($todayOpen, $todayClose)) {
            // Same-day window: open and close are on the draw day
            // e.g. stocks: open 01:00, close 08:50 → both on Mon
            $openTime = $drawDateTime->copy()->setTime($todayOpen->hour, $todayOpen->minute, 0);
        } else {
            // Overnight window: open is on the previous draw day (after results)
            // e.g. Lao: open 21:00 (Mon after draw), close 19:30 (Wed)
            $prevDrawDay = $this->findPreviousDrawDay($drawDateTime, $drawDays);
            $openTime = $prevDrawDay->copy()->setTime($todayOpen->hour, $todayOpen->minute, 0);
        }

        // Status: open only between open_time and close_time
        if ($now->greaterThanOrEqualTo($openTime) && $now->lessThan($closeTime)) {
            $status = 'open';
        } else {
            $status = 'closed';
        }

        // Description
        $dayNames = [0 => 'อา.', 1 => 'จ.', 2 => 'อ.', 3 => 'พ.', 4 => 'พฤ.', 5 => 'ศ.', 6 => 'ส.'];
        if (count($drawDays) >= 7) {
            $desc = 'ทุกวัน';
        } elseif (count($drawDays) >= 5 && !array_diff([1, 2, 3, 4, 5], $drawDays)) {
            $desc = 'จ.-ศ.';
        } else {
            $desc = implode(', ', array_map(fn($d) => $dayNames[$d] ?? '', $drawDays));
        }

        return [
            'draw_time' => $drawDateTime,
            'close_time' => $closeTime,
            'open_time' => $openTime,
            'status' => $status,
            'desc' => $desc,
            'next_draw_date' => $drawDateTime->format('Y-m-d'),
        ];
    }

    // ========== HELPERS ==========

    private function findNextDrawDay(Carbon $from, array $validDays, int $hour, int $minute)
    {
        $next = $from->copy()->addDay()->setTime($hour, $minute, 0);
        $maxIterations = 8;
        while (!in_array($next->dayOfWeek, $validDays) && $maxIterations-- > 0) {
            $next->addDay();
        }
        return $next;
    }

    /**
     * Find the previous draw day from a given date (exclusive).
     * e.g. for Wed draw with [Mon,Wed,Fri] → returns Mon
     */
    private function findPreviousDrawDay(Carbon $from, array $validDays)
    {
        $prev = $from->copy()->subDay();
        $maxIterations = 8;
        while (!in_array($prev->dayOfWeek, $validDays) && $maxIterations-- > 0) {
            $prev->subDay();
        }
        return $prev;
    }

    /**
     * Get the next draw date for a lottery (for auto-setting draw_date on bets)
     */
    public function getNextDrawDate(string $slug): string
    {
        $schedule = $this->getSchedule($slug);
        return $schedule['next_draw_date'] ?? $schedule['draw_time']->format('Y-m-d');
    }

    /**
     * Check if betting is currently open for a lottery
     */
    public function isBettingOpen(string $slug): bool
    {
        $schedule = $this->getSchedule($slug);
        return $schedule['status'] === 'open';
    }
}
