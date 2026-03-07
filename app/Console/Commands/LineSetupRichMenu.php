<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use App\Models\Setting;

class LineSetupRichMenu extends Command
{
    protected $signature = 'line:setup-rich-menu';
    protected $description = 'Create and set default Rich Menu for LINE OA';

    public function handle()
    {
        $token = config('services.line.channel_access_token');
        if (!$token) {
            $this->error('❌ LINE_CHANNEL_ACCESS_TOKEN not set in .env');
            return 1;
        }

        // Read LINE IDs from DB settings
        $lineContactId = Setting::get('line_contact_id', '@042jhjrk');
        $lineBackupId = Setting::get('line_backup_id', '@042jhjrk');

        $this->info('🔧 Setting up LINE Rich Menu...');

        // Step 0: Delete existing rich menus
        $this->info('🗑️  Deleting old Rich Menus...');
        $existingMenus = Http::withHeaders([
            'Authorization' => "Bearer {$token}",
        ])->get('https://api.line.me/v2/bot/richmenu/list');

        if ($existingMenus->successful()) {
            foreach ($existingMenus->json('richmenus', []) as $menu) {
                Http::withHeaders([
                    'Authorization' => "Bearer {$token}",
                ])->delete("https://api.line.me/v2/bot/richmenu/{$menu['richMenuId']}");
                $this->info("   Deleted: {$menu['richMenuId']}");
            }
        }

        // Step 1: Create Rich Menu structure (2 top + 3 bottom = 5 areas)
        $richMenu = [
            'size' => ['width' => 2500, 'height' => 1686],
            'selected' => true,
            'name' => 'ASAWIN89 Main Menu',
            'chatBarText' => 'เมนู',
            'areas' => [
                // Top-Left: สมัครสมาชิก (60% width)
                [
                    'bounds' => ['x' => 0, 'y' => 0, 'width' => 1500, 'height' => 843],
                    'action' => [
                        'type' => 'uri',
                        'label' => 'สมัครสมาชิก',
                        'uri' => 'https://asawin89.com/register?ref=FM8JES0X',
                    ],
                ],
                // Top-Right: ทางเข้าเล่น (40% width)
                [
                    'bounds' => ['x' => 1500, 'y' => 0, 'width' => 1000, 'height' => 843],
                    'action' => [
                        'type' => 'uri',
                        'label' => 'ทางเข้าเล่น',
                        'uri' => 'https://asawin89.com/login',
                    ],
                ],
                // Bottom-Left: ติดต่อเรา (33%)
                [
                    'bounds' => ['x' => 0, 'y' => 843, 'width' => 833, 'height' => 843],
                    'action' => [
                        'type' => 'uri',
                        'label' => 'ติดต่อเรา',
                        'uri' => "https://line.me/R/ti/p/{$lineContactId}",
                    ],
                ],
                // Bottom-Center: กิจกรรม (33%)
                [
                    'bounds' => ['x' => 833, 'y' => 843, 'width' => 834, 'height' => 843],
                    'action' => [
                        'type' => 'postback',
                        'label' => 'กิจกรรม',
                        'data' => 'action=promotions',
                        'displayText' => 'กิจกรรม',
                    ],
                ],
                // Bottom-Right: ไลน์สำรอง (33%)
                [
                    'bounds' => ['x' => 1667, 'y' => 843, 'width' => 833, 'height' => 843],
                    'action' => [
                        'type' => 'uri',
                        'label' => 'ไลน์สำรอง',
                        'uri' => "https://line.me/R/ti/p/{$lineBackupId}",
                    ],
                ],
            ],
        ];

        $this->info('📤 Creating Rich Menu...');
        $response = Http::withHeaders([
            'Authorization' => "Bearer {$token}",
            'Content-Type' => 'application/json',
        ])->post('https://api.line.me/v2/bot/richmenu', $richMenu);

        if (!$response->successful()) {
            $this->error("❌ Failed to create Rich Menu: {$response->body()}");
            return 1;
        }

        $richMenuId = $response->json('richMenuId');
        $this->info("✅ Rich Menu created: {$richMenuId}");

        // Step 2: Upload Rich Menu image
        $imagePath = public_path('images/ricj_menu.jpg');
        if (!file_exists($imagePath)) {
            $this->warn("⚠️  Rich Menu image not found at: {$imagePath}");
            $this->warn("   Please place your image there and run this command again.");
            return 1;
        }

        $this->info('📤 Uploading Rich Menu image...');
        $imageResponse = Http::withHeaders([
            'Authorization' => "Bearer {$token}",
            'Content-Type' => 'image/jpeg',
        ])->withBody(file_get_contents($imagePath), 'image/jpeg')
            ->post("https://api-data.line.me/v2/bot/richmenu/{$richMenuId}/content");

        if ($imageResponse->successful()) {
            $this->info('✅ Image uploaded successfully!');
        } else {
            $this->error("❌ Image upload failed: {$imageResponse->body()}");
            return 1;
        }

        // Step 3: Set as default Rich Menu
        $this->info('📤 Setting as default Rich Menu...');
        $defaultResponse = Http::withHeaders([
            'Authorization' => "Bearer {$token}",
        ])->post("https://api.line.me/v2/bot/user/all/richmenu/{$richMenuId}");

        if ($defaultResponse->successful()) {
            $this->info('✅ Rich Menu set as default!');
        } else {
            $this->error("❌ Failed to set default: {$defaultResponse->body()}");
        }

        $this->newLine();
        $this->info('🎉 LINE OA Rich Menu setup complete!');
        $this->info("   Rich Menu ID: {$richMenuId}");

        return 0;
    }
}
