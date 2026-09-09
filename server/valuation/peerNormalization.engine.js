/**
 * Peer Normalization & Outlier Filtering Engine
 * Phase 2B Institutional Relative Valuation Layer
 */

import { VALUATION_STATUS } from "./valuation.types.js";

/**
 * Computes deterministic distribution statistics (Min, P25, Median, P75, Max, Mean, StdDev)
 * @param {Array<number>} values - Array of clean numerical values
 * @returns {Object|null}
 */
export function calculateDistribution(values = []) {
    const valid = values.filter(v => v !== null && v !== undefined && typeof v === "number" && !isNaN(v));
    if (valid.length === 0) return null;

    valid.sort((a, b) => a - b);
    const n = valid.length;

    const min = valid[0];
    const max = valid[n - 1];
    const mean = valid.reduce((sum, v) => sum + v, 0) / n;

    // Variance and Standard Deviation
    const variance = n > 1
        ? valid.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1)
        : 0;
    const stdDev = Math.sqrt(variance);

    // Percentiles using linear interpolation
    const getPercentile = (p) => {
        if (n === 1) return valid[0];
        const index = p * (n - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const weight = index - lower;
        return Number((valid[lower] * (1 - weight) + valid[upper] * weight).toFixed(4));
    };

    const p25 = getPercentile(0.25);
    const median = getPercentile(0.50);
    const p75 = getPercentile(0.75);

    return {
        count: n,
        min: Number(min.toFixed(4)),
        p25,
        median,
        p75,
        max: Number(max.toFixed(4)),
        mean: Number(mean.toFixed(4)),
        stdDev: Number(stdDev.toFixed(4)),
        rawValues: valid
    };
}

/**
 * Validates and filters outliers for a specific financial metric with explicit reasons
 * @param {string} metricKey - Multiple/Ratio key (pe, evEbitda, pb, evRevenue, roe, etc.)
 * @param {number|null} value - Raw peer value
 * @returns {{ isValid: boolean, reason?: string }}
 */
export function filterMetricOutlier(metricKey, value) {
    if (value === null || value === undefined || typeof value !== "number" || isNaN(value)) {
        return { isValid: false, reason: "Metric value is missing (UNAVAILABLE)." };
    }

    switch (metricKey) {
        case "pe":
            if (value <= 0) return { isValid: false, reason: `Excluded: non-positive earnings (P/E = ${value}).` };
            if (value > 200) return { isValid: false, reason: `Excluded: extreme P/E multiple distortion (> 200x, value = ${value}).` };
            return { isValid: true };

        case "evEbitda":
            if (value <= 0) return { isValid: false, reason: `Excluded: non-positive EBITDA (EV/EBITDA = ${value}).` };
            if (value > 150) return { isValid: false, reason: `Excluded: extreme EV/EBITDA multiple distortion (> 150x, value = ${value}).` };
            return { isValid: true };

        case "pb":
            if (value <= 0) return { isValid: false, reason: `Excluded: negative book value (P/B = ${value}).` };
            if (value > 100) return { isValid: false, reason: `Excluded: extreme P/B distortion (> 100x, value = ${value}).` };
            return { isValid: true };

        case "evRevenue":
            if (value <= 0) return { isValid: false, reason: `Excluded: non-positive revenue (EV/Revenue = ${value}).` };
            if (value > 100) return { isValid: false, reason: `Excluded: extreme EV/Revenue distortion (> 100x, value = ${value}).` };
            return { isValid: true };

        case "roe":
        case "roic":
        case "ebitdaMargin":
        case "ebitMargin":
        case "netMargin":
        case "revenueGrowth":
            // Margins and growth can be negative, but filter extreme non-sensical artifacts (> 1000% or < -100%)
            if (value < -2.0 || value > 20.0) {
                return { isValid: false, reason: `Excluded: extreme ratio anomaly outside valid bounds (value = ${(value * 100).toFixed(1)}%).` };
            }
            return { isValid: true };

        default:
            return { isValid: true };
    }
}

/**
 * Normalizes peer metrics, logs outlier decisions, and builds statistical distributions
 * @param {Array<Object>} selectedPeers - Array of validated peer records
 * @returns {Object} Normalized peer dataset with distributions and exclusion audit
 */
export function normalizePeerMetrics(selectedPeers = []) {
    const metricKeys = [
        "pe",
        "evEbitda",
        "pb",
        "evRevenue",
        "revenueGrowth",
        "ebitdaMargin",
        "ebitMargin",
        "netMargin",
        "roe",
        "roic"
    ];

    const normalizedPeers = [];
    const distributions = {};
    const outlierAudit = [];

    // Collect values per metric
    const metricValues = {};
    for (const key of metricKeys) {
        metricValues[key] = [];
    }

    for (const peer of selectedPeers) {
        const normalizedPeer = {
            ticker: peer.ticker,
            name: peer.name,
            sector: peer.sector,
            industry: peer.industry,
            marketCap: peer.marketCap,
            metrics: {}
        };

        for (const key of metricKeys) {
            const rawVal = peer[key] !== undefined ? peer[key] : null;
            const filterResult = filterMetricOutlier(key, rawVal);

            if (filterResult.isValid) {
                normalizedPeer.metrics[key] = {
                    value: rawVal,
                    status: VALUATION_STATUS.GROUNDED,
                    source: peer.provenance?.source || "peerFinancials",
                    timestamp: peer.provenance?.timestamp || new Date().toISOString()
                };
                metricValues[key].push(rawVal);
            } else {
                normalizedPeer.metrics[key] = {
                    value: null,
                    status: VALUATION_STATUS.UNAVAILABLE,
                    reason: filterResult.reason,
                    source: peer.provenance?.source || "peerFinancials",
                    timestamp: peer.provenance?.timestamp || new Date().toISOString()
                };
                if (rawVal !== null && rawVal !== undefined) {
                    outlierAudit.push({
                        ticker: peer.ticker,
                        metric: key,
                        rawValue: rawVal,
                        reason: filterResult.reason
                    });
                }
            }
        }

        normalizedPeers.push(normalizedPeer);
    }

    // Build distributions for each metric
    for (const key of metricKeys) {
        const dist = calculateDistribution(metricValues[key]);
        const metricExclusions = outlierAudit.filter(a => a.metric === key);
        const validCount = metricValues[key].length;
        const rawCount = selectedPeers.length;
        const excludedCount = rawCount - validCount;

        if (dist) {
            distributions[key] = {
                status: VALUATION_STATUS.CALCULATED,
                rawPeerCount: rawCount,
                validPeerCount: validCount,
                excludedPeerCount: excludedCount,
                exclusions: metricExclusions,
                ...dist
            };
        } else {
            distributions[key] = {
                status: VALUATION_STATUS.UNAVAILABLE,
                reason: `Insufficient valid peer data for metric ${key}.`,
                rawPeerCount: rawCount,
                validPeerCount: validCount,
                excludedPeerCount: excludedCount,
                exclusions: metricExclusions,
                count: 0
            };
        }
    }

    return {
        peerCount: selectedPeers.length,
        normalizedPeers,
        distributions,
        outlierAudit,
        provenance: {
            source: "peerNormalization.engine",
            timestamp: new Date().toISOString()
        }
    };
}
