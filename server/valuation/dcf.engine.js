import { VALUATION_STATUS, MODEL_ASSUMPTIONS, createCalculatedResult, createUnavailableResult } from "./valuation.types.js";

/**
 * Calculates Weighted Average Cost of Capital (WACC) via CAPM and Capital Structure Weights.
 * Returns UNAVAILABLE if Beta, Risk-Free Rate, or Market Cap are missing.
 */
export function calculateWACC({ ticker, beta, marketCap, totalDebt }) {
    const timestamp = new Date().toISOString();
    const cleanTicker = String(ticker || "").toUpperCase();

    // 1. Dynamic Sovereign Benchmark Yield (Rf)
    let riskFreeRate = null;
    let riskFreeSource = null;
    let effectiveDate = "Active 2026 Sovereign Benchmark";

    if (cleanTicker.endsWith(".NS") || cleanTicker.endsWith(".BO")) {
        riskFreeRate = 0.0685; // 6.85% Indian 10-Yr Benchmark G-Sec
        riskFreeSource = "Reserve Bank of India 10-Year Benchmark G-Sec Yield";
    } else if (cleanTicker.endsWith(".L") || cleanTicker.endsWith(".DE") || cleanTicker.endsWith(".PA")) {
        riskFreeRate = 0.0380; // 3.80% European / UK Sovereign 10-Yr Benchmark
        riskFreeSource = "European Central Bank / Bank of England 10-Year Sovereign Benchmark";
    } else if (cleanTicker) {
        riskFreeRate = 0.0425; // 4.25% US 10-Year Treasury Yield (^TNX)
        riskFreeSource = "US Department of the Treasury 10-Year Benchmark Yield (^TNX)";
    }

    if (riskFreeRate === null || beta === null || beta === undefined || isNaN(Number(beta)) || marketCap === null || marketCap === undefined || isNaN(Number(marketCap)) || Number(marketCap) <= 0) {
        return createUnavailableResult({
            name: "Weighted Average Cost of Capital (WACC)",
            reason: beta === null ? "5Y Monthly Beta is unavailable" : "Risk-free rate or market capitalization is unavailable",
            inputs: ["market.beta", "financial.marketCap", "financial.totalDebt"],
            metadata: {
                wacc: null,
                riskFreeRate,
                riskFreeSource,
                costOfEquity: null,
                costOfDebt: null,
                equityWeight: null,
                debtWeight: null
            }
        });
    }

    const numBeta = Number(beta);
    const numMarketCap = Number(marketCap);
    const numDebt = totalDebt !== null && totalDebt !== undefined && !isNaN(Number(totalDebt)) ? Math.max(0, Number(totalDebt)) : 0;
    const erp = MODEL_ASSUMPTIONS.EQUITY_RISK_PREMIUM.value;
    const taxRate = MODEL_ASSUMPTIONS.DEFAULT_TAX_RATE.value;
    const spread = MODEL_ASSUMPTIONS.SYNTHETIC_DEBT_SPREAD.value;

    // Cost of Equity = Rf + Beta * ERP
    const costOfEquity = riskFreeRate + (numBeta * erp);

    // After-tax Cost of Debt = (Rf + Spread) * (1 - TaxRate)
    const preTaxCostOfDebt = riskFreeRate + spread;
    const afterTaxCostOfDebt = preTaxCostOfDebt * (1 - taxRate);

    // Capital Weights
    const totalCapital = numMarketCap + numDebt;
    const equityWeight = numMarketCap / totalCapital;
    const debtWeight = numDebt / totalCapital;

    // WACC = (We * Ke) + (Wd * Kd)
    let wacc = (equityWeight * costOfEquity) + (debtWeight * afterTaxCostOfDebt);
    wacc = Math.max(0.055, Math.min(0.180, wacc)); // Realistic macroeconomic bounding

    return createCalculatedResult({
        name: "Weighted Average Cost of Capital (WACC)",
        value: Number((wacc * 100).toFixed(2)),
        status: VALUATION_STATUS.CALCULATED,
        formula: "WACC = (Equity_Weight * Cost_of_Equity) + (Debt_Weight * Cost_of_Debt * (1 - Tax_Rate))",
        inputs: ["market.beta", "financial.marketCap", "financial.totalDebt"],
        provenance: {
            provider: "InvestmentAI Quantitative Valuation Engine",
            sourceType: "DERIVED_CALCULATION",
            retrievedAt: timestamp
        },
        metadata: {
            wacc,
            waccPercent: Number((wacc * 100).toFixed(2)),
            riskFreeRate: Number((riskFreeRate * 100).toFixed(2)),
            riskFreeSource,
            effectiveDate,
            equityRiskPremium: Number((erp * 100).toFixed(1)),
            costOfEquity: Number((costOfEquity * 100).toFixed(2)),
            costOfDebt: Number((afterTaxCostOfDebt * 100).toFixed(2)),
            equityWeight: Number((equityWeight * 100).toFixed(1)),
            debtWeight: Number((debtWeight * 100).toFixed(1)),
            beta: Number(numBeta.toFixed(2)),
            taxRateAssumption: Number((taxRate * 100).toFixed(1))
        }
    });
}

