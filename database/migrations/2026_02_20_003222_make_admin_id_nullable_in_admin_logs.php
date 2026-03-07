<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    /**
     * admin_logs.admin_id เป็น NOT NULL FK ซึ่งทำให้ CLI commands (scheduler)
     * ที่ไม่มี auth()->id() ไม่สามารถบันทึก AdminLog ได้
     *
     * แก้โดย DROP FK constraint เดิม แล้วสร้าง nullable FK ใหม่
     */
    public function up(): void
    {
        // Drop existing FK constraint first
        DB::statement('ALTER TABLE admin_logs DROP FOREIGN KEY admin_logs_admin_id_foreign');

        // Re-add as nullable with FK
        DB::statement('ALTER TABLE admin_logs MODIFY COLUMN admin_id BIGINT UNSIGNED NULL');
        DB::statement('ALTER TABLE admin_logs ADD CONSTRAINT admin_logs_admin_id_foreign FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL');
    }

    public function down(): void
    {
        // Revert: Delete rows with null admin_id first (can't undo otherwise)
        DB::statement('DELETE FROM admin_logs WHERE admin_id IS NULL');
        DB::statement('ALTER TABLE admin_logs DROP FOREIGN KEY admin_logs_admin_id_foreign');
        DB::statement('ALTER TABLE admin_logs MODIFY COLUMN admin_id BIGINT UNSIGNED NOT NULL');
        DB::statement('ALTER TABLE admin_logs ADD CONSTRAINT admin_logs_admin_id_foreign FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE');
    }
};
