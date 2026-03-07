<?php

namespace App\Services;

use App\Models\LotteryResult;
use App\Models\LotteryType;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

/**
 * LotteryScraperService - ManyCai Only
 * ใช้แค่ ManyCai /Issue/draw เป็น source เดียว
 */
class LotteryScraperService
{
    // Mapping ชื่อหวยภาษาไทย -> slug
    private $lotteryNameMappings = [
        // หวยไทย
        'หวยรัฐบาล' => 'thai',

        // หวยลาว
        'หวยลาว' => 'lao',
        'หวยลาวพัฒนา' => 'lao',

        // หวยลาว VIP
        // 'จับยี่กี VIP' => 'lao-vip', // ❌ คนละตัวกับ หวยลาว VIP
        'หวยลาว VIP' => 'lao-vip',
        'ຫວຍລາວ VIP' => 'lao-vip', // ภาษาลาว

        // หวยฮานอย
        'หวยฮานอย' => 'hanoi',

        // หวยฮานอย VIP
        'หวยฮานอย VIP' => 'hanoi-vip',

        // หวยฮานอยพิเศษ
        'หวยฮานอยพิเศษ' => 'hanoi-special',
        'ฮานอยพิเศษ' => 'hanoi-special', // ไม่มีคำว่า "หวย"
    ];

    /**
     * Scrape all lottery results from ManyCai /Issue/draw
     * Returns array of results
     */
    public function scrapeFromManyCaiDraw()
    {
        $scriptPath = base_path('scripts/manycai_draw.js');

        if (!file_exists($scriptPath)) {
            Log::error("[Scraper] Script not found: {$scriptPath}");
            return ['success' => false, 'error' => 'Script not found', 'results' => []];
        }

        $output = shell_exec("node \"{$scriptPath}\" 2>&1");

        if (empty($output)) {
            Log::error("[Scraper] No output from ManyCai script");
            return ['success' => false, 'error' => 'No output', 'results' => []];
        }

        // Find JSON in output
        $jsonStart = strpos($output, '{');
        if ($jsonStart === false) {
            Log::error("[Scraper] No JSON in output: {$output}");
            return ['success' => false, 'error' => 'No JSON', 'results' => []];
        }

        $json = substr($output, $jsonStart);
        $data = json_decode($json, true);

        if (!$data || !isset($data['success'])) {
            Log::error("[Scraper] Invalid JSON: {$json}");
            return ['success' => false, 'error' => 'Invalid JSON', 'results' => []];
        }

        return $data;
    }

    /**
     * Scrape and save results for a specific slug
     */
    public function scrape($slug = null, $date = null)
    {
        $data = $this->scrapeFromManyCaiDraw();

        if (!$data['success']) {
            return null;
        }

        $results = [];

        foreach ($data['results'] as $r) {
            $lotteryName = $r['lottery_name'] ?? '';
            $lotterySlug = $this->lotteryNameMappings[$lotteryName] ?? null;

            if (!$lotterySlug)
                continue;
            if ($slug && $lotterySlug !== $slug)
                continue;

            $drawDate = $r['draw_date'] ?? ($date ?? Carbon::today()->format('Y-m-d'));

            // Reject future dates
            if ($drawDate > Carbon::today()->format('Y-m-d')) {
                Log::warning("[Scraper] Future date rejected: {$lotterySlug} {$drawDate}");
                continue;
            }

            // Validate first_prize digit count
            $maxDigits = [
                'thai' => 6,
                'baac' => 7,
                'lao' => 4,
                'lao-vip' => 5,
                'lao-star' => 5,
                'lao-samakki' => 5,
                'hanoi' => 4,
                'hanoi-vip' => 5,
                'hanoi-special' => 5,
                'hanoi-adhoc' => 5,
                'malay' => 4,
            ];
            if (isset($maxDigits[$lotterySlug]) && strlen($r['first_prize']) > $maxDigits[$lotterySlug]) {
                Log::warning("[Scraper] Invalid digit count: {$lotterySlug} first_prize={$r['first_prize']}");
                continue;
            }

            $result = $this->saveResult(
                $lotterySlug,
                $drawDate,
                [
                    'first_prize' => $r['first_prize'],
                    'two_top' => $r['two_top'] ?? substr($r['first_prize'], -2),
                    'three_top' => $r['three_top'] ?? substr($r['first_prize'], -3),
                    'two_bottom' => $r['two_bottom'] ?? substr($r['first_prize'], 0, 2),
                ]
            );

            if ($result) {
                $results[$lotterySlug] = $result;
            }
        }

        return $slug ? ($results[$slug] ?? null) : $results;
    }

    /**
     * Save lottery result to database
     */
    public function saveResult($slug, $date, $data, $details = [])
    {
        $lotteryType = LotteryType::where('slug', $slug)->first();
        if (!$lotteryType) {
            Log::warning("[Scraper] Lottery type not found: {$slug}");
            return null;
        }

        // ✅ SECURITY: ไม่ใช้ updateOrCreate — ป้องกันการทับผลเดิม
        $existing = LotteryResult::where('lottery_type_id', $lotteryType->id)
            ->where('draw_date', $date)
            ->first();

        if ($existing) {
            // ถ้าผลเดิมมีอยู่แล้ว — ตรวจว่าตรงกันไหม
            $newThreeTop = $data['three_top'] ?? substr($data['first_prize'], -3);
            if ($existing->three_top !== $newThreeTop) {
                Log::warning("[Scraper] {$slug}: Result mismatch — DB={$existing->three_top}, new={$newThreeTop} — NOT overwriting");
            }
            return $existing;
        }

        return LotteryResult::create(
            array_merge([
                'lottery_type_id' => $lotteryType->id,
                'draw_date' => $date,
            ], $data, [
                'details' => json_encode(array_merge($details, [
                    'source' => 'manycai-draw',
                    'scraped_at' => now()->toIso8601String(),
                ])),
            ])
        );
    }

    /**
     * Get ManyCai lottery code mapping
     */
    public function getManyCaiCodes()
    {
        return [
            'hanoi' => 'YNHN',
            'hanoi-vip' => 'HNVIP',
            'hanoi-special' => 'BFHN',
            'lao' => 'TLZC',
            'lao-vip' => 'ZCVIP',
            'thai' => 'TGFC',
        ];
    }

    /**
     * Get lottery name mappings
     */
    public function getLotteryNameMappings()
    {
        return $this->lotteryNameMappings;
    }
}
