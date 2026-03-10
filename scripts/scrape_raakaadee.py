#!/usr/bin/env python3
"""
Raakaadee.com Lottery Scraper
ดึงผลหวยทุกประเภทจาก raakaadee.com ด้วย Camoufox (bypass Cloudflare)

Usage: python3 scripts/scrape_raakaadee.py [--debug] [--slug=china-morning-vip] [--url=...]
Output: JSON to stdout
"""

import sys
import json
import re
import argparse
from datetime import datetime

# ============ LOTTERY NAME → SLUG MAPPING ============
# Map Thai lottery names from raakaadee.com → system slugs
LOTTERY_MAPPINGS = {
    # === หุ้น VIP ===
    'หุ้นนิเคอิเช้า VIP': 'nikkei-morning-vip',
    'หุ้นนิเคอิ เช้า VIP': 'nikkei-morning-vip',
    'นิเคอิเช้า VIP': 'nikkei-morning-vip',
    'หุ้นนิเคอิบ่าย VIP': 'nikkei-afternoon-vip',
    'หุ้นนิเคอิ บ่าย VIP': 'nikkei-afternoon-vip',
    'นิเคอิบ่าย VIP': 'nikkei-afternoon-vip',
    'หุ้นจีนเช้า VIP': 'china-morning-vip',
    'หุ้นจีน เช้า VIP': 'china-morning-vip',
    'จีนเช้า VIP': 'china-morning-vip',
    'หุ้นจีนบ่าย VIP': 'china-afternoon-vip',
    'หุ้นจีน บ่าย VIP': 'china-afternoon-vip',
    'จีนบ่าย VIP': 'china-afternoon-vip',
    'หุ้นฮั่งเส็งเช้า VIP': 'hangseng-morning-vip',
    'หุ้นฮั่งเส็ง เช้า VIP': 'hangseng-morning-vip',
    'ฮั่งเส็งเช้า VIP': 'hangseng-morning-vip',
    'หุ้นฮั่งเส็งบ่าย VIP': 'hangseng-afternoon-vip',
    'หุ้นฮั่งเส็ง บ่าย VIP': 'hangseng-afternoon-vip',
    'ฮั่งเส็งบ่าย VIP': 'hangseng-afternoon-vip',
    'หุ้นไต้หวัน VIP': 'taiwan-vip',
    'ไต้หวัน VIP': 'taiwan-vip',
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
    'นิเคอิ - รอบเช้า': 'nikkei-morning',
    'หุ้นนิเคอิบ่าย': 'nikkei-afternoon',
    'หุ้นนิเคอิ บ่าย': 'nikkei-afternoon',
    'นิเคอิ - รอบบ่าย': 'nikkei-afternoon',
    'หุ้นจีนเช้า': 'china-morning',
    'หุ้นจีน เช้า': 'china-morning',
    'หุ้นจีน - รอบเช้า': 'china-morning',
    'หุ้นจีนบ่าย': 'china-afternoon',
    'หุ้นจีน บ่าย': 'china-afternoon',
    'หุ้นจีน - รอบบ่าย': 'china-afternoon',
    'หุ้นฮั่งเส็งเช้า': 'hangseng-morning',
    'หุ้นฮั่งเส็ง เช้า': 'hangseng-morning',
    'หุ้นฮั่งเส็ง - รอบเช้า': 'hangseng-morning',
    'หุ้นฮั่งเส็งบ่าย': 'hangseng-afternoon',
    'หุ้นฮั่งเส็ง บ่าย': 'hangseng-afternoon',
    'หุ้นฮั่งเส็ง - รอบบ่าย': 'hangseng-afternoon',
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

    # === หวยฮานอย ===
    'หวยฮานอย': 'hanoi',
    'หวยฮานอยปกติ': 'hanoi',
    'หวยฮานอย VIP': 'hanoi-vip',
    'หวยฮานอยพิเศษ': 'hanoi-special',
    'ฮานอยพิเศษ': 'hanoi-special',
    'หวยฮานอยเฉพาะกิจ': 'hanoi-adhoc',
    'ฮานอยเฉพาะกิจ': 'hanoi-adhoc',

    # === หวยลาว ===
    'หวยลาว': 'lao',
    'หวยลาวปกติ': 'lao',
    'หวยลาวพัฒนา': 'lao-pattana',
    'ลาวพัฒนา': 'lao-pattana',
    'หวยลาวสตาร์': 'lao-star',
    'ลาวสตาร์': 'lao-star',
    'หวยลาว VIP': 'lao-vip',
    'ลาว VIP': 'lao-vip',
    'หวยลาวสามัคคี': 'lao-samakki',
    'ลาวสามัคคี': 'lao-samakki',
    'หวยลาวเวียงจันทน์': 'lao-viengchan',
    'หวยลาวประตูชัย': 'lao-pratuchai',
    'ลาวประตูชัย': 'lao-pratuchai',

    # === หวยอื่นๆ ===
    'หวยมาเลย์': 'malay',
    'หวยรัฐบาล': 'thai',
}

# Fuzzy matching: normalize text for comparison
def normalize_name(name):
    """Normalize Thai lottery name for matching"""
    name = name.strip()
    # Remove extra spaces
    name = re.sub(r'\s+', ' ', name)
    # Remove common prefixes/suffixes that might differ
    name = name.replace('หวยหุ้น', 'หุ้น')
    return name


