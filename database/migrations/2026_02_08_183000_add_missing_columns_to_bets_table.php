<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('bets', function (Blueprint $table) {
            if (!Schema::hasColumn('bets', 'lottery_type_id')) {
                $table->unsignedBigInteger('lottery_type_id')->nullable()->after('user_id');
            }
            if (!Schema::hasColumn('bets', 'bet_slip_id')) {
                $table->unsignedBigInteger('bet_slip_id')->nullable()->after('id');
            }
            if (!Schema::hasColumn('bets', 'bet_type_id')) {
                $table->unsignedInteger('bet_type_id')->nullable()->after('lottery_type_id');
            }
            if (!Schema::hasColumn('bets', 'draw_date')) {
                $table->date('draw_date')->nullable()->after('amount');
            }
            if (!Schema::hasColumn('bets', 'payout_amount')) {
                $table->decimal('payout_amount', 12, 2)->nullable()->after('status');
            }
            if (!Schema::hasColumn('bets', 'is_special')) {
                $table->boolean('is_special')->default(false)->after('payout_amount');
            }
        });

        // Add indexes
        try {
            Schema::table('bets', function (Blueprint $table) {
                $table->index(['lottery_type_id', 'draw_date', 'number'], 'bets_lottery_draw_number_idx');
                $table->index(['user_id', 'draw_date'], 'bets_user_draw_idx');
                $table->index(['status', 'draw_date'], 'bets_status_draw_idx');
            });
        } catch (\Exception $e) {
            // Indexes may already exist
        }
    }

    public function down(): void
    {
        Schema::table('bets', function (Blueprint $table) {
            $cols = ['lottery_type_id', 'bet_slip_id', 'bet_type_id', 'draw_date', 'payout_amount', 'is_special'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('bets', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
