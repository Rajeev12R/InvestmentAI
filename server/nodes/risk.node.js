import { analyzeRisk } from "../tools/risk.tool.js";

export async function riskNode(state) {
    console.log("Running Risk Node");

    const risks = await analyzeRisk(state);

    return {
        ...state,

        risks,

        progress: [
            ...state.progress,
            "Risk analysis completed"
        ]
    };
}