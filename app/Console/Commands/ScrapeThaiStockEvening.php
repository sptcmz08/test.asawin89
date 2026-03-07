<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\AdminLog;
use App\Models\LotteryType;
use App\Models\LotteryResult;
use App\Services\BetSettlementService;
use Carbon\Carbon;

class ScrapeThaiStockEvening extends Command
{
    protected $signature = 'lottery:scrape-thai-stock-evening
                            {--calculate : Also calculate winning bets after scraping}
                            {--force : Overwrite existing result for today}
                            {--set= : Manually specify SET value (e.g. 1438.09)}
                            {--set50= : Manually specify SET50 value (e.g. 948.12)}
                            {--change= : Manually specify SET Change value (e.g. 7.68)}';

    protected $description = 'Scrape Thai stock evening (SET+SET50 at 16:30) from set.or.th';

    protected BetSettlementService $settlementService;

    public function __construct(BetSettlementService $settlementService)
    {
        parent::__construct();
        $this->settlementService = $settlementService;
    }

    public function handle()
    {
        $calculate = $this->option('calculate');
        $force = $this->option('force');

        $this->info('📈 Fetching SET & SET50 Index for Thai Stock Evening...');

        try {
            $manualSet = $this->option('set');
            $manualSet50 = $this->option('set50');
            $manualChange = $this->option('change');

            if ($manualSet && $manualSet50 && $manualChange !== null) {
                $setIndex = (float) $manualSet;
                $set50Index = (float) $manualSet50;
                $setChange = (float) $manualChange;
                $source = 'manual-input';
                $this->info("📝 ใช้ค่าจาก Manual Input");
            } else {
                // Primary: set.or.th (Puppeteer), Fallback: Google Finance
                $data = $this->fetchViaSetOrTh();
                
                if (!$data) {
                    $this->warn('⚠️  set.or.th failed, trying Google Finance fallback...');
                    $data = $this->fetchViaGoogleFinance();
                }

                if (!$data) {
                    $this->error('❌ ไม่สามารถดึง SET/SET50 Index ได้จากทุกแหล่ง');
                    return Command::FAILURE;
                }

                $setIndex = $data['set'];
                $set50Index = $data['set50'];
                $setChange = $data['set_change'];
                $source = $data['source'] ?? 'unknown';
            }

            $this->info("📊 SET Index: {$setIndex}");
            $this->info("📊 SET50 Index: {$set50Index}");
            $this->info("📊 SET Change: {$setChange}");
            $this->info("📡 Source: {$source}");

            $setDec = $this->getDecimals($setIndex);
            $set50Dec = $this->getDecimals($set50Index);
            $set50LastDigit = substr($set50Dec, -1);
            $changeDec = $this->getDecimals(abs($setChange));

            $threeTop = $set50LastDigit . $setDec;
            $twoTop = $setDec;
            $twoBottom = $changeDec;
            $firstPrize = $threeTop;

            $this->info("━━━━━━━━━━━━━━━━━━━━━━━");
            $this->info("🎯 3 ตัวบน: {$threeTop}  (SET50 ท้าย {$set50LastDigit} + SET ทศนิยม {$setDec})");
            $this->info("   2 ตัวบน: {$twoTop}  (SET ทศนิยม {$setDec})");
            $this->info("   2 ตัวล่าง: {$twoBottom}  (Change ทศนิยม {$changeDec})");
            $this->info("━━━━━━━━━━━━━━━━━━━━━━━");

            $lotteryType = LotteryType::where('slug', 'thai-stock')->first();
            if (!$lotteryType) {
                $this->error('❌ ไม่พบ lottery type thai-stock ในฐานข้อมูล');
                return Command::FAILURE;
            }

            $today = Carbon::today('Asia/Bangkok')->format('Y-m-d');

            $existing = LotteryResult::where('lottery_type_id', $lotteryType->id)
                ->where('draw_date', $today)
                ->first();

            if ($existing && !$force) {
                $this->warn("⏭️  หุ้นไทยเย็น: มีผลวันที่ {$today} แล้ว (ใช้ --force เพื่อเขียนทับ)");
                return Command::SUCCESS;
            }

            if ($existing && $force) {
                $this->warn("🔄 Force mode: ลบผลเก่าของวันที่ {$today} แล้วเขียนใหม่...");
                $existing->delete();
            }

            $lotteryResult = LotteryResult::create([
                'lottery_type_id' => $lotteryType->id,
                'draw_date' => $today,
                'first_prize' => $firstPrize,
                'three_top' => $threeTop,
                'two_top' => $twoTop,
                'two_bottom' => $twoBottom,
                'details' => json_encode([
                    'source' => $source,
                    'set_index' => $setIndex,
                    'set50_index' => $set50Index,
                    'set_change' => $setChange,
                    'formula' => 'SET50_last_dec + SET_dec / SET_dec / Change_dec',
                    'scraped_at' => now()->toIso8601String(),
                ]),
            ]);

            $this->info("✅ บันทึกผลหุ้นไทยเย็น สำเร็จ! ({$today})");

            if ($calculate) {
                $settlement = DB::transaction(function () use ($lotteryResult) {
                    return $this->settlementService->settleBets($lotteryResult);
                });
                $this->info("   → คำนวณผลรางวัล: ถูก {$settlement['won']} จาก {$settlement['settled']} รายการ, จ่าย {$settlement['total_payout']} บาท");
            }

            try {
                AdminLog::create([
                    'admin_id' => 1,
                    'action' => 'scrape_thai_stock_evening',
                    'description' => "SET:{$setIndex} SET50:{$set50Index} Chg:{$setChange} → 3บน:{$threeTop} 2บน:{$twoTop} 2ล่าง:{$twoBottom} ({$today}) [{$source}]",
                    'ip_address' => '127.0.0.1',
                ]);
            } catch (\Exception $e) { /* silently ignore */ }

            return Command::SUCCESS;

        } catch (\Exception $e) {
            $this->error('❌ Error: ' . $e->getMessage());
            Log::error('ScrapeThaiStockEvening error: ' . $e->getMessage());
            return Command::FAILURE;
        }
    }

