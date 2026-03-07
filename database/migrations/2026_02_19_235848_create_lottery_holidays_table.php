<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('lottery_holidays', function (Blueprint $table) {
            $table->id();
            // null = ใช้กับทุกหวย, ระบุ id = เฉพาะหวยนั้น
            $table->foreignId('lottery_type_id')->nullable()->constrained()->onDelete('cascade');
            $table->date('holiday_date');
            $table->string('reason')->nullable()->comment('เช่น ตรุษจีน, วันชาติเวียดนาม');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lottery_holidays');
    }
};
