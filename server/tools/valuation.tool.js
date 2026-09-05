/**
 * Valuation Tool: Calculates 5-Year Discounted Cash Flow (DCF),
 * Graham Number Intrinsic Value, and Fair Value Price Target.
 */
export function calculateValuation(state) {
    const fin = state.financials || {};
    const stock = state.stockData || {};
    const profile = state.companyProfile || {};

    const currentPrice = Number(stock.currentPrice || 0);
    const marketCap = Number(fin.marketCap || profile.marketCap || 0);
    const totalCash = Number(fin.totalCash || 0);
    const totalDebt = Number(fin.totalDebt || 0);
    const netIncome = Number(fin.netIncome || 0);
    const freeCashFlow = Number(fin.freeCashFlow || (netIncome * 0.85) || 0);
    const peRatio = Number(fin.peRatio || 0);
    const eps = Number(fin.eps || (currentPrice > 0 && peRatio > 0 ? currentPrice / peRatio : 0));
    const revenueGrowth = Number(fin.revenueGrowth || 0.08); // default 8%

    // Calculate approximate shares outstanding
    let sharesOutstanding = 0;
    if (currentPrice > 0 && marketCap > 0) {
        sharesOutstanding = marketCap / currentPrice;
    } else if (eps > 0 && netIncome > 0) {
        sharesOutstanding = netIncome / eps;
    }

    // Baseline DCF Assumptions
    const baseGrowthRate = Math.min(0.25, Math.max(0.04, Math.abs(revenueGrowth) > 1 ? revenueGrowth / 100 : revenueGrowth || 0.10));
    const discountRate = 0.095; // 9.5% WACC
    const terminalGrowthRate = 0.025; // 2.5% perpetual rate

    // 5-Year Projected Cash Flows
    const projectedFCF = [];
    let currentFCF = freeCashFlow > 0 ? freeCashFlow : (netIncome > 0 ? netIncome * 0.8 : (marketCap * 0.04));
    let presentValueOfCashFlows = 0;

    for (let year = 1; year <= 5; year++) {
        // Linear fade of growth rate toward mature rate
        const yearGrowth = baseGrowthRate * Math.pow(0.92, year - 1);
        currentFCF = currentFCF * (1 + yearGrowth);
        const pv = currentFCF / Math.pow(1 + discountRate, year);
        presentValueOfCashFlows += pv;
        projectedFCF.push({
            year,
            projectedAmount: Math.round(currentFCF),
            presentValue: Math.round(pv),
            growthRate: Number((yearGrowth * 100).toFixed(1))
        });
    }

    // Terminal Value
    const terminalFCF = currentFCF * (1 + terminalGrowthRate);
    const terminalValue = terminalFCF / (discountRate - terminalGrowthRate);
    const pvTerminalValue = terminalValue / Math.pow(1 + discountRate, 5);

    // Enterprise Value & Equity Value
    const enterpriseValue = presentValueOfCashFlows + pvTerminalValue;
    const equityValue = enterpriseValue + totalCash - totalDebt;

    // Fair Value per Share
    let dcfFairValue = currentPrice;
    if (sharesOutstanding > 0 && equityValue > 0) {
        dcfFairValue = equityValue / sharesOutstanding;
    } else if (peRatio > 0 && eps > 0) {
        dcfFairValue = eps * Math.min(25, Math.max(12, peRatio * 0.95));
    }

    // Graham Valuation (if EPS > 0 and book value approximated)
    let grahamValue = null;
    if (eps > 0) {
        const estBookValuePerShare = currentPrice / 3.5;
        grahamValue = Math.sqrt(22.5 * eps * estBookValuePerShare);
    }

    // Composite Fair Value (Blend DCF and Multiple-based target)
    let fairValuePriceTarget = dcfFairValue;
    if (currentPrice > 0) {
        // Clamp outliers within 40% to 220% of current price for realistic bounds
        fairValuePriceTarget = Math.max(currentPrice * 0.45, Math.min(currentPrice * 2.2, dcfFairValue));
    }

    const upsidePotential = currentPrice > 0 
        ? Number((((fairValuePriceTarget - currentPrice) / currentPrice) * 100).toFixed(1))
        : 0;

    let valuationRating = "FAIRLY VALUED";
    if (upsidePotential > 15) valuationRating = "UNDERVALUED";
    else if (upsidePotential < -15) valuationRating = "OVERVALUED";

    // Sensitivity Matrix: Discount Rate (8%, 9.5%, 11%) vs Growth Rate (-2%, Base, +2%)
    const sensitivity = [];
    const discountSteps = [0.08, 0.095, 0.11];
    const growthDeltas = [-0.02, 0, 0.02];

    for (const d of discountSteps) {
        const row = { discountRate: Number((d * 100).toFixed(1)), values: [] };
        for (const gDelta of growthDeltas) {
            const adjGrowth = Math.max(0.02, baseGrowthRate + gDelta);
            let pvSum = 0;
            let f = freeCashFlow > 0 ? freeCashFlow : (marketCap * 0.04);
            for (let y = 1; y <= 5; y++) {
                f = f * (1 + adjGrowth * Math.pow(0.92, y - 1));
                pvSum += f / Math.pow(1 + d, y);
            }
            const tv = (f * (1 + terminalGrowthRate)) / (d - terminalGrowthRate);
            const pvTv = tv / Math.pow(1 + d, 5);
            const eqVal = pvSum + pvTv + totalCash - totalDebt;
            const target = sharesOutstanding > 0 ? (eqVal / sharesOutstanding) : (currentPrice * (1 + gDelta));
            const clampedTarget = currentPrice > 0 ? Math.max(currentPrice * 0.4, Math.min(currentPrice * 2.3, target)) : target;
            row.values.push({
                growthDelta: gDelta === 0 ? "Base" : `${gDelta > 0 ? "+" : ""}${(gDelta * 100).toFixed(0)}%`,
                fairValue: Number(clampedTarget.toFixed(2))
            });
        }
        sensitivity.push(row);
    }

    return {
        currentPrice: Number(currentPrice.toFixed(2)),
        fairValuePriceTarget: Number(fairValuePriceTarget.toFixed(2)),
        upsidePotential,
        valuationRating,
        assumptions: {
            baseGrowthRate: Number((baseGrowthRate * 100).toFixed(1)),
            discountRate: Number((discountRate * 100).toFixed(1)),
            terminalGrowthRate: Number((terminalGrowthRate * 100).toFixed(1)),
            freeCashFlow: Math.round(freeCashFlow),
            sharesOutstanding: Math.round(sharesOutstanding)
        },
        projectedFCF,
        grahamValue: grahamValue ? Number(grahamValue.toFixed(2)) : null,
        sensitivity
    };
}
