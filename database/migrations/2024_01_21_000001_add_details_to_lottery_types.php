<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lottery_types', function (Blueprint $table) {
            if (!Schema::hasColumn('lottery_types', 'description')) {
                $table->text('description')->nullable()->after('category');
            }
            if (!Schema::hasColumn('lottery_types', 'draw_days')) {
                $table->string('draw_days')->nullable()->after('description');
            }
            if (!Schema::hasColumn('lottery_types', 'draw_time')) {
                $table->string('draw_time')->nullable()->after('draw_days');
            }
            if (!Schema::hasColumn('lottery_types', 'close_before_minutes')) {
                $table->integer('close_before_minutes')->default(30)->after('draw_time');
            }
            if (!Schema::hasColumn('lottery_types', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('close_before_minutes');
            }
        });
    }

    public function down(): void
    {
        Schema::table('lottery_types', function (Blueprint $table) {
            $table->dropColumn(['description', 'draw_days', 'draw_time', 'close_before_minutes', 'is_active']);
        });
    }
};
