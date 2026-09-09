import { VALUATION_STATUS, createCalculatedResult, createUnavailableResult } from "./valuation.types.js";
import { calculateFCFFDCF } from "./dcf.engine.js";

/**
 * Multi-Scenario Valuation Engine.
 * Evaluates Bear, Base, and Bull intrinsic values by executing discrete DCF models across modified operational inputs.
 * Strictly avoids arbitrary synthetic price multipliers (e.g. price * 0.85).
 */
export function calculateScenarioValuation({
    ticker,
    currentPrice,
    sharesOutstanding,
    freeCashFlow,
    totalRevenue,
    revenueGrowth,
    operatingMargin,
    totalDebt,
    totalCash,
    waccObj
}) {
    const timestamp = new Date().toISOString();

    // If base DCF inputs are unavailable, scenarios cannot be fabricated
    if (!waccObj || waccObj.status === VALUATION_STATUS.UNAVAILABLE || !freeCashFlow || !sharesOutstanding || totalDebt === null || totalCash === null) {
        return createUnavailableResult({
            name: "Multi-Scenario Fundamental Valuation",
            reason: "Underlying DCF inputs unavailable for scenario modeling",
            inputs: ["valuation.dcf"]
        });
    }

    const price = currentPrice !== null && currentPrice !== undefined && Number(currentPrice) > 0 ? Number(currentPrice) : null;
    const baseWacc = waccObj.metadata.wacc;
    const rawGrowth = revenueGrowth !== null && revenueGrowth !== undefined && !isNaN(Number(revenueGrowth)) ? Number(revenueGrowth) : 0.08;
    const normalizedGrowth = Math.abs(rawGrowth) > 1 ? rawGrowth / 100 : rawGrowth;
    const baseGrowth = Math.max(-0.50, Math.min(1.50, normalizedGrowth));
    const rf = waccObj.metadata.riskFreeRate ? waccObj.metadata.riskFreeRate / 100 : 0.0425;
    const baseTerminalGrowth = Math.min(0.030, Math.max(0.020, rf * 0.45));

    // 1. Base Case Execution
    const baseDCF = calculateFCFFDCF({
        ticker,
        currentPrice,
        sharesOutstanding,
        freeCashFlow,
        totalRevenue,
        revenueGrowth: baseGrowth,
        operatingMargin,
        totalDebt,
        totalCash,
        waccObj
    });

    if (baseDCF.status === VALUATION_STATUS.UNAVAILABLE || !baseDCF.metadata?.fairValue) {
        return createUnavailableResult({
            name: "Multi-Scenario Fundamental Valuation",
            reason: "Base DCF evaluation failed or produced negative equity value",
            inputs: ["valuation.dcf"]
        });
    }

    // 2. Bear Case Execution (WACC +150 bps, Growth -300 bps, Terminal Growth -50 bps)
    const bearWaccVal = baseWacc + 0.015;
    const bearGrowth = Math.max(0.01, baseGrowth - 0.030);
    const bearTerminalGrowth = Math.max(0.015, baseTerminalGrowth - 0.005);
    const bearWaccObj = {
        ...waccObj,
        metadata: {
            ...waccObj.metadata,
            wacc: bearWaccVal,
            waccPercent: Number((bearWaccVal * 100).toFixed(2))
        }
    };

    const bearDCF = calculateFCFFDCF({
        ticker,
        currentPrice,
        sharesOutstanding,
        freeCashFlow,
        totalRevenue,
        revenueGrowth: bearGrowth,
        operatingMargin,
        totalDebt,
        totalCash,
        waccObj: bearWaccObj,
        terminalGrowthOverride: bearTerminalGrowth
    });

    // 3. Bull Case Execution (WACC -100 bps, Growth +250 bps, Terminal Growth +50 bps)
    const bullWaccVal = Math.max(0.045, baseWacc - 0.010);
    const bullGrowth = Math.min(0.30, baseGrowth + 0.025);
    const bullTerminalGrowth = Math.min(0.035, baseTerminalGrowth + 0.005);
    const bullWaccObj = {
        ...waccObj,
        metadata: {
            ...waccObj.metadata,
            wacc: bullWaccVal,
            waccPercent: Number((bullWaccVal * 100).toFixed(2))
        }
    };

    const bullDCF = calculateFCFFDCF({
        ticker,
        currentPrice,
        sharesOutstanding,
        freeCashFlow,
        totalRevenue,
        revenueGrowth: bullGrowth,
        operatingMargin,
        totalDebt,
        totalCash,
        waccObj: bullWaccObj,
        terminalGrowthOverride: bullTerminalGrowth
    });

    const bearPrice = bearDCF.metadata?.fairValue ?? null;
    const basePrice = baseDCF.metadata?.fairValue ?? null;
    const bullPrice = bullDCF.metadata?.fairValue ?? null;

    const computeUpside = (fv) => (fv !== null && price ? Number((((fv - price) / price) * 100).toFixed(2)) : null);
    const computeMoS = (fv) => (fv !== null && price && fv > 0 ? Number((((fv - price) / fv) * 100).toFixed(2)) : null);

    const scenarios = {
        bear: {
            name: "Bear Case (Macro Stress & Growth Deceleration)",
            fairValue: bearPrice,
            upside: computeUpside(bearPrice),
            upsidePotential: computeUpside(bearPrice),
            marginOfSafety: computeMoS(bearPrice),
            assumptions: {
                waccPercent: Number((bearWaccVal * 100).toFixed(2)),
                initialGrowthPercent: Number((bearGrowth * 100).toFixed(2)),
                terminalGrowthPercent: Number((bearTerminalGrowth * 100).toFixed(2)),
                status: VALUATION_STATUS.ESTIMATED
            }
        },
        base: {
            name: "Base Case (Institutional Baseline DCF)",
            fairValue: basePrice,
            upside: computeUpside(basePrice),
            upsidePotential: computeUpside(basePrice),
            marginOfSafety: computeMoS(basePrice),
            assumptions: {
                waccPercent: Number((baseWacc * 100).toFixed(2)),
                initialGrowthPercent: Number((baseGrowth * 100).toFixed(2)),
                terminalGrowthPercent: Number((baseTerminalGrowth * 100).toFixed(2)),
                status: VALUATION_STATUS.CALCULATED
            }
        },
        bull: {
            name: "Bull Case (Optimal Expansion & Favorable Cost of Capital)",
            fairValue: bullPrice,
            upside: computeUpside(bullPrice),
            upsidePotential: computeUpside(bullPrice),
            marginOfSafety: computeMoS(bullPrice),
            assumptions: {
                waccPercent: Number((bullWaccVal * 100).toFixed(2)),
                initialGrowthPercent: Number((bullGrowth * 100).toFixed(2)),
                terminalGrowthPercent: Number((bullTerminalGrowth * 100).toFixed(2)),
                status: VALUATION_STATUS.ESTIMATED
            }
        }
    };

    return createCalculatedResult({
        name: "Multi-Scenario Fundamental Valuation",
        value: basePrice,
        status: VALUATION_STATUS.CALCULATED,
        formula: "Deterministic 5-Year DCF execution under explicit stress and expansion parameter bounds",
        inputs: ["valuation.dcf", "valuation.wacc"],
        provenance: {
            provider: "InvestmentAI Scenario Valuation Engine",
            sourceType: "DERIVED_CALCULATION",
            retrievedAt: timestamp
        },
        metadata: {
            scenarios,
            marginOfSafety: computeMoS(basePrice),
            valuationSpread: bearPrice && bullPrice ? Number((bullPrice - bearPrice).toFixed(2)) : null
        }
    });
}
