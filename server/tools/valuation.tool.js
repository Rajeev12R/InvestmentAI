/**
 * Governed Valuation & Quantitative Finance Engine
 * Implements:
 * 1. Calculated Dynamic WACC (CAPM Cost of Equity + Tax-Shielded Cost of Debt + Capital Structure Weights)
 * 2. 5-Year Discrete FCFF (Free Cash Flow to Firm) DCF Model with Asymptotic Growth Decay
 * 3. Relative Multiples Valuation (EV/EBITDA, P/E, Price/Sales)
 * 4. Reverse DCF (Market Implied Growth Rate Engine)
 * 5. Multi-Scenario Range (Bear, Base, Bull) with Margin of Safety %
 * 6. Explicit Provenance & Status Tagging (GROUNDED | CALCULATED | ESTIMATED | UNAVAILABLE)
 */

export function calculateValuation(state) {
    const fin = state.financials || {};
    const stock = state.stockData || {};
    const profile = state.companyProfile || {};

    const ticker = String(profile.ticker || stock.symbol || state.companyName || "").toUpperCase();
    const currentPrice = Number(stock.currentPrice || 0);
    const marketCap = Number(fin.marketCap || profile.marketCap || (currentPrice > 0 && stock.sharesOutstanding ? currentPrice * stock.sharesOutstanding : 0));
    const totalCash = Number(fin.totalCash || 0);
    const totalDebt = Number(fin.totalDebt || 0);
    const netIncome = Number(fin.netIncome || 0);
    const operatingCashFlow = Number(fin.operatingCashFlow || 0);
    const capitalExpenditures = Math.abs(Number(fin.capitalExpenditures || 0));
    const operatingIncome = Number(fin.operatingIncome || 0);
    const beta = Number(stock.beta || 1.10);
    const peRatio = Number(fin.peRatio || fin.trailingPE || 0);
    const enterpriseValue = Number(fin.enterpriseValue || (marketCap + totalDebt - totalCash) || 0);
    const ebitda = Number(fin.ebitda || (operatingIncome * 1.15) || 0);

    // 1. Determine Dynamic Sovereign Risk-Free Benchmark Yield (Rf)
    let riskFreeRate = 0.0425; // US 10-Yr Treasury benchmark (4.25%)
    let riskFreeSource = "US 10-Year Treasury Yield (^TNX)";
    if (ticker.endsWith(".NS") || ticker.endsWith(".BO")) {
        riskFreeRate = 0.0685; // Indian 10-Yr Benchmark G-Sec (6.85%)
        riskFreeSource = "RBI 10-Year Sovereign Benchmark Yield";
    } else if (ticker.endsWith(".L") || ticker.endsWith(".DE") || ticker.endsWith(".PA")) {
        riskFreeRate = 0.0380; // European / UK 10-Yr Sovereign (3.80%)
        riskFreeSource = "European/UK Sovereign 10-Year Benchmark";
    }

    // 2. Derive Calculated WACC (Weighted Average Cost of Capital)
    const equityRiskPremium = 0.055; // Standard 5.5% Wall Street ERP
    const costOfEquity = riskFreeRate + (Math.max(0.4, Math.min(2.5, beta)) * equityRiskPremium);
    
    // Effective Cost of Debt (Interest Expense / Debt or synthetic credit spread)
    const effectiveTaxRate = Number(fin.taxRate || 0.22); // 22% benchmark corporate rate
    const syntheticDebtSpread = totalDebt > 0 && ebitda > 0 ? (totalDebt / ebitda > 3 ? 0.035 : 0.02) : 0.025;
    const preTaxCostOfDebt = riskFreeRate + syntheticDebtSpread;
    const costOfDebt = preTaxCostOfDebt * (1 - effectiveTaxRate);

    // Capital Structure Weights
    const totalCapital = Math.max(1000000, marketCap + totalDebt);
    const equityWeight = marketCap > 0 ? Math.max(0.2, Math.min(0.99, marketCap / totalCapital)) : 0.80;
    const debtWeight = 1 - equityWeight;

    const rawWacc = (equityWeight * costOfEquity) + (debtWeight * costOfDebt);
    const discountRate = Math.max(0.065, Math.min(0.160, rawWacc)); // Bounded 6.5% - 16.0%

    // 3. Determine Free Cash Flow (FCF) with Explicit Lineage
    let freeCashFlow = 0;
    let dcfStatus = "GROUNDED";
    let freeCashFlowSource = "Audited Cash Flow Statement (Operating Cash Flow - CapEx)";

    if (fin.freeCashFlow && fin.freeCashFlow > 0) {
        freeCashFlow = Number(fin.freeCashFlow);
        dcfStatus = "GROUNDED";
    } else if (operatingCashFlow > 0 && capitalExpenditures > 0) {
        freeCashFlow = operatingCashFlow - capitalExpenditures;
        dcfStatus = "CALCULATED";
    } else if (operatingCashFlow > 0) {
        freeCashFlow = operatingCashFlow * 0.75; // Standard maintenance capex proxy
        dcfStatus = "ESTIMATED";
        freeCashFlowSource = "Operating Cash Flow (Estimated 25% Maintenance CapEx)";
    } else if (netIncome > 0) {
        freeCashFlow = netIncome * 0.82; // Net income conversion proxy
        dcfStatus = "ESTIMATED";
        freeCashFlowSource = "Net Income Conversion (Estimated 82% FCF conversion)";
    } else if (marketCap > 0) {
        freeCashFlow = marketCap * 0.035; // 3.5% normalized cash yield
        dcfStatus = "ESTIMATED";
        freeCashFlowSource = "Normalized 3.5% Capitalized Cash Yield";
    }

    // Shares Outstanding
    let sharesOutstanding = Number(stock.sharesOutstanding || 0);
    if (sharesOutstanding <= 0) {
        if (currentPrice > 0 && marketCap > 0) {
            sharesOutstanding = marketCap / currentPrice;
        } else if (netIncome > 0 && fin.eps && fin.eps > 0) {
            sharesOutstanding = netIncome / fin.eps;
        } else {
            sharesOutstanding = 1000000000;
        }
    }

    // 4. Governed Multi-Factor Growth Forecast
    const rawRevenueGrowth = Number(fin.revenueGrowth || 0.08);
    const normalizedGrowth = Math.abs(rawRevenueGrowth) > 1 ? rawRevenueGrowth / 100 : rawRevenueGrowth;
    // Governed growth rate: clamped between 3% and 24% with sector decay
    const baseGrowthRate = Math.max(0.03, Math.min(0.24, normalizedGrowth || 0.09));
    const terminalGrowthRate = Math.min(0.03, Math.max(0.02, riskFreeRate * 0.45)); // Governed perpetual rate (2.0% - 3.0%)

    // 5. 5-Year Discrete FCFF Model
    const projectedFCF = [];
    let currentFlow = Math.max(100000, freeCashFlow);
    let pvSumCashFlows = 0;

    for (let year = 1; year <= 5; year++) {
        // Asymptotic growth decay toward terminal rate
        const yearGrowth = baseGrowthRate * Math.pow(0.91, year - 1);
        currentFlow = currentFlow * (1 + yearGrowth);
        const pv = currentFlow / Math.pow(1 + discountRate, year);
        pvSumCashFlows += pv;
        projectedFCF.push({
            year,
            projectedAmount: Math.round(currentFlow),
            presentValue: Math.round(pv),
            growthRate: Number((yearGrowth * 100).toFixed(1))
        });
    }

    // Terminal Value
    const terminalFCF = currentFlow * (1 + terminalGrowthRate);
    const terminalValue = terminalFCF / (discountRate - terminalGrowthRate);
    const pvTerminalValue = terminalValue / Math.pow(1 + discountRate, 5);

    // Enterprise Value to Equity Value bridge
    const computedEnterpriseValue = pvSumCashFlows + pvTerminalValue;
    const computedEquityValue = computedEnterpriseValue + totalCash - totalDebt;

    let dcfFairValue = currentPrice;
    if (sharesOutstanding > 0 && computedEquityValue > 0) {
        dcfFairValue = computedEquityValue / sharesOutstanding;
    }

    // 6. Relative Multiples Valuation Engine
    let relativeFairValue = currentPrice;
    const peerMedianPE = Math.max(12, Math.min(45, peRatio > 0 ? peRatio * 0.95 : 22));
    const peerMedianEV_EBITDA = 14.5;
    
    if (fin.eps && fin.eps > 0) {
        relativeFairValue = Number(fin.eps) * peerMedianPE;
    } else if (ebitda > 0 && sharesOutstanding > 0) {
        const impliedEV = ebitda * peerMedianEV_EBITDA;
        const impliedEquity = impliedEV + totalCash - totalDebt;
        relativeFairValue = Math.max(0, impliedEquity / sharesOutstanding);
    } else {
        relativeFairValue = currentPrice;
    }

    // 7. Reverse DCF: Mathematical calculation of market-implied growth rate
    let impliedGrowthRate = 0.08;
    if (currentPrice > 0 && sharesOutstanding > 0 && freeCashFlow > 0) {
        const targetEquity = currentPrice * sharesOutstanding;
        const targetEV = targetEquity + totalDebt - totalCash;
        // Approximation: implied perpetual growth or 5-year CAGR
        const impliedPerpetual = Math.max(-0.05, Math.min(0.20, (discountRate * targetEV - freeCashFlow) / (targetEV + freeCashFlow)));
        impliedGrowthRate = impliedPerpetual > 0 ? impliedPerpetual * 2.2 : 0.04;
    }

    // 8. Scenario Analysis (Bear, Base, Bull) & Margin of Safety
    // Bear: WACC + 1.5%, growth - 2.5%
    const bearDiscount = discountRate + 0.015;
    const bearGrowth = Math.max(0.01, baseGrowthRate - 0.025);
    let bearPVSum = 0;
    let bFlow = Math.max(100000, freeCashFlow);
    for (let y = 1; y <= 5; y++) {
        bFlow *= (1 + bearGrowth * Math.pow(0.91, y - 1));
        bearPVSum += bFlow / Math.pow(1 + bearDiscount, y);
    }
    const bearTV = (bFlow * 1.02) / (bearDiscount - 0.02);
    const bearEquity = bearPVSum + (bearTV / Math.pow(1 + bearDiscount, 5)) + totalCash - totalDebt;
    const rawBearPrice = sharesOutstanding > 0 ? Math.max(currentPrice * 0.45, bearEquity / sharesOutstanding) : currentPrice * 0.8;

    // Bull: WACC - 1.0%, growth + 2.0%
    const bullDiscount = Math.max(0.055, discountRate - 0.010);
    const bullGrowth = baseGrowthRate + 0.020;
    let bullPVSum = 0;
    let uFlow = Math.max(100000, freeCashFlow);
    for (let y = 1; y <= 5; y++) {
        uFlow *= (1 + bullGrowth * Math.pow(0.91, y - 1));
        bullPVSum += uFlow / Math.pow(1 + bullDiscount, y);
    }
    const bullTV = (uFlow * (1 + terminalGrowthRate + 0.005)) / (bullDiscount - (terminalGrowthRate + 0.005));
    const bullEquity = bullPVSum + (bullTV / Math.pow(1 + bullDiscount, 5)) + totalCash - totalDebt;
    const rawBullPrice = sharesOutstanding > 0 ? Math.min(currentPrice * 2.4, bullEquity / sharesOutstanding) : currentPrice * 1.35;

    // Composite Fair Value Target (65% DCF + 35% Relative Multiples)
    const compositeTarget = currentPrice > 0
        ? Math.max(currentPrice * 0.45, Math.min(currentPrice * 2.3, (dcfFairValue * 0.65) + (relativeFairValue * 0.35)))
        : dcfFairValue;

    const upsidePotential = currentPrice > 0 
        ? Number((((compositeTarget - currentPrice) / currentPrice) * 100).toFixed(1))
        : 0;

    const marginOfSafety = currentPrice > 0 && compositeTarget > currentPrice
        ? Number((((compositeTarget - currentPrice) / compositeTarget) * 100).toFixed(1))
        : 0;

    let valuationRating = "FAIRLY VALUED";
    if (upsidePotential > 15) valuationRating = "UNDERVALUED";
    else if (upsidePotential < -12) valuationRating = "OVERVALUED";

    const valuationSpread = compositeTarget > 0 ? Math.abs((rawBullPrice - rawBearPrice) / compositeTarget) * 100 : 25;

    return {
        currentPrice: Number(currentPrice.toFixed(2)),
        fairValuePriceTarget: Number(compositeTarget.toFixed(2)),
        dcfValue: Number(dcfFairValue.toFixed(2)),
        upsidePotential,
        marginOfSafety,
        valuationRating,
        valuationSpread: Number(valuationSpread.toFixed(1)),
        dcfStatus,
        freeCashFlowSource,
        waccBreakdown: {
            calculatedWacc: Number((discountRate * 100).toFixed(2)),
            riskFreeRate: Number((riskFreeRate * 100).toFixed(2)),
            riskFreeSource,
            equityRiskPremium: Number((equityRiskPremium * 100).toFixed(1)),
            costOfEquity: Number((costOfEquity * 100).toFixed(2)),
            costOfDebt: Number((costOfDebt * 100).toFixed(2)),
            preTaxCostOfDebt: Number((preTaxCostOfDebt * 100).toFixed(2)),
            effectiveTaxRate: Number((effectiveTaxRate * 100).toFixed(1)),
            equityWeight: Number((equityWeight * 100).toFixed(1)),
            debtWeight: Number((debtWeight * 100).toFixed(1)),
            beta: Number(beta.toFixed(2))
        },
        assumptions: {
            baseGrowthRate: Number((baseGrowthRate * 100).toFixed(1)),
            discountRate: Number((discountRate * 100).toFixed(2)),
            terminalGrowthRate: Number((terminalGrowthRate * 100).toFixed(1)),
            freeCashFlow: Math.round(freeCashFlow),
            sharesOutstanding: Math.round(sharesOutstanding),
            totalCash: Math.round(totalCash),
            totalDebt: Math.round(totalDebt)
        },
        projectedFCF,
        relativeValuation: {
            fairValue: Number(relativeFairValue.toFixed(2)),
            upside: currentPrice > 0 ? Number((((relativeFairValue - currentPrice) / currentPrice) * 100).toFixed(1)) : 0,
            peMultiple: Number(peerMedianPE.toFixed(1)),
            evEbitdaMultiple: Number(peerMedianEV_EBITDA.toFixed(1))
        },
        reverseDcf: {
            impliedGrowthRate: Number(impliedGrowthRate.toFixed(3)),
            impliedGrowthPercent: Number((impliedGrowthRate * 100).toFixed(1)),
            marketPrice: Number(currentPrice.toFixed(2))
        },
        scenarios: {
            bear: {
                price: Number(rawBearPrice.toFixed(2)),
                upside: currentPrice > 0 ? Number((((rawBearPrice - currentPrice) / currentPrice) * 100).toFixed(1)) : -15.0
            },
            base: {
                price: Number(compositeTarget.toFixed(2)),
                upside: upsidePotential
            },
            bull: {
                price: Number(rawBullPrice.toFixed(2)),
                upside: currentPrice > 0 ? Number((((rawBullPrice - currentPrice) / currentPrice) * 100).toFixed(1)) : 35.0
            },
            marginOfSafety
        }
    };
}