def match_slug(lottery_name):
    """Try to match a lottery name to a system slug"""
    name = normalize_name(lottery_name)

    # Direct match
    if name in LOTTERY_MAPPINGS:
        return LOTTERY_MAPPINGS[name]

    # Try without leading/trailing spaces
    for key, slug in LOTTERY_MAPPINGS.items():
        if normalize_name(key) == name:
            return slug

    # Fuzzy: check if the lottery name contains a known key
    for key, slug in LOTTERY_MAPPINGS.items():
        nkey = normalize_name(key)
        if nkey in name or name in nkey:
            return slug

    return None


def parse_results_from_page(page_text, debug=False):
    """Parse lottery results from raakaadee.com page text"""
    results = []
    today = datetime.now().strftime('%Y-%m-%d')

    # raakaadee.com shows each lottery as a row with:
    # [flag] lottery_name HH:MM น.
    # and the result numbers nearby
    # The exact format depends on the page structure

    lines = page_text.split('\n')

    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue

        # Try to find lottery name + time pattern 
        # e.g. "หุ้นจีนเช้า VIP 10:05 น." or "หุ้นนิเคอิเช้า VIP 10:00 น."
        time_match = re.search(r'(.+?)\s+(\d{1,2}:\d{2})\s*น\.?', line)
        if not time_match:
            # Also try without "น."
            time_match = re.search(r'(.+?)\s+(\d{1,2}:\d{2})\s*$', line)

        if time_match:
            lottery_name = time_match.group(1).strip()
            draw_time = time_match.group(2)

            # Clean up lottery name (remove flag emojis/icons)
            lottery_name = re.sub(r'^[🇯🇵🇨🇳🇭🇰🇹🇼🇰🇷🇸🇬🇮🇳🇪🇬🇬🇧🇩🇪🇷🇺🇺🇸🇹🇭🇻🇳🇱🇦🇲🇾\s🏳️‍⚧️🏴󠁧󠁢󠁥󠁮󠁧󠁿]+', '', lottery_name)
            lottery_name = lottery_name.strip()

            slug = match_slug(lottery_name)
            if not slug:
                if debug:
                    print(f'[Raakaadee] ⚠️  No slug match: "{lottery_name}" (time: {draw_time})', file=sys.stderr)
                continue

            # Look for result numbers in nearby lines (next 1-3 lines)
            result_text = ' '.join(lines[i:i+4])

            # Try to extract 3-digit top and 2-digit bottom
            # Common patterns: "XXX" (3-digit) and "YY" (2-digit)
            three_top = None
            two_bottom = None

            # Pattern: look for 3-digit and 2-digit numbers near the lottery name
            nums = re.findall(r'\b(\d{2,3})\b', result_text)

            # Filter: find first 3-digit and first 2-digit after the name
            for n in nums:
                if len(n) == 3 and not three_top:
                    three_top = n
                elif len(n) == 2 and three_top and not two_bottom:
                    two_bottom = n

            if three_top:
                results.append({
                    'slug': slug,
                    'lottery_name': lottery_name,
                    'first_prize': three_top,
                    'three_top': three_top,
                    'two_top': three_top[-2:],
                    'two_bottom': two_bottom or '',
                    'draw_date': today,
                    'draw_time': draw_time,
                    'source': 'raakaadee.com',
                })
                if debug:
                    print(f'[Raakaadee] ✅ {lottery_name}: {three_top}/{two_bottom or "?"} (slug: {slug})', file=sys.stderr)

    return results


def scrape_raakaadee(debug=False, target_slug=None, target_url=None):
    """Main scraper function"""
    print('[Raakaadee] Starting Camoufox scraper...', file=sys.stderr)

    try:
        from camoufox.sync_api import Camoufox
    except ImportError:
        print('[Raakaadee] ERROR: camoufox not installed. Run: pip install camoufox[geoip] && camoufox fetch', file=sys.stderr)
        return {'success': False, 'error': 'camoufox not installed', 'results': []}

    # Default URL: main results page
    url = target_url or 'https://www.raakaadee.com/'

    try:
        with Camoufox(headless=True) as browser:
            page = browser.new_page()
            print(f'[Raakaadee] 🌐 Loading {url}...', file=sys.stderr)

            # Navigate directly to the target URL
            page.goto(url, timeout=60000)
            page.wait_for_load_state('networkidle', timeout=30000)

            # Wait for content to render
            page.wait_for_timeout(5000)

            # Get page text
            page_text = page.evaluate('() => document.body.innerText')
            page_url = page.url

            if debug:
                print(f'[Raakaadee] URL: {page_url}', file=sys.stderr)
                print(f'[Raakaadee] Page text preview:\n{page_text[:3000]}', file=sys.stderr)

            # Parse results
            results = parse_results_from_page(page_text, debug=debug)

            # Filter by slug if specified
            if target_slug:
                results = [r for r in results if r['slug'] == target_slug]

            print(f'[Raakaadee] 📊 Total results: {len(results)}', file=sys.stderr)

            return {
                'success': True,
                'results': results,
                'scraped_at': datetime.now().isoformat(),
                'source_url': page_url,
            }

    except Exception as e:
        print(f'[Raakaadee] ❌ Error: {e}', file=sys.stderr)
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
