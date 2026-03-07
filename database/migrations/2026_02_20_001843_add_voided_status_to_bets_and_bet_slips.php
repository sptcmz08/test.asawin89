<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * เพิ่ม 'voided' ใน enum ของ bets.status และ bet_slips.status
     * เพื่อรองรับ AutoVoidExpiredBets command
     *
     * MySQL ALTER TABLE MODIFY COLUMN ต้องระบุ enum ทั้งชุดใหม่
     */
    public function up(): void
    {
        // bets.status
        DB::statement("
            ALTER TABLE bets
            MODIFY COLUMN status ENUM('pending','won','lost','paid','cancelled','voided')
            NOT NULL DEFAULT 'pending'
        ");

        // bet_slips.status
        DB::statement("
            ALTER TABLE bet_slips
            MODIFY COLUMN status ENUM('pending','won','lost','paid','cancelled','voided')
            NOT NULL DEFAULT 'pending'
        ");
    }

    public function down(): void
    {
        // ย้อนกลับ — ต้องแน่ใจว่าไม่มีแถว status='voided' ก่อน
        DB::statement("
            ALTER TABLE bets
            MODIFY COLUMN status ENUM('pending','won','lost','paid','cancelled')
            NOT NULL DEFAULT 'pending'
        ");

        DB::statement("
            ALTER TABLE bet_slips
            MODIFY COLUMN status ENUM('pending','won','lost','paid','cancelled')
            NOT NULL DEFAULT 'pending'
        ");
    }
};
