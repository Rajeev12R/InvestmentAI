/**
 * Valuation Model Agreement & Dispersion Engine
 * Phase 2B Institutional Relative Valuation Layer
 */

import { VALUATION_STATUS } from "./valuation.types.js";

export const DISAGREEMENT_STATUS = {
    INSUFFICIENT_MODELS: "INSUFFICIENT_MODELS",
    LOW_DISAGREEMENT: "LOW_DISAGREEMENT",
    MODERATE_DISAGREEMENT: "MODERATE_DISAGREEMENT",
    HIGH_DISAGREEMENT: "HIGH_DISAGREEMENT"
};

/**
 * Evaluates agreement, standard deviation, and coefficient of variation across all valid valuation models
 * @param {Object} models - Valuation models with status and fairValue numbers
 * @returns {Object} Deterministic model agreement statistics
 */
export function calculateModelAgreement(models = {}) {
    const validModels = {};
    const unavailableModels = {};

    for (const [name, model] of Object.entries(models)) {
        if (!model) continue;

        // Model can be an object with status and fairValue/fairValuePerShare, or a numeric value
        let val = null;
        let status = VALUATION_STATUS.UNAVAILABLE;
        let reason = "Model output unavailable.";

        if (typeof model === "number" && !isNaN(model) && model > 0) {
            val = model;
            status = VALUATION_STATUS.CALCULATED;
        } else if (typeof model === "object") {
            status = model.status || VALUATION_STATUS.UNAVAILABLE;
            val = model.fairValue ?? model.fairValuePerShare ?? model.compositeRange?.base ?? null;
            reason = model.reason || model.message || "Model returned unavailable status.";
        }

        if (status === VALUATION_STATUS.CALCULATED && typeof val === "number" && !isNaN(val) && val > 0) {
            validModels[name] = Number(val.toFixed(2));
        } else {
            unavailableModels[name] = {
                status,
                reason
            };
        }
    }

    const values = Object.values(validModels);
    const count = values.length;

    if (count === 0) {
        return {
            status: VALUATION_STATUS.UNAVAILABLE,
            disagreementStatus: DISAGREEMENT_STATUS.INSUFFICIENT_MODELS,
            validModelCount: 0,
            validModels: {},
            unavailableModels,
            mean: null,
            median: null,
            stdDev: null,
            coefficientOfVariation: null,
            min: null,
            max: null,
            reason: "Zero valid valuation models available for cross-model agreement synthesis.",
            provenance: {
                source: "modelAgreement.engine",
                timestamp: new Date().toISOString()
            }
        };
    }

    if (count === 1) {
        const singleVal = values[0];
        return {
            status: VALUATION_STATUS.CALCULATED,
            modelStatus: "SINGLE_MODEL",
            disagreementStatus: DISAGREEMENT_STATUS.INSUFFICIENT_MODELS,
            validModelCount: 1,
            validModels,
            unavailableModels,
            mean: singleVal,
            median: singleVal,
            stdDev: 0,
            coefficientOfVariation: 0,
            min: singleVal,
            max: singleVal,
            note: "Single valid model available; cross-model dispersion requires at least 2 distinct models.",
            provenance: {
                source: "modelAgreement.engine",
                timestamp: new Date().toISOString()
            }
        };
    }

    // Sort for median and min/max
    const sorted = [...values].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[count - 1];
    const mean = values.reduce((sum, v) => sum + v, 0) / count;

    // Median
    let median = 0;
    const mid = Math.floor(count / 2);
    if (count % 2 === 0) {
        median = (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
        median = sorted[mid];
    }

    // Sample Standard Deviation
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (count - 1);
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? (stdDev / mean) : 0;

    let disagreementStatus = DISAGREEMENT_STATUS.LOW_DISAGREEMENT;
    if (cv > 0.30) {
        disagreementStatus = DISAGREEMENT_STATUS.HIGH_DISAGREEMENT;
    } else if (cv > 0.15) {
        disagreementStatus = DISAGREEMENT_STATUS.MODERATE_DISAGREEMENT;
    }

    return {
        status: VALUATION_STATUS.CALCULATED,
        modelStatus: count >= 2 ? "MULTI_MODEL" : (count === 1 ? "SINGLE_MODEL" : "NO_MODELS"),
        disagreementStatus,
        validModelCount: count,
        validModels,
        unavailableModels,
        mean: Number(mean.toFixed(2)),
        median: Number(median.toFixed(2)),
        stdDev: Number(stdDev.toFixed(2)),
        coefficientOfVariation: Number(cv.toFixed(4)),
        min: Number(min.toFixed(2)),
        max: Number(max.toFixed(2)),
        formula: "CV = stdDev / mean; Dispersion = max - min",
        provenance: {
            source: "modelAgreement.engine",
            timestamp: new Date().toISOString()
        }
    };
}
