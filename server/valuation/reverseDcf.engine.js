import { VALUATION_STATUS, createCalculatedResult, createUnavailableResult } from "./valuation.types.js";

/**
 * Exact Mathematical Reverse DCF Root-Solver (Bisection Method).
 * Solves for the implied 5-year revenue/FCF growth rate that equates intrinsic equity value to current market price.
 */
export function solveReverseDCF({
    currentPrice,
    sharesOutstanding,
    freeCashFlow,
    totalDebt,
    totalCash,
    waccObj,
    terminalGrowthOverride = null
}) {
    const timestamp = new Date().toISOString();

    // Validate Required Grounded Inputs
    if (
        currentPrice === null || currentPrice === undefined || isNaN(Number(currentPrice)) || Number(currentPrice) <= 0 ||
        sharesOutstanding === null || sharesOutstanding === undefined || isNaN(Number(sharesOutstanding)) || Number(sharesOutstanding) <= 0 ||
        freeCashFlow === null || freeCashFlow === undefined || isNaN(Number(freeCashFlow)) || Number(freeCashFlow) <= 0 ||
        totalDebt === null || totalDebt === undefined || isNaN(Number(totalDebt)) ||
        totalCash === null || totalCash === undefined || isNaN(Number(totalCash)) ||
        !waccObj || waccObj.status === VALUATION_STATUS.UNAVAILABLE || !waccObj.metadata?.wacc
    ) {
        return createUnavailableResult({
            name: "Reverse DCF Implied Market Expectations",
            reason: freeCashFlow === null || Number(freeCashFlow) <= 0
                ? "Free Cash Flow is unavailable or non-positive (standard for banks or entities without discrete cash flow reporting)"
                : currentPrice === null || Number(currentPrice) <= 0
                ? "Current market share price is unavailable"
                : "Required shares outstanding, WACC, or debt/cash inputs are unavailable",
            inputs: ["market.currentPrice", "market.sharesOutstanding", "financial.freeCashFlow", "valuation.wacc", "financial.totalDebt", "financial.totalCash"]
        });
    }

    const price = Number(currentPrice);
    const shares = Number(sharesOutstanding);
    const fcf = Number(freeCashFlow);
    const debt = Number(totalDebt);
    const cash = Number(totalCash);
    const netDebt = debt - cash;
    const wacc = waccObj.metadata.wacc;
    const rf = waccObj.metadata.riskFreeRate ? waccObj.metadata.riskFreeRate / 100 : 0.0425;
    const terminalGrowth = terminalGrowthOverride !== null
        ? terminalGrowthOverride
        : Math.min(0.030, Math.max(0.020, rf * 0.45));

    if (wacc <= terminalGrowth) {
        return createUnavailableResult({
            name: "Reverse DCF Implied Market Expectations",
            reason: "Terminal growth rate exceeds discount rate",
            inputs: ["valuation.wacc"]
        });
    }

    const targetEquity = price * shares;

    // Helper to evaluate equity value for a given initial growth rate g
    function computeEquityForGrowth(g) {
        let pv = 0;
        let flow = fcf;
        for (let y = 1; y <= 5; y++) {
            const yearGrowth = g * Math.pow(0.91, y - 1);
            flow *= (1 + yearGrowth);
            pv += flow / Math.pow(1 + wacc, y);
        }
        const tv = (flow * (1 + terminalGrowth)) / (wacc - terminalGrowth);
        const pvTv = tv / Math.pow(1 + wacc, 5);
        return (pv + pvTv) - netDebt;
    }

    // Bisection Root Solver on interval [-50%, +150%]
    let low = -0.50;
    let high = 1.50;
    let solvedGrowth = null;

    const eqLow = computeEquityForGrowth(low);
    const eqHigh = computeEquityForGrowth(high);

    // If target equity is outside realistic range bounds
    if (targetEquity < eqLow || targetEquity > eqHigh) {
        // Return unavailable with explanation rather than fake number
        return createUnavailableResult({
            name: "Reverse DCF Implied Market Expectations",
            reason: targetEquity < eqLow
                ? "Market price reflects extreme negative growth expectations (< -50% CAGR)"
                : "Market price reflects extreme hyper-growth expectations (> +150% CAGR)",
            inputs: ["market.currentPrice", "financial.freeCashFlow", "valuation.wacc"]
        });
    }

    for (let iter = 0; iter < 50; iter++) {
        const mid = (low + high) / 2;
        const eq = computeEquityForGrowth(mid);

        if (Math.abs(eq - targetEquity) < targetEquity * 0.0005) { // 0.05% tolerance
            solvedGrowth = mid;
            break;
        }

        if (eq < targetEquity) {
            low = mid;
        } else {
            high = mid;
        }
    }

    if (solvedGrowth === null) {
        solvedGrowth = (low + high) / 2;
    }

    const impliedGrowthPercent = Number((solvedGrowth * 100).toFixed(1));

    let expectationAnalysis = "";
    if (impliedGrowthPercent > 20) {
        expectationAnalysis = `Market expects high-growth expansion (+${impliedGrowthPercent}% FCF CAGR for 5 years). High execution bar.`;
    } else if (impliedGrowthPercent > 8) {
        expectationAnalysis = `Market prices in moderate commercial growth (+${impliedGrowthPercent}% FCF CAGR), consistent with industry leaders.`;
    } else if (impliedGrowthPercent > 0) {
        expectationAnalysis = `Market embeds conservative low-single-digit expansion (+${impliedGrowthPercent}% FCF CAGR), leaving upside if growth accelerates.`;
    } else {
        expectationAnalysis = `Market prices in severe operational contraction (${impliedGrowthPercent}% FCF CAGR), signaling pessimistic sentiment.`;
    }

    return createCalculatedResult({
        name: "Reverse DCF Implied Market Expectations",
        value: impliedGrowthPercent,
        status: VALUATION_STATUS.CALCULATED,
        formula: "Root Solve f(Implied_Growth) where PV(Forecast FCF) + PV(Terminal Value) - Net Debt = Market Cap",
        inputs: ["market.currentPrice", "market.sharesOutstanding", "financial.freeCashFlow", "valuation.wacc", "financial.totalDebt", "financial.totalCash"],
        provenance: {
            provider: "InvestmentAI Reverse DCF Engine",
            sourceType: "DERIVED_CALCULATION",
            retrievedAt: timestamp
        },
        metadata: {
            impliedGrowthRate: Number(solvedGrowth.toFixed(4)),
            impliedGrowthPercent,
            marketPrice: price,
            wacc: Number((wacc * 100).toFixed(2)),
            impliedTerminalGrowth: Number((terminalGrowth * 100).toFixed(2)),
            sharesOutstanding: shares,
            marketCap: Math.round(targetEquity),
            method: "Exact Numerical Bisection Root Solver (50 iterations, 0.05% tolerance)",
            expectationAnalysis
        }
    });
}
