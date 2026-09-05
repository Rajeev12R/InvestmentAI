import yahooFinance, { scrapeQuotePage } from "../services/yahooFinance.service.js";

export async function getCompanyProfile(companyName) {
    try {
        const searchResult = await yahooFinance.search(companyName);

        if (!searchResult || !searchResult.quotes || !searchResult.quotes.length) {
            throw new Error(`Company "${companyName}" not found`);
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