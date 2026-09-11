import ai from "../services/gemini.service.js";
import { cleanAndParseJSON } from "../utils/jsonParser.js";
import { makeInvestmentDecision as runDeterministicDecisionEngine } from "../decision/decision.engine.js";
import { evaluateInvestorFit } from "../decision/investorFit.engine.js";
import { calculateConviction } from "../decision/conviction.engine.js";
import { buildDecisionEvidenceGraph } from "../decision/decisionEvidence.engine.js";
import { makeIpoInvestmentDecision } from "../features/ipo/ipoDecision.engine.js";

const CANDIDATE_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.5-pro"
];

/**
 * Calculates Tri-Factor Scores deterministically (Phase 3):
 * 1. Company Quality Score (0-100)
 * 2. Stock Attractiveness Score (0-100 or null / UNAVAILABLE)
 * 3. Investor Fit Score (0-100)
 *
 * Strict Invariant Enforcement:
 * - Missing valuation data produces stockAttractivenessScore = null and stockAttractivenessStatus = "UNAVAILABLE" (No fake 50 default).
 * - Missing Beta does not fabricate beta = 1.0.
 * - Missing Current Ratio does not fabricate 1.2.
 */
export function calculateTriFactorScores(state) {
    if (String(state.securityContext?.securityType || '').toUpperCase() === 'IPO') {
        const ipoDecision = makeIpoInvestmentDecision({
            securityContext: {
                ...state.securityContext,
                financials: state.securityContext.financials || state.financials,
                balanceSheet: state.securityContext.balanceSheet || state.financials?.balanceSheet,
                governance: state.securityContext.governance || state.companyProfile?.governance
            },
            riskProfile: state.risks?.riskProfile || state.risks || {}
        });
        const categoryScores = ipoDecision.ipoAnalysis?.categoryScores || {};
        const investmentScore = ipoDecision.ipoAnalysis?.underwritingScore ?? null;

        return {
            companyQualityScore: categoryScores.actualOperations,
            stockAttractivenessScore: categoryScores.offerValuation,
            stockAttractivenessStatus: 'IPO_UNDERWRITING',
            valuationStatus: 'IPO_OFFER_VALUATION',
            decisionStatus: 'IPO_UNDERWRITING',
            decisionBasis: ['Dedicated IPO underwriting scorecard; listed-equity stock scoring was not used.'],
            investorFitScore: null,
            investmentScore,
            recommendation: ipoDecision.recommendation,
            reasoning: `IPO underwriting score is ${investmentScore ?? 'unavailable'}/100. ${ipoDecision.primaryDrivers?.[0] || 'Evidence review is incomplete.'}`,
            pros: ipoDecision.pros || ipoDecision.primaryDrivers || [],
            cons: ipoDecision.cons || [],
            keyFactors: Object.entries(categoryScores).map(([name, score]) => `${name}: ${score ?? 'UNAVAILABLE'}/100`),
            phase3Decision: ipoDecision,
            ipoAnalysis: ipoDecision.ipoAnalysis
        };
    }

    const fin = state.financials || {};
    const stock = state.stockData || {};
    const valuation = state.valuation || {};
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
    const rawOpMargin = fin.operatingMargin !== null && fin.operatingMargin !== undefined && !isNaN(Number(fin.operatingMargin))
        ? Number(fin.operatingMargin)
        : null;

    if (rawOpMargin !== null) {
        const opMargin = rawOpMargin * (Math.abs(rawOpMargin) < 1 ? 100 : 1);
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
    }

    // Capital Efficiency & ROE/ROIC (25 pts)
    const rawRoe = fin.roe !== null && fin.roe !== undefined && !isNaN(Number(fin.roe)) ? Number(fin.roe) : null;
    if (rawRoe !== null) {
        const roe = rawRoe * (Math.abs(rawRoe) < 1 ? 100 : 1);
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
    }

    // Balance Sheet Solvency & Debt (25 pts)
    const debt = fin.totalDebt !== null && fin.totalDebt !== undefined && !isNaN(Number(fin.totalDebt)) ? Number(fin.totalDebt) : null;
    const cash = fin.totalCash !== null && fin.totalCash !== undefined && !isNaN(Number(fin.totalCash)) ? Number(fin.totalCash) : null;

    if (debt !== null && cash !== null) {
        const netDebt = debt - cash;
        if (netDebt <= 0 && cash > 0) {
            qualityScore += 14;
            pros.push(`Fortress Balance Sheet: Net cash position with liquid cash reserves exceeding debt obligations.`);
        } else if (debt > 0 && cash > 0 && (debt / cash) > 2.5) {
            qualityScore -= 12;
            cons.push(`Leverage Burden: Total debt is ${(debt / cash).toFixed(2)}x liquid cash reserves.`);
        }
    }

    // Current Ratio without fake 1.2 default
    const currentRatio = fin.currentRatio !== null && fin.currentRatio !== undefined && !isNaN(Number(fin.currentRatio))
        ? Number(fin.currentRatio)
        : null;

    if (currentRatio !== null) {
        if (currentRatio >= 1.5) {
            qualityScore += 6;
        } else if (currentRatio < 1.05 && currentRatio > 0) {
            qualityScore -= 8;
            cons.push(`Liquidity Pressure: Current ratio is low at ${currentRatio.toFixed(2)}x.`);
        }
    }

    // Revenue Growth Consistency (20 pts)
    const rawRevGrowth = fin.revenueGrowth !== null && fin.revenueGrowth !== undefined && !isNaN(Number(fin.revenueGrowth))
        ? Number(fin.revenueGrowth)
        : null;

    if (rawRevGrowth !== null) {
        const revGrowth = rawRevGrowth * (Math.abs(rawRevGrowth) < 1 ? 100 : 1);
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
    }

    const companyQualityScore = Math.max(15, Math.min(98, Math.round(qualityScore)));

    // 2. Stock Attractiveness Score (0-100 or null if valuation unavailable)
    const rawUpside = valuation.upsidePotential ?? valuation.upside ?? null;
    const upside = (rawUpside !== null && Number.isFinite(Number(rawUpside))) ? Number(rawUpside) : null;
    const marginOfSafety = (valuation.marginOfSafety !== null && valuation.marginOfSafety !== undefined && Number.isFinite(Number(valuation.marginOfSafety)))
        ? Number(valuation.marginOfSafety)
        : null;

    let stockAttractivenessScore = null;
    let stockAttractivenessStatus = "UNAVAILABLE";

    if (upside !== null) {
        stockAttractivenessStatus = "CALCULATED";
        let attractivenessScore = 50; // Active baseline for valid valuation model

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

        if (marginOfSafety !== null && marginOfSafety > 15) {
            attractivenessScore += 12;
        }

        stockAttractivenessScore = Math.max(10, Math.min(98, Math.round(attractivenessScore)));
    }

    // 3. Investor Profile Fit Score (0-100)
    let fitScore = 70;
    const beta = (stock.beta !== null && stock.beta !== undefined && !isNaN(Number(stock.beta))) ? Number(stock.beta) : null;
    const rawDivYield = fin.dividendYield !== null && fin.dividendYield !== undefined && !isNaN(Number(fin.dividendYield)) ? Number(fin.dividendYield) : null;
    const divYield = rawDivYield !== null ? rawDivYield * (Math.abs(rawDivYield) < 1 ? 100 : 1) : 0;

    const riskTolerance = String(investorProfile.riskTolerance || "").toLowerCase();
    const goal = String(investorProfile.goal || "").toLowerCase();

    // Risk tolerance matching without fake beta
    if (riskTolerance.includes("conservative") || riskTolerance.includes("preservation")) {
        if (beta !== null && beta > 1.3) fitScore -= 20;
        if (companyQualityScore < 70) fitScore -= 15;
        if (divYield > 2.0 && companyQualityScore >= 75) fitScore += 15;
    } else if (riskTolerance.includes("aggressive") || riskTolerance.includes("growth")) {
        const revGrowth = rawRevGrowth !== null ? rawRevGrowth * (Math.abs(rawRevGrowth) < 1 ? 100 : 1) : 0;
        if (revGrowth > 15 && (stockAttractivenessScore === null || stockAttractivenessScore > 65)) fitScore += 18;
    }

    // Goal matching
    if (goal.includes("dividend") || goal.includes("income")) {
        if (divYield > 2.5) fitScore += 20;
        else if (rawDivYield === null || divYield === 0) fitScore -= 18;
    } else if (goal.includes("compound") || goal.includes("growth")) {
        const revGrowth = rawRevGrowth !== null ? rawRevGrowth * (Math.abs(rawRevGrowth) < 1 ? 100 : 1) : 0;
        if (companyQualityScore >= 80 && revGrowth > 10) fitScore += 15;
    }

    const investorFitScore = Math.max(25, Math.min(98, Math.round(fitScore)));

    // Run Phase 3 Deterministic Decision Engine
    const phase3Decision = runDeterministicDecisionEngine({
        valuation,
        riskProfile: state.risks?.riskProfile || state.risks || {},
        investorProfile: investorProfile.goal || investorProfile.riskTolerance || 'BALANCED_VALUE',
        financialFacts: state.truthPackage?.financialFacts || {},
        securityContext: state.securityContext || {}
    });

    let recommendation = phase3Decision.decision || "HOLD";
    let rationale = phase3Decision.primaryDrivers?.[0] || "";

    const decisionBasis = [];
    if (stockAttractivenessScore === null) {
        decisionBasis.push("Valuation model is UNAVAILABLE (no DCF or multiples available)");
        decisionBasis.push(`Company operational quality score available (${companyQualityScore}/100)`);
        decisionBasis.push(`Investor profile fit score available (${investorFitScore}/100)`);
        decisionBasis.push("Recommendation derived from quality, solvency, and investor profile without intrinsic valuation discount");
    } else {
        decisionBasis.push(`Intrinsic valuation model calculated (Attractiveness: ${stockAttractivenessScore}/100)`);
        decisionBasis.push(`Company operational quality score available (${companyQualityScore}/100)`);
        decisionBasis.push(`Investor profile fit score available (${investorFitScore}/100)`);
    }

    const investmentScore = stockAttractivenessScore !== null
        ? Math.round((companyQualityScore * 0.55) + (stockAttractivenessScore * 0.45))
        : companyQualityScore;

    return {
        companyQualityScore,
        stockAttractivenessScore,
        stockAttractivenessStatus,
        valuationStatus: stockAttractivenessScore !== null ? "CALCULATED" : "UNAVAILABLE",
        decisionStatus: "CALCULATED",
        decisionBasis,
        investorFitScore,
        investmentScore,
        recommendation,
        reasoning: `${profile.name || state.companyName || "The security"} scores Quality ${companyQualityScore}/100 and Attractiveness ${stockAttractivenessScore !== null ? stockAttractivenessScore + "/100" : "UNAVAILABLE"}. ${rationale}`,
        pros: pros.slice(0, 5),
        cons: cons.slice(0, 5),
        keyFactors: keyFactors.slice(0, 4),
        phase3Decision // Embed Phase 3 payload (conviction, tradeoffs, falsification triggers, evidence graph)
    };
}

