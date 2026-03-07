/**
 * Stocks VIP Draw Scraper
 * ดึงผลหวยหุ้น VIP จาก stocks-vip.com (Vue.js SPA)
 * 
 * Usage: node scripts/stocks_vip_draw.js
 * 
 * Output: JSON to stdout
 * {
 *   "success": true,
 *   "results": [
 *     { "slug": "nikkei-morning-vip", "lottery_name": "หุ้นนิเคอิเช้า VIP", "three_top": "119", "two_top": "19", "two_bottom": "38", "draw_date": "2026-02-12" },
 *     ...
 *   ]
 * }
 */

import puppeteer from 'puppeteer';

// Mapping: slug -> info for VIP stocks
const VIP_STOCKS = {
    'nikkei-morning-vip': { name: 'หุ้นนิเคอิเช้า VIP', keywords: ['นิเคอิ', 'เช้า', 'nikkei', 'morning'] },
    'china-morning-vip': { name: 'หุ้นจีนเช้า VIP', keywords: ['จีน', 'เช้า', 'china', 'morning'] },
    'hangseng-morning-vip': { name: 'หุ้นฮั่งเส็งเช้า VIP', keywords: ['ฮั่งเส็ง', 'เช้า', 'hang seng', 'hangseng', 'morning'] },
    'taiwan-vip': { name: 'หุ้นไต้หวัน VIP', keywords: ['ไต้หวัน', 'taiwan'] },
    'nikkei-afternoon-vip': { name: 'หุ้นนิเคอิบ่าย VIP', keywords: ['นิเคอิ', 'บ่าย', 'nikkei', 'afternoon'] },
    'china-afternoon-vip': { name: 'หุ้นจีนบ่าย VIP', keywords: ['จีน', 'บ่าย', 'china', 'afternoon'] },
    'hangseng-afternoon-vip': { name: 'หุ้นฮั่งเส็งบ่าย VIP', keywords: ['ฮั่งเส็ง', 'บ่าย', 'hang seng', 'hangseng', 'afternoon'] },
    'singapore-vip': { name: 'หุ้นสิงคโปร์ VIP', keywords: ['สิงคโปร์', 'singapore'] },
    'india-vip': { name: 'หุ้นอินเดีย VIP', keywords: ['อินเดีย', 'india', 'sensex'] },
    'egypt-vip': { name: 'หุ้นอียิปต์ VIP', keywords: ['อียิปต์', 'egypt', 'egx'] },
    'uk-vip': { name: 'หุ้นอังกฤษ VIP', keywords: ['อังกฤษ', 'uk', 'england', 'ftse'] },
    'germany-vip': { name: 'หุ้นเยอรมัน VIP', keywords: ['เยอรมัน', 'germany', 'dax'] },
    'russia-vip': { name: 'หุ้นรัสเซีย VIP', keywords: ['รัสเซีย', 'russia'] },
    'dowjones-vip': { name: 'หุ้นดาวโจนส์ VIP', keywords: ['ดาวโจนส์', 'dowjones', 'dow jones', 'dow'] },
};

