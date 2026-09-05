import ai from "../services/gemini.service.js";
import { decisionPrompt } from "../prompts/decision.prompt.js";
import { cleanAndParseJSON } from "../utils/jsonParser.js";

const CANDIDATE_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro"
];

function generateFallbackDecision(state) {
    const fin = state.financials || {};
    const stock = state.stockData || {};
    const risks = state.risks || {};
    const profile = state.companyProfile || {};
    const news = state.newsData || [];

    let score = 50;
    const pros = [];
    const cons = [];
    const keyFactors = [];

    // Evaluate revenue growth
    if (fin.revenueGrowth !== null && fin.revenueGrowth !== undefined) {
        const revGrowth = Number(fin.revenueGrowth) * (Math.abs(Number(fin.revenueGrowth)) < 1 ? 100 : 1);
        if (revGrowth > 10) {
            score += 12;
            pros.push(`Solid Top-Line Growth: Revenue growth is active at ${revGrowth.toFixed(1)}%.`);
        } else if (revGrowth < 0) {
            score -= 10;
            cons.push(`Revenue Contraction: Top-line revenue contracted by ${Math.abs(revGrowth).toFixed(1)}%.`);
        }
    }

    // Evaluate profit/operating margins
    if (fin.operatingMargin !== null && fin.operatingMargin !== undefined) {
        const opMargin = Number(fin.operatingMargin) * (Math.abs(Number(fin.operatingMargin)) < 1 ? 100 : 1);
        if (opMargin > 20) {
            score += 10;
            pros.push(`High Operating Efficiency: Operating margin is strong at ${opMargin.toFixed(1)}%.`);
        } else if (opMargin < 5) {
            score -= 8;
            cons.push(`Compressed Margins: Operating margin is narrow at ${opMargin.toFixed(1)}%.`);
        }
    }

    // Evaluate cash vs debt
    const debt = Number(fin.totalDebt || 0);
    const cash = Number(fin.totalCash || 0);
    if (cash > 0 && debt <= cash) {
        score += 8;
        pros.push(`Healthy Solvency: Total cash reserves ($${(cash / 1e9).toFixed(2)}B) cover total debt ($${(debt / 1e9).toFixed(2)}B).`);
    } else if (debt > 0 && cash > 0 && (debt / cash) > 2) {
        score -= 10;
        cons.push(`Elevated Leverage: Total debt is ${(debt / cash).toFixed(2)}x cash holdings.`);
    }

    // Evaluate current ratio
    const cr = Number(fin.currentRatio || 0);
    if (cr >= 1.3) {
        score += 5;
        pros.push(`Adequate Liquidity: Current ratio stands healthy at ${cr.toFixed(2)}x.`);
    } else if (cr > 0 && cr < 1.0) {
        score -= 8;
        cons.push(`Tight Working Capital: Current ratio is below parity at ${cr.toFixed(2)}x.`);
    }

    // Evaluate news
    if (news.length > 0) {
        keyFactors.push(`Recent active coverage: ${news.length} press events and market articles recorded.`);
    }
    if (profile.sector) {
        keyFactors.push(`Sector momentum and macro tailwinds in ${profile.sector}.`);
    }
    keyFactors.push("Core product execution and recurring revenue stability.");

    if (pros.length === 0) {
        pros.push("Established market brand presence and operational infrastructure.");
    }
    if (cons.length === 0) {
        cons.push("Macroeconomic volatility and competitive pressure from industry peers.");
    }

    score = Math.max(15, Math.min(95, Math.round(score)));

    let recommendation = "HOLD";
    if (score >= 70) recommendation = "INVEST";
    else if (score <= 45) recommendation = "PASS";

    const reasoning = `${profile.name || state.companyName || "The equity"} displays a composite suitability score of ${score}/100. ${
        recommendation === "INVEST"
            ? "Strong fundamentals, solid margins, and viable solvency provide a favorable risk/reward profile."
            : recommendation === "PASS"
            ? "Elevated leverage, valuation headwinds, or compressed liquidity suggest caution under current market conditions."
            : "Balanced operational indicators with mixed risk vectors recommend maintaining a watchful hold position."
    }`;

    return {
        recommendation,
        investmentScore: score,
        confidence: 80,
        pros,
        cons,
        keyFactors,
        reasoning,
        investmentHorizon: score >= 65 ? "Long Term" : "Medium Term",
        competitors: state.competitors || {
            industry: profile.industry || "General Industry",
            marketPosition: `${profile.name || "Company"} operates within ${profile.sector || "its respective sector"}.`,
            primaryCompetitors: []
        },
        risks: state.risks || {
            overallRisk: score >= 70 ? "LOW" : score >= 45 ? "MEDIUM" : "HIGH",
            financialRisk: { level: cr < 1.0 ? "HIGH" : "MEDIUM", reason: "Standard capital structure and liquidity evaluation." },
            marketRisk: { level: "MEDIUM", reason: "Index and general equities market exposure." },
            competitionRisk: { level: "MEDIUM", reason: "Competitive dynamics within the sector." },
            sentimentRisk: { level: "LOW", reason: "News sentiment and public disclosures." },
            summary: ["Market volatility risk", "Sector-wide competitive developments"]
        }
    };
}

export async function generateDecision(state) {
    const prompt = `
${decisionPrompt}

Company Profile:
${JSON.stringify(state.companyProfile || {}, null, 2)}

Financials:
${JSON.stringify(state.financials || {}, null, 2)}

Stock Data:
${JSON.stringify(state.stockData || {}, null, 2)}

News Data:
${JSON.stringify(state.newsData || [], null, 2)}

Competitors:
${JSON.stringify(state.competitors || {}, null, 2)}

Risk Assessment:
${JSON.stringify(state.risks || {}, null, 2)}

DCF & Valuation Model:
${JSON.stringify(state.valuation || {}, null, 2)}
`;

    let lastError = null;

    for (const modelName of CANDIDATE_MODELS) {
        try {
            console.log(`[Decision Tool] Attempting synthesis with model: ${modelName}...`);
            const response = await ai.models.generateContent({
                model: modelName,
                contents: prompt,
                config: {
                    responseMimeType: "application/json"
                }
            });

            if (response && response.text) {
                const parsed = cleanAndParseJSON(response.text);
                if (parsed && typeof parsed === "object" && (parsed.recommendation || parsed.investmentScore !== undefined)) {
                    console.log(`[Decision Tool] Successfully generated decision with ${modelName}`);
                    return {
                        recommendation: (parsed.recommendation || "HOLD").toUpperCase(),
                        investmentScore: Number(parsed.investmentScore) || 50,
                        confidence: Number(parsed.confidence) || 75,
                        pros: Array.isArray(parsed.pros) ? parsed.pros : [],
                        cons: Array.isArray(parsed.cons) ? parsed.cons : [],
                        keyFactors: Array.isArray(parsed.keyFactors) ? parsed.keyFactors : [],
                        reasoning: parsed.reasoning || "Consolidated investment evaluation complete.",
                        investmentHorizon: parsed.investmentHorizon || "Medium Term",
                        competitors: parsed.competitors || state.competitors,
                        risks: parsed.risks || state.risks
                    };
                }
            }
        } catch (err) {
            console.warn(`[Decision Tool] Model ${modelName} encountered error:`, err.message);
            lastError = err;
        }
    }

    console.warn("[Decision Tool] All Gemini models failed or unparseable. Utilizing robust fallback decision engine.");
    return generateFallbackDecision(state);
}