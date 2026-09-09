import { getStockData } from "../tools/stock.tool.js";

export async function stockNode(state) {
    console.log("Running Stock Node");
    const stockData = await getStockData(state.companyProfile.ticker);
    return {
        stockData
    };
}