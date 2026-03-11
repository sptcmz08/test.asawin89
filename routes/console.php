<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Auto-Scrape Lottery Schedule (เวลาไทย)
|--------------------------------------------------------------------------
| ใช้ lottery:auto-scrape ดึงผลหวยอัตโนมัติหลังเวลาออก
| 
| === หวยหุ้น (เรียงตามเวลาออก) ===
| นิเคอิ เช้า     : 09:30 (จ.-ศ.)
| จีน เช้า        : 10:30 (จ.-ศ.)
| ฮั่งเส็ง เช้า    : 11:10 (จ.-ศ.)
| หุ้นไทย เช้า    : 12:30 (จ.-ศ.) ← ดึง SET+SET50+Change แยก
| ไต้หวัน         : 12:35 (จ.-ศ.)
| เกาหลี          : 13:00 (จ.-ศ.)
| นิเคอิ บ่าย     : 13:00 (จ.-ศ.)
| จีน บ่าย        : 14:00 (จ.-ศ.)
| ฮั่งเส็ง บ่าย    : 15:10 (จ.-ศ.)
| สิงคโปร์        : 16:15 (จ.-ศ.)
| หุ้นไทย เย็น    : 16:50 (จ.-ศ.)
| อินเดีย         : 17:30 (จ.-ศ.)
|
| === หวยปกติ ===
| ฮานอยเฉพาะกิจ  : 16:30 (ทุกวัน)
| หวยฮานอยพิเศษ  : 17:30 (ทุกวัน)
| มาเลย์         : 18:30 (พ/ส/อา)
| หวยฮานอย       : 18:30 (ทุกวัน)
| หวยฮานอย VIP   : 19:30 (ทุกวัน)
| อียิปต์         : 20:00 (จ.-พฤ.)
| หวยลาวพัฒนา    : 20:30 (จ/พ/ศ)
| หวยลาว VIP     : 21:30 (ทุกวัน)
| รัสเซีย         : 22:50 (จ.-ศ.)
| อังกฤษ/เยอรมัน  : 23:50 (จ.-ศ.)
| ดาวโจนส์       : 04:10 (จ.-ศ.)
*/

// ================================
// Thai Government Lottery - Rayriffy API (1st and 16th only)
// ================================
// หวยออก 15:00 → API อัพเดตประมาณ 15:30-16:00
// รันทุก 15 นาที ช่วง 15:30-17:00 จนกว่าจะได้ผล
Schedule::command('lottery:scrape-thai --calculate')
    ->monthlyOn(1, '15:30')
    ->timezone('Asia/Bangkok')
    ->description('Thai lottery Rayriffy - 1st attempt');

Schedule::command('lottery:scrape-thai --calculate')
    ->monthlyOn(1, '15:45')
    ->timezone('Asia/Bangkok')
    ->description('Thai lottery Rayriffy - 1st retry');

Schedule::command('lottery:scrape-thai --calculate')
    ->monthlyOn(1, '16:00')
    ->timezone('Asia/Bangkok')
    ->description('Thai lottery Rayriffy - 2nd retry');

Schedule::command('lottery:scrape-thai --calculate')
    ->monthlyOn(1, '16:30')
    ->timezone('Asia/Bangkok')
    ->description('Thai lottery Rayriffy - 3rd retry');

Schedule::command('lottery:scrape-thai --calculate')
    ->monthlyOn(16, '15:30')
    ->timezone('Asia/Bangkok')
    ->description('Thai lottery Rayriffy 16th - 1st attempt');

Schedule::command('lottery:scrape-thai --calculate')
    ->monthlyOn(16, '15:45')
    ->timezone('Asia/Bangkok')
    ->description('Thai lottery Rayriffy 16th - 1st retry');

Schedule::command('lottery:scrape-thai --calculate')
    ->monthlyOn(16, '16:00')
    ->timezone('Asia/Bangkok')
    ->description('Thai lottery Rayriffy 16th - 2nd retry');

Schedule::command('lottery:scrape-thai --calculate')
    ->monthlyOn(16, '16:30')
    ->timezone('Asia/Bangkok')
    ->description('Thai lottery Rayriffy 16th - 3rd retry');

// ================================
// GSB Lottery - ออมสิน (psc.gsb.or.th)
// ================================
// ออมสิน 1 ปี: ออกวันที่ 16 ทุกเดือน เวลา ~10:30
// ออมสิน 2 ปี: ออกวันที่ 1 ทุกเดือน เวลา ~10:30
Schedule::command('lottery:scrape-gsb 1year --calculate')
    ->monthlyOn(16, '11:00')
    ->timezone('Asia/Bangkok')
    ->description('GSB 1-year lottery scrape');