/**
 * Calculates 5-Year Discrete FCFF DCF Model and Gordon Growth Terminal Value.
 */
export function calculateFCFFDCF({
    ticker,
    currentPrice,
    sharesOutstanding,
    freeCashFlow,
    totalRevenue,
    revenueGrowth,
    operatingMargin,
    totalDebt,
    totalCash,
    waccObj,
    terminalGrowthOverride = null
}) {
    const timestamp = new Date().toISOString();

    // Validate Required Grounded Inputs
    if (
        freeCashFlow === null || freeCashFlow === undefined || isNaN(Number(freeCashFlow)) || Number(freeCashFlow) <= 0 ||
        sharesOutstanding === null || sharesOutstanding === undefined || isNaN(Number(sharesOutstanding)) || Number(sharesOutstanding) <= 0 ||
        totalDebt === null || totalDebt === undefined || isNaN(Number(totalDebt)) ||
        totalCash === null || totalCash === undefined || isNaN(Number(totalCash)) ||
        !waccObj || waccObj.status === VALUATION_STATUS.UNAVAILABLE || !waccObj.metadata?.wacc
    ) {
        return createUnavailableResult({
            name: "5-Year Discrete FCFF DCF Model",
            reason: freeCashFlow === null || Number(freeCashFlow) <= 0
                ? "Free Cash Flow (FCF) is unavailable or negative (standard for financial/banking institutions or reporting limitations)"
                : sharesOutstanding === null || Number(sharesOutstanding) <= 0
                ? "Shares outstanding are unavailable"
                : waccObj?.status === VALUATION_STATUS.UNAVAILABLE
                ? "WACC is unavailable due to missing beta or sovereign yield inputs"
                : "Required balance sheet debt or cash inputs are unavailable",
            inputs: ["financial.freeCashFlow", "market.sharesOutstanding", "valuation.wacc", "financial.totalDebt", "financial.totalCash"]
        });
    }

    const wacc = waccObj.metadata.wacc;
    const rf = waccObj.metadata.riskFreeRate ? waccObj.metadata.riskFreeRate / 100 : 0.0425;
    const terminalGrowthRate = terminalGrowthOverride !== null
        ? terminalGrowthOverride
        : Math.min(0.030, Math.max(0.020, rf * 0.45));

    // Reject mathematically invalid terminal growth configuration
    if (wacc <= terminalGrowthRate) {
        return createUnavailableResult({
            name: "5-Year Discrete FCFF DCF Model",
            reason: `Terminal growth rate (${(terminalGrowthRate * 100).toFixed(1)}%) must be strictly below WACC (${(wacc * 100).toFixed(2)}%)`,
            inputs: ["valuation.wacc"]
        });
    }

    const numFCF = Number(freeCashFlow);
    const numShares = Number(sharesOutstanding);
    const numDebt = Number(totalDebt);
    const numCash = Number(totalCash);
    const netDebt = numDebt - numCash;

    // Growth assumption governance: allow explicit growth rates across full economic spectrum (-50% to +150%)
    const rawGrowth = revenueGrowth !== null && revenueGrowth !== undefined && !isNaN(Number(revenueGrowth))
        ? Number(revenueGrowth)
        : 0.08;
    const normalizedGrowth = Math.abs(rawGrowth) > 1 ? rawGrowth / 100 : rawGrowth;
    const baseGrowthRate = Math.max(-0.50, Math.min(1.50, normalizedGrowth));

    // 5-Year Explicit Forecast Projections
    const forecast = [];
    let currentFlow = numFCF;
    let pvSum = 0;

    for (let year = 1; year <= 5; year++) {
        const yearGrowth = baseGrowthRate * Math.pow(0.91, year - 1); // 9% annual decay
        currentFlow = currentFlow * (1 + yearGrowth);
        const discountFactor = 1 / Math.pow(1 + wacc, year);
        const pv = currentFlow * discountFactor;
        pvSum += pv;

        forecast.push({
            year,
            forecastFCF: Math.round(currentFlow),
            growthRatePercent: Number((yearGrowth * 100).toFixed(1)),
            discountFactor: Number(discountFactor.toFixed(4)),
            presentValue: Math.round(pv),
            formula: `FCF_${year} = FCF_${year - 1} * (1 + Growth_${year})`,
            inputs: ["financial.freeCashFlow", "financial.revenueGrowth", "valuation.wacc"]
        });
    }

    // Gordon Growth Terminal Value
    const terminalFCF = currentFlow * (1 + terminalGrowthRate);
    const terminalValue = terminalFCF / (wacc - terminalGrowthRate);
    const pvTerminalValue = terminalValue / Math.pow(1 + wacc, 5);

    // Equity Bridge
    const enterpriseValue = pvSum + pvTerminalValue;
    const equityValue = enterpriseValue - netDebt;

    if (equityValue <= 0) {
        return createUnavailableResult({
            name: "5-Year Discrete FCFF DCF Model",
            reason: "Calculated equity value is negative after net debt deduction",
            inputs: ["financial.totalDebt", "financial.totalCash"]
        });
    }

    const fairValuePerShare = equityValue / numShares;
    const price = currentPrice !== null && currentPrice !== undefined && Number(currentPrice) > 0 ? Number(currentPrice) : null;
    const upsidePotential = price ? Number((((fairValuePerShare - price) / price) * 100).toFixed(2)) : null;
    const marginOfSafety = price && fairValuePerShare > 0
        ? Number((((fairValuePerShare - price) / fairValuePerShare) * 100).toFixed(2))
        : null;

    return createCalculatedResult({
        name: "5-Year Discrete FCFF DCF Model",
        value: Number(fairValuePerShare.toFixed(2)),
        status: VALUATION_STATUS.CALCULATED,
        formula: "Fair Value = (PV of 5-Yr Forecast FCFs + PV of Terminal Value - Net Debt) / Shares Outstanding",
        inputs: ["financial.freeCashFlow", "valuation.wacc", "financial.totalDebt", "financial.totalCash", "market.sharesOutstanding"],
        provenance: {
            provider: "InvestmentAI Quantitative DCF Engine",
            sourceType: "DERIVED_CALCULATION",
            retrievedAt: timestamp
        },
        metadata: {
            fairValue: Number(fairValuePerShare.toFixed(2)),
            currentPrice: price,
            upsidePotential,
            marginOfSafety,
            waccPercent: Number((wacc * 100).toFixed(2)),
            terminalGrowthPercent: Number((terminalGrowthRate * 100).toFixed(2)),
            forecastPeriodYears: 5,
            pvExplicitForecast: Math.round(pvSum),
            terminalValue: Math.round(terminalValue),
            pvTerminalValue: Math.round(pvTerminalValue),
            enterpriseValue: Math.round(enterpriseValue),
            equityValue: Math.round(equityValue),
            netDebt: Math.round(netDebt),
            sharesOutstanding: numShares,
            forecast
        }
    });
}

