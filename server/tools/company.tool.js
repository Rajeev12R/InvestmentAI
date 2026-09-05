import yahooFinance, { scrapeQuotePage } from "../services/yahooFinance.service.js";

// Common Indian equity aliases mapping to NSE tickers
const INDIAN_STOCK_MAP = {
    'TATAMOTORS': 'TATAMOTORS.NS',
    'TATA MOTORS': 'TATAMOTORS.NS',
    'RELIANCE': 'RELIANCE.NS',
    'RIL': 'RELIANCE.NS',
    'INFOSYS': 'INFY.NS',
    'INFY': 'INFY.NS',
    'TCS': 'TCS.NS',
    'HDFCBANK': 'HDFCBANK.NS',
    'HDFC BANK': 'HDFCBANK.NS',
    'ICICIBANK': 'ICICIBANK.NS',
    'ICICI BANK': 'ICICIBANK.NS',
    'SBIN': 'SBIN.NS',
    'STATE BANK OF INDIA': 'SBIN.NS',
    'ZOMATO': 'ZOMATO.NS',
    'SUZLON': 'SUZLON.NS',
    'PAYTM': 'PAYTM.NS',
    'ONE97': 'PAYTM.NS',
    'ITC': 'ITC.NS',
    'WIPRO': 'WIPRO.NS',
    'BHARTIARTL': 'BHARTIARTL.NS',
    'AIRTEL': 'BHARTIARTL.NS',
    'ADANIENT': 'ADANIENT.NS',
    'ADANI ENTERPRISES': 'ADANIENT.NS',
    'ADANIPORTS': 'ADANIPORTS.NS',
    'BAJFINANCE': 'BAJFINANCE.NS',
    'BAJAJ FINANCE': 'BAJFINANCE.NS',
    'TATAPOWER': 'TATAPOWER.NS',
    'TATA POWER': 'TATAPOWER.NS',
    'TATASTEEL': 'TATASTEEL.NS',
    'TATA STEEL': 'TATASTEEL.NS',
    'MARUTI': 'MARUTI.NS',
    'MARUTI SUZUKI': 'MARUTI.NS',
    'LT': 'LT.NS',
    'LARSEN': 'LT.NS',
    'LARSEN & TOUBRO': 'LT.NS'
};

export async function getCompanyProfile(companyName) {
    try {
        const cleanName = (companyName || '').trim().toUpperCase();
        let targetQuery = INDIAN_STOCK_MAP[cleanName] || companyName;

        let searchResult = await yahooFinance.search(targetQuery);

        if ((!searchResult || !searchResult.quotes || !searchResult.quotes.length) && !cleanName.includes('.')) {
            // Try appending .NS for Indian markets
            try {
                searchResult = await yahooFinance.search(`${cleanName}.NS`);
            } catch (e) {
                // Ignore fallback search error
            }
        }

        if (!searchResult || !searchResult.quotes || !searchResult.quotes.length) {
            throw new Error(`Company "${companyName}" not found on global or Indian exchanges`);
        }

        const validQuotes = searchResult.quotes.filter(
            q => q.symbol && (q.quoteType === "EQUITY" || q.quoteType === "ETF" || !q.quoteType)
        );
        const candidates = validQuotes.length > 0 ? validQuotes : searchResult.quotes;

        let lastError = null;
        for (const candidate of candidates.slice(0, 4)) {
            try {
                const symbol = candidate.symbol;
                const { quoteSummary, quote } = await scrapeQuotePage(symbol);

                if (quoteSummary || quote) {
                    return {
                        name: quoteSummary.price?.longName || quoteSummary.price?.shortName || candidate.shortname || candidate.longname || companyName,
                        ticker: symbol,
                        exchange: quoteSummary.price?.exchangeName || quote?.fullExchangeName || null,
                        industry: quoteSummary.summaryProfile?.industry || null,
                        sector: quoteSummary.summaryProfile?.sector || null,
                        country: quoteSummary.summaryProfile?.country || null,
                        website: quoteSummary.summaryProfile?.website || null,
                        employees: quoteSummary.summaryProfile?.fullTimeEmployees || null,
                        description: quoteSummary.summaryProfile?.longBusinessSummary || null,
                        marketCap: quoteSummary.price?.marketCap || quote?.marketCap || null,
                        currency: quoteSummary.price?.currency || quote?.currency || null
                    };
                }
            } catch (err) {
                lastError = err;
                console.warn(`[Company Tool] Could not load candidate ${candidate.symbol}:`, err.message);
            }
        }

        throw lastError || new Error(`Failed to load company profile statistics for "${companyName}"`);
    } catch (error) {
        console.error("Company Tool Error:", error.message);
        throw error;
    }
}