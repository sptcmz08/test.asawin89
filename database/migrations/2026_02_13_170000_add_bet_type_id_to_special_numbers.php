<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('special_numbers', function (Blueprint $table) {
            if (!Schema::hasColumn('special_numbers', 'bet_type_id')) {
                $table->unsignedInteger('bet_type_id')->nullable()->after('lottery_type_id');
            }
            // Make start_date and end_date nullable (no longer required)
            $table->date('start_date')->nullable()->change();
            $table->date('end_date')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('special_numbers', function (Blueprint $table) {
            $table->dropColumn('bet_type_id');
        });
    }
};
