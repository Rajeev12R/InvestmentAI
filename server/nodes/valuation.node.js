import { calculateValuation } from "../tools/valuation.tool.js";

export async function valuationNode(state) {
    console.log("Running Valuation Node");

    try {
        const valuation = calculateValuation(state);
        return {
            valuation
        };
    } catch (error) {
        console.error("Valuation Node Error:", error.message);
        return {
            valuation: null
        };
    }
}

