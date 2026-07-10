import yahooFinance, { scrapeQuotePage } from "../services/yahooFinance.service.js";

export async function getStockData(symbol) {
    try {

        const { quote } = await scrapeQuotePage(symbol);

        if (!quote) {
            throw new Error("Failed to load stock quote details");
        }

        return {
            currentPrice: quote.regularMarketPrice ?? null,
            previousClose: quote.regularMarketPreviousClose ?? null,
            open: quote.regularMarketOpen ?? null,
            dayHigh: quote.regularMarketDayHigh ?? null,
            dayLow: quote.regularMarketDayLow ?? null,
            fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh ?? null,
            fiftyTwoWeekLow: quote.fiftyTwoWeekLow ?? null,
            averageVolume: quote.averageDailyVolume3Month ?? null,
            beta: quote.beta ?? null,
            currency: quote.currency ?? null,
            exchange: quote.fullExchangeName ?? null

        };

    } catch (error) {
        console.error("Stock Tool Error:", error.message);
        throw error;

    }
}