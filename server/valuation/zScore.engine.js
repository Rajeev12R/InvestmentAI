/**
 * Statistical Z-Score Benchmarking Engine
 * Phase 2B Institutional Relative Valuation Layer
 */

import { VALUATION_STATUS } from "./valuation.types.js";

/**
 * Normal CDF approximation for percentile calculation from z-score
 * @param {number} z 
 * @returns {number} Percentile in range [0, 1]
 */
function normalCdf(z) {
    if (isNaN(z)) return 0.5;
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    if (z > 0) p = 1 - p;
    return Number(p.toFixed(4));
}

/**
 * Calculates deterministic relative z-score and statistical positioning
 * @param {Object} companyMetrics - Company key ratios/multiples
 * @param {Object} peerDistributions - Metric distributions from normalizePeerMetrics
 * @returns {Object} Metric z-scores, rank percentiles, and statistical interpretations
 */
export function calculateZScores(companyMetrics = {}, peerDistributions = {}) {
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

    const zScores = {};

    for (const key of metricKeys) {
        const companyVal = companyMetrics[key];
        const dist = peerDistributions[key];

        // 1. Check data availability
        if (
            companyVal === null ||
            companyVal === undefined ||
            typeof companyVal !== "number" ||
            isNaN(companyVal) ||
            !dist ||
            dist.status === VALUATION_STATUS.UNAVAILABLE ||
            dist.count < 2
        ) {
            zScores[key] = {
                status: VALUATION_STATUS.UNAVAILABLE,
                companyValue: companyVal ?? null,
                peerMean: dist?.mean ?? null,
                peerMedian: dist?.median ?? null,
                peerStdDev: dist?.stdDev ?? null,
                zScore: null,
                percentile: null,
                reason: companyVal === null || companyVal === undefined
                    ? "Company metric is unavailable."
                    : (dist?.count < 2 ? "Insufficient peer count (< 2 peers) for statistical z-score." : "Peer distribution unavailable.")
            };
            continue;
        }

        const mean = dist.mean;
        const stdDev = dist.stdDev;

        // 2. Safe calculation with zero-variance protection
        let z = 0;
        if (stdDev > 1e-6) {
            z = (companyVal - mean) / stdDev;
        }

        z = Number(z.toFixed(4));
        const percentile = normalCdf(z);

        // 3. Direction-aware institutional interpretation
        let interpretation = "";
        const isMultiple = ["pe", "evEbitda", "pb", "evRevenue"].includes(key);

        if (isMultiple) {
            if (z < -1.0) {
                interpretation = `Trading at significant multiple discount (${z}σ below peer mean).`;
            } else if (z < -0.25) {
                interpretation = `Trading at modest multiple discount (${z}σ below peer mean).`;
            } else if (z <= 0.25) {
                interpretation = `Trading in line with peer group multiples (${z}σ).`;
            } else if (z <= 1.0) {
                interpretation = `Trading at modest multiple premium (+${z}σ above peer mean).`;
            } else {
                interpretation = `Trading at significant multiple premium (+${z}σ above peer mean).`;
            }
        } else {
            // Growth and Margins
            if (z > 1.0) {
                interpretation = `Significant outperformance (+${z}σ above peer average).`;
            } else if (z > 0.25) {
                interpretation = `Modest outperformance (+${z}σ above peer average).`;
            } else if (z >= -0.25) {
                interpretation = `Performing in line with peer group average (${z}σ).`;
            } else if (z >= -1.0) {
                interpretation = `Modest underperformance (${z}σ below peer average).`;
            } else {
                interpretation = `Significant underperformance (${z}σ below peer average).`;
            }
        }

        zScores[key] = {
            status: VALUATION_STATUS.CALCULATED,
            companyValue: companyVal,
            peerMean: mean,
            peerMedian: dist.median,
            peerStdDev: stdDev,
            zScore: z,
            percentile,
            formula: "z = (companyMetric - peerMean) / peerStdDev",
            interpretation
        };
    }

    return zScores;
}
