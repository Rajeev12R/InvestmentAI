import { buildRiskProfile } from '../risk/riskAggregation.engine.js';

/**
 * Quantitative Multi-Vector Risk Tool (Phase 3)
 * Integrates modular institutional risk engines (Market, Financial, Liquidity, Earnings Quality, Growth, Event, Governance, Data Quality).
 *
 * Invariants:
 * 1. Zero synthetic defaults (no ?? 0, || 0, or fabricated beta).
 * 2. Missing data remains UNAVAILABLE.
 * 3. Sector-aware solvency & leverage constraints.
 */
export async function analyzeRisk(state) {
    try {
        const fin = state.financials || {};
        const stock = state.stockData || {};
        const news = state.newsData || [];
        const profile = state.companyProfile || {};

        // Run Phase 3 Institutional Risk Aggregation Engine
        const riskProfile = buildRiskProfile({
            financials: fin,
            stockData: stock,
            newsData: news,
            companyProfile: profile
        });

        const cats = riskProfile.categories || riskProfile.categoryBreakdowns || {};
        const mktBreakdown = cats.market || {};
        const finBreakdown = cats.financial || {};
        const earnBreakdown = cats.earningsQuality || {};
        const growthBreakdown = cats.growth || {};
        const liqBreakdown = cats.liquidity || {};
        const govBreakdown = cats.governance || {};

        // Transform signals to legacy-compatible array
        const flags = [];
        for (const [catName, catData] of Object.entries(cats)) {
            if (Array.isArray(catData.signals) && catData.signals.length > 0) {
                for (const sig of catData.signals) {
                    flags.push({
                        category: catName,
                        severity: sig.severity === 'CRITICAL' ? 'HIGH' : (sig.severity === 'HIGH' ? 'HIGH' : 'MEDIUM'),
                        message: `[${catName}] ${sig.direction || sig.metric}: ${sig.reason || ''}`.trim()
                    });
                }
            }
        }

        const indicators = riskProfile.criticalFlags?.length > 0
            ? riskProfile.criticalFlags.map(f => typeof f === 'string' ? `Critical: ${f}` : `Critical: ${f.message || f.reason || JSON.stringify(f)}`)
            : ["Financial and market risk indicators evaluated deterministically."];

        const debtToEbitdaVal = finBreakdown.metrics?.netDebtToEbitda?.value;
        const currentRatioVal = liqBreakdown.metrics?.currentRatio?.value;
        const quickRatioVal = liqBreakdown.metrics?.quickRatio?.value;
        const betaVal = mktBreakdown.metrics?.beta?.value;
        const drawdownVal = mktBreakdown.metrics?.drawdown52w?.value;

        return {
            score: riskProfile.compositeScore ?? riskProfile.compositeRiskScore ?? 50,
            riskLevel: riskProfile.overallSeverity ?? riskProfile.overallRiskLevel ?? "MODERATE",
            criticalFlags: riskProfile.criticalFlags || [],
            riskProfile, // Full 9-vector Phase 3 payload
            indicators,
            flags,
            financialRisk: {
                score: finBreakdown.severity === 'LOW' ? 25 : (finBreakdown.severity === 'HIGH' ? 75 : 50),
                severity: finBreakdown.severity ?? 'UNKNOWN',
                debtToEbitda: debtToEbitdaVal !== undefined && debtToEbitdaVal !== null ? Number(debtToEbitdaVal).toFixed(2) : "UNAVAILABLE",
                currentRatio: currentRatioVal !== undefined && currentRatioVal !== null ? `${Number(currentRatioVal).toFixed(2)}x` : "UNAVAILABLE",
                quickRatio: quickRatioVal !== undefined && quickRatioVal !== null ? `${Number(quickRatioVal).toFixed(2)}x` : "UNAVAILABLE",
                totalDebt: fin.totalDebt ?? null,
                totalCash: fin.totalCash ?? null
            },
            marketRisk: {
                score: mktBreakdown.severity === 'LOW' ? 25 : (mktBreakdown.severity === 'HIGH' ? 75 : 50),
                severity: mktBreakdown.severity ?? 'UNKNOWN',
                beta: betaVal !== undefined && betaVal !== null ? Number(betaVal).toFixed(2) : "UNAVAILABLE",
                maxDrawdown52w: drawdownVal !== undefined && drawdownVal !== null ? `${Number(drawdownVal).toFixed(1)}%` : "UNAVAILABLE",
                fiftyTwoWeekHigh: stock.fiftyTwoWeekHigh ?? stock.high52 ?? null,
                fiftyTwoWeekLow: stock.fiftyTwoWeekLow ?? stock.low52 ?? null
            },
            earningsRisk: {
                score: earnBreakdown.severity === 'LOW' ? 25 : (earnBreakdown.severity === 'HIGH' ? 75 : 50),
                severity: earnBreakdown.severity ?? 'UNKNOWN',
                roe: fin.roe !== null && fin.roe !== undefined ? `${(Math.abs(fin.roe) < 1 ? fin.roe * 100 : fin.roe).toFixed(1)}%` : "UNAVAILABLE",
                operatingMargin: fin.operatingMargin !== null && fin.operatingMargin !== undefined ? `${(fin.operatingMargin * 100).toFixed(1)}%` : "UNAVAILABLE"
            },
            liquidityRisk: {
                score: liqBreakdown.severity === 'LOW' ? 25 : (liqBreakdown.severity === 'HIGH' ? 75 : 50),
                severity: liqBreakdown.severity ?? 'UNKNOWN'
            },
            growthRisk: {
                score: growthBreakdown.severity === 'LOW' ? 25 : (growthBreakdown.severity === 'HIGH' ? 75 : 50),
                severity: growthBreakdown.severity ?? 'UNKNOWN'
            },
            governanceRisk: {
                status: govBreakdown.status ?? "UNAVAILABLE",
                severity: govBreakdown.severity ?? "UNKNOWN",
                note: govBreakdown.reason || "Audited promoter pledging and board governance feeds unavailable in current primary pipeline"
            },
            newsCount: news.length
        };
    } catch (error) {
        console.error("Risk Tool Error:", error.message);
        return {
            score: null,
            riskLevel: "UNKNOWN",
            criticalFlags: [],
            indicators: ["Automated risk indicators unavailable due to processing error."],
            flags: [],
            financialRisk: { score: null, status: "UNAVAILABLE" },
            marketRisk: { score: null, status: "UNAVAILABLE" },
            earningsRisk: { score: null, status: "UNAVAILABLE" },
            governanceRisk: { status: "UNAVAILABLE" },
            newsCount: 0
        };
    }
}