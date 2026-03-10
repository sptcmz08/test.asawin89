#!/usr/bin/env python3
"""
Raakaadee.com Lottery Scraper v2
ดึงผลหวยจาก raakaadee.com ด้วย Camoufox (bypass Cloudflare)

Usage: .venv/bin/python scripts/scrape_raakaadee.py [--debug] [--slug=china-morning-vip] [--url=...]
Output: JSON to stdout
"""

import sys
import json
import re
import argparse
from datetime import datetime

# ============ LOTTERY NAME → SLUG MAPPING ============
# เฉพาะหวยที่มีอยู่ในระบบ asawin89.com เท่านั้น
# Key = keyword ที่อาจเจอในข้อความ raakaadee.com, Value = system slug
LOTTERY_MAPPINGS = {
    # === หุ้น VIP (14 ตัว) ===
    'หุ้นนิเคอิเช้า VIP': 'nikkei-morning-vip',
    'หุ้นนิเคอิ เช้า VIP': 'nikkei-morning-vip',
    'นิเคอิเช้า VIP': 'nikkei-morning-vip',
    'นิเคอิเช้าVIP': 'nikkei-morning-vip',
    'หุ้นนิเคอิบ่าย VIP': 'nikkei-afternoon-vip',
    'หุ้นนิเคอิ บ่าย VIP': 'nikkei-afternoon-vip',
    'นิเคอิบ่าย VIP': 'nikkei-afternoon-vip',
    'นิเคอิบ่ายVIP': 'nikkei-afternoon-vip',
    'หุ้นจีนเช้า VIP': 'china-morning-vip',
    'หุ้นจีน เช้า VIP': 'china-morning-vip',
    'จีนเช้า VIP': 'china-morning-vip',
    'จีนเช้าVIP': 'china-morning-vip',
    'หุ้นจีนบ่าย VIP': 'china-afternoon-vip',
    'หุ้นจีน บ่าย VIP': 'china-afternoon-vip',
    'จีนบ่าย VIP': 'china-afternoon-vip',
    'จีนบ่ายVIP': 'china-afternoon-vip',
    'หุ้นฮั่งเส็งเช้า VIP': 'hangseng-morning-vip',
    'หุ้นฮั่งเส็ง เช้า VIP': 'hangseng-morning-vip',
    'ฮั่งเส็งเช้า VIP': 'hangseng-morning-vip',
    'ฮั่งเส็งเช้าVIP': 'hangseng-morning-vip',
    'หุ้นฮั่งเส็งบ่าย VIP': 'hangseng-afternoon-vip',
    'หุ้นฮั่งเส็ง บ่าย VIP': 'hangseng-afternoon-vip',
    'ฮั่งเส็งบ่าย VIP': 'hangseng-afternoon-vip',
    'ฮั่งเส็งบ่ายVIP': 'hangseng-afternoon-vip',
    'หุ้นไต้หวัน VIP': 'taiwan-vip',
    'ไต้หวัน VIP': 'taiwan-vip',
    'ไต้หวันVIP': 'taiwan-vip',
    'หุ้นสิงคโปร์ VIP': 'singapore-vip',
    'สิงคโปร์ VIP': 'singapore-vip',
    'หุ้นอินเดีย VIP': 'india-vip',
    'อินเดีย VIP': 'india-vip',
    'หุ้นอียิปต์ VIP': 'egypt-vip',
    'อียิปต์ VIP': 'egypt-vip',
    'หุ้นอังกฤษ VIP': 'uk-vip',
    'อังกฤษ VIP': 'uk-vip',
    'หุ้นเยอรมัน VIP': 'germany-vip',
    'เยอรมัน VIP': 'germany-vip',
    'หุ้นรัสเซีย VIP': 'russia-vip',
    'รัสเซีย VIP': 'russia-vip',
    'หุ้นดาวโจนส์ VIP': 'dowjones-vip',
    'ดาวโจนส์ VIP': 'dowjones-vip',

    # === หุ้นปกติ (non-VIP) ===
    'หุ้นนิเคอิเช้า': 'nikkei-morning',
    'หุ้นนิเคอิ เช้า': 'nikkei-morning',
    'หุ้นนิเคอิบ่าย': 'nikkei-afternoon',
    'หุ้นนิเคอิ บ่าย': 'nikkei-afternoon',
    'หุ้นจีนเช้า': 'china-morning',
    'หุ้นจีน เช้า': 'china-morning',
    'หุ้นจีนบ่าย': 'china-afternoon',
    'หุ้นจีน บ่าย': 'china-afternoon',
    'หุ้นฮั่งเส็งเช้า': 'hangseng-morning',
    'หุ้นฮั่งเส็ง เช้า': 'hangseng-morning',
    'หุ้นฮั่งเส็งบ่าย': 'hangseng-afternoon',
    'หุ้นฮั่งเส็ง บ่าย': 'hangseng-afternoon',
    'หุ้นไต้หวัน': 'taiwan',
    'หุ้นเกาหลี': 'korea',
    'หุ้นสิงคโปร์': 'singapore',
    'หุ้นอินเดีย': 'india',
    'หุ้นอียิปต์': 'egypt',
    'หุ้นอังกฤษ': 'uk',
    'หุ้นเยอรมัน': 'germany',
    'หุ้นรัสเซีย': 'russia',
    'หุ้นดาวโจนส์': 'dowjones',
    'หุ้นไทย': 'thai-stock',
    'หุ้นไทยเย็น': 'thai-stock',
    'หุ้นไทยเช้า': 'thai-stock-morning',

    # === หวยฮานอย ===
    'หวยฮานอย': 'hanoi',
    'หวยฮานอยปกติ': 'hanoi',
    'หวยฮานอย VIP': 'hanoi-vip',
    'หวยฮานอยVIP': 'hanoi-vip',
    'หวยฮานอยพิเศษ': 'hanoi-special',
    'ฮานอยพิเศษ': 'hanoi-special',
    'หวยฮานอยเฉพาะกิจ': 'hanoi-adhoc',
    'ฮานอยเฉพาะกิจ': 'hanoi-adhoc',
    'หวยฮานอยกาชาด': 'hanoi-redcross',
    'ฮานอยกาชาด': 'hanoi-redcross',

    # === หวยลาว ===
    'หวยลาว': 'lao',
    'หวยลาวปกติ': 'lao',
    'หวยลาว VIP': 'lao-vip',
    'ลาว VIP': 'lao-vip',
    'หวยลาวสตาร์': 'lao-star',
    'ลาวสตาร์': 'lao-star',
    'หวยลาวสามัคคี': 'lao-samakki',
    'ลาวสามัคคี': 'lao-samakki',

    # === อื่นๆ ===
    'หวยรัฐบาล': 'thai',
    'สลากกินแบ่งรัฐบาล': 'thai',
    'หวยมาเลย์': 'malay',
}


