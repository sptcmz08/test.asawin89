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
            // Renames
            if (Schema::hasColumn('lottery_results', 'top_three')) {
                $table->renameColumn('top_three', 'three_top');
            }
            if (Schema::hasColumn('lottery_results', 'top_two')) {
                $table->renameColumn('top_two', 'two_top');
            }
            if (Schema::hasColumn('lottery_results', 'bottom_two')) {
                $table->renameColumn('bottom_two', 'two_bottom');
            }

            // New Columns
            if (!Schema::hasColumn('lottery_results', 'first_prize')) {
                $table->string('first_prize', 20)->nullable()->after('id');
            }
            if (!Schema::hasColumn('lottery_results', 'three_bottom')) {
                $table->string('three_bottom', 10)->nullable()->after('three_top');
            }
            if (!Schema::hasColumn('lottery_results', 'lottery_type_id')) {
                $table->foreignId('lottery_type_id')->nullable()->after('id'); // Add index if needed
            }
            if (!Schema::hasColumn('lottery_results', 'draw_date')) {
                $table->date('draw_date')->nullable()->after('lottery_type_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('lottery_results', function (Blueprint $table) {
            // Revert Renames
            if (Schema::hasColumn('lottery_results', 'three_top')) {
                $table->renameColumn('three_top', 'top_three');
            }
            if (Schema::hasColumn('lottery_results', 'two_top')) {
                $table->renameColumn('two_top', 'top_two');
            }
            if (Schema::hasColumn('lottery_results', 'two_bottom')) {
                $table->renameColumn('two_bottom', 'bottom_two');
            }

            // Drop New Columns
            $table->dropColumn(['first_prize', 'three_bottom', 'lottery_type_id', 'draw_date']);
        });
    }
};
