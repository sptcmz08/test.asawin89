<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Add schedule_type and reopen_buffer_minutes to lottery_types
 * so ALL schedules can be managed from Admin panel (no more hardcode)
 * 
 * schedule_type: 'daily', 'weekly', 'monthly'
 * reopen_buffer_minutes: minutes after draw before reopening for next round
 */
return new class extends Migration {
    public function up(): void
    {
        // Add columns
        Schema::table('lottery_types', function (Blueprint $table) {
            if (!Schema::hasColumn('lottery_types', 'schedule_type')) {
                $table->string('schedule_type')->default('weekly')->after('draw_days');
            }
            if (!Schema::hasColumn('lottery_types', 'reopen_buffer_minutes')) {
                $table->integer('reopen_buffer_minutes')->default(30)->after('close_before_minutes');
            }
        });

        // === Set schedule_type for each lottery ===

        // Monthly lotteries (draw on specific dates of month)
        DB::table('lottery_types')
            ->whereIn('slug', ['thai', 'baac', 'gsb-1', 'gsb-2'])
            ->update(['schedule_type' => 'monthly']);

        // Daily lotteries (draw every day)
        DB::table('lottery_types')
            ->whereIn('slug', [
                'hanoi',
                'hanoi-vip',
                'hanoi-special',
                'hanoi-adhoc',
                'hanoi-redcross',
                'lao-vip',
                'lao-star',
            ])
            ->update(['schedule_type' => 'daily']);

        // Weekly lotteries (draw on specific days of week) - this is the default
        // Includes: lao, malay, lao-samakki, all stocks, all stock-vip
        // They already have 'weekly' as default, but let's be explicit
        DB::table('lottery_types')
            ->whereNotIn('slug', [
                'thai',
                'baac',
                'gsb-1',
                'gsb-2',
                'hanoi',
                'hanoi-vip',
                'hanoi-special',
                'hanoi-adhoc',
                'hanoi-redcross',
                'lao-vip',
                'lao-star',
            ])
            ->update(['schedule_type' => 'weekly']);

        // === Set reopen_buffer_minutes ===

        // Daily lotteries: reopen 30 min after draw
        DB::table('lottery_types')
            ->where('schedule_type', 'daily')
            ->update(['reopen_buffer_minutes' => 30]);

        // Monthly lotteries: reopen next day (use large buffer)
        DB::table('lottery_types')
            ->where('schedule_type', 'monthly')
            ->update(['reopen_buffer_minutes' => 60]);

        // Stock lotteries: reopen 60 min after draw
        DB::table('lottery_types')
            ->whereIn('category', ['stock', 'stock-vip'])
            ->update(['reopen_buffer_minutes' => 60]);

        // Weekly non-stock lotteries: reopen 30 min after draw
        DB::table('lottery_types')
            ->where('schedule_type', 'weekly')
            ->whereNotIn('category', ['stock', 'stock-vip'])
            ->update(['reopen_buffer_minutes' => 30]);
    }

    public function down(): void
    {
        Schema::table('lottery_types', function (Blueprint $table) {
            if (Schema::hasColumn('lottery_types', 'schedule_type')) {
                $table->dropColumn('schedule_type');
            }
            if (Schema::hasColumn('lottery_types', 'reopen_buffer_minutes')) {
                $table->dropColumn('reopen_buffer_minutes');
            }
        });
    }
};
