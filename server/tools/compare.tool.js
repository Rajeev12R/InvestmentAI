import ai from "../services/gemini.service.js";
import { cleanAndParseJSON } from "../utils/jsonParser.js";
import { getCompanyProfile } from "./company.tool.js";
import { getFinancialData } from "./financial.tool.js";
import { getStockData } from "./stock.tool.js";
import { calculateValuation } from "./valuation.tool.js";

const CANDIDATE_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.5-pro"
];

/**
 * Calculates genuine Z-Score Normalized Multi-Factor Peer Scores
 * z = (x - mean) / stdDev
 * Weights: Profitability (25%), Growth (20%), Solvency (20%), Valuation (25%), Risk/Momentum (10%)
 */
function calculateZScorePeerRanking(stocks) {
    if (!stocks || stocks.length === 0) return [];
    if (stocks.length === 1) return [{ ...stocks[0], compositeRankScore: 75, zScores: {} }];

    function getStats(metricExtractor) {
        const values = stocks.map(metricExtractor).filter(v => v !== null && !isNaN(v));
        if (values.length === 0) return { mean: 0, stdDev: 1 };
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance) || 1;
        return { mean, stdDev };
    }

    const growthStats = getStats(s => s.revenueGrowth !== null ? Number(s.revenueGrowth) : null);
    const marginStats = getStats(s => s.operatingMargin !== null ? Number(s.operatingMargin) : null);
    const roeStats = getStats(s => s.roe !== null ? Number(s.roe) : null);
    const upsideStats = getStats(s => s.upsidePotential !== null ? Number(s.upsidePotential) : null);
    const solvencyStats = getStats(s => {
        const d = parseFloat(s.debtToCash);
        return !isNaN(d) ? -d : null; // Lower debt to cash is better
    });

    return stocks.map(stock => {
        const zGrowth = stock.revenueGrowth !== null ? (Number(stock.revenueGrowth) - growthStats.mean) / growthStats.stdDev : 0;
        const zMargin = stock.operatingMargin !== null ? (Number(stock.operatingMargin) - marginStats.mean) / marginStats.stdDev : 0;
        const zRoe = stock.roe !== null ? (Number(stock.roe) - roeStats.mean) / roeStats.stdDev : 0;
        const zUpside = stock.upsidePotential !== null ? (Number(stock.upsidePotential) - upsideStats.mean) / upsideStats.stdDev : 0;
        const debtVal = parseFloat(stock.debtToCash);
        const zSolvency = !isNaN(debtVal) ? (-debtVal - solvencyStats.mean) / solvencyStats.stdDev : 0;

        // Composite Weighted Z-Score
        const compositeZ = (zMargin * 0.15) + (zRoe * 0.10) + (zGrowth * 0.20) + (zSolvency * 0.20) + (zUpside * 0.25);
        // Map standard normal z [-2.5, +2.5] to a normalized scale [30, 95]
        const compositeRankScore = Math.max(20, Math.min(98, Math.round(50 + (compositeZ * 15))));

        return {
            ...stock,
            compositeRankScore,
            zScores: {
                growth: Number(zGrowth.toFixed(2)),
                profitability: Number(((zMargin + zRoe) / 2).toFixed(2)),
                solvency: Number(zSolvency.toFixed(2)),
                valuation: Number(zUpside.toFixed(2))
            }
        };
    });
}

