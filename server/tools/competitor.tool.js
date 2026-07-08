import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export async function getCompetitors(companyProfile) {
    try {
        console.log(`Extracting competitors for: ${companyProfile.name}`);
        
        const searchResult = await yahooFinance.search(companyProfile.name || companyProfile.ticker);
        
        if (!searchResult || !searchResult.quotes || !searchResult.quotes.length) {
            return { primaryCompetitors: [] };
        }

        const primaryCompetitors = searchResult.quotes
            .filter(quote => 
                quote.symbol !== companyProfile.ticker && 
                (quote.quoteType === "EQUITY" || quote.quoteType === "ETF") &&
                (quote.shortname || quote.longname)
            )
            .slice(0, 5)
            .map(quote => ({
                name: quote.shortname || quote.longname || quote.symbol,
                ticker: quote.symbol
            }));

        return {
            primaryCompetitors
        };
    } catch (error) {
        console.error("Competitor Extraction Error:", error.message);
        return {
            primaryCompetitors: []
        };
    }
}