import { scrapeQuotePage } from "../services/yahooFinance.service.js";

export async function getStockData(symbol) {
    try {
        const { quoteSummary, quote } = await scrapeQuotePage(symbol);

        if (!quote && !quoteSummary) {
            throw new Error(`Failed to load stock quote details for ${symbol}`);
        }

        const fiftyTwoWeekHigh = quote?.fiftyTwoWeekHigh ?? quoteSummary?.summaryDetail?.fiftyTwoWeekHigh ?? null;
        const fiftyTwoWeekLow = quote?.fiftyTwoWeekLow ?? quoteSummary?.summaryDetail?.fiftyTwoWeekLow ?? null;
        const beta = quoteSummary?.summaryDetail?.beta ?? quoteSummary?.defaultKeyStatistics?.beta ?? quote?.beta ?? null;
        const sharesOutstanding = quote?.sharesOutstanding ?? quoteSummary?.defaultKeyStatistics?.sharesOutstanding ?? null;
        const marketCap = quote?.marketCap ?? quoteSummary?.price?.marketCap ?? quoteSummary?.summaryDetail?.marketCap ?? null;

        return {
            currentPrice: quote?.regularMarketPrice ?? quoteSummary?.price?.regularMarketPrice ?? null,
            previousClose: quote?.regularMarketPreviousClose ?? quoteSummary?.price?.regularMarketPreviousClose ?? null,
            open: quote?.regularMarketOpen ?? quoteSummary?.price?.regularMarketOpen ?? null,
            dayHigh: quote?.regularMarketDayHigh ?? quoteSummary?.price?.regularMarketDayHigh ?? null,
            dayLow: quote?.regularMarketDayLow ?? quoteSummary?.price?.regularMarketDayLow ?? null,
            fiftyTwoWeekHigh,
            fiftyTwoWeekLow,
            high52: fiftyTwoWeekHigh, // Backward compatibility alias
            low52: fiftyTwoWeekLow,   // Backward compatibility alias
            sharesOutstanding,
            marketCap,
            averageVolume: quote?.averageDailyVolume3Month ?? quoteSummary?.summaryDetail?.averageDailyVolume3Month ?? null,
            beta,
            currency: quote?.currency ?? quoteSummary?.price?.currency ?? "USD",
            exchange: quote?.fullExchangeName ?? quoteSummary?.price?.exchangeName ?? null
        };


    } catch (error) {
        console.error("Stock Tool Error:", error.message);
        throw error;
    }
}