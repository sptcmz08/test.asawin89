<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * เพิ่ม bonus_credit ใน users table
     * - bonus_credit = เครดิตโปรโมชั่น ใช้แทงได้ ถอนไม่ได้
     * - credit = เงินจริง ฝาก/ถอน/แทงได้
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->decimal('bonus_credit', 12, 2)->default(0)->after('credit');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('bonus_credit');
        });
    }
};
