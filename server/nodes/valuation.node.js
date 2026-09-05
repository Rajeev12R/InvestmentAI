import { calculateValuation } from "../tools/valuation.tool.js";

export async function valuationNode(state) {
    console.log("Running Valuation Node");

    try {
        const valuation = calculateValuation(state);

        return {
            ...state,
            valuation,
            progress: [
                ...(state.progress || []),
                "Valuation & DCF model generated"
            ]
        };
    } catch (error) {
        console.error("Valuation Node Error:", error.message);
        return {
            ...state,
            valuation: null,
            progress: [
                ...(state.progress || []),
                "Valuation calculation bypassed"
            ]
        };
    }
}
