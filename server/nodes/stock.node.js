import { getStockData } from "../tools/stock.tool.js";

export async function stockNode(state) {

    console.log("Running Stock Node");

    const stockData = await getStockData(state.companyProfile.ticker);

    return {
        ...state,

        stockData,

        progress: [
            ...state.progress,
            "Stock analysis completed"
        ]

    };

}