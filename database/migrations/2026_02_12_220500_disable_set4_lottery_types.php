<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * ปิด/ลบ lottery types "ฮานอย ชุด 4 ตัว" และ "ลาวพัฒนา ชุด 4 ตัว"
 * เพราะ 4 ตัวจะแทงจากหวยลาวพัฒนา (slug=lao) ตัวเดิมได้เลย
 * ไม่ต้องแยกเป็น lottery type ใหม่
 */
return new class extends Migration {
    public function up(): void
    {
        DB::table('lottery_types')
            ->whereIn('slug', ['hanoi-set4', 'lao-set4'])
            ->update(['is_active' => false]);
    }

    public function down(): void
    {
        DB::table('lottery_types')
            ->whereIn('slug', ['hanoi-set4', 'lao-set4'])
            ->update(['is_active' => true]);
    }
};