async function findChrome() {
    const fs = await import('fs');
    const path = await import('path');
    const { execSync } = await import('child_process');

    let executablePath = null;

    // Method 1: Search Puppeteer cache directories
    const cacheRoots = [
        path.resolve(process.cwd(), '.puppeteer-cache'),
        path.resolve(process.cwd(), 'node_modules/puppeteer/.local-chromium'),
        path.resolve(process.env.HOME || '/root', '.cache/puppeteer'),
        '/var/www/vhosts/after-spa.com/lotto.after-spa.com/.puppeteer-cache',
        '/root/.cache/puppeteer',
    ];

    for (const cacheRoot of cacheRoots) {
        if (!fs.existsSync(cacheRoot)) continue;
        try {
            const findCmd = `find "${cacheRoot}" -type f \\( -name "chrome" -o -name "chromium" \\) 2>/dev/null | head -5`;
            const found = execSync(findCmd, { timeout: 5000 }).toString().trim();
            if (found) {
                const lines = found.split('\n');
                for (const line of lines) {
                    if (line && fs.existsSync(line)) {
                        executablePath = line;
                        console.error(`[StocksVIP] Found Chrome in cache: ${line}`);
                        break;
                    }
                }
            }
        } catch (e) { /* ignore */ }
        if (executablePath) break;
    }

    // Method 2: Common system paths
    if (!executablePath) {
        const systemPaths = [
            '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
            '/usr/bin/chromium', '/usr/bin/chromium-browser',
            '/snap/bin/chromium', '/usr/local/bin/chrome',
        ];
        for (const p of systemPaths) {
            if (fs.existsSync(p)) {
                executablePath = p;
                console.error(`[StocksVIP] Found Chrome at: ${p}`);
                break;
            }
        }
    }

    // Method 3: which command
    if (!executablePath) {
        try {
            executablePath = execSync('which google-chrome || which chromium || which chromium-browser', { timeout: 3000 }).toString().trim();
            if (executablePath) console.error(`[StocksVIP] Found Chrome via which: ${executablePath}`);
        } catch (e) { /* not found */ }
    }

    return executablePath;
}

async function scrapeStocksVip() {
    console.error('[StocksVIP] Starting scrape from stocks-vip.com...');

    let browser;
    try {
        const executablePath = await findChrome();

        const launchOptions = {
            headless: 'new',
            args: [
                '--no-sandbox', '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', '--disable-gpu',
                '--disable-web-security', '--single-process',
                '--no-zygote',
            ],
            timeout: 60000,
        };

        if (executablePath) {
            launchOptions.executablePath = executablePath;
        }

        browser = await puppeteer.launch(launchOptions);
        const page = await browser.newPage();

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1280, height: 800 });

        console.error('[StocksVIP] Loading stocks-vip.com...');
        await page.goto('https://stocks-vip.com/', {
            waitUntil: 'networkidle2',
            timeout: 60000,
        });

        // Wait for Vue.js to render content
        await new Promise(r => setTimeout(r, 5000));

        // Try to extract all VIP stock results from the page
        const rawResults = await page.evaluate(() => {
            const items = [];

            // Strategy 1: Look for tables with lottery results + capture surrounding context
            const tables = document.querySelectorAll('table');
            for (const table of tables) {
                // ✅ SECURITY FIX: Capture the parent section text to identify which stock
                // this table belongs to (instead of relying on table order)
                let sectionContext = '';
                let parent = table.parentElement;
                // Walk up 3 levels to find surrounding stock identifier text
                for (let depth = 0; depth < 3 && parent; depth++) {
                    const siblingText = [];
                    // Check previous siblings for stock name / URL
                    let prevSib = parent.previousElementSibling;
                    for (let s = 0; s < 3 && prevSib; s++) {
                        siblingText.push(prevSib.textContent || '');
                        prevSib = prevSib.previousElementSibling;
                    }
                    sectionContext += ' ' + siblingText.join(' ') + ' ' + (parent.textContent || '').substring(0, 500);
                    parent = parent.parentElement;
                }
                sectionContext = sectionContext.toLowerCase().trim();

                const rows = table.querySelectorAll('tr');
                for (const row of rows) {
                    const cells = row.querySelectorAll('td, th');
                    const text = row.textContent || '';
                    items.push({
                        type: 'table-row',
                        text: text.trim().replace(/\s+/g, ' '),
                        cellCount: cells.length,
                        cells: Array.from(cells).map(c => c.textContent.trim()),
                        sectionContext: sectionContext.substring(0, 1000),
                    });
                }
            }

            // Strategy 2: Look for card/panel elements with results
            const allElements = document.querySelectorAll('div, section, article');
            for (const el of allElements) {
                const text = el.textContent || '';
                // Look for elements containing VIP stock names and numbers
                if ((text.includes('VIP') || text.includes('vip')) &&
                    (text.includes('ตัวบน') || text.includes('ตัวล่าง') || text.match(/\d{2,3}/))) {
                    if (el.children.length < 20 && text.length < 500) {
                        items.push({
                            type: 'card',
                            text: text.trim().replace(/\s+/g, ' '),
                            tag: el.tagName,
                            className: el.className,
                        });
                    }
                }
            }

            // Strategy 3: Get entire page text for fallback parsing
            items.push({
                type: 'page-text',
                text: document.body.innerText.substring(0, 10000),
            });

            return items;
        });

        console.error(`[StocksVIP] Extracted ${rawResults.length} raw items from page`);

        // Debug mode: dump raw data
        if (process.argv.includes('--debug')) {
            console.error('[StocksVIP] === RAW DATA DUMP ===');
            for (const item of rawResults) {
                if (item.type === 'page-text') {
                    console.error(`[RAW page-text] ${item.text.substring(0, 3000)}`);
                } else {
                    console.error(`[RAW ${item.type}] ${item.text.substring(0, 300)}`);
                }
            }
            console.error('[StocksVIP] === END RAW DATA ===');
        }

        // Parse the raw results to find VIP stock data
        const results = parseVipResults(rawResults);

        // Also try individual VIP sites as fallback for missing stocks
        const totalVipStocks = Object.keys(VIP_STOCKS).length;
        if (results.length < totalVipStocks) {
            console.error(`[StocksVIP] Found ${results.length}/${totalVipStocks}, trying individual sites for missing stocks...`);
            const fallbackResults = await scrapeFallbackSites(page);

            // Merge: prefer fallback if main didn't find that slug
            const existingSlugs = new Set(results.map(r => r.slug));
            for (const fr of fallbackResults) {
                if (!existingSlugs.has(fr.slug)) {
                    results.push(fr);
                }
            }
        }

        await browser.close();

        console.error(`[StocksVIP] Total results: ${results.length}`);

        // Output JSON to stdout
        console.log(JSON.stringify({
            success: true,
            results: results,
            scraped_at: new Date().toISOString(),
        }));

    } catch (error) {
        if (browser) await browser.close().catch(() => { });
        console.error(`[StocksVIP] Error: ${error.message}`);
        console.log(JSON.stringify({
            success: false,
            error: error.message,
            results: [],
        }));
        process.exit(1);
    }
}

