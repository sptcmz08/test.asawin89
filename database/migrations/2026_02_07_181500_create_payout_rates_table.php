<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('payout_rates', function (Blueprint $table) {
            $table->id();
            $table->integer('bet_type_id')->unique();
            $table->string('name');
            $table->decimal('payout_rate', 10, 2);
            $table->timestamps();
        });

        // Seed default payout rates
        DB::table('payout_rates')->insert([
            ['bet_type_id' => 1, 'name' => '2ตัวบน', 'payout_rate' => 90, 'created_at' => now(), 'updated_at' => now()],
            ['bet_type_id' => 2, 'name' => '2ตัวล่าง', 'payout_rate' => 90, 'created_at' => now(), 'updated_at' => now()],
            ['bet_type_id' => 3, 'name' => '3ตัวโต๊ด', 'payout_rate' => 150, 'created_at' => now(), 'updated_at' => now()],
            ['bet_type_id' => 4, 'name' => '3ตัวบน', 'payout_rate' => 900, 'created_at' => now(), 'updated_at' => now()],
            ['bet_type_id' => 5, 'name' => 'วิ่งบน', 'payout_rate' => 2.40, 'created_at' => now(), 'updated_at' => now()],
            ['bet_type_id' => 6, 'name' => 'วิ่งล่าง', 'payout_rate' => 3.20, 'created_at' => now(), 'updated_at' => now()],
            ['bet_type_id' => 9, 'name' => '3ตัวล่าง', 'payout_rate' => 900, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('payout_rates');
    }
};
