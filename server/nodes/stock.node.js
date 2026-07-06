import { getStockData } from "../tools/stock.tool.js";

export async function stockNode(state) {

    console.log("Running Stock Node");

    const stock = await getStockData(state.companyProfile.ticker);

    return {
        ...state,

        stock,

        progress: [
            ...state.progress,
            "Stock analysis completed"
        ]

    };

}