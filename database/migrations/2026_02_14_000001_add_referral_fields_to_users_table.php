<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'referral_code')) {
                $table->string('referral_code', 10)->unique()->nullable()->after('credit');
            }
            if (!Schema::hasColumn('users', 'referred_by')) {
                $table->unsignedBigInteger('referred_by')->nullable()->after('referral_code');
                $table->foreign('referred_by')->references('id')->on('users')->nullOnDelete();
            }
        });

        // Generate referral codes for existing users
        $users = \DB::table('users')->whereNull('referral_code')->get();
        foreach ($users as $user) {
            $code = strtoupper(Str::random(8));
            while (\DB::table('users')->where('referral_code', $code)->exists()) {
                $code = strtoupper(Str::random(8));
            }
            \DB::table('users')->where('id', $user->id)->update(['referral_code' => $code]);
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['referred_by']);
            $table->dropColumn(['referral_code', 'referred_by']);
        });
    }
};
