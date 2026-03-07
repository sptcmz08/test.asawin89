<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('lottery_results')) {
            Schema::create('lottery_results', function (Blueprint $table) {
                $table->id();
                $table->foreignId('lottery_type_id')->constrained()->onDelete('cascade');
                $table->date('draw_date');
                $table->string('first_prize', 20)->nullable();
                $table->string('two_top', 10)->nullable();
                $table->string('two_bottom', 10)->nullable();
                $table->string('three_top', 10)->nullable();
                $table->string('three_bottom', 10)->nullable();
                $table->json('raw_data')->nullable();
                $table->timestamps();
                
                $table->unique(['lottery_type_id', 'draw_date']);
                $table->index(['draw_date']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('lottery_results');
    }
};
