<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class EasySlipService
{
    protected string $apiKey;
    protected string $apiUrl;

    public function __construct()
    {
        $this->apiKey = config('services.easyslip.api_key', '');
        $this->apiUrl = config('services.easyslip.api_url', 'https://developer.easyslip.com/api/v1/verify');
    }

    /**
     * Verify a bank slip image via EasySlip API
     *
     * @param string $base64Image Base64-encoded slip image (without data:image prefix)
     * @return array ['success' => bool, 'data' => [...], 'error' => string|null]
     */
    public function verifySlip(string $base64Image): array
    {
        if (empty($this->apiKey)) {
            return [
                'success' => false,
                'error' => 'EasySlip API key not configured',
                'data' => null,
            ];
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
            ])->post($this->apiUrl, [
                        'image' => $base64Image,
                    ]);

            if (!$response->successful()) {
                Log::warning('EasySlip API error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                $errorMsg = 'ไม่สามารถตรวจสอบสลิปได้';
                if ($response->status() === 401) {
                    $errorMsg = 'API Key ไม่ถูกต้อง';
                } elseif ($response->status() === 403) {
                    $errorMsg = 'ใช้งาน API เกินจำนวนที่กำหนด กรุณาอัพเกรดแพ็คเกจ';
                } elseif ($response->status() === 404) {
                    $errorMsg = 'ไม่พบข้อมูลสลิปนี้ในระบบธนาคาร กรุณาตรวจสอบสลิปอีกครั้ง';
                } elseif ($response->status() === 429) {
                    $errorMsg = 'ใช้งาน API เกินจำนวนที่กำหนด';
                }

                return [
                    'success' => false,
                    'error' => $errorMsg,
                    'data' => null,
                ];
            }

            $data = $response->json();

            // EasySlip returns { status: 200, data: { ... } }
            if (!isset($data['data'])) {
                return [
                    'success' => false,
                    'error' => 'รูปแบบสลิปไม่ถูกต้องหรือไม่สามารถอ่านได้',
                    'data' => null,
                ];
            }

            $slipData = $data['data'];

            // Extract receiver account from bank.account or proxy.account
            $receiverAccount = $slipData['receiver']['account']['proxy']['account']
                ?? $slipData['receiver']['account']['bank']['account']
                ?? null;

            return [
                'success' => true,
                'error' => null,
                'data' => [
                    'transRef' => $slipData['transRef'] ?? null,
                    'amount' => $slipData['amount']['amount'] ?? null,
                    'sender' => [
                        'bank' => $slipData['sender']['bank']['short'] ?? $slipData['sender']['bank']['name'] ?? null,
                        'name' => $slipData['sender']['account']['name']['th'] ?? $slipData['sender']['account']['name']['en'] ?? null,
                    ],
                    'receiver' => [
                        'bank' => $slipData['receiver']['bank']['short'] ?? $slipData['receiver']['bank']['name'] ?? null,
                        'name' => $slipData['receiver']['account']['name']['th'] ?? $slipData['receiver']['account']['name']['en'] ?? null,
                        'account' => $receiverAccount,
                    ],
                    'date' => $slipData['date'] ?? null,
                    'raw' => $slipData,
                ],
            ];

        } catch (\Exception $e) {
            Log::error('EasySlip API exception: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => 'เกิดข้อผิดพลาดในการเชื่อมต่อ EasySlip',
                'data' => null,
            ];
        }
    }

    /**
     * Validate that the slip data matches our expected deposit
     *
     * @param array $slipData Parsed data from verifySlip()
     * @param float $expectedAmount The amount the user says they deposited
     * @return array ['valid' => bool, 'error' => string|null]
     */
    public function validateTransaction(array $slipData, float $expectedAmount): array
    {
        // 1. Check amount matches
        $slipAmount = floatval($slipData['amount'] ?? 0);
        if (abs($slipAmount - $expectedAmount) > 0.01) {
            return [
                'valid' => false,
                'error' => "จำนวนเงินไม่ตรง: สลิป ฿" . number_format($slipAmount, 2) . " แต่แจ้งฝาก ฿" . number_format($expectedAmount, 2),
            ];
        }

        // 2. Check receiver matches our account (PromptPay or bank account)
        $receiverName = mb_strtolower(trim($slipData['receiver']['name'] ?? ''));
        $ourAccountName = mb_strtolower(trim(\App\Models\Setting::get('bank_account_name', config('services.bank_account.account_name', ''))));
        $promptPayId = trim(\App\Models\Setting::get('promptpay_id', config('services.promptpay.id', '')));
        $receiverAccount = trim($slipData['receiver']['account'] ?? '');
        $ourBankAccount = trim(\App\Models\Setting::get('bank_account_number', config('services.bank_account.account_number', '')));

        // Try multiple matching strategies:
        $matched = false;
        $matchMethod = '';

        // Strategy 1: PromptPay ID match (most reliable for PromptPay transfers)
        if (!$matched && !empty($promptPayId) && !empty($receiverAccount)) {
            $cleanReceiver = str_replace(['-', ' ', 'x'], '', $receiverAccount);
            $cleanPrompt = str_replace(['-', ' '], '', $promptPayId);
            // Check if the non-masked digits of receiver match our PromptPay
            if (str_contains($cleanReceiver, $cleanPrompt) || str_contains($cleanPrompt, $cleanReceiver)) {
                $matched = true;
                $matchMethod = 'promptpay_id';
            }
        }

        // Strategy 2: Bank account number match (last 4 digits)
        if (!$matched && !empty($ourBankAccount) && !empty($receiverAccount)) {
            $cleanOur = preg_replace('/[^0-9]/', '', $ourBankAccount);
            $cleanSlip = preg_replace('/[^0-9]/', '', $receiverAccount);
            // Compare last 4 digits (slip may mask middle digits)
            if (strlen($cleanOur) >= 4 && strlen($cleanSlip) >= 4) {
                if (substr($cleanOur, -4) === substr($cleanSlip, -4)) {
                    $matched = true;
                    $matchMethod = 'bank_account_last4';
                }
            }
        }

        // Strategy 3: Name matching — check individual name parts (first/last name)
        if (!$matched && !empty($ourAccountName) && !empty($receiverName)) {
            // Split name into parts and check if any part matches
            $ourParts = preg_split('/[\s\.]+/', $ourAccountName);
            foreach ($ourParts as $part) {
                $part = trim($part);
                // Skip short particles/titles like นาย, นาง, น.ส.
                if (mb_strlen($part) <= 2)
                    continue;
                if (str_contains($receiverName, $part)) {
                    $matched = true;
                    $matchMethod = 'name_part:' . $part;
                    break;
                }
            }
        }

        // Strategy 4: If no bank settings configured at all, allow (first-time setup)
        if (!$matched && empty($ourAccountName) && empty($promptPayId) && empty($ourBankAccount)) {
            $matched = true;
            $matchMethod = 'no_settings';
            Log::info('Slip verification: no bank settings configured, allowing deposit');
        }

        if (!$matched) {
            Log::warning('Slip receiver mismatch', [
                'slip_receiver_name' => $receiverName,
                'slip_receiver_account' => $receiverAccount,
                'our_account_name' => $ourAccountName,
                'our_bank_account' => $ourBankAccount,
                'our_promptpay' => $promptPayId,
            ]);

            return [
                'valid' => false,
                'error' => 'บัญชีผู้รับไม่ตรงกับบัญชีของระบบ (กรุณาโอนเข้าบัญชีที่แสดงในหน้าฝากเงิน)',
            ];
        }

        Log::info('Slip receiver matched', ['method' => $matchMethod]);

        // 3. transRef must exist
        if (empty($slipData['transRef'])) {
            return [
                'valid' => false,
                'error' => 'ไม่พบเลขอ้างอิงในสลิป',
            ];
        }

        return [
            'valid' => true,
            'error' => null,
        ];
    }
}
