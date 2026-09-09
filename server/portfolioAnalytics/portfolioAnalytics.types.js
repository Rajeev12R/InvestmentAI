/**
 * Portfolio Analytics & Attribution Types — Phase 12
 * Strictly deterministic institutional analytics enums, interfaces, and validation schemas.
 */

export const PerformanceInterval = Object.freeze({
    DAILY: 'DAILY',
    WEEKLY: 'WEEKLY',
    MONTHLY: 'MONTHLY',
    QUARTERLY: 'QUARTERLY',
    YTD: 'YTD',
    ONE_YEAR: 'ONE_YEAR',
    SINCE_INCEPTION: 'SINCE_INCEPTION'
});

export const ReturnMetricType = Object.freeze({
    TIME_WEIGHTED_RETURN: 'TIME_WEIGHTED_RETURN',
    MONEY_WEIGHTED_RETURN: 'MONEY_WEIGHTED_RETURN', // IRR
    ABSOLUTE_RETURN: 'ABSOLUTE_RETURN',
    CUMULATIVE_RETURN: 'CUMULATIVE_RETURN',
    ANNUALIZED_RETURN: 'ANNUALIZED_RETURN'
});

export const CashFlowType = Object.freeze({
    DEPOSIT: 'DEPOSIT',
    WITHDRAWAL: 'WITHDRAWAL',
    DIVIDEND: 'DIVIDEND',
    INTEREST: 'INTEREST',
    FEE: 'FEE',
    TAX: 'TAX',
    CORPORATE_ACTION: 'CORPORATE_ACTION'
});

export const DrawdownEvent = Object.freeze({
    NEW_DRAWDOWN: 'NEW_DRAWDOWN',
    DEEPENING_DRAWDOWN: 'DEEPENING_DRAWDOWN',
    RECOVERY: 'RECOVERY',
    NEW_HIGH: 'NEW_HIGH'
});

export const ThesisStatus = Object.freeze({
    WORKING: 'WORKING',
    MIXED: 'MIXED',
    WEAKENING: 'WEAKENING',
    BROKEN: 'BROKEN',
    INSUFFICIENT_DATA: 'INSUFFICIENT_DATA'
});

export const DriverAssessment = Object.freeze({
    SUPPORTED: 'SUPPORTED',
    PARTIALLY_SUPPORTED: 'PARTIALLY_SUPPORTED',
    NOT_SUPPORTED: 'NOT_SUPPORTED',
    INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE'
});

export const DriftType = Object.freeze({
    TARGET_WEIGHT_DRIFT: 'TARGET_WEIGHT_DRIFT',
    SECTOR_DRIFT: 'SECTOR_DRIFT',
    GEOGRAPHIC_DRIFT: 'GEOGRAPHIC_DRIFT',
    BENCHMARK_DRIFT: 'BENCHMARK_DRIFT',
    RISK_BUDGET_DRIFT: 'RISK_BUDGET_DRIFT',
    CONCENTRATION_DRIFT: 'CONCENTRATION_DRIFT'
});

export const AttributionEffect = Object.freeze({
    ALLOCATION_EFFECT: 'ALLOCATION_EFFECT',
    SELECTION_EFFECT: 'SELECTION_EFFECT',
    INTERACTION_EFFECT: 'INTERACTION_EFFECT',
    TOTAL_ACTIVE_RETURN: 'TOTAL_ACTIVE_RETURN'
});

export const AnalyticsStatus = Object.freeze({
    PASS: 'PASS',
    WARNING: 'WARNING',
    CONFLICT: 'CONFLICT',
    UNAVAILABLE: 'UNAVAILABLE',
    UNKNOWN: 'UNKNOWN'
});

export const BenchmarkSymbol = Object.freeze({
    SP500: '^GSPC',
    NASDAQ100: '^NDX',
    NIFTY50: '^NSEI',
    CUSTOM: 'CUSTOM'
});

/**
 * Validates a cash flow item according to strict Phase 12 schema
 */
export function validateCashFlow(cf) {
    if (!cf || typeof cf !== 'object') {
        throw new Error('INVALID_CASH_FLOW: Must be an object');
    }
    if (!cf.id || typeof cf.id !== 'string') {
        throw new Error('INVALID_CASH_FLOW: Missing or invalid cash flow id');
    }
    if (!cf.portfolioId || typeof cf.portfolioId !== 'string') {
        throw new Error('INVALID_CASH_FLOW: Missing or invalid portfolioId');
    }
    if (!cf.timestamp || isNaN(new Date(cf.timestamp).getTime())) {
        throw new Error('INVALID_CASH_FLOW: Missing or invalid timestamp');
    }
    if (typeof cf.amount !== 'number' || isNaN(cf.amount) || !isFinite(cf.amount)) {
        throw new Error('INVALID_CASH_FLOW: Missing or non-numeric amount');
    }
    if (!cf.currency || typeof cf.currency !== 'string') {
        throw new Error('INVALID_CASH_FLOW: Missing currency');
    }
    if (!cf.type || !Object.values(CashFlowType).includes(cf.type)) {
        throw new Error(`INVALID_CASH_FLOW: Unknown cash flow type: ${cf.type}`);
    }
    if (!cf.provenance || typeof cf.provenance !== 'object') {
        throw new Error('INVALID_CASH_FLOW: Missing provenance record');
    }
    return true;
}

/**
 * Deep freeze helper for strict immutability of sealed analytics packages
 */
export function deepFreeze(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    Object.freeze(obj);
    for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'object' && obj[key] !== null && !Object.isFrozen(obj[key])) {
            deepFreeze(obj[key]);
        }
    }
    return obj;
}