/**
 * Parse raw page data to extract VIP stock results.
 * 
 * Page structure (from debug dump):
 * - Table rows are concatenated: "morningtop119bottom38"
 * - Page text has sections separated by URLs like nikkeivipstock.com
 * - Each section has lines: "morning top     119     bottom  38"
 */
function parseVipResults(rawItems) {
    const results = [];
    const foundSlugs = new Set();
    const today = new Date().toISOString().split('T')[0];

    // === Strategy 1: Parse from page-text (most reliable) ===
    const pageText = rawItems.find(i => i.type === 'page-text')?.text || '';

    // Define stock sections by their URL markers on the page
    const sectionMarkers = [
        { url: 'nikkeivipstock.com', stock: 'nikkei', sessions: { morning: 'nikkei-morning-vip', afternoon: 'nikkei-afternoon-vip' } },
        { url: 'vnindexvip.com', stock: 'vietnam', sessions: { morning: 'vietnam-morning-vip', afternoon: 'vietnam-afternoon-vip', evening: 'vietnam-evening-vip' } },
        { url: 'shenzhenindex.com', stock: 'china', sessions: { morning: 'china-morning-vip', evening: 'china-evening-vip' } },
        { url: 'hangseng', stock: 'hangseng', sessions: { morning: 'hangseng-morning-vip', afternoon: 'hangseng-afternoon-vip' } },
        { url: 'taiex', stock: 'taiwan', sessions: { closed: 'taiwan-vip' } },
        { url: 'ktopvipindex.com', stock: 'korea', sessions: { closed: 'korea-vip' } },
        { url: 'lsxvip.com', stock: 'lao', sessions: {} },
        { url: 'straits times', stock: 'singapore', sessions: { closed: 'singapore-vip' } },
        { url: 'bse sensex', stock: 'india', sessions: { closed: 'india-vip', close: 'india-vip' } },
        { url: 'dowjones-vip', stock: 'dowjones', sessions: { closed: 'dowjones-vip', close: 'dowjones-vip' } },
    ];

    // === Strategy 2: Parse table rows using CONTEXT KEYWORDS (not positional order!) ===
    // ✅ SECURITY FIX: Each row carries sectionContext from parent elements.
    // We match rows to stocks by looking for stock-specific keywords in context.
    const tableRows = rawItems.filter(i => i.type === 'table-row');

    // Keywords to identify each stock from surrounding page context
    const stockContextKeywords = {
        'nikkei': ['nikkei', 'nikkeivipstock', '日経', 'นิเคอิ'],
        'vietnam': ['vnindex', 'vietnam', 'เวียดนาม'],
        'china': ['shenzhen', 'china', 'จีน', '深圳'],
        'hangseng': ['hangseng', 'hang seng', 'ฮั่งเส็ง', '恒生'],
        'taiwan': ['taiex', 'taiwan', 'ไต้หวัน', '台灣'],
        'korea': ['ktop', 'korea', 'kospi', 'เกาหลี', '한국'],
        'lao': ['lsx', 'laos', 'ลาว'],
        'singapore': ['straits', 'singapore', 'สิงคโปร์'],
        'india': ['sensex', 'bse', 'india', 'อินเดีย'],
        'egypt': ['egypt', 'egx', 'อียิปต์'],
        'uk': ['ftse', 'uk', 'london', 'อังกฤษ'],
        'germany': ['dax', 'germany', 'เยอรมัน', 'frankfurt'],
        'russia': ['moex', 'russia', 'รัสเซีย', 'moscow'],
        'dowjones': ['dow jones', 'dowjones', 'djia', 'ดาวโจนส์', 'wall street'],
    };

    // Session to slug mapping (unchanged)
    const stockSlugMap = {
        'nikkei': { 'morning': 'nikkei-morning-vip', 'afternoon': 'nikkei-afternoon-vip' },
        'vietnam': { 'morning': '_skip', 'afternoon': '_skip', 'evening': '_skip' },
        'china': { 'morning': 'china-morning-vip', 'evening': 'china-afternoon-vip' },
        'hangseng': { 'morning': 'hangseng-morning-vip', 'evening': 'hangseng-afternoon-vip' },
        'taiwan': { 'closed': 'taiwan-vip', 'close': 'taiwan-vip' },
        'korea': { 'closed': '_skip', 'close': '_skip' },
        'singapore': { 'closed': 'singapore-vip', 'close': 'singapore-vip' },
        'india': { 'closed': 'india-vip', 'close': 'india-vip' },
        'egypt': { 'closed': 'egypt-vip', 'close': 'egypt-vip' },
        'uk': { 'closed': 'uk-vip', 'close': 'uk-vip' },
        'germany': { 'closed': 'germany-vip', 'close': 'germany-vip' },
        'russia': { 'closed': 'russia-vip', 'close': 'russia-vip' },
        'dowjones': { 'closed': 'dowjones-vip', 'close': 'dowjones-vip' },
    };

    // Parse session rows with their context
    const sessionRows = [];
    for (const row of tableRows) {
        const text = row.text.replace(/\s+/g, '');
        const match = text.match(/^(morning|afternoon|evening|closed?)\s*top\s*(\d{3}|-)\s*bottom\s*(\d{2}|-)/i);
        if (match) {
            const session = match[1].toLowerCase();
            const threeTop = match[2] === '-' ? null : match[2];
            const twoBottom = match[3] === '-' ? null : match[3];
            if (threeTop) {
                sessionRows.push({
                    session,
                    threeTop,
                    twoBottom,
                    context: (row.sectionContext || '').toLowerCase(),
                });
            }
        }
    }

    console.error(`[StocksVIP] Found ${sessionRows.length} session rows from tables`);

    // ✅ SECURITY FIX: Match rows to stocks by context keywords (NOT by position)
    for (const row of sessionRows) {
        let matchedStock = null;
        let bestMatchScore = 0;

        for (const [stock, keywords] of Object.entries(stockContextKeywords)) {
            const slugMap = stockSlugMap[stock];
            if (!slugMap) continue;

            // Count how many keywords match in the row's context
            let score = 0;
            for (const kw of keywords) {
                if (row.context.includes(kw.toLowerCase())) {
                    score++;
                }
            }

            if (score > bestMatchScore) {
                bestMatchScore = score;
                matchedStock = stock;
            }
        }

        if (!matchedStock || bestMatchScore === 0) {
            console.error(`[StocksVIP] ⚠️  No stock match for row: session=${row.session}, top=${row.threeTop}, context snippet="${row.context.substring(0, 80)}..."`);
            continue;
        }

        const slugMap = stockSlugMap[matchedStock];
        const slug = slugMap[row.session] || slugMap['closed'] || slugMap['close'];

        if (!slug || slug === '_skip') continue;
        if (foundSlugs.has(slug)) continue;
        if (!VIP_STOCKS[slug]) continue;

        results.push({
            slug,
            lottery_name: VIP_STOCKS[slug].name,
            first_prize: row.threeTop,
            three_top: row.threeTop,
            two_top: row.threeTop.slice(-2),
            two_bottom: row.twoBottom || '',
            draw_date: today,
        });
        foundSlugs.add(slug);
        console.error(`[StocksVIP] ✅ ${VIP_STOCKS[slug].name}: ${row.threeTop} / ${row.threeTop.slice(-2)} / ${row.twoBottom} (matched: ${matchedStock}, score: ${bestMatchScore})`);
    }

    // === Strategy 3: Fallback — parse page text for any remaining ===
    // Always run this for any stocks not yet found
    const missingCount = Object.keys(VIP_STOCKS).length - foundSlugs.size;
    if (missingCount > 0 && pageText) {
        console.error(`[StocksVIP] Strategy 3: ${missingCount} stocks still missing, parsing page text...`);
        const lines = pageText.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // Match: "morning top     119     bottom  38" or "closed top 821 bottom 32"
            const m = line.match(/^(morning|afternoon|evening|closed?)\s+top\s+(\d{3})\s+bottom\s+(\d{2})/i);
            if (!m) continue;

            // Look backwards for stock identifier (wider context window)
            const context = lines.slice(Math.max(0, i - 50), i).join(' ').toLowerCase();
            for (const [slug, info] of Object.entries(VIP_STOCKS)) {
                if (foundSlugs.has(slug)) continue;
                const session = m[1].toLowerCase();
                // Check slug matches session
                if (slug.includes('morning') && session !== 'morning') continue;
                if (slug.includes('afternoon') && session !== 'afternoon' && session !== 'evening') continue;
                // For non-session stocks (egypt, uk, etc.), accept closed/close
                if (!slug.includes('morning') && !slug.includes('afternoon') &&
                    session !== 'closed' && session !== 'close') continue;
                // Check stock keywords in context
                const stockKw = info.keywords.filter(k => !['เช้า', 'บ่าย', 'morning', 'afternoon'].includes(k));
                if (stockKw.some(k => context.includes(k.toLowerCase()))) {
                    results.push({
                        slug,
                        lottery_name: info.name,
                        first_prize: m[2],
                        three_top: m[2],
                        two_top: m[2].slice(-2),
                        two_bottom: m[3],
                        draw_date: today,
                    });
                    foundSlugs.add(slug);
                    console.error(`[StocksVIP] ✅ (text) ${info.name}: ${m[2]} / ${m[2].slice(-2)} / ${m[3]}`);
                }
            }
        }
    }

    return results;
}

