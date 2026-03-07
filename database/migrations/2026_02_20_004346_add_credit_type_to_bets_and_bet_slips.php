<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * เพิ่ม credit_type ใน bets และ bet_slips
     * - 'real'  = ใช้เครดิตจริง (ถอนได้)
     * - 'bonus' = ใช้โบนัสเครดิต (ไม่สามารถถอนได้ แต่ถ้าถูกรางวัล payout ไปที่ credit จริง)
     */
    public function up(): void
    {
        DB::statement("
            ALTER TABLE bets
            ADD COLUMN credit_type ENUM('real','bonus') NOT NULL DEFAULT 'real'
            AFTER status
        ");

        DB::statement("
            ALTER TABLE bet_slips
            ADD COLUMN credit_type ENUM('real','bonus') NOT NULL DEFAULT 'real'
            AFTER status
        ");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE bets DROP COLUMN credit_type");
        DB::statement("ALTER TABLE bet_slips DROP COLUMN credit_type");
    }
};
