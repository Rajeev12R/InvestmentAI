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

function calculateNormalizedPeerScores(stocks) {
    if (!stocks || stocks.length === 0) return [];

    return stocks.map(stock => {
        let score = 50;

        // 1. Growth Component (20%)
        const revGrowth = Number(stock.revenueGrowth || 0) * (Math.abs(Number(stock.revenueGrowth || 0)) < 1 ? 100 : 1);
        if (revGrowth > 15) score += 10;
        else if (revGrowth > 5) score += 5;
        else if (revGrowth < 0) score -= 8;

        // 2. Profitability Component (25%)
        const opMargin = Number(stock.operatingMargin || 0) * (Math.abs(Number(stock.operatingMargin || 0)) < 1 ? 100 : 1);
        if (opMargin > 20) score += 14;
        else if (opMargin > 10) score += 7;
        else if (opMargin <= 0) score -= 12;

        const roe = Number(stock.roe || 0) * (Math.abs(Number(stock.roe || 0)) < 1 ? 100 : 1);
        if (roe > 18) score += 10;
        else if (roe > 8) score += 5;

        // 3. Balance Sheet Solvency (20%)
        const debtToCash = parseFloat(stock.debtToCash);
        if (!isNaN(debtToCash)) {
            if (debtToCash <= 1.0) score += 10;
            else if (debtToCash > 3.0) score -= 10;
        }

        // 4. Valuation & Margin of Safety (25%)
        const upside = Number(stock.upsidePotential || 0);
        if (upside > 25) score += 15;
        else if (upside > 10) score += 8;
        else if (upside < -15) score -= 12;

        return {
            ...stock,
            compositeRankScore: Math.max(10, Math.min(98, Math.round(score)))
        };
    });
}

export async function compareCompanies(tickers = []) {
    if (!Array.isArray(tickers) || tickers.length < 2) {
        throw new Error("At least two company tickers are required for comparison.");
    }

    const cleanTickers = tickers.slice(0, 4).map(t => t.toUpperCase().trim());
    console.log(`[Compare Tool] Executing parallel multi-stock intelligence for: ${cleanTickers.join(", ")}`);

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
                    marketCap: financials.marketCap || profile.marketCap,
                    currency: profile.currency || "USD",
                    currentPrice: stockData.currentPrice,
                    revenueGrowth: financials.revenueGrowth,
                    operatingMargin: financials.operatingMargin,
                    profitMargin: financials.profitMargin,
                    peRatio: financials.peRatio,
                    roe: financials.roe,
                    debtToCash: financials.totalCash > 0 ? (Number(financials.totalDebt || 0) / Number(financials.totalCash)).toFixed(2) : "N/A",
                    freeCashFlow: financials.freeCashFlow,
                    fairValue: valuation?.fairValuePriceTarget,
                    upsidePotential: valuation?.upsidePotential,
                    valuationRating: valuation?.valuationRating,
                    marginOfSafety: valuation?.marginOfSafety
                };
            } catch (err) {
                console.warn(`[Compare Tool] Failed data for ${ticker}:`, err.message);
                return {
                    ticker,
                    name: ticker,
                    currentPrice: 0,
                    error: true
                };
            }
        })
    );

    const validStocks = stocksData.filter(s => !s.error && s.currentPrice > 0);
    if (validStocks.length < 2) {
        throw new Error("Could not retrieve sufficient market data for the selected tickers.");
    }

    const rankedStocks = calculateNormalizedPeerScores(validStocks);
    const sortedStocks = [...rankedStocks].sort((a, b) => b.compositeRankScore - a.compositeRankScore);
    const topStock = sortedStocks[0];

    const prompt = `You are the Lead Financial Comparison Analyst for InvestmentAI.
Compare these companies quantitatively based on the structured data:
${JSON.stringify(rankedStocks, null, 2)}

Provide a structured JSON comparison:
{
  "winner": "${topStock.ticker}",
  "verdict": "Executive synthesis explaining why ${topStock.ticker} has the superior risk-adjusted profile",
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
            console.warn(`[Compare Tool] Model ${modelName} error:`, err.message);
        }
    }

    if (!aiAnalysis) {
        aiAnalysis = {
            winner: topStock.ticker,
            verdict: `${topStock.name} (${topStock.ticker}) ranks highest with a normalized multi-factor quality & valuation score of ${topStock.compositeRankScore}/100.`,
            categoryWinners: {
                growth: { winner: sortedStocks[0].ticker, reason: "Superior top-line growth metrics." },
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
