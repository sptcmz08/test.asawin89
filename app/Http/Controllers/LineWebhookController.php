<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use App\Models\Setting;

class LineWebhookController extends Controller
{
    /**
     * Handle LINE webhook events
     */
    public function handle(Request $request)
    {
        // Verify signature — MUST reject if channel_secret is not configured
        $channelSecret = config('services.line.channel_secret');
        $signature = $request->header('X-Line-Signature');

        if (!$channelSecret) {
            Log::error('LINE Webhook: LINE_CHANNEL_SECRET not configured');
            return response('Server configuration error', 500);
        }

        if (!$signature) {
            Log::warning('LINE Webhook: Missing X-Line-Signature header');
            return response('Missing signature', 403);
        }

        $hash = base64_encode(hash_hmac('sha256', $request->getContent(), $channelSecret, true));
        if (!hash_equals($hash, $signature)) {
            Log::warning('LINE Webhook: Invalid signature');
            return response('Invalid signature', 403);
        }

        $events = $request->input('events', []);

        foreach ($events as $event) {
            try {
                $this->handleEvent($event);
            } catch (\Exception $e) {
                Log::error('LINE Webhook Error: ' . $e->getMessage(), ['event' => $event]);
            }
        }

        return response('OK', 200);
    }

    /**
     * Route events to handlers
     */
    private function handleEvent(array $event)
    {
        $type = $event['type'] ?? '';

        switch ($type) {
            case 'follow':
                $this->handleFollow($event);
                break;
            case 'message':
                $this->handleMessage($event);
                break;
            case 'postback':
                $this->handlePostback($event);
                break;
        }
    }

    /**
     * Welcome message when user adds friend
     */
    private function handleFollow(array $event)
    {
        $replyToken = $event['replyToken'] ?? null;
        if (!$replyToken)
            return;

        $this->replyMessage($replyToken, [
            [
                'type' => 'text',
                'text' => "🎰 แทงหวยออนไลน์ จ่ายจริง จ่ายเต็ม!\nสมัครเลย 👉 https://asawin89.com/register?ref=FM8JES0X\nสมัครฟรี ไม่มีค่าธรรมเนียม ฝาก-ถอน ไม่มีขั้นต่ำ",
            ],
        ]);
    }

    /**
     * Handle text messages (auto-reply)
     */
    private function handleMessage(array $event)
    {
        $replyToken = $event['replyToken'] ?? null;
        $messageType = $event['message']['type'] ?? '';
        $text = trim($event['message']['text'] ?? '');

        if (!$replyToken || $messageType !== 'text')
            return;

        $textLower = mb_strtolower($text);

        // Keyword matching
        if ($this->matchKeyword($textLower, ['กิจกรรม', 'โปรโมชั่น', 'โปร', 'โบนัส', 'promotion'])) {
            $this->replyPromotions($replyToken);
        } elseif ($this->matchKeyword($textLower, ['สมัคร', 'register', 'ลงทะเบียน'])) {
            $this->replyMessage($replyToken, [['type' => 'text', 'text' => "📝 สมัครสมาชิกง่ายๆ กดลิงก์ด้านล่าง 👇\n\nhttps://asawin89.com/register\n\n✅ สมัครฟรี ไม่มีค่าใช้จ่าย!"]]);
        } elseif ($this->matchKeyword($textLower, ['เข้าเล่น', 'เข้าสู่ระบบ', 'login', 'ล็อกอิน'])) {
            $this->replyMessage($replyToken, [['type' => 'text', 'text' => "🎰 เข้าเล่นได้ที่ 👇\n\nhttps://asawin89.com/login\n\n🔥 หวยเปิดให้แทงทุกวัน!"]]);
        } elseif ($this->matchKeyword($textLower, ['ติดต่อ', 'แอดมิน', 'contact', 'help', 'ช่วย'])) {
            $this->replyContactMessage($replyToken);
        }
        // Don't reply to unmatched messages (let admin handle manually)
    }

    /**
     * Handle postback events (Rich Menu actions)
     */
    private function handlePostback(array $event)
    {
        $replyToken = $event['replyToken'] ?? null;
        $data = $event['postback']['data'] ?? '';

        if (!$replyToken)
            return;

        switch ($data) {
            case 'action=promotions':
                $this->replyPromotions($replyToken);
                break;
            case 'action=contact':
                $this->replyContactMessage($replyToken);
                break;
        }
    }

