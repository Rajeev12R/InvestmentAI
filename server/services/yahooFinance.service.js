import YahooFinance from "yahoo-finance2";

const browserUserAgent = process.env.YAHOO_USER_AGENT || 
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
  fetchOptions: {
    headers: {
      "User-Agent": browserUserAgent
    }
  }
});

const cache = new Map();
const inFlightRequests = new Map();

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
        console.log(`[Yahoo Service] Cache hit for ${cleanSymbol}`);
        return cache.get(cleanSymbol);
    }

    if (inFlightRequests.has(cleanSymbol)) {
        console.log(`[Yahoo Service] Joining in-flight request for ${cleanSymbol}`);
        return inFlightRequests.get(cleanSymbol);
    }

    const request = (async () => {
        console.log(`[Yahoo Service] Fetching data for ${cleanSymbol}...`);

        let quoteSummary = null;
        let quote = null;
        let wasRateLimited = false;

        try {
            quoteSummary = await yahooFinance.quoteSummary(cleanSymbol, {
                modules: [
                    "price",
                    "summaryProfile",
                    "financialData",
                    "defaultKeyStatistics",
                    "summaryDetail"
                ]
            });
        } catch (err) {
            wasRateLimited ||= err.statusCode === 429 || err.status === 429;
            console.warn(`[Yahoo Service] quoteSummary warning for ${cleanSymbol}:`, err.message);
        }

        try {
            quote = await yahooFinance.quote(cleanSymbol);
        } catch (err) {
            wasRateLimited ||= err.statusCode === 429 || err.status === 429;
            console.warn(`[Yahoo Service] quote warning for ${cleanSymbol}:`, err.message);
        }

        if (!quoteSummary && !quote) {
            if (wasRateLimited) {
                throw new Error(`Yahoo Finance rate-limited requests for "${cleanSymbol}" (HTTP 429). Please wait and try again.`);
            }
            throw new Error(`Could not retrieve financial and stock data for ticker "${cleanSymbol}". Please check if the ticker symbol is valid.`);
        }

        const result = {
            quoteSummary: cleanRawValues(quoteSummary) || {},
            quote: cleanRawValues(quote) || {}
        };

        cache.set(cleanSymbol, result);
        return result;
    })();

    inFlightRequests.set(cleanSymbol, request);
    try {
        return await request;
    } finally {
        inFlightRequests.delete(cleanSymbol);
    }
}

export default yahooFinance;

