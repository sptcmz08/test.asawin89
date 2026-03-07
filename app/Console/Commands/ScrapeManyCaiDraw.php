<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\LotteryType;
use App\Models\LotteryResult;
use App\Services\BetSettlementService;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ScrapeManyCaiDraw extends Command
{
    protected $signature = 'lottery:draw {--filter= : Filter by lottery name pattern}';

    protected $description = 'ดึงผลหวยล่าสุดทั้งหมดจาก ManyCai /Issue/draw (Primary Source)';

    // Mapping ชื่อหวยจาก ManyCai -> slug ในระบบ (เฉพาะที่ใช้งาน)
    protected $lotteryNameMappings = [
        'หวยรัฐบาล' => 'thai',
        'หวยลาว' => 'lao',
        'หวยลาวพัฒนา' => 'lao',
        'ຫວຍລາວ VIP' => 'lao-vip',
        'หวยฮานอย' => 'hanoi',
        'หวยฮานอย VIP' => 'hanoi-vip',
        'ฮานอยพิเศษ' => 'hanoi-special',
        'หวยฮานอยพิเศษ' => 'hanoi-special',
    ];

    protected BetSettlementService $settlementService;

    public function __construct(BetSettlementService $settlementService)
    {
        parent::__construct();
        $this->settlementService = $settlementService;
    }

    public function handle()
    {
        $this->info('ดึงผลหวยล่าสุดจาก ManyCai /Issue/draw...');
        $filter = $this->option('filter');

        try {
            $scriptPath = base_path('scripts/manycai_draw.js');

            if (!file_exists($scriptPath)) {
                $this->error('Script not found: ' . $scriptPath);
                return 1;
            }

            $output = shell_exec('node ' . escapeshellarg($scriptPath) . ' 2>&1');

            $jsonStart = strpos($output, '{');
            if ($jsonStart === false) {
                $this->error('No JSON output from scraper');
                $this->line($output);
                return 1;
            }

            $jsonOutput = substr($output, $jsonStart);
            $data = json_decode($jsonOutput, true);

            if (!$data || !$data['success']) {
                $this->error('Scraper failed: ' . ($data['error'] ?? 'Unknown error'));
                return 1;
            }

            $this->info("พบ {$data['count']} หวย");

            $savedCount = 0;
            $skippedCount = 0;

            foreach ($data['results'] as $result) {
                $lotteryName = $result['lottery_name'];

                if ($filter && stripos($lotteryName, $filter) === false) {
                    continue;
                }

                $slug = $this->findSlugByName($lotteryName);

                if (!$slug) {
                    $this->line("  ⏭️ ไม่พบ mapping: {$lotteryName}");
                    continue;
                }

                $lotteryType = LotteryType::where('slug', $slug)->first();

                if (!$lotteryType) {
                    $this->line("  ⏭️ ไม่พบ lottery_type: {$slug}");
                    continue;
                }

                $drawDate = $result['draw_date'];
                $existing = LotteryResult::where('lottery_type_id', $lotteryType->id)
                    ->whereDate('draw_date', $drawDate)
                    ->first();

                if ($existing) {
                    $this->line("  ⏭️ {$lotteryName}: มีอยู่แล้ว ({$drawDate})");
                    $skippedCount++;
                    continue;
                }

                $firstPrize = $result['first_prize'];

                // Validate first_prize digit count (reject corrupt data)
                $maxDigits = [
                    'thai' => 6,
                    'baac' => 7,
                    'gsb-1' => 7,
                    'gsb-2' => 7,
                    'lao' => 4,
                    'lao-vip' => 5,
                    'lao-star' => 5,
                    'lao-samakki' => 5,
                    'hanoi' => 4,
                    'hanoi-vip' => 5,
                    'hanoi-special' => 5,
                    'hanoi-adhoc' => 5,
                    'hanoi-redcross' => 5,
                    'malay' => 4,
                ];
                if (isset($maxDigits[$slug]) && strlen($firstPrize) > $maxDigits[$slug]) {
                    $this->warn("⚠️  {$lotteryName}: first_prize '{$firstPrize}' เกิน {$maxDigits[$slug]} หลัก → ข้าม");
                    continue;
                }

                $newResult = LotteryResult::create([
                    'lottery_type_id' => $lotteryType->id,
                    'draw_date' => $drawDate,
                    'first_prize' => $firstPrize,
                    'three_top' => substr($firstPrize, -3),
                    'three_bottom' => null,
                    'two_top' => substr($firstPrize, -2),
                    'two_bottom' => substr($firstPrize, 0, 2),
                ]);

                $this->info("  ✅ {$lotteryName}: {$firstPrize} ({$result['date_thai']})");
                $savedCount++;

                // ใช้ BetSettlementService (เพิ่มเครดิต + สร้าง Transaction + อัพเดท BetSlip อัตโนมัติ)
                $settlement = DB::transaction(function () use ($newResult) {
                    return $this->settlementService->settleBets($newResult);
                });

                if ($settlement['won'] > 0) {
                    $this->info("    💰 ถูก {$settlement['won']} จาก {$settlement['settled']} รายการ, จ่าย " . number_format($settlement['total_payout'], 2) . " บาท");
                }
            }

            $this->newLine();
            $this->info("สรุป: บันทึก {$savedCount} รายการ, มีอยู่แล้ว {$skippedCount} รายการ");

            return 0;

        } catch (\Exception $e) {
            $this->error('Error: ' . $e->getMessage());
            return 1;
        }
    }

    protected function findSlugByName($name)
    {
        foreach ($this->lotteryNameMappings as $pattern => $slug) {
            if (stripos($name, $pattern) !== false || $name === $pattern) {
                return $slug;
            }
        }
        return null;
    }
}
