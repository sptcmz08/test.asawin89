#!/usr/bin/env python3
"""
Raakaadee.com Lottery Scraper v3
ดึงผลหวยจาก raakaadee.com ด้วย Camoufox (bypass Cloudflare)
Scrape แยกหน้าตามหมวดหวย เพื่อความแม่นยำ

Usage: .venv/bin/python scripts/scrape_raakaadee.py [--debug] [--slug=china-morning-vip] [--url=...]
Output: JSON to stdout
"""

import sys
import json
import re
import argparse
from datetime import datetime

# ============ CATEGORY PAGES TO SCRAPE ============
# แต่ละหน้ามีผลหวยเฉพาะหมวดนั้น ดึงแม่นกว่าหน้าหลัก
CATEGORY_URLS = [
    'https://www.raakaadee.com/ตรวจหวย-หุ้น/หุ้น-VIP/',
    'https://www.raakaadee.com/ตรวจหวย-หุ้น/หวยฮานอย/',
    'https://www.raakaadee.com/ตรวจหวย-หุ้น/หวยลาว/',
    'https://www.raakaadee.com/ตรวจหวย-หุ้น/หุ้นจีน/',
    'https://www.raakaadee.com/ตรวจหวย-หุ้น/หุ้นนิเคอิ/',
    'https://www.raakaadee.com/ตรวจหวย-หุ้น/หุ้นฮั่งเส็ง/',
    'https://www.raakaadee.com/ตรวจหวย-หุ้น/หุ้นไต้หวัน/',
    'https://www.raakaadee.com/ตรวจหวย-หุ้น/หุ้นเกาหลี/',
    'https://www.raakaadee.com/ตรวจหวย-หุ้น/หุ้นสิงคโปร์/',
    'https://www.raakaadee.com/ตรวจหวย-หุ้น/หุ้นอินเดีย/',
    'https://www.raakaadee.com/ตรวจหวย-หุ้น/หุ้นอียิปต์/',
    'https://www.raakaadee.com/ตรวจหวย-หุ้น/หุ้นอังกฤษ/',
    'https://www.raakaadee.com/ตรวจหวย-หุ้น/หุ้นเยอรมัน/',
    'https://www.raakaadee.com/ตรวจหวย-หุ้น/หุ้นรัสเซีย/',
    'https://www.raakaadee.com/ตรวจหวย-หุ้น/หุ้นดาวโจนส์/',
    'https://www.raakaadee.com/ตรวจหวย-หุ้น/หุ้นไทย/',
    'https://www.raakaadee.com/',  # หน้าหลัก — fallback
]

