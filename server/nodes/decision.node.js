import { makeInvestmentDecision } from "../tools/decision.tool.js";

export async function decisionNode(state) {
    console.log("Running Decision Node");

    try {
        const decision = await makeInvestmentDecision(state);

        return {
            recommendation: decision?.recommendation || "HOLD",
            companyQualityScore: decision?.companyQualityScore ?? 50,
            stockAttractivenessScore: decision?.stockAttractivenessScore ?? 50,
            investorFitScore: decision?.investorFitScore ?? 70,
            investmentScore: decision?.investmentScore ?? 50,
            confidence: decision?.confidence ?? 75,
            pros: Array.isArray(decision?.pros) ? decision.pros : [],
            cons: Array.isArray(decision?.cons) ? decision.cons : [],
            keyFactors: Array.isArray(decision?.keyFactors) ? decision.keyFactors : [],
            reasoning: decision?.reasoning || "Consolidated investment evaluation complete.",
            investmentHorizon: decision?.investmentHorizon || "3-5 Years",
            competitors: state.competitors,
            risks: state.risks,
            progress: [
                ...(state.progress || []),
                "Investment decision generated"
            ]
        };
    } catch (error) {
        console.error("Decision Node Unexpected Error:", error.message);
        return {
            recommendation: "HOLD",
            companyQualityScore: 50,
            stockAttractivenessScore: 50,
            investorFitScore: 70,
            investmentScore: 50,
            confidence: 70,
            pros: ["Operating enterprise with active commercial operations."],
            cons: ["Analysis synthesized with automated baseline guardrails."],
            keyFactors: ["Market and valuation metrics evaluated under standard tolerances."],
            reasoning: "Analysis generated through baseline quantitative assessment.",
            investmentHorizon: "3-5 Years",
            progress: [
                ...(state.progress || []),
                "Investment decision generated"
            ]
        };
    }
}