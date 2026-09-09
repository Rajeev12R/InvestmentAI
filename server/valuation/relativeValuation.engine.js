/**
 * Relative Valuation Range Engine
 * Phase 2B Institutional Relative Valuation Layer
 */

import { VALUATION_STATUS } from "./valuation.types.js";
import { VALUATION_METHODS } from "./sector.types.js";

/**
 * Calculates multiple-implied fair values across Bear (P25), Base (Median), and Bull (P75) distributions
 * @param {Object} params - Target company fundamentals, sector framework, and peer distributions
 * @returns {Object} Deterministic relative valuation ranges and method breakdowns
 */
export function calculateRelativeValuationRanges({
    ticker = "",
    eps = null,
    ebitda = null,
    revenue = null,
    bookValuePerShare = null,
    totalDebt = null,
    debt = null,
    totalCash = null,
    cash = null,
    sharesOutstanding = null,
    shares = null,
    framework = null,
    distributions = {}
}) {
    const effDebt = totalDebt !== null ? totalDebt : (debt !== null ? debt : null);
    const effCash = totalCash !== null ? totalCash : (cash !== null ? cash : null);
    const effShares = sharesOutstanding !== null ? sharesOutstanding : (shares !== null ? shares : null);
    const netDebt = (effDebt !== null && effCash !== null) ? (effDebt - effCash) : null;
    const prohibitedMethods = framework?.prohibitedMethods || [];
    const primaryMethods = framework?.primaryMethods || [];
    const secondaryMethods = framework?.secondaryMethods || [];

    const methodResults = {};

    // Helper to calculate 3-point range from multiple distribution
    const calculateImpliedValues = (dist, perShareSolver) => {
        if (!dist || dist.status === VALUATION_STATUS.UNAVAILABLE || dist.count < 1) {
            return {
                status: VALUATION_STATUS.UNAVAILABLE,
                reason: "Insufficient peer multiple distribution data."
            };
        }

        const conservative = perShareSolver(dist.p25);
        const base = perShareSolver(dist.median);
        const optimistic = perShareSolver(dist.p75);

        if (conservative === null || base === null || optimistic === null) {
            return {
                status: VALUATION_STATUS.UNAVAILABLE,
                reason: "Company fundamental inputs missing or invalid for this multiple."
            };
        }

        return {
            status: VALUATION_STATUS.CALCULATED,
            multiples: {
                conservative: dist.p25,
                base: dist.median,
                optimistic: dist.p75
            },
            impliedValues: {
                conservative: Number(conservative.toFixed(2)),
                base: Number(base.toFixed(2)),
                optimistic: Number(optimistic.toFixed(2))
            }
        };
    };

    // 1. P/E Multiple Valuation
    if (prohibitedMethods.includes(VALUATION_METHODS.PE)) {
        methodResults[VALUATION_METHODS.PE] = {
            status: VALUATION_STATUS.NOT_APPROPRIATE,
            reason: "P/E multiple is prohibited by sector valuation framework."
        };
    } else {
        const peDist = distributions.pe;
        if (eps === null || eps === undefined || eps <= 0) {
            methodResults[VALUATION_METHODS.PE] = {
                status: VALUATION_STATUS.UNAVAILABLE,
                reason: eps <= 0 ? "Non-positive EPS: P/E valuation cannot be calculated." : "EPS is unavailable."
            };
        } else {
            const res = calculateImpliedValues(peDist, (mult) => eps * mult);
            methodResults[VALUATION_METHODS.PE] = {
                ...res,
                method: VALUATION_METHODS.PE,
                formula: "Fair Value = Diluted EPS × Peer P/E Multiple",
                inputs: { eps, peerPeDistribution: peDist }
            };
        }
    }

    // 2. EV/EBITDA Multiple Valuation
    if (prohibitedMethods.includes(VALUATION_METHODS.EV_EBITDA)) {
        methodResults[VALUATION_METHODS.EV_EBITDA] = {
            status: VALUATION_STATUS.NOT_APPROPRIATE,
            reason: "EV/EBITDA multiple is prohibited by sector framework (e.g. Banks/Financials)."
        };
    } else {
        const evEbitdaDist = distributions.evEbitda;
        if (ebitda === null || ebitda <= 0 || effShares === null || effShares <= 0 || netDebt === null) {
            const missing = [];
            if (ebitda === null || ebitda <= 0) missing.push("positive EBITDA");
            if (effShares === null || effShares <= 0) missing.push("diluted shares");
            if (netDebt === null) missing.push("net debt (total debt / cash)");
            methodResults[VALUATION_METHODS.EV_EBITDA] = {
                status: VALUATION_STATUS.UNAVAILABLE,
                reason: `Missing required inputs: ${missing.join(", ")}.`
            };
        } else {
            const res = calculateImpliedValues(evEbitdaDist, (mult) => {
                const enterpriseValue = ebitda * mult;
                const equityValue = enterpriseValue - netDebt;
                return equityValue > 0 ? (equityValue / effShares) : null;
            });
            methodResults[VALUATION_METHODS.EV_EBITDA] = {
                ...res,
                method: VALUATION_METHODS.EV_EBITDA,
                formula: "Fair Value = (EBITDA × EV/EBITDA Multiple - Net Debt) / Diluted Shares",
                inputs: { ebitda, netDebt, shares: effShares, peerEvEbitdaDistribution: evEbitdaDist }
            };
        }
    }

    // 3. Price-to-Book (P/B) Multiple Valuation
    if (prohibitedMethods.includes(VALUATION_METHODS.PRICE_TO_BOOK)) {
        methodResults[VALUATION_METHODS.PRICE_TO_BOOK] = {
            status: VALUATION_STATUS.NOT_APPROPRIATE,
            reason: "P/B multiple is prohibited by sector framework."
        };
    } else {
        const pbDist = distributions.pb;
        if (bookValuePerShare === null || bookValuePerShare === undefined || bookValuePerShare <= 0) {
            methodResults[VALUATION_METHODS.PRICE_TO_BOOK] = {
                status: VALUATION_STATUS.UNAVAILABLE,
                reason: bookValuePerShare <= 0 ? "Non-positive Book Value Per Share." : "Book Value Per Share is unavailable."
            };
        } else {
            const res = calculateImpliedValues(pbDist, (mult) => bookValuePerShare * mult);
            methodResults[VALUATION_METHODS.PRICE_TO_BOOK] = {
                ...res,
                method: VALUATION_METHODS.PRICE_TO_BOOK,
                formula: "Fair Value = Book Value Per Share × Peer P/B Multiple",
                inputs: { bookValuePerShare, peerPbDistribution: pbDist }
            };
        }
    }

    // 4. EV/Revenue Multiple Valuation
    if (prohibitedMethods.includes(VALUATION_METHODS.EV_REVENUE)) {
        methodResults[VALUATION_METHODS.EV_REVENUE] = {
            status: VALUATION_STATUS.NOT_APPROPRIATE,
            reason: "EV/Revenue multiple is prohibited by sector framework."
        };
    } else {
        const evRevDist = distributions.evRevenue;
        if (revenue === null || revenue <= 0 || effShares === null || effShares <= 0 || netDebt === null) {
            const missing = [];
            if (revenue === null || revenue <= 0) missing.push("positive revenue");
            if (effShares === null || effShares <= 0) missing.push("diluted shares");
            if (netDebt === null) missing.push("net debt");
            methodResults[VALUATION_METHODS.EV_REVENUE] = {
                status: VALUATION_STATUS.UNAVAILABLE,
                reason: `Missing required inputs: ${missing.join(", ")}.`
            };
        } else {
            const res = calculateImpliedValues(evRevDist, (mult) => {
                const enterpriseValue = revenue * mult;
                const equityValue = enterpriseValue - netDebt;
                return equityValue > 0 ? (equityValue / effShares) : null;
            });
            methodResults[VALUATION_METHODS.EV_REVENUE] = {
                ...res,
                method: VALUATION_METHODS.EV_REVENUE,
                formula: "Fair Value = (Revenue × EV/Revenue Multiple - Net Debt) / Diluted Shares",
                inputs: { revenue, netDebt, shares: effShares, peerEvRevenueDistribution: evRevDist }
            };
        }
    }

    // 5. Synthesize Composite Relative Valuation Range
    // Only synthesize over valid allowed methods specified in framework
    const validMethods = [];
    for (const [methodName, res] of Object.entries(methodResults)) {
        if (res.status === VALUATION_STATUS.CALCULATED && res.impliedValues?.base !== null) {
            validMethods.push(methodName);
        }
    }

    if (validMethods.length === 0) {
        return {
            status: VALUATION_STATUS.UNAVAILABLE,
            reason: "No relative valuation multiples could be calculated with available peer data.",
            methods: methodResults,
            compositeRange: null
        };
    }

    // Determine weights from framework weightings or equal weight among valid methods
    const rawWeights = framework?.weightings || {};
    let totalWeight = 0;
    const normalizedWeights = {};

    for (const m of validMethods) {
        const w = rawWeights[m] || 1.0;
        normalizedWeights[m] = w;
        totalWeight += w;
    }

    for (const m of validMethods) {
        normalizedWeights[m] = normalizedWeights[m] / totalWeight;
    }

    let conservativeSum = 0;
    let baseSum = 0;
    let optimisticSum = 0;

    for (const m of validMethods) {
        const w = normalizedWeights[m];
        const vals = methodResults[m].impliedValues;
        conservativeSum += vals.conservative * w;
        baseSum += vals.base * w;
        optimisticSum += vals.optimistic * w;
    }

    return {
        status: VALUATION_STATUS.CALCULATED,
        methods: methodResults,
        validMethods,
        compositeRange: {
            conservative: Number(conservativeSum.toFixed(2)),
            base: Number(baseSum.toFixed(2)),
            optimistic: Number(optimisticSum.toFixed(2)),
            weightsUsed: normalizedWeights
        },
        provenance: {
            source: "relativeValuation.engine",
            timestamp: new Date().toISOString()
        }
    };
}