# ============ LOTTERY NAME → SLUG MAPPING ============
# เฉพาะหวยที่มีอยู่ในระบบ asawin89.com เท่านั้น
LOTTERY_MAPPINGS = {
    # === หุ้น VIP ===
    'นิเคอิเช้า VIP': 'nikkei-morning-vip',
    'นิเคอิเช้าVIP': 'nikkei-morning-vip',
    'นิเคอิบ่าย VIP': 'nikkei-afternoon-vip',
    'นิเคอิบ่ายVIP': 'nikkei-afternoon-vip',
    'จีนเช้า VIP': 'china-morning-vip',
    'จีนเช้าVIP': 'china-morning-vip',
    'จีนบ่าย VIP': 'china-afternoon-vip',
    'จีนบ่ายVIP': 'china-afternoon-vip',
    'ฮั่งเส็งเช้า VIP': 'hangseng-morning-vip',
    'ฮั่งเส็งเช้าVIP': 'hangseng-morning-vip',
    'ฮั่งเส็งบ่าย VIP': 'hangseng-afternoon-vip',
    'ฮั่งเส็งบ่ายVIP': 'hangseng-afternoon-vip',
    'ไต้หวัน VIP': 'taiwan-vip',
    'ไต้หวันVIP': 'taiwan-vip',
    'สิงคโปร์ VIP': 'singapore-vip',
    'อินเดีย VIP': 'india-vip',
    'อียิปต์ VIP': 'egypt-vip',
    'อังกฤษ VIP': 'uk-vip',
    'เยอรมัน VIP': 'germany-vip',
    'รัสเซีย VIP': 'russia-vip',
    'ดาวโจนส์ VIP': 'dowjones-vip',
    'เกาหลี VIP': 'korea',  # ระบบไม่มี korea-vip → ใช้ korea

    # === หุ้นปกติ ===
    'หุ้นนิเคอิเช้า': 'nikkei-morning',
    'หุ้นนิเคอิบ่าย': 'nikkei-afternoon',
    'หุ้นจีนเช้า': 'china-morning',
    'หุ้นจีนบ่าย': 'china-afternoon',
    'หุ้นฮั่งเส็งเช้า': 'hangseng-morning',
    'หุ้นฮั่งเส็งบ่าย': 'hangseng-afternoon',
    'หุ้นไต้หวัน': 'taiwan',
    'ไต้หวันพิเศษ': 'taiwan',
    'หุ้นเกาหลี': 'korea',
    'เกาหลีพิเศษ': 'korea',
    'หุ้นสิงคโปร์': 'singapore',
    'หุ้นอินเดีย': 'india',
    'หุ้นอียิปต์': 'egypt',
    'หุ้นอังกฤษ': 'uk',
    'หุ้นเยอรมัน': 'germany',
    'หุ้นรัสเซีย': 'russia',
    'หุ้นดาวโจนส์': 'dowjones',
    'หุ้นไทยช่อง9': 'thai-stock',
    'หุ้นไทย ปิด': 'thai-stock',
    'หุ้นไทยเย็น': 'thai-stock',
    'หุ้นไทยบ่าย': 'thai-stock',
    'หุ้นไทยช่อง9 ปิด': 'thai-stock',
    'หุ้นไทยเช้า': 'thai-stock-morning',
    'หุ้นไทย เปิด': 'thai-stock-morning',
    'หุ้นไทยช่อง9 เปิด': 'thai-stock-morning',

    # === หวยฮานอย ===
    'ฮานอยปกติ': 'hanoi',
    'ฮานอย ออก': 'hanoi',
    'ฮานอย VISA': 'hanoi',
    'ฮานอย VIP': 'hanoi-vip',
    'ฮานอยVIP': 'hanoi-vip',
    'ฮานอยพิเศษ': 'hanoi-special',
    'ฮานอยเฉพาะกิจ': 'hanoi-adhoc',
    'ฮานอยกาชาด': 'hanoi-redcross',

    # === หวยลาว ===
    'ลาวร่ำรวย': 'lao',
    'หวยลาว ': 'lao',
    'ลาว VIP': 'lao-vip',
    'ลาวVIP': 'lao-vip',
    'ลาวสตาร์': 'lao-star',
    'ลาวสามัคคี': 'lao-samakki',

    # === อื่นๆ ===
    'สลากกินแบ่งรัฐบาล': 'thai',
    'หวยมาเลย์': 'malay',
}


def match_slug(text):
    """Match text against known lottery names — longest match first"""
    text_clean = re.sub(r'\s+', ' ', text.strip())
    for key in sorted(LOTTERY_MAPPINGS.keys(), key=len, reverse=True):
        if key in text_clean:
            return LOTTERY_MAPPINGS[key], key
    return None, None


def parse_page_results(lines, found_slugs, today, debug=False):
    """Parse results from a single page's lines"""
    results = []

    for i, line in enumerate(lines):
        line_stripped = line.strip()

        # Only process lines containing "ตรวจผล" (actual results)
        if 'ตรวจผล' not in line_stripped:
            continue

        slug, matched_name = match_slug(line_stripped)
        if not slug or slug in found_slugs:
            if debug and not slug:
                short = line_stripped[:60]
                print(f'[Raakaadee]   ⚠️ No match: "{short}"', file=sys.stderr)
            continue

        # Look ahead for "3 ตัวบน" and "2 ตัวล่าง"
        three_top = None
        two_bottom = None

        for j in range(i+1, min(i+10, len(lines))):
            next_line = lines[j].strip()
            if 'ตรวจผล' in next_line:
                break  # Next lottery section

            top_m = re.match(r'3\s*ตัวบน\s+(\d{3})', next_line)
            if top_m:
                three_top = top_m.group(1)

            bottom_m = re.match(r'2\s*ตัวล่าง\s*(\d{2})', next_line)
            if bottom_m:
                two_bottom = bottom_m.group(1)

        if three_top:
            results.append({
                'slug': slug,
                'lottery_name': matched_name,
                'first_prize': three_top,
                'three_top': three_top,
                'two_top': three_top[-2:],
                'two_bottom': two_bottom or '',
                'draw_date': today,
                'source': 'raakaadee.com',
            })
            found_slugs.add(slug)
            print(f'[Raakaadee]   ✅ {matched_name}: {three_top} / {three_top[-2:]} / {two_bottom or "?"} → {slug}', file=sys.stderr)
        elif debug:
            print(f'[Raakaadee]   ⚠️ {matched_name}: ไม่พบ 3 ตัวบน → {slug}', file=sys.stderr)

    return results


