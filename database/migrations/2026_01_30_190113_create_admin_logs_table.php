<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('admin_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('admin_id')->constrained('users')->onDelete('cascade');
            $table->string('action', 50); // create, update, delete, scrape, payout, etc.
            $table->string('model_type', 100)->nullable(); // LotteryResult, Bet, User, etc.
            $table->unsignedBigInteger('model_id')->nullable();
            $table->json('before_data')->nullable(); // Data before change
            $table->json('after_data')->nullable(); // Data after change
            $table->text('description')->nullable(); // Human-readable description
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['admin_id', 'created_at']);
            $table->index(['model_type', 'model_id']);
            $table->index('action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('admin_logs');
    }
};
