<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('referral_commissions')) {
            Schema::create('referral_commissions', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('referrer_id');
                $table->unsignedBigInteger('bet_user_id');
                $table->unsignedBigInteger('bet_id');
                $table->decimal('bet_amount', 12, 2);
                $table->decimal('commission_rate', 5, 4); // e.g. 0.0100 = 1%
                $table->decimal('commission_amount', 12, 2);
                $table->timestamps();

                $table->foreign('referrer_id')->references('id')->on('users')->cascadeOnDelete();
                $table->foreign('bet_user_id')->references('id')->on('users')->cascadeOnDelete();
                $table->foreign('bet_id')->references('id')->on('bets')->cascadeOnDelete();

                $table->index('referrer_id');
                $table->index('bet_user_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('referral_commissions');
    }
};
