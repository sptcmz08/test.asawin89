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
        Schema::create('scraper_logs', function (Blueprint $table) {
            $table->id();
            $table->string('lottery_slug');
            $table->string('lottery_name')->nullable();
            $table->string('source'); // manycai, sanook, raakaadee, manual
            $table->enum('status', ['success', 'failed', 'pending'])->default('pending');
            $table->text('message')->nullable();
            $table->json('data')->nullable();
            $table->date('draw_date')->nullable();
            $table->timestamps();

            $table->index(['lottery_slug', 'created_at']);
            $table->index(['status', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('scraper_logs');
    }
};