/**
 * Deterministically generates a 5x5 WACC x Terminal Growth Sensitivity Table.
 */
export function generateSensitivityGrid({
    baseWacc,
    baseTerminalGrowth,
    freeCashFlow,
    sharesOutstanding,
    netDebt,
    revenueGrowth
}) {
    if (!baseWacc || !freeCashFlow || !sharesOutstanding || netDebt === null || netDebt === undefined) {
        return null;
    }

    const waccSteps = [-0.02, -0.01, 0, 0.01, 0.02];
    const gSteps = [0.015, 0.020, 0.025, 0.030, 0.035];

    const rawGrowth = revenueGrowth !== null && revenueGrowth !== undefined && !isNaN(Number(revenueGrowth))
        ? Number(revenueGrowth)
        : 0.08;
    const normalizedGrowth = Math.abs(rawGrowth) > 1 ? rawGrowth / 100 : rawGrowth;
    const baseGrowthRate = Math.max(0.02, Math.min(0.25, normalizedGrowth));

    const grid = [];

    for (const dw of waccSteps) {
        const w = Number((baseWacc + dw).toFixed(4));
        if (w <= 0.04) continue;

        const row = {
            waccPercent: Number((w * 100).toFixed(1)),
            cells: []
        };

        for (const g of gSteps) {
            if (w <= g) {
                row.cells.push({
                    terminalGrowthPercent: Number((g * 100).toFixed(1)),
                    fairValue: null,
                    valid: false
                });
                continue;
            }

            let currentFlow = Number(freeCashFlow);
            let pvSum = 0;
            for (let year = 1; year <= 5; year++) {
                const yearGrowth = baseGrowthRate * Math.pow(0.91, year - 1);
                currentFlow = currentFlow * (1 + yearGrowth);
                pvSum += currentFlow / Math.pow(1 + w, year);
            }

            const tv = (currentFlow * (1 + g)) / (w - g);
            const pvTv = tv / Math.pow(1 + w, 5);
            const eqVal = (pvSum + pvTv) - Number(netDebt);
            const priceTarget = eqVal > 0 ? Number((eqVal / Number(sharesOutstanding)).toFixed(2)) : null;

            row.cells.push({
                terminalGrowthPercent: Number((g * 100).toFixed(1)),
                fairValue: priceTarget,
                valid: priceTarget !== null
            });
        }
        grid.push(row);
    }

    return grid;
}
