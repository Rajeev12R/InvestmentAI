import ai from "../services/gemini.service.js";
import { cleanAndParseJSON } from "../utils/jsonParser.js";

const CANDIDATE_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.5-pro"
];

/**
 * Calculates Tri-Factor Scores deterministically:
 * 1. Company Quality Score (0-100)
 * 2. Stock Attractiveness Score (0-100)
 * 3. Investor Fit Score (0-100)
 */
export function calculateTriFactorScores(state) {
    const fin = state.financials || {};
    const stock = state.stockData || {};
    const valuation = state.valuation || {};
    const risks = state.risks || {};
    const profile = state.companyProfile || {};
    const investorProfile = state.investorProfile || {
        horizon: "Long (3-5 Years)",
        riskTolerance: "Moderate / Balanced",
        goal: "Capital Growth & Compounding"
    };

    // 1. Company Quality Score (0-100)
    let qualityScore = 50;
    const pros = [];
    const cons = [];
    const keyFactors = [];

    // Profitability & Margins (30 pts)
    const opMargin = Number(fin.operatingMargin || 0) * (Math.abs(Number(fin.operatingMargin || 0)) < 1 ? 100 : 1);
    if (opMargin > 22) {
        qualityScore += 16;
        pros.push(`High Operating Moat: Operating margin is strong at ${opMargin.toFixed(1)}%.`);
        keyFactors.push(`Operating Margin: ${opMargin.toFixed(1)}%`);
    } else if (opMargin > 12) {
        qualityScore += 8;
        pros.push(`Healthy Profitability: Operating margin is solid at ${opMargin.toFixed(1)}%.`);
    } else if (opMargin < 5 && opMargin > 0) {
        qualityScore -= 8;
        cons.push(`Compressed Margins: Operating margin is tight at ${opMargin.toFixed(1)}%.`);
    } else if (opMargin <= 0) {
        qualityScore -= 18;
        cons.push("Operating Deficit: Company is operating at an un-profitable operating margin.");
    }

    // Capital Efficiency & ROE/ROIC (25 pts)
    const roe = Number(fin.roe || 0) * (Math.abs(Number(fin.roe || 0)) < 1 ? 100 : 1);
    if (roe > 20) {
        qualityScore += 14;
        pros.push(`Superior Capital Efficiency: Return on Equity (ROE) is high at ${roe.toFixed(1)}%.`);
        keyFactors.push(`ROE: ${roe.toFixed(1)}%`);
    } else if (roe > 12) {
        qualityScore += 7;
    } else if (roe < 6 && roe > 0) {
        qualityScore -= 8;
        cons.push(`Sub-par Capital Returns: ROE of ${roe.toFixed(1)}% trails typical cost of capital.`);
    }

    // Balance Sheet Solvency & Debt (25 pts)
    const debt = Number(fin.totalDebt || 0);
    const cash = Number(fin.totalCash || 0);
    const netDebt = debt - cash;
    const currentRatio = Number(fin.currentRatio || 1.2);

    if (netDebt <= 0 && cash > 0) {
        qualityScore += 14;
        pros.push(`Fortress Balance Sheet: Net cash position with $${(cash / 1e9).toFixed(2)}B cash vs $${(debt / 1e9).toFixed(2)}B debt.`);
    } else if (debt > 0 && cash > 0 && (debt / cash) > 2.5) {
        qualityScore -= 12;
        cons.push(`Leverage Burden: Total debt is ${(debt / cash).toFixed(2)}x liquid cash reserves.`);
    }

    if (currentRatio >= 1.5) {
        qualityScore += 6;
    } else if (currentRatio < 1.05 && currentRatio > 0) {
        qualityScore -= 8;
        cons.push(`Liquidity Pressure: Current ratio is low at ${currentRatio.toFixed(2)}x.`);
    }

    // Revenue Growth Consistency (20 pts)
    const revGrowth = Number(fin.revenueGrowth || 0) * (Math.abs(Number(fin.revenueGrowth || 0)) < 1 ? 100 : 1);
    if (revGrowth > 15) {
        qualityScore += 12;
        pros.push(`Dynamic Top-Line Growth: Revenue expansion is active at ${revGrowth.toFixed(1)}% YoY.`);
        keyFactors.push(`Revenue Growth: +${revGrowth.toFixed(1)}%`);
    } else if (revGrowth > 6) {
        qualityScore += 6;
    } else if (revGrowth < -5) {
        qualityScore -= 12;
        cons.push(`Revenue Contraction: Top-line revenue declined by ${Math.abs(revGrowth).toFixed(1)}% YoY.`);
    }

    const companyQualityScore = Math.max(15, Math.min(98, Math.round(qualityScore)));

    // 2. Stock Attractiveness Score (0-100)
    let attractivenessScore = 50;
    const upside = Number(valuation.upsidePotential || valuation.upside || 0);
    const marginOfSafety = Number(valuation.marginOfSafety || 0);

    if (upside > 30) {
        attractivenessScore += 35;
        pros.push(`Significant Discount to Intrinsic Value: DCF and relative models indicate +${upside.toFixed(1)}% upside.`);
        keyFactors.push(`Fair Value Upside: +${upside.toFixed(1)}%`);
    } else if (upside > 15) {
        attractivenessScore += 20;
        pros.push(`Favorable Valuation Margin: Fair value estimate offers +${upside.toFixed(1)}% margin.`);
    } else if (upside < -20) {
        attractivenessScore -= 30;
        cons.push(`Stretched Valuation: Stock trades at a ${Math.abs(upside).toFixed(1)}% premium to estimated fair value.`);
        keyFactors.push(`Valuation Premium: ${Math.abs(upside).toFixed(1)}% Overvalued`);
    } else if (upside < -8) {
        attractivenessScore -= 15;
        cons.push(`Valuation Headwind: Current price trades above estimated base-case fair value.`);
    }

    if (marginOfSafety > 15) {
        attractivenessScore += 12;
    }

    const stockAttractivenessScore = Math.max(10, Math.min(98, Math.round(attractivenessScore)));

    // 3. Investor Profile Fit Score (0-100)
    let fitScore = 70;
    const beta = Number(stock.beta || 1.0);
    const divYield = Number(fin.dividendYield || 0) * (Math.abs(Number(fin.dividendYield || 0)) < 1 ? 100 : 1);

    const horizon = String(investorProfile.horizon || "").toLowerCase();
    const riskTolerance = String(investorProfile.riskTolerance || "").toLowerCase();
    const goal = String(investorProfile.goal || "").toLowerCase();

    // Risk tolerance matching
    if (riskTolerance.includes("conservative") || riskTolerance.includes("preservation")) {
        if (beta > 1.3 || companyQualityScore < 70) fitScore -= 20;
        if (divYield > 2.0 && companyQualityScore >= 75) fitScore += 15;
    } else if (riskTolerance.includes("aggressive") || riskTolerance.includes("growth")) {
        if (revGrowth > 15 && stockAttractivenessScore > 65) fitScore += 18;
    }

    // Goal matching
    if (goal.includes("dividend") || goal.includes("income")) {
        if (divYield > 2.5) fitScore += 20;
        else if (divYield === 0) fitScore -= 18;
    } else if (goal.includes("compound") || goal.includes("growth")) {
        if (companyQualityScore >= 80 && revGrowth > 10) fitScore += 15;
    }

    const investorFitScore = Math.max(25, Math.min(98, Math.round(fitScore)));

    // 4. Decision Matrix: Distinct Recommendation Logic
    let recommendation = "HOLD";
    let rationale = "";

    if (companyQualityScore >= 75 && stockAttractivenessScore >= 65) {
        recommendation = "BUY";
        rationale = "High operational quality combined with an attractive intrinsic valuation discount provides a compelling risk/reward setup.";
    } else if (companyQualityScore >= 75 && stockAttractivenessScore < 45) {
        recommendation = "HOLD";
        rationale = "Exceptional company fundamentals, but current market price reflects premium valuation multiples. Recommend awaiting a pullback.";
    } else if (companyQualityScore >= 55 && stockAttractivenessScore >= 75) {
        recommendation = "ACCUMULATE";
        rationale = "Deep valuation discount and viable margin of safety compensate for moderate operational cyclicality.";
    } else if (companyQualityScore < 50 || stockAttractivenessScore < 30) {
        recommendation = "AVOID";
        rationale = "Deteriorating balance sheet leverage, compressed operating margins, or excessive valuation premium warrant capital protection.";
    } else {
        recommendation = "HOLD";
        rationale = "Balanced operational quality and fair market pricing recommend maintaining an observant holding position.";
    }

    return {
        companyQualityScore,
        stockAttractivenessScore,
        investorFitScore,
        investmentScore: Math.round((companyQualityScore * 0.55) + (stockAttractivenessScore * 0.45)),
        recommendation,
        reasoning: `${profile.name || state.companyName || "The security"} scores Quality ${companyQualityScore}/100 and Attractiveness ${stockAttractivenessScore}/100. ${rationale}`,
        pros: pros.slice(0, 5),
        cons: cons.slice(0, 5),
        keyFactors: keyFactors.slice(0, 4)
    };
}

