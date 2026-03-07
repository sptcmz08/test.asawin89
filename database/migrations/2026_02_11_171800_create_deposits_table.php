<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('deposits')) {
            Schema::create('deposits', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->decimal('amount', 15, 2);
                $table->string('status')->default('pending'); // pending, completed, failed
                $table->string('transaction_ref')->unique()->nullable();
                $table->string('gateway_mode')->default('dev'); // dev, production
                $table->json('gateway_response')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('deposits');
    }
};
