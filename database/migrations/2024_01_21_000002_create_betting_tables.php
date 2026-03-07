<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Bet Slips table (check if exists)
        if (!Schema::hasTable('bet_slips')) {
            Schema::create('bet_slips', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->foreignId('lottery_type_id')->constrained()->onDelete('cascade');
                $table->string('slip_name')->nullable();
                $table->date('draw_date');
                $table->decimal('total_amount', 12, 2)->default(0);
                $table->enum('status', ['pending', 'won', 'lost', 'paid', 'cancelled'])->default('pending');
                $table->timestamps();
                
                $table->index(['user_id', 'draw_date']);
                $table->index(['status', 'draw_date']);
            });
        }

        // Bets table - Skip if exists (use existing table from PHP system)
        if (!Schema::hasTable('bets')) {
            Schema::create('bets', function (Blueprint $table) {
                $table->id();
                $table->foreignId('bet_slip_id')->constrained()->onDelete('cascade');
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->foreignId('lottery_type_id')->constrained()->onDelete('cascade');
                $table->unsignedInteger('bet_type_id');
                $table->string('number', 10);
                $table->decimal('amount', 12, 2);
                $table->date('draw_date');
                $table->enum('status', ['pending', 'won', 'lost', 'paid', 'cancelled'])->default('pending');
                $table->decimal('payout_amount', 12, 2)->nullable();
                $table->boolean('is_special')->default(false);
                $table->timestamps();
                
                $table->index(['user_id', 'draw_date']);
                $table->index(['lottery_type_id', 'draw_date', 'number']);
                $table->index(['status', 'draw_date']);
            });
        }

        // Transactions table
        if (!Schema::hasTable('transactions')) {
            Schema::create('transactions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->enum('type', ['deposit', 'withdraw', 'bet', 'payout', 'refund', 'bonus', 'adjustment']);
                $table->decimal('amount', 12, 2);
                $table->decimal('balance_after', 12, 2)->nullable();
                $table->string('description')->nullable();
                $table->string('reference_id')->nullable();
                $table->string('reference_type')->nullable();
                $table->timestamps();
                
                $table->index(['user_id', 'type']);
                $table->index(['created_at']);
            });
        }

        // Special/Forbidden Numbers table
        if (!Schema::hasTable('special_numbers')) {
            Schema::create('special_numbers', function (Blueprint $table) {
                $table->id();
                $table->foreignId('lottery_type_id')->constrained()->onDelete('cascade');
                $table->string('number', 10);
                $table->boolean('is_special')->default(false);
                $table->boolean('is_forbidden')->default(false);
                $table->decimal('payout_rate', 5, 2)->nullable();
                $table->date('start_date');
                $table->date('end_date');
                $table->timestamps();
                
                $table->index(['lottery_type_id', 'start_date', 'end_date']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('special_numbers');
        Schema::dropIfExists('transactions');
        Schema::dropIfExists('bets');
        Schema::dropIfExists('bet_slips');
    }
};