    private function getDecimals(float $value): string
    {
        $formatted = number_format($value, 2, '.', '');
        $parts = explode('.', $formatted);
        return str_pad($parts[1] ?? '00', 2, '0', STR_PAD_RIGHT);
    }

    private function fetchViaSetOrTh(): ?array
    {
        $scriptPath = base_path('scripts/set_index_puppeteer.js');
        if (!file_exists($scriptPath)) {
            $this->warn("❌ Puppeteer script not found: {$scriptPath}");
            return null;
        }
        $this->info('🌐 ดึงจาก set.or.th (Puppeteer)...');
        $output = shell_exec("cd " . base_path() . " && node \"{$scriptPath}\" 2>&1");
        return $this->parseScriptOutput($output, 'set.or.th');
    }

    private function fetchViaGoogleFinance(): ?array
    {
        $scriptPath = base_path('scripts/set_index.js');
        if (!file_exists($scriptPath)) {
            $this->warn("❌ Google Finance script not found: {$scriptPath}");
            return null;
        }
        $this->info('🌐 ดึงจาก Google Finance (fallback)...');
        $output = shell_exec("cd " . base_path() . " && node \"{$scriptPath}\" 2>&1");
        return $this->parseScriptOutput($output, 'google-finance');
    }

    private function parseScriptOutput(?string $output, string $sourceName): ?array
    {
        if (empty($output)) {
            $this->warn("❌ No output from {$sourceName} script");
            return null;
        }
        $jsonStart = strpos($output, '{');
        if ($jsonStart === false) {
            $this->warn("❌ No JSON in {$sourceName} output: " . substr($output, 0, 200));
            return null;
        }
        $json = substr($output, $jsonStart);
        $data = json_decode($json, true);
        if (!$data || !($data['success'] ?? false)) {
            $this->warn("❌ {$sourceName} error: " . ($data['error'] ?? 'unknown'));
            return null;
        }
        if (!isset($data['set']) || !isset($data['set50'])) {
            $this->warn("❌ Missing SET or SET50 data from {$sourceName}");
            return null;
        }
        if (!isset($data['set_change']) || $data['set_change'] === null) {
            $this->warn("⚠️  SET Change not found from {$sourceName}, default to 0.00");
            $data['set_change'] = 0.00;
        }
        $data['source'] = $data['source'] ?? $sourceName;
        return $data;
    }
}