Schedule::command('lottery:scrape-gsb 1year --calculate')
    ->monthlyOn(16, '11:30')
    ->timezone('Asia/Bangkok')
    ->description('GSB 1-year lottery retry');

Schedule::command('lottery:scrape-gsb 2year --calculate')
    ->monthlyOn(1, '11:00')
    ->timezone('Asia/Bangkok')
    ->description('GSB 2-year lottery scrape');

Schedule::command('lottery:scrape-gsb 2year --calculate')
    ->monthlyOn(1, '11:30')
    ->timezone('Asia/Bangkok')
    ->description('GSB 2-year lottery retry');

// ================================
// Thai Stock Morning (SET Index at 12:30) - ไม่ใช้ ManyCai
// ================================
// หุ้นไทยเช้า: ดึงจาก set.or.th (Puppeteer), fallback: Google Finance
// ค่า SET/SET50/Change จะคงที่ช่วง 12:30-14:00 (ตลาดพัก)
Schedule::command('lottery:scrape-thai-stock-morning --calculate')
    ->weekdays()
    ->at('12:35')
    ->timezone('Asia/Bangkok')
    ->description('Thai stock morning - fallback 1st attempt');

Schedule::command('lottery:scrape-thai-stock-morning --calculate')
    ->weekdays()
    ->at('12:45')
    ->timezone('Asia/Bangkok')
    ->description('Thai stock morning - fallback retry');

// ================================
// Stock Lotteries - Morning Session (จ.-ศ.)
// ================================
// รันทุก 1 นาที ช่วง 09:30-13:30 สำหรับหุ้นเช้า (ManyCai)
Schedule::command('lottery:auto-scrape --all --calculate')
    ->everyMinute()
    ->weekdays()
    ->between('09:30', '13:30')
    ->timezone('Asia/Bangkok')
    ->description('Stock morning session scrape');

// ================================
// Stock Lotteries - Afternoon Session (จ.-ศ.)
// ================================
// รันทุก 1 นาที ช่วง 13:30-17:30 สำหรับหุ้นบ่าย
Schedule::command('lottery:auto-scrape --all --calculate')
    ->everyMinute()
    ->weekdays()
    ->between('13:30', '17:30')
    ->timezone('Asia/Bangkok')
    ->description('Stock afternoon session scrape');

// ================================
// Thai Stock Evening — ใช้ ManyCai (auto-scrape ช่วง 13:30-17:30 บรรทัด 147)
// ================================
// ⚠️ DISABLED: ScrapeThaiStockEvening (Google Finance) ให้ค่าผิด
// ManyCai ดึงผลรอบเย็นได้ถูกต้องอยู่แล้ว ('หุ้นไทย' → 'thai-stock')
// เก็บ command ไว้ใช้ manual fix ถ้าจำเป็น:
//   php artisan lottery:scrape-thai-stock-evening --set=X --set50=X --change=X --force --calculate

// ================================
// Daily Lotteries (ทุกวัน 16:15-22:00)
// ================================
// ฮานอยเฉพาะกิจ (16:30), ฮานอยพิเศษ (17:30), ฮานอย (18:30), มาเลย์ (18:30 พ/ส/อา)
// ฮานอย VIP (19:30), อียิปต์ (20:00 จ-พฤ), ลาวพัฒนา (20:30 จ/พ/ศ), ลาว VIP (21:30)
Schedule::command('lottery:auto-scrape --all --calculate')
    ->everyMinute()
    ->between('16:15', '22:00')
    ->timezone('Asia/Bangkok')
    ->description('Daily lottery scrape (Hanoi/Lao/Malay/Egypt)');

// ================================
// หวยฮานอยปกติ - XSMB API (ทุกวัน ~18:15)
// ================================
// ⚠️ DISABLED: ใช้ Raakaadee ดึงฮานอยปกติแทน (XSMB ส่งผลทีละส่วน → settle ด้วยผลผิดได้)
// เก็บ command ไว้ใช้ manual ถ้าจำเป็น:
//   php artisan lottery:scrape-hanoi-normal --calculate
// Schedule::command('lottery:scrape-hanoi-normal --calculate')
//     ->everyMinute()
//     ->between('18:15', '19:00')
//     ->timezone('Asia/Bangkok')
//     ->description('Hanoi Normal XSMB scrape');
//
// Schedule::command('lottery:scrape-hanoi-normal --calculate')
//     ->dailyAt('19:30')
//     ->timezone('Asia/Bangkok')
//     ->description('Hanoi Normal XSMB catchup');

// ================================
// หวยฮานอยกาชาด - xosoredcross.com API (ทุกวัน 16:30)
// ================================
Schedule::command('lottery:scrape-hanoi-redcross --calculate')
    ->everyMinute()
    ->between('16:30', '17:00')
    ->timezone('Asia/Bangkok')
    ->description('Hanoi Red Cross scrape');

