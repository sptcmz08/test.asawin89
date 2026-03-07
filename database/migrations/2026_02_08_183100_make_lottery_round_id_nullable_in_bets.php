<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('bets', function (Blueprint $table) {
            if (Schema::hasColumn('bets', 'lottery_round_id')) {
                $table->unsignedBigInteger('lottery_round_id')->nullable()->change();
            }
        });
    }

    public function down(): void
    {
        // No rollback needed
    }
};
