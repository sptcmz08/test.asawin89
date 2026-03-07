<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('bets', function (Blueprint $table) {
            // Old columns that are NOT NULL but no longer used by the new code
            if (Schema::hasColumn('bets', 'bet_type')) {
                $table->string('bet_type')->nullable()->change();
            }
            if (Schema::hasColumn('bets', 'payout_rate')) {
                $table->decimal('payout_rate', 15, 2)->nullable()->change();
            }
            if (Schema::hasColumn('bets', 'win_amount')) {
                $table->decimal('win_amount', 15, 2)->nullable()->change();
            }
        });
    }

    public function down(): void
    {
        // No rollback needed
    }
};
