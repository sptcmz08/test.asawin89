<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('deposits', function (Blueprint $table) {
            if (!Schema::hasColumn('deposits', 'slip_ref')) {
                $table->string('slip_ref')->nullable()->unique()->after('transaction_ref');
            }
            if (!Schema::hasColumn('deposits', 'slip_data')) {
                $table->json('slip_data')->nullable()->after('slip_ref');
            }
        });
    }

    public function down(): void
    {
        Schema::table('deposits', function (Blueprint $table) {
            $table->dropColumn(['slip_ref', 'slip_data']);
        });
    }
};
