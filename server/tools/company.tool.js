import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export async function getCompanyProfile(companyName){
    try {
        const searchResult = await yahooFinance.search(companyName);

        if (!searchResult.quotes.length) {
            throw new Error("Company not found");
        }

        const symbol = searchResult.quotes[0].symbol;

        const summary = await yahooFinance.quoteSummary(symbol, {
            modules: [
                "assetProfile",
                "price"
            ]
        });

        return {
            name: summary.price?.longName || companyName,
            ticker: symbol,
            exchange: summary.price?.exchangeName || null,
            industry: summary.assetProfile?.industry || null,
            sector: summary.assetProfile?.sector || null,
            country: summary.assetProfile?.country || null,
            website: summary.assetProfile?.website || null,
            employees: summary.assetProfile?.fullTimeEmployees || null,
            description: summary.assetProfile?.longBusinessSummary || null,
            marketCap: summary.price?.marketCap || null,
            currency: summary.price?.currency || null
        };
    } catch (error){
        console.error("Company Tool Error:", error.message);
        throw error;
    }
}