import yahooFinance, { scrapeQuotePage } from "../services/yahooFinance.service.js";

export async function getCompanyProfile(companyName) {
    try {
        const searchResult = await yahooFinance.search(companyName);

        if (!searchResult || !searchResult.quotes || !searchResult.quotes.length) {
            throw new Error("Company not found");
        }

        const symbol = searchResult.quotes[0].symbol;

        const { quoteSummary } = await scrapeQuotePage(symbol);

        if (!quoteSummary) {
            throw new Error("Failed to load company profile statistics");
        }

        return {
            name: quoteSummary.price?.longName || companyName,
            ticker: symbol,
            exchange: quoteSummary.price?.exchangeName || null,
            industry: quoteSummary.summaryProfile?.industry || null,
            sector: quoteSummary.summaryProfile?.sector || null,
            country: quoteSummary.summaryProfile?.country || null,
            website: quoteSummary.summaryProfile?.website || null,
            employees: quoteSummary.summaryProfile?.fullTimeEmployees || null,
            description: quoteSummary.summaryProfile?.longBusinessSummary || null,
            marketCap: quoteSummary.price?.marketCap || null,
            currency: quoteSummary.price?.currency || null
        };
    } catch (error) {
        console.error("Company Tool Error:", error.message);
        throw error;
    }
}