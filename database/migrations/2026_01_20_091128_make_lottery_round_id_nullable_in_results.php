<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('lottery_results', function (Blueprint $table) {
            if (Schema::hasColumn('lottery_results', 'lottery_round_id')) {
                // Use unsignedBigInteger for changing foreign key column
                $table->unsignedBigInteger('lottery_round_id')->nullable()->change();
            }
            if (Schema::hasColumn('lottery_results', 'details')) {
                $table->json('details')->nullable()->change();
            }
        });
    }

    public function down(): void
    {
        Schema::table('lottery_results', function (Blueprint $table) {
            if (Schema::hasColumn('lottery_results', 'lottery_round_id')) {
                $table->unsignedBigInteger('lottery_round_id')->nullable(false)->change();
            }
            // Cannot easily revert nullable to not-null if data contains nulls, but for strict down:
            // $table->json('details')->nullable(false)->change();
        });
    }
};
