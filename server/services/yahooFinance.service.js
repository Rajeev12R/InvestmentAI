import YahooFinance from "yahoo-finance2";

const browserUserAgent = process.env.YAHOO_USER_AGENT || 
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const yahooFinance = new YahooFinance({
  fetchOptions: {
    headers: {
      "User-Agent": browserUserAgent
    }
  }
});

const cache = new Map();

function cleanRawValues(obj) {
    if (obj === null || obj === undefined) {
        return obj;
    }
    if (typeof obj !== 'object') {
        return obj;
    }
    if ('raw' in obj && (Object.keys(obj).includes('fmt') || Object.keys(obj).includes('longFmt'))) {
        return obj.raw;
    }
    if (Array.isArray(obj)) {
        return obj.map(cleanRawValues);
    }
    const cleaned = {};
    for (const key of Object.keys(obj)) {
        cleaned[key] = cleanRawValues(obj[key]);
    }
    return cleaned;
}

export async function scrapeQuotePage(symbol) {
    const cleanSymbol = symbol.toUpperCase().trim();
    if (cache.has(cleanSymbol)) {
        console.log(`[Yahoo Scraper] Cache hit for ${cleanSymbol}`);
        return cache.get(cleanSymbol);
    }

    console.log(`[Yahoo Scraper] Cache miss. Fetching HTML page for ${cleanSymbol}...`);
    const url = `https://finance.yahoo.com/quote/${cleanSymbol}`;
    
    try {
        await yahooFinance.search(cleanSymbol);
    } catch (e) {
        console.warn("[Yahoo Scraper] Pre-fetch search failed, proceeding anyway:", e.message);
    }
    
    const cookieString = await yahooFinance._opts.cookieJar.getCookieString(url);
    const response = await fetch(url, {
        headers: {
            "User-Agent": browserUserAgent,
            "Cookie": cookieString
        }
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch Yahoo Finance page: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    
    let quoteSummary = null;
    const summaryRegex = /<script[^>]*type="application\/json"[^>]*data-url="([^"]*quoteSummary[^"]*)"[^>]*>([\s\S]*?)<\/script>/gi;
    let summaryMatch;
    while ((summaryMatch = summaryRegex.exec(html)) !== null) {
        const dataUrl = summaryMatch[1];
        if (dataUrl.includes(cleanSymbol) || dataUrl.includes(symbol)) {
            try {
                const payload = JSON.parse(summaryMatch[2]);
                const bodyJson = JSON.parse(payload.body);
                quoteSummary = bodyJson.quoteSummary?.result?.[0] || null;
                if (quoteSummary) break;
            } catch (err) {
                console.error("[Yahoo Scraper] Error parsing quoteSummary JSON:", err.message);
            }
        }
    }
    
    let quote = null;
    const quoteRegex = /<script[^>]*type="application\/json"[^>]*data-url="([^"]*quote[^"]*)"[^>]*>([\s\S]*?)<\/script>/gi;
    let quoteMatch;
    while ((quoteMatch = quoteRegex.exec(html)) !== null) {
        const dataUrl = quoteMatch[1];
        if (!dataUrl.includes("quoteSummary") && (dataUrl.includes(cleanSymbol) || dataUrl.includes(symbol))) {
            try {
                const payload = JSON.parse(quoteMatch[2]);
                const bodyJson = JSON.parse(payload.body);
                const q = bodyJson.quoteResponse?.result?.[0];
                if (q) {
                    quote = q;
                    break;
                }
            } catch (err) {
            }
        }
    }
    
    if (!quoteSummary && !quote) {
        throw new Error(`Could not extract stock details for ${cleanSymbol} from Yahoo Finance page. SvelteKit state structure might have changed.`);
    }
    
    const result = {
        quoteSummary: cleanRawValues(quoteSummary),
        quote: cleanRawValues(quote)
    };
    cache.set(cleanSymbol, result);
    return result;
}

export default yahooFinance;