    /**
     * Send contact reply (reads LINE ID from DB settings)
     */
    private function replyContactMessage(string $replyToken)
    {
        // Read from DB settings, fall back to default
        $lineId = Setting::get('line_contact_id', '@042jhjrk');
        $customMessage = Setting::get('line_contact_message', '');

        $message = $customMessage ?: "📞 ติดต่อเราได้ที่\n\n💬 LINE: {$lineId}\n🕐 บริการ 24 ชั่วโมง\n\nแอดมินพร้อมช่วยเหลือทุกเรื่อง! 😊";

        $this->replyMessage($replyToken, [['type' => 'text', 'text' => $message]]);
    }

    /**
     * Send promotions reply
     */
    private function replyPromotions(string $replyToken)
    {
        $this->replyMessage($replyToken, [
            [
                'type' => 'flex',
                'altText' => '🎁 กิจกรรมและโปรโมชั่น',
                'contents' => $this->getPromotionFlexMessage(),
            ],
        ]);
    }

    /**
     * Promotion Flex Message (reads from DB settings)
     */
    private function getPromotionFlexMessage(): array
    {
        $defaultPromos = [
            '🔥 สมัครใหม่ รับเครดิตฟรี 100 บาท',
            '💰 ฝาก 500 รับโบนัส 300 บาท',
            '👥 เชิญเพื่อน รับค่าคอมมิชชั่นทันที',
            '🎰 หวยเปิดให้แทงทุกวัน ครบทุกสำนัก',
        ];

        try {
            $raw = Setting::get('line_promotions', '');
            $promos = $raw ? json_decode($raw, true) : [];
            if (empty($promos))
                $promos = $defaultPromos;
        } catch (\Exception $e) {
            $promos = $defaultPromos;
        }

        $promoItems = array_map(fn($p) => [
            'type' => 'box',
            'layout' => 'horizontal',
            'contents' => [
                ['type' => 'text', 'text' => '•', 'size' => 'sm', 'flex' => 0, 'color' => '#FFD700'],
                ['type' => 'text', 'text' => $p ?: '-', 'size' => 'sm', 'color' => '#FFFFFF', 'wrap' => true],
            ],
            'spacing' => 'sm',
        ], array_filter($promos));

        return [
            'type' => 'bubble',
            'body' => [
                'type' => 'box',
                'layout' => 'vertical',
                'contents' => [
                    [
                        'type' => 'text',
                        'text' => '🎁 กิจกรรม & โปรโมชั่น',
                        'weight' => 'bold',
                        'size' => 'lg',
                        'color' => '#FFD700',
                    ],
                    ['type' => 'separator', 'margin' => 'md'],
                    [
                        'type' => 'box',
                        'layout' => 'vertical',
                        'margin' => 'md',
                        'spacing' => 'sm',
                        'contents' => array_values($promoItems),
                    ],
                    ['type' => 'separator', 'margin' => 'md'],
                    [
                        'type' => 'text',
                        'text' => '⚡ โปรโมชั่นอาจเปลี่ยนแปลงได้ตามเงื่อนไข',
                        'size' => 'xxs',
                        'color' => '#888888',
                        'margin' => 'md',
                        'wrap' => true,
                    ],
                    [
                        'type' => 'button',
                        'action' => ['type' => 'uri', 'label' => '🎮 เข้าเล่นเลย', 'uri' => 'https://asawin89.com/register'],
                        'style' => 'primary',
                        'color' => '#FFD700',
                        'height' => 'sm',
                        'margin' => 'md',
                    ],
                ],
                'backgroundColor' => '#0a1628',
                'paddingAll' => '20px',
            ],
        ];
    }
    /**
     * Reply to LINE event
     */
    private function replyMessage(string $replyToken, array $messages)
    {
        $token = config('services.line.channel_access_token');
        if (!$token) {
            Log::error('LINE: Missing channel access token');
            return;
        }

        $response = Http::withHeaders([
            'Authorization' => "Bearer {$token}",
        ])->post('https://api.line.me/v2/bot/message/reply', [
                    'replyToken' => $replyToken,
                    'messages' => $messages,
                ]);

        if (!$response->successful()) {
            Log::error('LINE Reply Error', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
        }
    }

    /**
     * Check if text matches any keyword
     */
    private function matchKeyword(string $text, array $keywords): bool
    {
        foreach ($keywords as $keyword) {
            if (str_contains($text, $keyword)) {
                return true;
            }
        }
        return false;
    }
}
