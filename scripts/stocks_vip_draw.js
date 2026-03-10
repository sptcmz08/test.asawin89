/**
 * Stocks VIP Draw Scraper v2
 * ดึงผลหวยหุ้น VIP จากเว็บเฉพาะของแต่ละหุ้น (per-site scraping)
 * 
 * แก้ปัญหา: scraper เดิมดึงจาก stocks-vip.com หน้าเดียว 
 * แล้วใช้ keyword matching แบบคาดเดา → ผลสลับกันบ่อย
 * 
 * v2: เข้าเว็บเฉพาะของแต่ละหุ้น → ไม่มีโอกาสจับผิดตัว
 * 
 * Usage: node scripts/stocks_vip_draw.js [--debug]
 */

import puppeteer from 'puppeteer';

// ============ PER-SITE CONFIG ============
// Each site shows only ONE stock → zero ambiguity
const INDIVIDUAL_SITES = [
    {
        url: 'https://nikkeivipstock.com/',
        stock: 'nikkei',
        slugs: { morning: 'nikkei-morning-vip', afternoon: 'nikkei-afternoon-vip' },
        names: { morning: 'หุ้นนิเคอิเช้า VIP', afternoon: 'หุ้นนิเคอิบ่าย VIP' },
    },
    {
        url: 'https://shenzhenindex.com/',
        stock: 'china',
        slugs: { morning: 'china-morning-vip', afternoon: 'china-afternoon-vip' },
        names: { morning: 'หุ้นจีนเช้า VIP', afternoon: 'หุ้นจีนบ่าย VIP' },
    },
    {
        url: 'https://hangseng-vip.com/',
        stock: 'hangseng',
        slugs: { morning: 'hangseng-morning-vip', afternoon: 'hangseng-afternoon-vip' },
        names: { morning: 'หุ้นฮั่งเส็งเช้า VIP', afternoon: 'หุ้นฮั่งเส็งบ่าย VIP' },
    },
    {
        url: 'https://dowjones-vip.com/',
        stock: 'dowjones',
        slugs: { closed: 'dowjones-vip' },
        names: { closed: 'หุ้นดาวโจนส์ VIP' },
    },
];

// Stocks that don't have individual sites → scrape from stocks-vip.com
const STOCKS_VIP_FALLBACK = {
    'taiwan-vip': { name: 'หุ้นไต้หวัน VIP', keywords: ['taiwan', 'taiex', 'ไต้หวัน'], session: 'closed' },
    'singapore-vip': { name: 'หุ้นสิงคโปร์ VIP', keywords: ['singapore', 'straits', 'สิงคโปร์'], session: 'closed' },
    'india-vip': { name: 'หุ้นอินเดีย VIP', keywords: ['india', 'sensex', 'bse', 'อินเดีย'], session: 'closed' },
    'egypt-vip': { name: 'หุ้นอียิปต์ VIP', keywords: ['egypt', 'egx', 'อียิปต์'], session: 'closed' },
    'uk-vip': { name: 'หุ้นอังกฤษ VIP', keywords: ['uk', 'ftse', 'london', 'อังกฤษ'], session: 'closed' },
    'germany-vip': { name: 'หุ้นเยอรมัน VIP', keywords: ['germany', 'dax', 'frankfurt', 'เยอรมัน'], session: 'closed' },
    'russia-vip': { name: 'หุ้นรัสเซีย VIP', keywords: ['russia', 'moex', 'moscow', 'รัสเซีย'], session: 'closed' },
};

const DEBUG = process.argv.includes('--debug');
const today = new Date().toISOString().split('T')[0];

