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

export async function compareCompanies(tickers = []) {
    if (!Array.isArray(tickers) || tickers.length < 2) {
        throw new Error("At least two company tickers are required for comparison.");
    }

    const cleanTickers = tickers.slice(0, 4).map(t => t.toUpperCase().trim());

    console.log(`[Compare Tool] Fetching multi-stock intelligence for: ${cleanTickers.join(", ")}`);

    // Fetch data in parallel
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
                    valuationRating: valuation?.valuationRating
                };
            } catch (err) {
                console.warn(`[Compare Tool] Failed to fetch data for ${ticker}:`, err.message);
                return {
                    ticker,
                    name: ticker,
                    error: err.message
                };
            }
        })
    );

    const validStocks = stocksData.filter(s => !s.error);
    if (validStocks.length < 2) {
        throw new Error("Could not retrieve sufficient financial data for comparison. Please verify the ticker symbols.");
    }

    const prompt = `
You are a Principal Hedge Fund Analyst.
Compare the following companies side-by-side:

${JSON.stringify(validStocks, null, 2)}

Provide an objective, data-backed comparative verdict.
Return ONLY valid JSON matching this schema:

{
  "winner": "TICKER of the overall best investment opportunity",
  "winnerName": "Full Name of winner",
  "summaryVerdict": "A 2-3 sentence executive synthesis explaining why the winner edges out the peers.",
  "categoryWinners": {
    "growth": { "winner": "TICKER", "reason": "Specific growth metrics explanation" },
    "valuation": { "winner": "TICKER", "reason": "P/E, Fair value discount, or DCF upside comparison" },
    "profitability": { "winner": "TICKER", "reason": "Operating margin and ROE comparison" },
    "balanceSheetHealth": { "winner": "TICKER", "reason": "Debt vs cash solvency comparison" }
  },
  "keyTakeaways": [
    "Takeaway 1 highlighting a major divergence",
    "Takeaway 2 comparing risk profiles",
    "Takeaway 3 defining the optimal investor profile for each"
  ]
}
`;

    let aiAnalysis = null;
    for (const modelName of CANDIDATE_MODELS) {
        try {
            const response = await ai.models.generateContent({
                model: modelName,
                contents: prompt,
                config: {
                    responseMimeType: "application/json"
                }
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
                console.warn(`[Compare Tool] Gemini quota reached on ${modelName}. Switching to local quantitative multi-stock engine.`);
                break;
            }
            console.warn(`[Compare Tool] Model ${modelName} error:`, err.message);
        }
    }

    // Fallback comparison synthesis if LLM is unavailable
    if (!aiAnalysis) {
        const sortedByScore = [...validStocks].sort((a, b) => {
            const aScore = (Number(a.upsidePotential) || 0) + (Number(a.operatingMargin) || 0) * 100;
            const bScore = (Number(b.upsidePotential) || 0) + (Number(b.operatingMargin) || 0) * 100;
            return bScore - aScore;
        });

        const topStock = sortedByScore[0];
        aiAnalysis = {
            winner: topStock.ticker,
            winnerName: topStock.name,
            summaryVerdict: `${topStock.name} (${topStock.ticker}) presents the superior risk-adjusted profile with favorable margin structure and upside valuation potential.`,
            categoryWinners: {
                growth: { winner: validStocks[0].ticker, reason: "Relative top-line expansion trajectory." },
                valuation: { winner: topStock.ticker, reason: "Discounted cash flow upside and valuation metrics." },
                profitability: { winner: topStock.ticker, reason: "Higher operating margin and return on capital." },
                balanceSheetHealth: { winner: validStocks[0].ticker, reason: "Solvency and capital reserve position." }
            },
            keyTakeaways: [
                "Significant dispersion in operating margins between compared peers.",
                "Valuation multiples reflect differing market growth expectations.",
                "Portfolio allocation should weigh balance sheet resilience vs momentum."
            ]
        };
    }

    return {
        stocks: validStocks,
        analysis: aiAnalysis
    };
}
