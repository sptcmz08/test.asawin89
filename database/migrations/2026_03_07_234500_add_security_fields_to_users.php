<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Security Enhancement — เพิ่ม fields สำหรับระบบป้องกัน fraud
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Ban system
            $table->boolean('is_banned')->default(false)->after('role');
            $table->text('banned_reason')->nullable()->after('is_banned');
            $table->timestamp('banned_at')->nullable()->after('banned_reason');

            // IP tracking
            $table->string('last_login_ip', 45)->nullable()->after('banned_at');
            $table->timestamp('last_login_at')->nullable()->after('last_login_ip');

            // Risk level
            $table->enum('risk_level', ['normal', 'watch', 'high', 'banned'])->default('normal')->after('last_login_at');

            // Index for quick ban checks
            $table->index('is_banned');
            $table->index('risk_level');
        });

        // Add IP tracking to bets
        Schema::table('bets', function (Blueprint $table) {
            $table->string('bet_ip', 45)->nullable()->after('credit_type');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['is_banned']);
            $table->dropIndex(['risk_level']);
            $table->dropColumn(['is_banned', 'banned_reason', 'banned_at', 'last_login_ip', 'last_login_at', 'risk_level']);
        });

        Schema::table('bets', function (Blueprint $table) {
            $table->dropColumn('bet_ip');
        });
    }
};
