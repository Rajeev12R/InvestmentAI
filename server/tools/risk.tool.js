export async function analyzeRisk(state) {
    try {
        console.log("Analyzing local quantitative risk indicators");

        const financials = state.financials || {};
        const stock = state.stockData || {};
        const news = state.newsData || [];

        const indicators = [];

        const debt = Number(financials.totalDebt || 0);
        const cash = Number(financials.totalCash || 0);
        let debtToCash = 0;
        if (cash > 0) {
            debtToCash = debt / cash;
            if (debtToCash > 2.0) {
                indicators.push(`High Leverage: Outstanding debt is ${(debtToCash).toFixed(2)}x cash reserves.`);
            }
        } else if (debt > 0) {
            indicators.push("Solvency Concern: Significant debt outstanding with zero reported cash holdings.");
        }

        const currentRatio = Number(financials.currentRatio || 0);
        if (currentRatio > 0 && currentRatio < 1.2) {
            indicators.push(`Liquidity Concern: Current ratio is low at ${currentRatio.toFixed(2)}x, indicating short-term obligation pressure.`);
        }

        const beta = Number(stock.beta || 0);
        if (beta > 1.3) {
            indicators.push(`High Beta Volatility: Stock beta is ${beta.toFixed(2)}, making it highly responsive to market corrections.`);
        } else if (beta > 0 && beta < 0.7) {
            indicators.push(`Defensive Volatility: Stock beta is defensive at ${beta.toFixed(2)}, showing low correlation to index swings.`);
        }

        const roe = Number(financials.roe || 0);
        let roeVal = roe;
        if (Math.abs(roeVal) < 1 && roeVal !== 0) {
            roeVal = roeVal * 100;
        }
        if (roeVal !== 0 && roeVal < 6.0) {
            indicators.push(`Sub-par Performance: Return on Equity (ROE) of ${roeVal.toFixed(2)}% is below standard cost of equity benchmarks.`);
        }

        if (news.length === 0) {
            indicators.push("Information Scarcity: No recent press publications mapped for sentiment evaluation.");
        }

        return {
            indicators,
            debtToCash: debtToCash.toFixed(2),
            currentRatio: currentRatio.toFixed(2),
            beta: beta.toFixed(2),
            roe: roeVal.toFixed(2),
            newsCount: news.length
        };
    } catch (error) {
        console.error("Local Risk Analysis Error:", error.message);
        return {
            indicators: ["Error analyzing quantitative indicators locally."],
            debtToCash: "0.00",
            currentRatio: "1.00",
            beta: "1.00",
            roe: "0.00",
            newsCount: 0
        };
    }
}