def match_slug(text):
    """Try to match text against known lottery names — longest match first"""
    text = text.strip()
    text_norm = re.sub(r'\s+', ' ', text)

    # Try exact match first
    if text_norm in LOTTERY_MAPPINGS:
        return LOTTERY_MAPPINGS[text_norm], text_norm

    # Try longest substring match (to avoid "หุ้นจีนเช้า" matching before "หุ้นจีนเช้า VIP")
    # Sort by key length descending so longer matches take priority
    for key in sorted(LOTTERY_MAPPINGS.keys(), key=len, reverse=True):
        key_norm = re.sub(r'\s+', '', key)
        text_clean = re.sub(r'\s+', '', text_norm)
        if key_norm in text_clean:
            return LOTTERY_MAPPINGS[key], key

    return None, None


def scrape_raakaadee(debug=False, target_slug=None, target_url=None):
    """Main scraper function using Camoufox"""
    print('[Raakaadee] Starting Camoufox scraper v2...', file=sys.stderr)

    try:
        from camoufox.sync_api import Camoufox
    except ImportError:
        print('[Raakaadee] ERROR: camoufox not installed. Run: pip install camoufox[geoip] && camoufox fetch', file=sys.stderr)
        return {'success': False, 'error': 'camoufox not installed', 'results': []}

    url = target_url or 'https://www.raakaadee.com/'
    today = datetime.now().strftime('%Y-%m-%d')

    try:
        with Camoufox(headless=True) as browser:
            page = browser.new_page()
            print(f'[Raakaadee] 🌐 Loading {url}...', file=sys.stderr)

            page.goto(url, timeout=60000)
            page.wait_for_load_state('networkidle', timeout=30000)

            # Wait for Cloudflare challenge to complete
            max_cf_wait = 30
            cf_interval = 3
            waited = 0
            while waited < max_cf_wait:
                check_text = page.evaluate('() => document.body.innerText')
                if 'checking your browser' in check_text.lower() or 'please wait' in check_text.lower():
                    print(f'[Raakaadee] ⏳ Cloudflare challenge detected, waiting... ({waited}s/{max_cf_wait}s)', file=sys.stderr)
                    page.wait_for_timeout(cf_interval * 1000)
                    waited += cf_interval
                else:
                    print(f'[Raakaadee] ✅ Cloudflare challenge passed! ({waited}s)', file=sys.stderr)
                    break
            else:
                print(f'[Raakaadee] ⚠️ Cloudflare challenge did not clear after {max_cf_wait}s', file=sys.stderr)
                return {'success': False, 'error': f'Cloudflare challenge timeout ({max_cf_wait}s)', 'results': []}

            page.wait_for_timeout(3000)

            # ============ USE DOM TO EXTRACT STRUCTURED DATA ============
            # Instead of parsing text, use Puppeteer-style DOM queries
            # to find each lottery section and extract its numbers
            sections = page.evaluate('''() => {
                const results = [];
                const body = document.body.innerText;
                
                // Get ALL text content as one big string
                return body;
            }''')

            page_url = page.url

            if debug:
                print(f'[Raakaadee] URL: {page_url}', file=sys.stderr)
                # Show more of the page
                print(f'[Raakaadee] Page length: {len(sections)} chars', file=sys.stderr)
                print(f'[Raakaadee] Page text preview:\n{sections[:5000]}', file=sys.stderr)

            # ============ PARSE RESULTS ============
            results = []
            found_slugs = set()

            # Strategy: scan page text for known lottery names,
            # then try to extract 3-digit (top) and 2-digit (bottom) numbers nearby

            lines = sections.split('\n')

            for i, line in enumerate(lines):
                line_stripped = line.strip()
                if not line_stripped or len(line_stripped) < 3:
                    continue

                # Try to match this line to a known lottery
                slug, matched_name = match_slug(line_stripped)

                if not slug:
                    continue

                # Avoid duplicates (first match wins for each slug)
                if slug in found_slugs:
                    continue

                if debug:
                    print(f'[Raakaadee] 🔍 Found: "{line_stripped}" → slug={slug}', file=sys.stderr)

                # Look ahead in next 15 lines for result numbers
                search_window = '\n'.join(lines[i:i+20])
                three_top = None
                two_bottom = None

                # Pattern 1: "3 ตัวบน" followed by 3-digit number
                top_match = re.search(r'(?:3\s*ตัวบน|สามตัวบน|เลข\s*3\s*ตัว|three.*top)\s*[:\s]*(\d{3})', search_window, re.IGNORECASE)
                if top_match:
                    three_top = top_match.group(1)

                # Pattern 2: "2 ตัวล่าง" followed by 2-digit number
                bottom_match = re.search(r'(?:2\s*ตัวล่าง|สองตัวล่าง|เลข\s*2\s*ตัว|two.*bottom)\s*[:\s]*(\d{2})', search_window, re.IGNORECASE)
                if bottom_match:
                    two_bottom = bottom_match.group(1)

                # Pattern 3: For Thai government lottery: "รางวัลที่ 1" + 6-digit → take last 3
                if not three_top and slug == 'thai':
                    thai_match = re.search(r'รางวัลที่\s*1[^\d]*(\d{6})', search_window)
                    if thai_match:
                        three_top = thai_match.group(1)[-3:]  # Last 3 digits
                    # Also look for "เลขท้าย 2 ตัว"
                    thai_bottom = re.search(r'เลขท้าย\s*2\s*ตัว[^\d]*(\d{2})', search_window)
                    if thai_bottom:
                        two_bottom = thai_bottom.group(1)

                # Pattern 4: Generic — look for standalone 3-digit number, then 2-digit
                if not three_top:
                    # Look in the search window for lines that are just 3 digits
                    for j in range(i+1, min(i+15, len(lines))):
                        candidate = lines[j].strip()
                        if re.match(r'^\d{3}$', candidate):
                            three_top = candidate
                            break
                        # Stop if we hit another lottery name
                        other_slug, _ = match_slug(candidate)
                        if other_slug and other_slug != slug:
                            break

                if three_top and not two_bottom:
                    # Look for 2-digit bottom after we found the top
                    for j in range(i+1, min(i+15, len(lines))):
                        candidate = lines[j].strip()
                        if re.match(r'^\d{2}$', candidate):
                            two_bottom = candidate
                            break
                        if other_slug and other_slug != slug:
                            break

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
                    print(f'[Raakaadee] ✅ {matched_name}: {three_top} / {three_top[-2:]} / {two_bottom or "?"} (slug: {slug})', file=sys.stderr)
                else:
                    if debug:
                        print(f'[Raakaadee] ⚠️  {matched_name}: ไม่พบตัวเลขผล (slug: {slug})', file=sys.stderr)

            # Filter by slug if specified
            if target_slug:
                results = [r for r in results if r['slug'] == target_slug]

            print(f'[Raakaadee] 📊 Total matched: {len(results)} / {len(LOTTERY_MAPPINGS)} mapped lotteries', file=sys.stderr)
            print(f'[Raakaadee] 📋 Matched slugs: {", ".join(sorted(found_slugs))}', file=sys.stderr)

            return {
                'success': True,
                'results': results,
                'scraped_at': datetime.now().isoformat(),
                'source_url': page_url,
            }

    except Exception as e:
        print(f'[Raakaadee] ❌ Error: {e}', file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return {
            'success': False,
            'error': str(e),
            'results': [],
        }


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Scrape lottery results from raakaadee.com')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    parser.add_argument('--slug', type=str, help='Filter by specific slug')
    parser.add_argument('--url', type=str, help='Specific raakaadee.com URL to scrape')
    args = parser.parse_args()

    result = scrape_raakaadee(debug=args.debug, target_slug=args.slug, target_url=args.url)

    # Output JSON to stdout
    print(json.dumps(result, ensure_ascii=False))

    if not result['success']:
        sys.exit(1)
