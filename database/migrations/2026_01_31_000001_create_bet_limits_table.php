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
        Schema::create('bet_limits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lottery_type_id')->nullable()->constrained()->onDelete('cascade');
            $table->unsignedTinyInteger('bet_type_id')->nullable(); // null = applies to all
            $table->string('number', 10)->nullable(); // specific number or null for all

            // Limits
            $table->decimal('max_per_bet', 12, 2)->nullable(); // Max amount per single bet
            $table->decimal('max_per_number', 12, 2)->nullable(); // Max total per number per draw
            $table->decimal('max_per_user_daily', 12, 2)->nullable(); // Max per user per day
            $table->decimal('max_total_per_draw', 12, 2)->nullable(); // Max total for all users per draw

            // Status
            $table->boolean('is_active')->default(true);
            $table->text('description')->nullable();

            $table->timestamps();

            $table->index(['lottery_type_id', 'bet_type_id', 'is_active']);
            $table->index(['number', 'is_active']);
        });

        // Insert default global limit
        DB::table('bet_limits')->insert([
            'lottery_type_id' => null, // Global
            'bet_type_id' => null,
            'max_per_bet' => 50000, // 50,000 per bet
            'max_per_number' => 100000, // 100,000 total per number
            'max_per_user_daily' => 200000, // 200,000 per user per day
            'max_total_per_draw' => null, // No limit
            'is_active' => true,
            'description' => 'วงเงินเริ่มต้นทั้งระบบ',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bet_limits');
    }
};