export async function makeInvestmentDecision(state) {
    const scores = calculateTriFactorScores(state);

    if (String(state.securityContext?.securityType || '').toUpperCase() === 'IPO') {
        return {
            ...scores,
            confidence: scores.phase3Decision?.convictionScore || null,
            pros: scores.pros.map((claim) => ({ claim, evidenceIds: [] })),
            cons: scores.cons.map((claim) => ({ claim, evidenceIds: [] })),
            keyFactors: scores.keyFactors.map((claim) => ({ claim, evidenceIds: [] })),
            investmentHorizon: 'IPO_EVENT_DRIVEN',
            phase3Decision: scores.phase3Decision
        };
    }

    const truthPackage = state.truthPackage;

    // Strict Invariant: LLM MUST receive ONLY the validated/sealed Truth Package.
    // NEVER fall back to mutable raw state.
    if (!truthPackage || !truthPackage.integrity || !truthPackage.integrity.valid) {
        console.warn("[Decision Engine] Valid sealed Truth Package not provided. Skipping AI reasoning.");
        return {
            recommendation: scores.recommendation,
            companyQualityScore: scores.companyQualityScore,
            stockAttractivenessScore: scores.stockAttractivenessScore,
            stockAttractivenessStatus: scores.stockAttractivenessStatus,
            investorFitScore: scores.investorFitScore,
            investmentScore: scores.investmentScore,
            confidence: state.confidence?.overall || null,
            reasoning: "Valid sealed Truth Package required for AI reasoning. Baseline deterministic assessment only.",
            pros: scores.pros.map(p => ({ claim: p, evidenceIds: [] })),
            cons: scores.cons.map(c => ({ claim: c, evidenceIds: [] })),
            keyFactors: scores.keyFactors.map(k => ({ claim: k, evidenceIds: [] })),
            investmentHorizon: "3-5 Years",
            phase3Decision: scores.phase3Decision
        };
    }

    // Build known fact IDs set for reference validation
    const validEvidenceIds = new Set([
        ...(truthPackage.financialFacts || []).map(f => f.id),
        ...(truthPackage.calculatedMetrics || []).map(m => m.id),
        ...(truthPackage.provenance || []).map(p => p.id)
    ]);

    // Build Sealed AI Reasoning Prompt over ONLY the Truth Package
    const prompt = `You are the Lead Investment Reasoning Engine for InvestmentAI.
CONSTITUTIONAL INVARIANTS:
1. You CANNOT invent or modify ANY financial numbers or ratios.
2. You MUST reason strictly over the facts provided in the Sealed Investment Truth Package.
3. Every claim must align with the provided balance sheet, valuation scenarios, and risk metrics.
4. Every pro, con, and keyFactor MUST include a "claim" string and an "evidenceIds" array referencing only valid fact IDs from the Truth Package.

SEALED INVESTMENT TRUTH PACKAGE (SHA-256 Seal: ${truthPackage.integrity?.packageHash}):
${JSON.stringify({
    company: truthPackage.company,
    financialFacts: truthPackage.financialFacts,
    calculatedMetrics: truthPackage.calculatedMetrics,
    valuationModels: truthPackage.valuationModels,
    riskSignals: truthPackage.riskSignals,
    newsEvents: truthPackage.newsEvents,
    scores: {
        companyQualityScore: scores.companyQualityScore,
        stockAttractivenessScore: scores.stockAttractivenessScore,
        stockAttractivenessStatus: scores.stockAttractivenessStatus,
        investorFitScore: scores.investorFitScore,
        recommendation: scores.recommendation
    },
    confidence: truthPackage.confidence
}, null, 2)}

Produce a structured JSON investment evaluation with the following exact schema:
{
  "recommendation": "${scores.recommendation}",
  "reasoning": "Executive investment thesis (2-3 sentences explaining quality vs valuation dynamics without hallucinating outside figures)",
  "pros": [
    { "claim": "Verified operational strength description", "evidenceIds": ["financial.operatingMargin", "financial.roe"] }
  ],
  "cons": [
    { "claim": "Verified risk factor description", "evidenceIds": ["financial.totalDebt", "risk.marketRisk"] }
  ],
  "keyFactors": [
    { "claim": "Key catalyst description", "evidenceIds": ["financial.totalRevenue"] }
  ],
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
                    // Helper to validate evidence IDs
                    const filterEvidence = (items) => {
                        if (!Array.isArray(items)) return [];
                        return items.map(item => {
                            if (typeof item === "string") return { claim: item, evidenceIds: [] };
                            const cleanIds = Array.isArray(item.evidenceIds)
                                ? item.evidenceIds.filter(id => validEvidenceIds.has(id))
                                : [];
                            return { claim: item.claim || String(item), evidenceIds: cleanIds };
                        });
                    };

                    return {
                        recommendation: scores.recommendation,
                        companyQualityScore: scores.companyQualityScore,
                        stockAttractivenessScore: scores.stockAttractivenessScore,
                        stockAttractivenessStatus: scores.stockAttractivenessStatus,
                        investorFitScore: scores.investorFitScore,
                        investmentScore: scores.investmentScore,
                        confidence: truthPackage.confidence?.overall || null,
                        reasoning: parsed.reasoning || scores.reasoning,
                        pros: filterEvidence(parsed.pros).length ? filterEvidence(parsed.pros) : scores.pros.map(p => ({ claim: p, evidenceIds: [] })),
                        cons: filterEvidence(parsed.cons).length ? filterEvidence(parsed.cons) : scores.cons.map(c => ({ claim: c, evidenceIds: [] })),
                        keyFactors: filterEvidence(parsed.keyFactors).length ? filterEvidence(parsed.keyFactors) : scores.keyFactors.map(k => ({ claim: k, evidenceIds: [] })),
                        investmentHorizon: parsed.investmentHorizon || "3-5 Years",
                        phase3Decision: scores.phase3Decision
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
        stockAttractivenessStatus: scores.stockAttractivenessStatus,
        investorFitScore: scores.investorFitScore,
        investmentScore: scores.investmentScore,
        confidence: truthPackage.confidence?.overall || null,
        reasoning: scores.reasoning,
        pros: scores.pros.map(p => ({ claim: p, evidenceIds: [] })),
        cons: scores.cons.map(c => ({ claim: c, evidenceIds: [] })),
        keyFactors: scores.keyFactors.map(k => ({ claim: k, evidenceIds: [] })),
        investmentHorizon: "3-5 Years",
        phase3Decision: scores.phase3Decision
    };
}