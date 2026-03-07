<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\LotteryType;
use App\Models\LotteryResult;
use App\Models\ScraperLog;
use App\Services\BetSettlementService;

/**
 * Backfill หวยมาเลย์ Magnum 4D ย้อนหลัง
 * ข้อมูลจาก magnum4d.my, gd4d.co, 4d2ulive.com, 4dresult88.com
 * 
 * Usage:
 *   php artisan lottery:backfill-malay              # แสดงรายการทั้งหมด
 *   php artisan lottery:backfill-malay --run         # บันทึกลง DB
 *   php artisan lottery:backfill-malay --calculate   # บันทึก + คำนวณผล
 */
class BackfillMalayLottery extends Command
{
    protected $signature = 'lottery:backfill-malay
                            {--run : Actually save to database (dry-run by default)}
                            {--calculate : Also calculate winning bets after saving}';

    protected $description = 'Backfill historical Magnum 4D results for หวยมาเลย์';

    // ข้อมูลจริง Magnum 4D 1st Prize ย้อนหลัง
    // ตรวจสอบจาก magnum4d.my (official), gd4d.co, 4d2ulive.com, businesslist.my
    private $historicalResults = [
        // January 2026
        '2026-01-01' => '8171',
        '2026-01-04' => '9629',
        '2026-01-08' => null, // ไม่มีผล (ไม่ใช่วันออก)
        '2026-01-11' => '4695',
        '2026-01-15' => '0353',
        '2026-01-18' => '0990',
        '2026-01-22' => '0610',
        '2026-01-25' => '0879',
        // February 2026
        '2026-02-01' => '8452',
        '2026-02-04' => '7527',
        '2026-02-07' => '3803',
        '2026-02-08' => '6230',
        '2026-02-10' => '5014',
        '2026-02-11' => '9674',
        '2026-02-14' => '0185',
    ];

    protected BetSettlementService $settlementService;

    public function __construct(BetSettlementService $settlementService)
    {
        parent::__construct();
        $this->settlementService = $settlementService;
    }

    public function handle()
    {
        $dryRun = !$this->option('run');
        $calculate = $this->option('calculate');

        $this->info('🇲🇾 Backfill หวยมาเลย์ Magnum 4D (ข้อมูลจริงจาก magnum4d.my)');
        $this->info($dryRun ? '📋 DRY RUN - ไม่บันทึกลง DB (ใช้ --run เพื่อบันทึกจริง)' : '💾 LIVE RUN - จะบันทึกลง DB');
        $this->newLine();

        $lotteryType = LotteryType::where('slug', 'malay')->first();
        if (!$lotteryType) {
            $this->error("❌ ไม่พบ lottery type 'malay' ในฐานข้อมูล");
            return Command::FAILURE;
        }

        $saved = 0;
        $updated = 0;
        $skipped = 0;

        foreach ($this->historicalResults as $date => $firstPrize) {
            if (!$firstPrize) {
                $this->line("  ⏭️  {$date}: ไม่มีผล");
                continue;
            }

            $threeTop = substr($firstPrize, -3);
            $twoTop = substr($firstPrize, -2);
            $twoBottom = substr($firstPrize, 0, 2);

            $existing = LotteryResult::where('lottery_type_id', $lotteryType->id)
                ->where('draw_date', $date)
                ->first();

            if ($existing) {
                if ($existing->first_prize === $firstPrize) {
                    $this->line("  ✅ {$date}: {$firstPrize} (ตรงแล้ว)");
                    $skipped++;
                    continue;
                }

                // ผลไม่ตรง → อัพเดท
                $this->warn("  🔄 {$date}: {$existing->first_prize} → {$firstPrize} (แก้ไข)");

                if (!$dryRun) {
                    $existing->update([
                        'first_prize' => $firstPrize,
                        'three_top' => $threeTop,
                        'two_top' => $twoTop,
                        'two_bottom' => $twoBottom,
                        'details' => json_encode([
                            'source' => 'backfill-magnum4d',
                            'old_value' => $existing->first_prize,
                            'corrected_at' => now()->toIso8601String(),
                        ]),
                    ]);

                    if ($calculate) {
                        $settlement = \DB::transaction(function () use ($existing) {
                            return $this->settlementService->settleBets($existing);
                        });
                        $this->info("     → คำนวณผล: ถูก {$settlement['won']} จาก {$settlement['settled']} รายการ");
                    }
                }
                $updated++;
            } else {
                // ยังไม่มี → เพิ่มใหม่
                $this->info("  🆕 {$date}: {$firstPrize} (เพิ่มใหม่)");

                if (!$dryRun) {
                    $result = LotteryResult::create([
                        'lottery_type_id' => $lotteryType->id,
                        'draw_date' => $date,
                        'first_prize' => $firstPrize,
                        'three_top' => $threeTop,
                        'two_top' => $twoTop,
                        'two_bottom' => $twoBottom,
                        'details' => json_encode([
                            'source' => 'backfill-magnum4d',
                            'scraped_at' => now()->toIso8601String(),
                        ]),
                    ]);

                    if ($calculate) {
                        $settlement = \DB::transaction(function () use ($result) {
                            return $this->settlementService->settleBets($result);
                        });
                        $this->info("     → คำนวณผล: ถูก {$settlement['won']} จาก {$settlement['settled']} รายการ");
                    }
                }
                $saved++;
            }
        }

        $this->newLine();
        $this->info("📊 สรุป: เพิ่มใหม่ {$saved}, แก้ไข {$updated}, ตรงแล้ว {$skipped}");

        if ($dryRun && ($saved > 0 || $updated > 0)) {
            $this->warn("⚠️  ใช้ --run เพื่อบันทึกจริง: php artisan lottery:backfill-malay --run");
        }

        return Command::SUCCESS;
    }
}