export async function makeInvestmentDecision(state) {
    const scores = calculateTriFactorScores(state);
    const truthPackage = state.truthPackage || {};

    // Build the Sealed AI Reasoning Prompt
    const prompt = `You are the Lead Investment Reasoning Engine for InvestmentAI.
CONSTITUTIONAL INVARIANTS:
1. You CANNOT invent or modify ANY financial numbers or ratios.
2. You MUST reason strictly over the facts provided in the Sealed Investment Truth Package.
3. Every claim must align with the provided balance sheet, valuation scenarios, and risk metrics.

SEALED INVESTMENT TRUTH PACKAGE:
${JSON.stringify({
    company: truthPackage.company || state.companyProfile,
    financialFacts: truthPackage.financialFacts || state.financials,
    calculatedMetrics: truthPackage.calculatedMetrics || {},
    valuationModels: truthPackage.valuationModels || state.valuation,
    riskSignals: truthPackage.riskSignals || state.risks,
    newsEvents: truthPackage.newsEvents || state.newsData,
    scores: {
        companyQualityScore: scores.companyQualityScore,
        stockAttractivenessScore: scores.stockAttractivenessScore,
        investorFitScore: scores.investorFitScore,
        recommendation: scores.recommendation
    },
    confidence: state.confidence || {}
}, null, 2)}

Produce a structured JSON investment evaluation with the following exact schema:
{
  "recommendation": "${scores.recommendation}",
  "reasoning": "Comprehensive executive investment thesis (2-3 sentences explaining quality vs valuation dynamics without hallucinating outside figures)",
  "pros": ["Key verified strength 1", "Key verified strength 2", "Key verified strength 3"],
  "cons": ["Key verified risk factor 1", "Key verified risk factor 2", "Key verified risk factor 3"],
  "keyFactors": ["Catalyst 1", "Catalyst 2", "Catalyst 3"],
  "investmentHorizon": "3-5 Years"
}
`;

    for (const modelName of CANDIDATE_MODELS) {
        try {
            console.log(`[Decision Engine] Generating reasoned investment thesis with ${modelName}...`);
            const response = await ai.models.generateContent({
                model: modelName,
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });

            if (response && response.text) {
                const parsed = cleanAndParseJSON(response.text);
                if (parsed && (parsed.recommendation || parsed.reasoning)) {
                    return {
                        recommendation: scores.recommendation,
                        companyQualityScore: scores.companyQualityScore,
                        stockAttractivenessScore: scores.stockAttractivenessScore,
                        investorFitScore: scores.investorFitScore,
                        investmentScore: scores.investmentScore,
                        confidence: state.confidence?.overall || 85,
                        reasoning: parsed.reasoning || scores.reasoning,
                        pros: Array.isArray(parsed.pros) && parsed.pros.length ? parsed.pros : scores.pros,
                        cons: Array.isArray(parsed.cons) && parsed.cons.length ? parsed.cons : scores.cons,
                        keyFactors: Array.isArray(parsed.keyFactors) && parsed.keyFactors.length ? parsed.keyFactors : scores.keyFactors,
                        investmentHorizon: parsed.investmentHorizon || "3-5 Years"
                    };
                }
            }
        } catch (err) {
            const isQuota = err.message?.includes("429") || err.message?.includes("RESOURCE_EXHAUSTED");
            if (isQuota) {
                console.warn(`[Decision Engine] Gemini rate limit reached on ${modelName}. Using verified deterministic thesis.`);
                break;
            }
            console.warn(`[Decision Engine] Model ${modelName} error:`, err.message);
        }
    }

    // Grounded deterministic fallback
    return {
        recommendation: scores.recommendation,
        companyQualityScore: scores.companyQualityScore,
        stockAttractivenessScore: scores.stockAttractivenessScore,
        investorFitScore: scores.investorFitScore,
        investmentScore: scores.investmentScore,
        confidence: state.confidence?.overall || 85,
        reasoning: scores.reasoning,
        pros: scores.pros,
        cons: scores.cons,
        keyFactors: scores.keyFactors,
        investmentHorizon: "3-5 Years"
    };
}