Schedule::command('lottery:scrape-hanoi-redcross --calculate')
    ->dailyAt('17:30')
    ->timezone('Asia/Bangkok')
    ->description('Hanoi Red Cross catchup');

// ================================
// หวยมาเลย์ Magnum 4D - 4dresult88.com (พ. ส. อา. 18:30)
// ================================
Schedule::command('lottery:scrape-malay --calculate')
    ->everyMinute()
    ->days([0, 3, 6]) // อา.(0), พ.(3), ส.(6)
    ->between('19:00', '19:30')
    ->timezone('Asia/Bangkok')
    ->description('Malay Magnum 4D scrape');

Schedule::command('lottery:scrape-malay --calculate')
    ->days([0, 3, 6])
    ->at('20:00')
    ->timezone('Asia/Bangkok')
    ->description('Malay Magnum 4D catchup');

// ================================
// Evening/Night Stock Lotteries (จ.-ศ.)
// ================================
// รัสเซีย (22:50), อังกฤษ/เยอรมัน (23:50)
Schedule::command('lottery:auto-scrape --all --calculate')
    ->everyMinute()
    ->weekdays()
    ->between('22:00', '23:59')
    ->timezone('Asia/Bangkok')
    ->description('Evening stock scrape (Russia/UK/Germany)');

// ================================
// Late Night - Dow Jones (จ.-ศ.)
// ================================
// ดาวโจนส์ ออก ~04:10
Schedule::command('lottery:auto-scrape --all --calculate')
    ->everyMinute()
    ->weekdays()
    ->between('04:00', '05:30')
    ->timezone('Asia/Bangkok')
    ->description('Dow Jones late night scrape');

// ================================
// 📈 หุ้น VIP (stocks-vip.com) — ออกผลทุกวัน (รวมเสาร์-อาทิตย์)
// ================================
// นิเคอิเช้าVIP(09:05), จีนเช้าVIP(10:05), ฮั่งเส็งเช้าVIP(10:35)
// ไต้หวันVIP(11:35), นิเคอิบ่ายVIP(13:25)
// จีนบ่ายVIP(14:25), ฮั่งเส็งบ่ายVIP(15:25), สิงคโปร์VIP(17:05), อินเดียVIP(17:30)
// อียิปต์VIP(18:40), อังกฤษVIP(21:50), เยอรมันVIP(22:50), รัสเซียVIP(23:50)
// ดาวโจนส์VIP(00:30)

// รอบเช้า (09:05-12:00) — ดึงทุก 5 นาที
Schedule::command('lottery:scrape-stock-vip --calculate')
    ->everyFiveMinutes()
    ->between('09:05', '12:00')
    ->timezone('Asia/Bangkok')
    ->description('VIP Stock morning scrape');

// รอบบ่าย (13:25-16:00) — ดึงทุก 5 นาที
Schedule::command('lottery:scrape-stock-vip --calculate')
    ->everyFiveMinutes()
    ->between('13:25', '16:00')
    ->timezone('Asia/Bangkok')
    ->description('VIP Stock afternoon scrape');

// รอบเย็น (17:05-19:00) — ดึงทุก 5 นาที
Schedule::command('lottery:scrape-stock-vip --calculate')
    ->everyFiveMinutes()
    ->between('17:05', '19:00')
    ->timezone('Asia/Bangkok')
    ->description('VIP Stock evening scrape');

// รอบค่ำ-ดึก (21:50-23:59) — ดึงทุก 5 นาที
Schedule::command('lottery:scrape-stock-vip --calculate')
    ->everyFiveMinutes()
    ->between('21:50', '23:59')
    ->timezone('Asia/Bangkok')
    ->description('VIP Stock night scrape');

// ดาวโจนส์ (00:00-01:00) — ดึงทุก 5 นาที
Schedule::command('lottery:scrape-stock-vip --calculate')
    ->everyFiveMinutes()
    ->between('00:00', '02:00')
    ->timezone('Asia/Bangkok')
    ->description('VIP Stock late night (Dow Jones)');

// Catch-all รวมผลทั้งวัน
Schedule::command('lottery:scrape-stock-vip --calculate')
    ->dailyAt('01:30')
    ->timezone('Asia/Bangkok')
    ->description('VIP Stock final catchup');

// ================================
// 🌐 Raakaadee.com Scraper — PRIMARY (Camoufox)
// ================================
// ดึง 36 หวยจาก raakaadee.com — ใช้เป็นตัวหลัก
// รันทุก 15 นาที ช่วง 09:00-04:30 (~78 รอบ/วัน)
// withoutOverlapping ป้องกันรันซ้อนกัน (Camoufox ใช้เวลา ~3 นาที)

