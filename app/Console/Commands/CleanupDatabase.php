<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CleanupDatabase extends Command
{
    protected $signature = 'db:cleanup {--force : Skip confirmation}';
    protected $description = 'ล้างข้อมูลทั้งหมด เหลือเฉพาะ admin user และผลรางวัลย้อนหลัง';

    public function handle()
    {
        if (!$this->option('force')) {
            if (!$this->confirm('⚠️ จะลบข้อมูลทั้งหมด (ยกเว้น admin + ผลรางวัล) ยืนยัน?')) {
                $this->info('ยกเลิก');
                return;
            }
        }

        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        // 1. ลบ users ที่ไม่ใช่ admin
        $deleted = DB::table('users')->where('role', '!=', 'admin')->delete();
        $this->info("✅ ลบ users ทั่วไป: {$deleted} รายการ");

        // 2. ล้างตารางที่เกี่ยวข้องกับ user ทั้งหมด
        $tablesToTruncate = [
            'bets',
            'bet_slips',
            'deposits',
            'withdrawals',
            'transactions',
            'bank_accounts',
            'referral_commissions',
            'user_notifications',
            'admin_logs',
            'special_numbers',
            'bet_limits',
        ];

        foreach ($tablesToTruncate as $table) {
            try {
                DB::table($table)->truncate();
                $this->info("✅ ล้าง {$table}");
            } catch (\Exception $e) {
                $this->warn("⚠️ ข้าม {$table}: " . $e->getMessage());
            }
        }

        // 3. ล้าง settings (LINE, bank info, etc.)
        DB::table('settings')->truncate();
        $this->info("✅ ล้าง settings (LINE, บัญชีธนาคาร, etc.)");

        // 4. ล้าง scraper logs
        DB::table('scraper_logs')->truncate();
        $this->info("✅ ล้าง scraper_logs");

        // 5. ล้าง sessions & cache
        try {
            DB::table('sessions')->truncate();
            $this->info("✅ ล้าง sessions");
        } catch (\Exception $e) {}

        try {
            DB::table('cache')->truncate();
            $this->info("✅ ล้าง cache");
        } catch (\Exception $e) {}

        // 6. Reset admin credit to 0
        DB::table('users')->where('role', 'admin')->update([
            'credit' => 0,
            'bonus_credit' => 0,
        ]);
        $this->info("✅ Reset admin credit เป็น 0");

        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // 7. ล้าง Laravel log
        $logPath = storage_path('logs/laravel.log');
        if (file_exists($logPath)) {
            file_put_contents($logPath, '');
            $this->info("✅ ล้าง laravel.log");
        }

        $this->newLine();
        $this->info('🎉 ล้างข้อมูลเรียบร้อย! คงเหลือ: admin user + ผลรางวัลย้อนหลัง + lottery types');
    }
}