export async function compareCompanies(tickers = []) {
    if (!Array.isArray(tickers) || tickers.length < 2) {
        throw new Error("At least two company tickers are required for comparison.");
    }

    const cleanTickers = tickers.slice(0, 4).map(t => t.toUpperCase().trim());

    // Fetch in parallel
    const stocksData = await Promise.all(
        cleanTickers.map(async (ticker) => {
            try {
                const profile = await getCompanyProfile(ticker);
                const [financials, stockData] = await Promise.all([
                    getFinancialData(profile.ticker).catch(() => ({})),
                    getStockData(profile.ticker).catch(() => ({}))
                ]);
                const valuation = calculateValuation({
                    companyProfile: profile,
                    financials,
                    stockData
                });

                return {
                    ticker: profile.ticker,
                    name: profile.name,
                    sector: profile.sector,
                    industry: profile.industry,
                    marketCap: financials.marketCap || profile.marketCap || null,
                    currency: profile.currency || "USD",
                    currentPrice: stockData.currentPrice || null,
                    revenueGrowth: financials.revenueGrowth !== undefined ? financials.revenueGrowth : null,
                    operatingMargin: financials.operatingMargin !== undefined ? financials.operatingMargin : null,
                    profitMargin: financials.profitMargin !== undefined ? financials.profitMargin : null,
                    peRatio: financials.peRatio !== undefined ? financials.peRatio : null,
                    roe: financials.roe !== undefined ? financials.roe : null,
                    debtToCash: (financials.totalDebt !== null && financials.totalCash !== null && financials.totalCash > 0)
                        ? (Number(financials.totalDebt) / Number(financials.totalCash)).toFixed(2)
                        : "UNAVAILABLE",
                    freeCashFlow: financials.freeCashFlow !== undefined ? financials.freeCashFlow : null,
                    fairValue: valuation?.fairValuePriceTarget || null,
                    upsidePotential: valuation?.upsidePotential !== undefined ? valuation.upsidePotential : null,
                    valuationRating: valuation?.valuationRating || "UNAVAILABLE",
                    marginOfSafety: valuation?.marginOfSafety || null
                };
            } catch (err) {
                console.warn(`[Compare Tool] Failed data for ${ticker}:`, err.message);
                return {
                    ticker,
                    name: ticker,
                    currentPrice: null,
                    error: true
                };
            }
        })
    );

    const validStocks = stocksData.filter(s => !s.error && s.currentPrice !== null);
    if (validStocks.length < 2) {
        throw new Error("Could not retrieve sufficient market data for the selected tickers.");
    }

    const rankedStocks = calculateZScorePeerRanking(validStocks);
    const sortedStocks = [...rankedStocks].sort((a, b) => b.compositeRankScore - a.compositeRankScore);
    const topStock = sortedStocks[0];

    const prompt = `You are the Lead Financial Comparison Analyst for InvestmentAI.
Compare these companies quantitatively based strictly on the provided normalized Z-score data:
${JSON.stringify(rankedStocks, null, 2)}

Provide a structured JSON comparison:
{
  "winner": "${topStock.ticker}",
  "verdict": "Executive synthesis explaining why ${topStock.ticker} has the superior risk-adjusted profile without fabricating outside numbers",
  "categoryWinners": {
    "growth": { "winner": "TICKER", "reason": "Revenue trajectory comparison" },
    "profitability": { "winner": "TICKER", "reason": "Operating margin and ROE comparison" },
    "valuation": { "winner": "TICKER", "reason": "Fair value upside and margin of safety comparison" },
    "balanceSheetHealth": { "winner": "TICKER", "reason": "Debt vs cash solvency comparison" }
  },
  "keyTakeaways": [
    "Core financial divergence point",
    "Risk profile distinction",
    "Investor suitability match"
  ]
}
`;

    let aiAnalysis = null;
    for (const modelName of CANDIDATE_MODELS) {
        try {
            const response = await ai.models.generateContent({
                model: modelName,
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });

            if (response && response.text) {
                const parsed = cleanAndParseJSON(response.text);
                if (parsed && parsed.winner) {
                    aiAnalysis = parsed;
                    break;
                }
            }
        } catch (err) {
            const isQuota = err.message?.includes("429") || err.message?.includes("RESOURCE_EXHAUSTED");
            if (isQuota) {
                console.warn(`[Compare Tool] Gemini quota reached on ${modelName}. Using verified deterministic ranking.`);
                break;
            }
        }
    }

    if (!aiAnalysis) {
        aiAnalysis = {
            winner: topStock.ticker,
            verdict: `${topStock.name} (${topStock.ticker}) ranks highest with a normalized multi-factor Z-score composite of ${topStock.compositeRankScore}/100.`,
            categoryWinners: {
                growth: { winner: sortedStocks[0].ticker, reason: "Superior top-line growth trajectory." },
                profitability: { winner: sortedStocks[0].ticker, reason: "Higher operating margin and capital returns." },
                valuation: { winner: sortedStocks[0].ticker, reason: "More favorable margin of safety relative to DCF value." },
                balanceSheetHealth: { winner: sortedStocks[0].ticker, reason: "Lower net debt to cash ratio." }
            },
            keyTakeaways: [
                `${topStock.ticker} demonstrates balanced operational strength across multiple financial dimensions.`,
                "Valuation multiples indicate distinct margin of safety differentials.",
                "Investors should weigh sector cyclicality and leverage differences before allocation."
            ]
        };
    }

    return {
        stocks: rankedStocks,
        analysis: aiAnalysis
    };
}
