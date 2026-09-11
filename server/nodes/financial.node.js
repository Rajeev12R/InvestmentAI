import { getFinancialData } from "../tools/financial.tool.js";

export async function financialNode(state) {
    console.log("Running Financial Node");
    if (String(state.securityContext?.securityType || '').toUpperCase() === 'IPO') {
        return { financials: state.securityContext.financials || state.financials || {} };
    }
    const financials = await getFinancialData(state.companyProfile.ticker);
    return {
        financials
    };
}