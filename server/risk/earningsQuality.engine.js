/**
 * Earnings Quality & Cash Flow Realization Engine
 * Analyzes relationship between accounting accrual profits and cash flow conversion.
 */

import { RISK_CATEGORIES, SEVERITY_LEVELS, RISK_THRESHOLDS } from "./risk.types.js";
import { VALUATION_STATUS } from "../valuation/valuation.types.js";

/**
 * Evaluates earnings quality, cash conversion, and accrual divergence
 * @param {Object} financials - Grounded financial facts
 * @returns {Object} Structured earnings quality risk profile
 */
export function evaluateEarningsQuality(financials = {}) {
    const timestamp = new Date().toISOString();

    const netIncome = (financials.netIncome !== null && financials.netIncome !== undefined && !isNaN(Number(financials.netIncome)))
        ? Number(financials.netIncome)
        : null;

    const cfoRaw = financials.operatingCashFlow !== undefined ? financials.operatingCashFlow : financials.operatingCashflow;
    const cfo = (cfoRaw !== null && cfoRaw !== undefined && !isNaN(Number(cfoRaw)))
        ? Number(cfoRaw)
        : null;

    const fcf = (financials.freeCashFlow !== null && financials.freeCashFlow !== undefined && !isNaN(Number(financials.freeCashFlow)))
        ? Number(financials.freeCashFlow)
        : null;

    const revenue = (financials.totalRevenue !== null && financials.totalRevenue !== undefined && !isNaN(Number(financials.totalRevenue)))
        ? Number(financials.totalRevenue)
        : null;

    const signals = [];
    const metrics = {};

    // 1. Operating Cash Flow to Net Income (CFO / NI)
    if (cfo !== null && netIncome !== null && netIncome > 0) {
        const cfoToNi = Number((cfo / netIncome).toFixed(2));
        metrics.cfoToNetIncome = {
            value: cfoToNi,
            status: VALUATION_STATUS.CALCULATED,
            formula: "OperatingCashflow / NetIncome",
            inputs: { operatingCashflow: cfo, netIncome },
            timestamp
        };

        let severity = SEVERITY_LEVELS.LOW;
        let direction = "STRONG_CASH_CONVERSION";
        let reason = `Strong Cash Realization: Operating cash flow is ${cfoToNi}x accounting net income.`;

        if (cfoToNi <= RISK_THRESHOLDS.cfoToNetIncome.critical) {
            severity = SEVERITY_LEVELS.CRITICAL;
            direction = "CASH_FLOW_DIVERGENCE";
            reason = `High Cash Flow Divergence: CFO conversion is only ${cfoToNi}x net income (<= ${RISK_THRESHOLDS.cfoToNetIncome.critical}x), indicating high non-cash accruals.`;
        } else if (cfoToNi <= RISK_THRESHOLDS.cfoToNetIncome.high) {
            severity = SEVERITY_LEVELS.HIGH;
            direction = "CASH_FLOW_DIVERGENCE";
            reason = `Moderate Cash Flow Divergence: CFO trails net income (${cfoToNi}x).`;
        } else if (cfoToNi <= RISK_THRESHOLDS.cfoToNetIncome.moderate) {
            severity = SEVERITY_LEVELS.MODERATE;
            direction = "FAIR_CONVERSION";
            reason = `Fair Cash Conversion: CFO is roughly in line with net income (${cfoToNi}x).`;
        }

        signals.push({
            category: RISK_CATEGORIES.EARNINGS_QUALITY_RISK,
            metric: "cfoToNetIncome",
            value: cfoToNi,
            status: VALUATION_STATUS.CALCULATED,
            severity,
            direction,
            formula: "OperatingCashflow / NetIncome",
            reason,
            provenance: { source: "financials.operatingCashflow & financials.netIncome", timestamp }
        });
    } else {
        metrics.cfoToNetIncome = {
            value: null,
            status: VALUATION_STATUS.UNAVAILABLE,
            reason: netIncome !== null && netIncome <= 0 ? "Net Income is non-positive." : "CFO or Net Income data unavailable.",
            timestamp
        };
    }

    // 2. Free Cash Flow to Net Income
    if (fcf !== null && netIncome !== null && netIncome > 0) {
        const fcfToNi = Number((fcf / netIncome).toFixed(2));
        metrics.fcfToNetIncome = {
            value: fcfToNi,
            status: VALUATION_STATUS.CALCULATED,
            formula: "FreeCashFlow / NetIncome",
            inputs: { freeCashFlow: fcf, netIncome },
            timestamp
        };
    } else {
        metrics.fcfToNetIncome = {
            value: null,
            status: VALUATION_STATUS.UNAVAILABLE,
            reason: "FCF or Net Income data unavailable.",
            timestamp
        };
    }

    // 3. FCF Margin (FCF / Revenue)
    if (fcf !== null && revenue !== null && revenue > 0) {
        const fcfMargin = Number((fcf / revenue).toFixed(4));
        metrics.fcfMargin = {
            value: fcfMargin,
            status: VALUATION_STATUS.CALCULATED,
            formula: "FreeCashFlow / TotalRevenue",
            inputs: { freeCashFlow: fcf, totalRevenue: revenue },
            timestamp
        };
    } else {
        metrics.fcfMargin = {
            value: null,
            status: VALUATION_STATUS.UNAVAILABLE,
            reason: "FCF or Revenue data unavailable.",
            timestamp
        };
    }

    let overallSeverity = SEVERITY_LEVELS.UNKNOWN;
    if (signals.length > 0) {
        if (signals.some(s => s.severity === SEVERITY_LEVELS.CRITICAL)) overallSeverity = SEVERITY_LEVELS.CRITICAL;
        else if (signals.some(s => s.severity === SEVERITY_LEVELS.HIGH)) overallSeverity = SEVERITY_LEVELS.HIGH;
        else if (signals.some(s => s.severity === SEVERITY_LEVELS.MODERATE)) overallSeverity = SEVERITY_LEVELS.MODERATE;
        else overallSeverity = SEVERITY_LEVELS.LOW;
    }

    return {
        category: RISK_CATEGORIES.EARNINGS_QUALITY_RISK,
        status: signals.length > 0 ? VALUATION_STATUS.CALCULATED : VALUATION_STATUS.UNAVAILABLE,
        severity: overallSeverity,
        metrics,
        signals,
        provenance: {
            source: "earningsQuality.engine",
            timestamp
        }
    };
}
