<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('scraper_logs', function (Blueprint $table) {
            // Fix: 'status' was too short for values like 'updated', 'rejected'
            $table->string('status', 20)->change();
        });
    }

    public function down(): void
    {
        Schema::table('scraper_logs', function (Blueprint $table) {
            $table->string('status', 10)->change();
        });
    }
};
