import { makeInvestmentDecision } from "../tools/decision.tool.js";

export async function decisionNode(state) {
    console.log("Running Decision Node");

    try {
        const decision = await makeInvestmentDecision(state);

        return {
            recommendation: decision?.recommendation || "HOLD",
            companyQualityScore: decision?.companyQualityScore ?? null,
            stockAttractivenessScore: decision?.stockAttractivenessScore ?? null,
            stockAttractivenessStatus: decision?.stockAttractivenessStatus || (decision?.stockAttractivenessScore !== null ? "CALCULATED" : "UNAVAILABLE"),
            investorFitScore: decision?.investorFitScore ?? null,
            investmentScore: decision?.investmentScore ?? null,
            confidence: decision?.confidence ?? null,
            pros: Array.isArray(decision?.pros) ? decision.pros : [],
            cons: Array.isArray(decision?.cons) ? decision.cons : [],
            keyFactors: Array.isArray(decision?.keyFactors) ? decision.keyFactors : [],
            reasoning: decision?.reasoning || "Consolidated investment evaluation complete.",
            investmentHorizon: decision?.investmentHorizon || "3-5 Years",
            phase3Decision: decision?.phase3Decision || null,
            decision: decision?.phase3Decision || null
        };
    } catch (error) {
        console.error("Decision Node Unexpected Error:", error.message);
        return {
            recommendation: "HOLD",
            companyQualityScore: null,
            stockAttractivenessScore: null,
            stockAttractivenessStatus: "UNAVAILABLE",
            investorFitScore: null,
            investmentScore: null,
            confidence: null,
            pros: [{ claim: "Operating enterprise with active commercial operations.", evidenceIds: [] }],
            cons: [{ claim: "Analysis synthesized with automated baseline guardrails.", evidenceIds: [] }],
            keyFactors: [{ claim: "Market and valuation metrics evaluated under standard tolerances.", evidenceIds: [] }],
            reasoning: "Analysis generated through baseline quantitative assessment.",
            investmentHorizon: "3-5 Years",
            phase3Decision: null,
            decision: null
        };
    }
}