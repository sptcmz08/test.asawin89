<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Lottery Types (Thai, Hanoi, Lao, YiKi)
        Schema::create('lottery_types', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // e.g., "Thai Government", "Hanoi Special"
            $table->string('slug')->unique(); // e.g., "thai", "hanoi-special"
            $table->string('category'); // 'government', 'stocks', 'yiki'
            $table->string('img_url')->nullable();
            $table->json('config')->nullable(); // Store specific rules like verify sources
            $table->timestamps();
        });

        // 2. Lottery Rounds/Periods
        Schema::create('lottery_rounds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lottery_type_id')->constrained()->cascadeOnDelete();
            $table->string('period_code')->index(); // e.g. "2024-02-01" or "20240201-88"
            $table->date('draw_date');
            $table->dateTime('draw_time'); // Scheduled draw time
            $table->dateTime('close_time'); // Betting close time
            $table->string('status')->default('pending'); // pending, open, closed, processed
            $table->timestamps();
        });

        // 3. Results
        Schema::create('lottery_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lottery_round_id')->constrained()->cascadeOnDelete();
            // Store common result formats
            $table->string('top_three')->nullable();
            $table->string('top_two')->nullable();
            $table->string('bottom_two')->nullable();
            $table->string('three_tod')->nullable(); 
            $table->json('raw_data')->nullable(); // Store full raw result from API/Source
            $table->timestamps();
        });

        // 4. Bets
        Schema::create('bets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('lottery_round_id')->constrained()->cascadeOnDelete();
            $table->string('bet_type'); // 3top, 2top, 2bottom, etc.
            $table->string('number'); // The number bet on
            $table->decimal('amount', 15, 2);
            $table->decimal('payout_rate', 15, 2); // Locked rate at time of bet
            $table->decimal('win_amount', 15, 2)->nullable();
            $table->string('status')->default('pending'); // pending, won, lost, cancelled
            $table->timestamps();
        });

        // 5. Transactions (Wallet Logs)
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type'); // deposit, withdraw, bet, win_payout, adjust
            $table->decimal('amount', 15, 2);
            $table->decimal('balance_after', 15, 2)->nullable();
            $table->string('status')->default('completed'); // pending, completed, failed
            $table->text('remark')->nullable(); // e.g. "Bet #123 Win"
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
        Schema::dropIfExists('bets');
        Schema::dropIfExists('lottery_results');
        Schema::dropIfExists('lottery_rounds');
        Schema::dropIfExists('lottery_types');
    }
};