// ช่วงกลางวัน-ดึก: 09:00 - 23:59
Schedule::command('lottery:scrape-raakaadee --calculate')
    ->everyFifteenMinutes()
    ->between('09:00', '23:59')
    ->timezone('Asia/Bangkok')
    ->withoutOverlapping(10)
    ->description('Raakaadee PRIMARY (09:00-23:59)');

// ช่วงหลังเที่ยงคืน: 00:00 - 04:30 (ดาวโจนส์ + catchup)
Schedule::command('lottery:scrape-raakaadee --calculate')
    ->everyFifteenMinutes()
    ->between('00:00', '04:30')
    ->timezone('Asia/Bangkok')
    ->withoutOverlapping(10)
    ->description('Raakaadee PRIMARY (00:00-04:30)');

// ================================
// Nightly Catchup (00:30)
// ================================
// รันสรุปทุกคืนเพื่อ catchup ผลที่พลาดไป
Schedule::command('lottery:auto-scrape --all --calculate')
    ->dailyAt('00:30')
    ->timezone('Asia/Bangkok')
    ->description('Nightly catchup scrape');

// ================================
// หวยลาวสตาร์ (ทุกวัน)
// ================================
// ออก ~15:30-15:45 ทุกวัน (ดึงจาก api.laostars.com)
Schedule::command('lottery:scrape-lao-star --calculate')
    ->everyMinute()
    ->between('15:30', '16:00')
    ->timezone('Asia/Bangkok')
    ->description('Lao Star scrape');

// Catchup ลาวสตาร์ 16:30
Schedule::command('lottery:scrape-lao-star --calculate')
    ->dailyAt('16:30')
    ->timezone('Asia/Bangkok')
    ->description('Lao Star catchup scrape');

// ================================
// หวยลาวสามัคคี (อ/พ/ศ/ส/อา)
// ================================
// ออก ~20:30 (ดึงจาก laounion.com ผ่าน Puppeteer)
Schedule::command('lottery:scrape-lao-samakki --calculate')
    ->everyMinute()
    ->between('20:25', '20:50')
    ->timezone('Asia/Bangkok')
    ->description('Lao Samakki scrape');

// Catchup ลาวสามัคคี 21:15
Schedule::command('lottery:scrape-lao-samakki --calculate')
    ->dailyAt('21:15')
    ->timezone('Asia/Bangkok')
    ->description('Lao Samakki catchup scrape');

// ================================
// หวยลาว VIP (ทุกวัน)
// ================================
// ออก ~21:30 ทุกวัน (ดึงจาก laos-vip.com ผ่าน Puppeteer)
Schedule::command('lottery:scrape-lao-vip --calculate')
    ->everyFiveMinutes()
    ->between('21:25', '22:00')
    ->timezone('Asia/Bangkok')
    ->description('Lao VIP scrape');

// Catchup ลาว VIP 22:30
Schedule::command('lottery:scrape-lao-vip --calculate')
    ->dailyAt('22:30')
    ->timezone('Asia/Bangkok')
    ->description('Lao VIP catchup scrape');

// ================================
// Settlement Sweep — Safety Net
// ================================
// ตรวจทุกชั่วโมง: ถ้ามี pending bets ที่มีผลแล้วแต่ยัง settle ไม่ได้ → settle ทันที
// ป้องกันกรณี scraper บันทึกผลสำเร็จแต่ settlement ล้มเหลว
Schedule::command('lottery:settle-pending')
    ->hourly()
    ->timezone('Asia/Bangkok')
    ->description('Settlement sweep — catch unsettled bets');

// ================================
// Auto-Void Expired Bets
// ================================
// รันทุกชั่วโมงช่วงกลางคืน ตรวจสอบ bets ที่ผ่าน deadline แล้วไม่มีผล
// → void + คืน credit อัตโนมัติ + แจ้ง AdminLog
Schedule::command('lottery:auto-void-expired')
    ->hourly()
    ->between('20:00', '02:00')
    ->timezone('Asia/Bangkok')
    ->description('Auto-void pending bets past draw deadline (20:00-02:00)');

// Catch หวยดึก (ดาวโจนส์ 04:10 → deadline ~09:10)
Schedule::command('lottery:auto-void-expired')
    ->dailyAt('09:00')
    ->timezone('Asia/Bangkok')
    ->description('Auto-void overnight lotteries (Dow Jones catchup)');

// ================================
// 🚨 Security: Anomaly Detection
// ================================
// ทุก 2 ชั่วโมง ตรวจ users ที่ถูกรางวัลผิดปกติ
// auto-flag → ตั้ง risk_level = 'watch' หรือ 'high'
Schedule::command('security:detect-anomalies --auto-flag')
    ->everyTwoHours()
    ->timezone('Asia/Bangkok')
    ->description('Security: Detect anomalous winning patterns');