/**
 * Scrape individual VIP stock sites as fallback
 */
async function scrapeFallbackSites(page) {
    const results = [];

    const sites = [
        { url: 'https://nikkeivipstock.com/', slugPrefix: 'nikkei', name: 'นิเคอิ' },
        { url: 'https://hangseng-vip.com/', slugPrefix: 'hangseng', name: 'ฮั่งเส็ง' },
        { url: 'https://dowjones-vip.com/', slugPrefix: 'dowjones', name: 'ดาวโจนส์' },
    ];

    for (const site of sites) {
        try {
            console.error(`[StocksVIP] Trying fallback: ${site.url}`);
            await page.goto(site.url, { waitUntil: 'networkidle2', timeout: 20000 });
            await new Promise(r => setTimeout(r, 3000));

            const pageData = await page.evaluate(() => {
                return {
                    text: document.body.innerText.substring(0, 8000),
                    tables: Array.from(document.querySelectorAll('table')).map(t => ({
                        rows: Array.from(t.querySelectorAll('tr')).map(r =>
                            Array.from(r.querySelectorAll('td, th')).map(c => c.textContent.trim())
                        )
                    }))
                };
            });

            // Parse results from fallback site
            const text = pageData.text;

            // Look for patterns like "3 ตัวบน XXX" or table rows with numbers
            const sections = text.split(/\n{2,}|(?=.*(?:เช้า|บ่าย|morning|afternoon))/);

            for (const section of sections) {
                const threeTopMatch = section.match(/3\s*ตัวบน\s*[:：]?\s*(\d{3})/);
                const twoTopMatch = section.match(/2\s*ตัวบน\s*[:：]?\s*(\d{2})/);
                const twoBottomMatch = section.match(/2\s*ตัวล่าง\s*[:：]?\s*(\d{2})/);

                if (threeTopMatch) {
                    const isMorning = section.includes('เช้า') || section.includes('morning');
                    const isAfternoon = section.includes('บ่าย') || section.includes('afternoon');

                    let slug;
                    if (site.slugPrefix === 'dowjones') {
                        slug = 'dowjones-vip';
                    } else if (isMorning) {
                        slug = `${site.slugPrefix}-morning-vip`;
                    } else if (isAfternoon) {
                        slug = `${site.slugPrefix}-afternoon-vip`;
                    } else {
                        continue;
                    }

                    const vipInfo = VIP_STOCKS[slug];
                    if (!vipInfo) continue;

                    results.push({
                        slug,
                        lottery_name: vipInfo.name,
                        first_prize: threeTopMatch[1],
                        three_top: threeTopMatch[1],
                        two_top: twoTopMatch ? twoTopMatch[1] : threeTopMatch[1].slice(-2),
                        two_bottom: twoBottomMatch ? twoBottomMatch[1] : '',
                        draw_date: new Date().toISOString().split('T')[0],
                    });
                    console.error(`[StocksVIP] ✅ (fallback) ${vipInfo.name}: ${threeTopMatch[1]}`);
                }
            }

            // Also parse from tables
            for (const table of pageData.tables) {
                for (const row of table.rows) {
                    const rowText = row.join(' ');
                    if (rowText.includes('3 ตัวบน') || rowText.includes('3ตัวบน')) {
                        const numMatch = rowText.match(/(\d{3})\s*$/);
                        if (numMatch) {
                            console.error(`[StocksVIP] Found table data: ${rowText}`);
                        }
                    }
                }
            }

        } catch (error) {
            console.error(`[StocksVIP] Fallback ${site.url} failed: ${error.message}`);
        }
    }

    return results;
}

// Run
scrapeStocksVip();