def load_page(page, url, debug=False):
    """Load a page, handle Cloudflare challenge, return text"""
    print(f'[Raakaadee] 🌐 Loading {url}...', file=sys.stderr)
    page.goto(url, timeout=60000)
    page.wait_for_load_state('networkidle', timeout=30000)

    # Cloudflare wait
    max_wait = 30
    waited = 0
    while waited < max_wait:
        text = page.evaluate('() => document.body.innerText')
        if 'checking your browser' in text.lower() or 'please wait' in text.lower():
            if waited == 0:
                print(f'[Raakaadee] ⏳ Cloudflare challenge...', file=sys.stderr)
            page.wait_for_timeout(3000)
            waited += 3
        else:
            if waited > 0:
                print(f'[Raakaadee] ✅ Cloudflare passed! ({waited}s)', file=sys.stderr)
            break
    else:
        print(f'[Raakaadee] ⚠️ Cloudflare timeout ({max_wait}s)', file=sys.stderr)
        return None

    page.wait_for_timeout(2000)
    return page.evaluate('() => document.body.innerText')


def scrape_raakaadee(debug=False, target_slug=None, target_url=None):
    """Main scraper — visits multiple category pages"""
    print('[Raakaadee] Starting Camoufox scraper v3...', file=sys.stderr)

    try:
        from camoufox.sync_api import Camoufox
    except ImportError:
        print('[Raakaadee] ERROR: camoufox not installed.', file=sys.stderr)
        return {'success': False, 'error': 'camoufox not installed', 'results': []}

    today = datetime.now().strftime('%Y-%m-%d')

    # If specific URL given, use only that
    urls = [target_url] if target_url else CATEGORY_URLS

    try:
        with Camoufox(headless=True) as browser:
            page = browser.new_page()
            all_results = []
            found_slugs = set()

            for url in urls:
                page_text = load_page(page, url, debug)
                if not page_text:
                    continue

                lines = page_text.split('\n')

                if debug:
                    # Count "ตรวจผล" lines
                    result_lines = [l for l in lines if 'ตรวจผล' in l]
                    print(f'[Raakaadee] 📄 {len(result_lines)} result sections on this page', file=sys.stderr)

                # Parse results
                new_results = parse_page_results(lines, found_slugs, today, debug)
                all_results.extend(new_results)

                # Also handle Thai govt lottery on main page
                if 'thai' not in found_slugs and 'raakaadee.com/' == url.split('/')[-1] + '/' or url.endswith('.com/'):
                    thai_match = re.search(r'รางวัลที่\s*1[^\d]*(\d{6})', page_text)
                    thai_bottom = re.search(r'เลขท้าย\s*2\s*ตัว[^\d]*(\d{2})', page_text)
                    if thai_match:
                        prize = thai_match.group(1)
                        three_top = prize[-3:]
                        two_bottom = thai_bottom.group(1) if thai_bottom else ''
                        all_results.append({
                            'slug': 'thai',
                            'lottery_name': 'สลากกินแบ่งรัฐบาล',
                            'first_prize': prize,
                            'three_top': three_top,
                            'two_top': three_top[-2:],
                            'two_bottom': two_bottom,
                            'draw_date': today,
                            'source': 'raakaadee.com',
                        })
                        found_slugs.add('thai')
                        print(f'[Raakaadee]   ✅ สลากกินแบ่งรัฐบาล: {prize} → 3บน={three_top} 2ล่าง={two_bottom}', file=sys.stderr)

                print(f'[Raakaadee] 📊 Running total: {len(all_results)} results', file=sys.stderr)

            # Filter by slug if specified
            if target_slug:
                all_results = [r for r in all_results if r['slug'] == target_slug]

            # Summary
            print(f'[Raakaadee] ════════════════════════════════', file=sys.stderr)
            print(f'[Raakaadee] 📊 TOTAL: {len(all_results)} results from {len(urls)} pages', file=sys.stderr)
            print(f'[Raakaadee] 📋 Slugs: {", ".join(sorted(found_slugs))}', file=sys.stderr)

            all_system_slugs = set(LOTTERY_MAPPINGS.values())
            missing = all_system_slugs - found_slugs
            if missing:
                print(f'[Raakaadee] ❌ Not found ({len(missing)}): {", ".join(sorted(missing))}', file=sys.stderr)

            return {
                'success': True,
                'results': all_results,
                'scraped_at': datetime.now().isoformat(),
                'pages_scraped': len(urls),
            }

    except Exception as e:
        print(f'[Raakaadee] ❌ Error: {e}', file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return {'success': False, 'error': str(e), 'results': []}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Scrape lottery results from raakaadee.com')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    parser.add_argument('--slug', type=str, help='Filter by specific slug')
    parser.add_argument('--url', type=str, help='Scrape only this URL')
    args = parser.parse_args()

    result = scrape_raakaadee(debug=args.debug, target_slug=args.slug, target_url=args.url)
    print(json.dumps(result, ensure_ascii=False))

    if not result['success']:
        sys.exit(1)
