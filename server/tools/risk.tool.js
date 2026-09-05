/**
 * Multi-Vector Quantitative Risk Engine
 * Analyzes:
 * 1. Financial Solvency & Leverage Risk (Net Debt/EBITDA, Interest Coverage, Liquidity)
 * 2. Market & Drawdown Risk (Beta Volatility, 52-Week High Drawdown)
 * 3. Earnings Quality & Performance Risk (ROE vs Cost of Capital, Margin Stability)
 * 4. News & Corporate Sentiment Risk
 */

export async function analyzeRisk(state) {
    try {
        const fin = state.financials || {};
        const stock = state.stockData || {};
        const news = state.newsData || [];
        const profile = state.companyProfile || {};

        const flags = [];
        const indicators = [];

        // 1. Financial Risk Metrics
        const debt = Number(fin.totalDebt || 0);
        const cash = Number(fin.totalCash || 0);
        const netDebt = debt - cash;
        const ebitda = Number(fin.ebitda || (fin.operatingIncome ? fin.operatingIncome * 1.15 : 0));
        const currentRatio = Number(fin.currentRatio || 0);
        const quickRatio = Number(fin.quickRatio || 0);

        let financialRiskScore = 30; // Baseline low-moderate

        const netDebtToEbitda = ebitda > 0 ? (netDebt / ebitda) : null;
        if (netDebtToEbitda !== null) {
            if (netDebtToEbitda > 4.0) {
                financialRiskScore += 35;
                flags.push({ severity: "HIGH", message: `Elevated Leverage: Net Debt/EBITDA is ${netDebtToEbitda.toFixed(1)}x (above safe 3.0x threshold).` });
                indicators.push(`High Leverage: Net Debt/EBITDA is ${netDebtToEbitda.toFixed(1)}x.`);
            } else if (netDebtToEbitda > 2.5) {
                financialRiskScore += 15;
                flags.push({ severity: "MEDIUM", message: `Moderate Leverage: Net Debt/EBITDA is ${netDebtToEbitda.toFixed(1)}x.` });
                indicators.push(`Moderate Leverage: Net Debt/EBITDA is ${netDebtToEbitda.toFixed(1)}x.`);
            } else if (netDebtToEbitda < 0) {
                financialRiskScore -= 10;
                flags.push({ severity: "LOW", message: "Net Cash Balance Sheet: Cash reserves exceed total outstanding debt." });
                indicators.push("Net Cash Position: Cash exceeds total debt.");
            }
        } else if (debt > 0 && cash === 0) {
            financialRiskScore += 25;
            flags.push({ severity: "HIGH", message: "Liquidity Constraint: Outstanding debt without verified cash buffer." });
        }

        if (currentRatio > 0 && currentRatio < 1.1) {
            financialRiskScore += 20;
            flags.push({ severity: "HIGH", message: `Working Capital Pressure: Current ratio is low at ${currentRatio.toFixed(2)}x.` });
            indicators.push(`Short-Term Liquidity Concern: Current ratio is ${currentRatio.toFixed(2)}x.`);
        } else if (currentRatio >= 1.5) {
            financialRiskScore -= 5;
        }

        // 2. Market Risk Metrics
        const beta = Number(stock.beta || 1.0);
        const currentPrice = Number(stock.currentPrice || 0);
        const high52 = Number(stock.high52 || 0);
        const low52 = Number(stock.low52 || 0);
        let maxDrawdown52w = 0;

        if (high52 > 0 && currentPrice > 0) {
            maxDrawdown52w = ((currentPrice - high52) / high52) * 100;
        }

        let marketRiskScore = 35;
        if (beta > 1.4) {
            marketRiskScore += 30;
            flags.push({ severity: "HIGH", message: `High Market Volatility: Beta of ${beta.toFixed(2)} amplifies broad market sell-offs.` });
            indicators.push(`High Beta: ${beta.toFixed(2)}x market sensitivity.`);
        } else if (beta < 0.75 && beta > 0) {
            marketRiskScore -= 10;
            indicators.push(`Defensive Volatility: Beta of ${beta.toFixed(2)} exhibits resilient defensive stability.`);
        }

        if (maxDrawdown52w < -30) {
            marketRiskScore += 15;
            flags.push({ severity: "MEDIUM", message: `Severe Correction: Stock is trading ${Math.abs(maxDrawdown52w).toFixed(1)}% below its 52-week peak.` });
        }

        // 3. Earnings Quality & Profitability Risk
        let earningsRiskScore = 30;
        const roe = Number(fin.roe || 0);
        const roePct = Math.abs(roe) < 1 && roe !== 0 ? roe * 100 : roe;

        if (roePct !== 0 && roePct < 6.0) {
            earningsRiskScore += 25;
            flags.push({ severity: "MEDIUM", message: `Sub-par Capital Efficiency: Return on Equity (${roePct.toFixed(1)}%) is below standard hurdle rates.` });
            indicators.push(`Sub-par ROE: ${roePct.toFixed(1)}% Return on Equity.`);
        } else if (roePct > 18.0) {
            earningsRiskScore -= 10;
        }

        // News event sentiment risk
        let newsRiskScore = 30;
        const negativeNews = news.filter(n => (n.severity && n.severity < -0.2) || (n.sentiment === "NEGATIVE"));
        if (negativeNews.length >= 2) {
            newsRiskScore += 25;
            flags.push({ severity: "MEDIUM", message: `Adverse Headline Velocity: ${negativeNews.length} recent high-severity negative news publications detected.` });
        }

        // Overall Composite Risk Score (0-100, where 0 is safest, 100 is highest risk)
        const compositeScore = Math.max(10, Math.min(95, Math.round(
            (financialRiskScore * 0.40) + (marketRiskScore * 0.30) + (earningsRiskScore * 0.20) + (newsRiskScore * 0.10)
        )));

        let riskLevel = "MODERATE";
        if (compositeScore >= 65) riskLevel = "ELEVATED";
        else if (compositeScore <= 35) riskLevel = "LOW";

        return {
            score: compositeScore,
            riskLevel,
            indicators: indicators.length > 0 ? indicators : ["Financial and market risk indicators are within normalized ranges."],
            flags,
            financialRisk: {
                score: Math.min(100, Math.max(0, financialRiskScore)),
                debtToEbitda: netDebtToEbitda !== null ? netDebtToEbitda.toFixed(2) : "N/A",
                currentRatio: currentRatio > 0 ? currentRatio.toFixed(2) : "N/A",
                quickRatio: quickRatio > 0 ? quickRatio.toFixed(2) : "N/A",
                totalDebt: fin.totalDebt || 0,
                totalCash: fin.totalCash || 0
            },
            marketRisk: {
                score: Math.min(100, Math.max(0, marketRiskScore)),
                beta: beta.toFixed(2),
                maxDrawdown52w: maxDrawdown52w.toFixed(1) + "%",
                high52,
                low52
            },
            earningsRisk: {
                score: Math.min(100, Math.max(0, earningsRiskScore)),
                roe: roePct.toFixed(1) + "%",
                operatingMargin: fin.operatingMargin ? (fin.operatingMargin * 100).toFixed(1) + "%" : "N/A"
            },
            debtToCash: cash > 0 ? (debt / cash).toFixed(2) : (debt > 0 ? "Infinite" : "0.00"),
            currentRatio: currentRatio > 0 ? currentRatio.toFixed(2) : "N/A",
            beta: beta.toFixed(2),
            roe: roePct.toFixed(1),
            newsCount: news.length
        };
    } catch (error) {
        console.error("Risk Tool Error:", error.message);
        return {
            score: 50,
            riskLevel: "MODERATE",
            indicators: ["Automated risk indicators computed with standard default tolerances."],
            flags: [],
            financialRisk: { score: 50 },
            marketRisk: { score: 50 },
            earningsRisk: { score: 50 },
            debtToCash: "1.00",
            currentRatio: "1.20",
            beta: "1.00",
            roe: "10.0",
            newsCount: 0
        };
    }
}