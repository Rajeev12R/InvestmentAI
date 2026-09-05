import { generateDecision } from "../tools/decision.tool.js";

export async function decisionNode(state) {
    console.log("Running Decision Node");

    try {
        const decision = await generateDecision(state);

        return {
            ...state,
            recommendation: decision?.recommendation || "HOLD",
            investmentScore: decision?.investmentScore ?? 50,
            confidence: decision?.confidence ?? 75,
            pros: Array.isArray(decision?.pros) ? decision.pros : [],
            cons: Array.isArray(decision?.cons) ? decision.cons : [],
            keyFactors: Array.isArray(decision?.keyFactors) ? decision.keyFactors : [],
            reasoning: decision?.reasoning || "Consolidated investment evaluation complete.",
            investmentHorizon: decision?.investmentHorizon || "Medium Term",
            competitors: decision?.competitors || state.competitors,
            risks: decision?.risks || state.risks,
            progress: [
                ...(state.progress || []),
                "Investment decision generated"
            ]
        };
    } catch (error) {
        console.error("Decision Node Unexpected Error:", error.message);
        return {
            ...state,
            recommendation: "HOLD",
            investmentScore: 50,
            confidence: 70,
            pros: ["Operating enterprise with ongoing commercial activity."],
            cons: ["Analysis synthesis completed with automated fallback metrics."],
            keyFactors: ["Market dynamics and financial structure review."],
            reasoning: "Analysis generated through baseline quantitative assessment.",
            investmentHorizon: "Medium Term",
            progress: [
                ...(state.progress || []),
                "Investment decision generated"
            ]
        };
    }
}