// ============ CHROME FINDER ============
async function findChrome() {
    const fs = await import('fs');
    const path = await import('path');
    const { execSync } = await import('child_process');

    let executablePath = null;

    // Search Puppeteer cache directories
    const cacheRoots = [
        path.resolve(process.cwd(), '.puppeteer-cache'),
        path.resolve(process.cwd(), 'node_modules/puppeteer/.local-chromium'),
        path.resolve(process.env.HOME || '/root', '.cache/puppeteer'),
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

    // Common system paths
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

    // which command
    if (!executablePath) {
        try {
            executablePath = execSync('which google-chrome || which chromium || which chromium-browser', { timeout: 3000 }).toString().trim();
            if (executablePath) console.error(`[StocksVIP] Found Chrome via which: ${executablePath}`);
        } catch (e) { /* not found */ }
    }

    return executablePath;
}

// ============ PARSE RESULTS FROM A SINGLE PAGE ============
// Extract "morning top XXX bottom YY", "afternoon top XXX bottom YY", "closed top XXX bottom YY"
function parseSessionResults(pageText) {
    const sessions = {};
    const lines = pageText.split('\n');

    for (const line of lines) {
        const cleaned = line.trim().replace(/\s+/g, ' ');
        // Match: "morning top 119 bottom 38" or "closed top 821 bottom 32"
        const m = cleaned.match(/\b(morning|afternoon|evening|close[d]?)\s+top\s+(\d{3})\s+bottom\s+(\d{2})\b/i);
        if (m) {
            let session = m[1].toLowerCase();
            // Normalize: "close" → "closed", "evening" → "afternoon"  
            if (session === 'close') session = 'closed';
            if (session === 'evening') session = 'afternoon';

            sessions[session] = {
                three_top: m[2],
                two_bottom: m[3],
            };

            if (DEBUG) {
                console.error(`[StocksVIP]   → parsed: ${session} top=${m[2]} bottom=${m[3]}`);
            }
        }
    }

    // Also try matching from concatenated text (table rows often lose whitespace)
    const allText = pageText.replace(/\n/g, ' ');
    const globalMatches = allText.matchAll(/\b(morning|afternoon|evening|close[d]?)\s*top\s*(\d{3})\s*bottom\s*(\d{2})\b/gi);
    for (const gm of globalMatches) {
        let session = gm[1].toLowerCase();
        if (session === 'close') session = 'closed';
        if (session === 'evening') session = 'afternoon';

        if (!sessions[session]) {
            sessions[session] = {
                three_top: gm[2],
                two_bottom: gm[3],
            };
            if (DEBUG) {
                console.error(`[StocksVIP]   → parsed (global): ${session} top=${gm[2]} bottom=${gm[3]}`);
            }
        }
    }

    return sessions;
}

// ============ SCRAPE ONE INDIVIDUAL SITE ============
async function scrapeIndividualSite(page, siteConfig) {
    const results = [];
    try {
        console.error(`[StocksVIP] 🌐 Loading ${siteConfig.url} (${siteConfig.stock})...`);
        await page.goto(siteConfig.url, { waitUntil: 'networkidle2', timeout: 30000 });
        // Wait for Vue.js to render
        await new Promise(r => setTimeout(r, 4000));

        const pageText = await page.evaluate(() => document.body.innerText);

        if (DEBUG) {
            console.error(`[StocksVIP] Page text (${siteConfig.stock}):\n${pageText.substring(0, 1000)}`);
        }

        const sessions = parseSessionResults(pageText);

        for (const [session, data] of Object.entries(sessions)) {
            const slug = siteConfig.slugs[session];
            const name = siteConfig.names[session];
            if (!slug || !name) {
                if (DEBUG) console.error(`[StocksVIP]   ⚠️  No slug mapping for ${siteConfig.stock} session=${session}`);
                continue;
            }

            results.push({
                slug,
                lottery_name: name,
                first_prize: data.three_top,
                three_top: data.three_top,
                two_top: data.three_top.slice(-2),
                two_bottom: data.two_bottom,
                draw_date: today,
                source: siteConfig.url,
            });
            console.error(`[StocksVIP] ✅ ${name}: ${data.three_top} / ${data.three_top.slice(-2)} / ${data.two_bottom} (from ${siteConfig.url})`);
        }

        if (Object.keys(sessions).length === 0) {
            console.error(`[StocksVIP] ⚠️  ${siteConfig.stock}: ไม่พบผลจาก ${siteConfig.url} (อาจยังไม่ออกผล)`);
        }

    } catch (error) {
        console.error(`[StocksVIP] ❌ ${siteConfig.stock}: ${error.message}`);
    }

    return results;
}

// ============ SCRAPE stocks-vip.com FOR REMAINING STOCKS ============
async function scrapeStocksVipFallback(page, foundSlugs) {
    const results = [];
    const missingSlugs = Object.keys(STOCKS_VIP_FALLBACK).filter(s => !foundSlugs.has(s));

    if (missingSlugs.length === 0) {
        console.error('[StocksVIP] All stocks found from individual sites, skipping fallback');
        return results;
    }

    console.error(`[StocksVIP] 🌐 Loading stocks-vip.com for ${missingSlugs.length} remaining stocks...`);

    try {
        await page.goto('https://stocks-vip.com/', { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 5000));

        // Get full page text
        const pageText = await page.evaluate(() => document.body.innerText);

        if (DEBUG) {
            console.error(`[StocksVIP] stocks-vip.com full text:\n${pageText.substring(0, 3000)}`);
        }

        // Split page into sections by known URL markers / stock names
        // Each section on stocks-vip.com is separated by the site URL of that stock
        const sectionSplitters = [
            { pattern: /nikkeivipstock\.com/i, stock: 'nikkei' },
            { pattern: /vnindexvip\.com/i, stock: 'vietnam' },
            { pattern: /shenzhenindex\.com/i, stock: 'china' },
            { pattern: /hangseng/i, stock: 'hangseng' },
            { pattern: /taiex|taiwan/i, stock: 'taiwan' },
            { pattern: /ktopvipindex\.com|kospi|korea/i, stock: 'korea' },
            { pattern: /lsxvip\.com|laos/i, stock: 'lao' },
            { pattern: /straits\s*times|singapore/i, stock: 'singapore' },
            { pattern: /bse\s*sensex|india/i, stock: 'india' },
            { pattern: /egx|egypt/i, stock: 'egypt' },
            { pattern: /ftse|uk.*vip/i, stock: 'uk' },
            { pattern: /dax|germany|frankfurt/i, stock: 'germany' },
            { pattern: /moex|russia|moscow/i, stock: 'russia' },
            { pattern: /dowjones|dow\s*jones|djia/i, stock: 'dowjones' },
        ];

        // Build a map of stock→section text by finding section boundaries
        const lines = pageText.split('\n');
        const stockSections = {};
        let currentStock = null;

        for (const line of lines) {
            // Check if this line starts a new stock section
            for (const sp of sectionSplitters) {
                if (sp.pattern.test(line)) {
                    currentStock = sp.stock;
                    if (!stockSections[currentStock]) stockSections[currentStock] = '';
                    break;
                }
            }
            if (currentStock) {
                stockSections[currentStock] += line + '\n';
            }
        }

        if (DEBUG) {
            console.error(`[StocksVIP] Found sections for: ${Object.keys(stockSections).join(', ')}`);
        }

        // Now parse each section for its results
        for (const [slug, config] of Object.entries(STOCKS_VIP_FALLBACK)) {
            if (foundSlugs.has(slug)) continue;

            // Find which stock section this slug belongs to by keyword match
            let sectionText = null;
            for (const [stockKey, text] of Object.entries(stockSections)) {
                const hasKeyword = config.keywords.some(kw =>
                    text.toLowerCase().includes(kw.toLowerCase()) || stockKey === kw
                );
                if (hasKeyword) {
                    sectionText = text;
                    break;
                }
            }

            if (!sectionText) {
                if (DEBUG) console.error(`[StocksVIP] ⚠️  No section found for ${slug}`);
                continue;
            }

            const sessions = parseSessionResults(sectionText);
            const session = config.session;

            // For "closed" session stocks, try "closed" first, then "close"
            const data = sessions[session] || sessions['closed'] || sessions['close'];
            if (!data) {
                if (DEBUG) console.error(`[StocksVIP] ⚠️  ${slug}: no ${session} data in section`);
                continue;
            }

            results.push({
                slug,
                lottery_name: config.name,
                first_prize: data.three_top,
                three_top: data.three_top,
                two_top: data.three_top.slice(-2),
                two_bottom: data.two_bottom,
                draw_date: today,
                source: 'stocks-vip.com (fallback)',
            });
            foundSlugs.add(slug);
            console.error(`[StocksVIP] ✅ ${config.name}: ${data.three_top} / ${data.three_top.slice(-2)} / ${data.two_bottom} (from stocks-vip.com)`);
        }

    } catch (error) {
        console.error(`[StocksVIP] ❌ stocks-vip.com fallback failed: ${error.message}`);
    }

    return results;
}

// ============ MAIN ============
async function main() {
    console.error('[StocksVIP] Starting VIP Stock scraper v2 (per-site)...');
    console.error(`[StocksVIP] Date: ${today}`);

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

        const allResults = [];
        const foundSlugs = new Set();

        // Step 1: Scrape each individual VIP stock site
        console.error(`[StocksVIP] === Step 1: Scraping ${INDIVIDUAL_SITES.length} individual sites ===`);
        for (const site of INDIVIDUAL_SITES) {
            const siteResults = await scrapeIndividualSite(page, site);
            for (const r of siteResults) {
                if (!foundSlugs.has(r.slug)) {
                    allResults.push(r);
                    foundSlugs.add(r.slug);
                }
            }
        }
        console.error(`[StocksVIP] After individual sites: ${allResults.length} results`);

        // Step 2: Scrape stocks-vip.com for remaining stocks
        console.error(`[StocksVIP] === Step 2: Fallback to stocks-vip.com ===`);
        const fallbackResults = await scrapeStocksVipFallback(page, foundSlugs);
        allResults.push(...fallbackResults);

        await browser.close();

        console.error(`[StocksVIP] 📊 Total results: ${allResults.length}`);
        for (const r of allResults) {
            console.error(`   ${r.slug}: ${r.three_top}/${r.two_bottom} (${r.source})`);
        }

        // Output JSON to stdout
        console.log(JSON.stringify({
            success: true,
            results: allResults,
            scraped_at: new Date().toISOString(),
        }));

    } catch (error) {
        if (browser) await browser.close().catch(() => { });
        console.error(`[StocksVIP] Fatal error: ${error.message}`);
        console.log(JSON.stringify({
            success: false,
            error: error.message,
            results: [],
        }));
        process.exit(1);
    }
}

main();
