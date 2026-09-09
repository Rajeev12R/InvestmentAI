/**
 * Valuation Types & Constants
 * Adheres strictly to the Truth Layer Invariants:
 * - No fake default numbers.
 * - Explicit ESTIMATED flags for model assumptions.
 * - UNAVAILABLE for missing critical inputs.
 */

export const VALUATION_STATUS = {
    GROUNDED: "GROUNDED",
    CALCULATED: "CALCULATED",
    ESTIMATED: "ESTIMATED",
    UNAVAILABLE: "UNAVAILABLE",
    NOT_APPROPRIATE: "NOT_APPROPRIATE"
};

export const MODEL_ASSUMPTIONS = {
    EQUITY_RISK_PREMIUM: {
        value: 0.055, // 5.5% Wall Street ERP benchmark
        status: VALUATION_STATUS.ESTIMATED,
        source: "Model Parameter (Standard Equity Risk Premium)",
        assumption: "Long-term institutional equity risk premium benchmark of 5.5%"
    },
    DEFAULT_TAX_RATE: {
        value: 0.22, // 22% statutory corporate tax rate benchmark
        status: VALUATION_STATUS.ESTIMATED,
        source: "Model Parameter (Corporate Statutory Tax Benchmark)",
        assumption: "Normalized corporate effective tax rate benchmark of 22%"
    },
    SYNTHETIC_DEBT_SPREAD: {
        value: 0.025, // 2.5% investment-grade debt spread
        status: VALUATION_STATUS.ESTIMATED,
        source: "Model Parameter (Synthetic Credit Spread)",
        assumption: "Investment-grade corporate debt spread benchmark of 250 bps over sovereign yield"
    }
};

/**
 * Creates a standard calculated valuation result item
 */
export function createCalculatedResult({
    name,
    value,
    status = VALUATION_STATUS.CALCULATED,
    formula,
    inputs = [],
    provenance = null,
    metadata = {}
}) {
    const isValValid = value !== null && value !== undefined && Number.isFinite(Number(value));
    return {
        name,
        value: isValValid ? Number(value) : null,
        status: isValValid ? status : VALUATION_STATUS.UNAVAILABLE,
        formula: formula || null,
        inputs: Array.isArray(inputs) ? inputs : [],
        provenance,
        metadata: { ...metadata },
        ...metadata
    };
}

/**
 * Creates an unavailable valuation result item with explicit reason
 */
export function createUnavailableResult({
    name,
    reason = "Required financial inputs are unavailable",
    inputs = [],
    metadata = {}
}) {
    return {
        name,
        value: null,
        status: VALUATION_STATUS.UNAVAILABLE,
        reason,
        formula: null,
        inputs: Array.isArray(inputs) ? inputs : [],
        metadata: { ...metadata },
        ...metadata
    };
}
