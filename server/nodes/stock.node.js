import { getStockData } from "../tools/stock.tool.js";

export async function stockNode(state) {
    console.log("Running Stock Node");
    if (String(state.securityContext?.securityType || '').toUpperCase() === 'IPO') {
        return {
            stockData: {
                securityType: 'IPO',
                currentPrice: state.securityContext.offerPrice || state.securityContext.priceRangeHigh || null,
                currency: state.securityContext.currency || 'INR'
            }
        };
    }
    const stockData = await getStockData(state.companyProfile.ticker);
    return {
        stockData
    };
}