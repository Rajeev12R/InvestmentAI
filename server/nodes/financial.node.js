import { getFinancialData } from "../tools/financial.tool.js";

export async function financialNode(state) {

    console.log("Running Financial Node");

    const financials = await getFinancialData(state.companyProfile.ticker);

    return {

        ...state,

        financials,
        
        progress: [
            ...state.progress,
            "Financial research completed"
        ]

    }

}