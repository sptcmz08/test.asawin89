<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Bank Accounts table
        if (!Schema::hasTable('bank_accounts')) {
            Schema::create('bank_accounts', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->string('bank_name');
                $table->string('account_number');
                $table->string('account_name');
                $table->boolean('is_default')->default(false);
                $table->timestamps();
                
                $table->index(['user_id']);
            });
        }

        // Withdrawals table
        if (!Schema::hasTable('withdrawals')) {
            Schema::create('withdrawals', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->foreignId('bank_account_id')->nullable()->constrained()->onDelete('set null');
                $table->decimal('amount', 12, 2);
                $table->enum('status', ['pending', 'approved', 'rejected', 'completed'])->default('pending');
                $table->text('admin_note')->nullable();
                $table->timestamp('processed_at')->nullable();
                $table->timestamps();
                
                $table->index(['user_id', 'status']);
                $table->index(['status', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('withdrawals');
        Schema::dropIfExists('bank_accounts');
    }
};
