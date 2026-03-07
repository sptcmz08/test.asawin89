<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            if (!Schema::hasColumn('transactions', 'description')) {
                $table->string('description')->nullable()->after('balance_after');
            }
            if (!Schema::hasColumn('transactions', 'reference_id')) {
                $table->unsignedBigInteger('reference_id')->nullable()->after('description');
            }
            if (!Schema::hasColumn('transactions', 'reference_type')) {
                $table->string('reference_type')->nullable()->after('reference_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn(['description', 'reference_id', 'reference_type']);
        });
    }
};
