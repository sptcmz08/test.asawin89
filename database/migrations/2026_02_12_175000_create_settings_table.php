<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('settings')) {
            Schema::create('settings', function (Blueprint $table) {
                $table->id();
                $table->string('key')->unique();
                $table->text('value')->nullable();
                $table->timestamps();
            });
        }

        // Seed default payment settings from .env
        $defaults = [
            'promptpay_id' => env('PROMPTPAY_ID', ''),
            'bank_name' => env('BANK_NAME', ''),
            'bank_account_number' => env('BANK_ACCOUNT_NUMBER', ''),
            'bank_account_name' => env('BANK_ACCOUNT_NAME', ''),
        ];

        foreach ($defaults as $key => $value) {
            if (!empty($value)) {
                \DB::table('settings')->updateOrInsert(
                    ['key' => $key],
                    ['value' => $value, 'created_at' => now(), 'updated_at' => now()]
                );
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
