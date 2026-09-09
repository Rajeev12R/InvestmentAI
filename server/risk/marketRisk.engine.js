/**
 * Market Risk Engine
 * Quantifies systematic market sensitivity (Beta), drawdown severity, and price boundaries.
 */

import { RISK_CATEGORIES, SEVERITY_LEVELS, RISK_THRESHOLDS } from "./risk.types.js";
import { VALUATION_STATUS } from "../valuation/valuation.types.js";

/**
 * Computes market risk metrics and signal evaluations
 * @param {Object} stockData - Stock parameters (currentPrice, fiftyTwoWeekHigh, fiftyTwoWeekLow, beta, historicalPrices)
 * @returns {Object} Deterministic market risk signals
 */
export function evaluateMarketRisk(stockData = {}) {
    const timestamp = new Date().toISOString();
    const currentPrice = (stockData.currentPrice !== null && stockData.currentPrice !== undefined && Number(stockData.currentPrice) > 0)
        ? Number(stockData.currentPrice)
        : null;

    const high52 = (stockData.fiftyTwoWeekHigh !== null && stockData.fiftyTwoWeekHigh !== undefined && Number(stockData.fiftyTwoWeekHigh) > 0)
        ? Number(stockData.fiftyTwoWeekHigh)
        : ((stockData.high52 !== null && stockData.high52 !== undefined && Number(stockData.high52) > 0) ? Number(stockData.high52) : null);

    const low52 = (stockData.fiftyTwoWeekLow !== null && stockData.fiftyTwoWeekLow !== undefined && Number(stockData.fiftyTwoWeekLow) > 0)
        ? Number(stockData.fiftyTwoWeekLow)
        : ((stockData.low52 !== null && stockData.low52 !== undefined && Number(stockData.low52) > 0) ? Number(stockData.low52) : null);

    const beta = (stockData.beta !== null && stockData.beta !== undefined && !isNaN(Number(stockData.beta)))
        ? Number(Number(stockData.beta).toFixed(2))
        : null;

    const signals = [];
    const metrics = {};

    // 1. Beta Systematic Volatility Signal
    if (beta !== null) {
        let severity = SEVERITY_LEVELS.LOW;
        let direction = "NEUTRAL";
        let reason = `Beta of ${beta} indicates market-like or defensive systematic sensitivity.`;

        if (beta >= RISK_THRESHOLDS.beta.critical) {
            severity = SEVERITY_LEVELS.CRITICAL;
            direction = "HIGH_RISK";
            reason = `Extreme Systematic Volatility: Beta of ${beta} indicates severe amplification of market fluctuations (>= ${RISK_THRESHOLDS.beta.critical}x).`;
        } else if (beta >= RISK_THRESHOLDS.beta.high) {
            severity = SEVERITY_LEVELS.HIGH;
            direction = "HIGH_RISK";
            reason = `Elevated Systematic Volatility: Beta of ${beta} indicates heightened sensitivity to market declines (>= ${RISK_THRESHOLDS.beta.high}x).`;
        } else if (beta >= RISK_THRESHOLDS.beta.moderate) {
            severity = SEVERITY_LEVELS.MODERATE;
            direction = "MODERATE_RISK";
            reason = `Moderate Systematic Volatility: Beta of ${beta} reflects slightly higher market correlation.`;
        } else if (beta < 0.80 && beta > 0) {
            severity = SEVERITY_LEVELS.LOW;
            direction = "DEFENSIVE";
            reason = `Defensive Volatility: Beta of ${beta} provides portfolio shock absorption.`;
        }

        metrics.beta = {
            value: beta,
            status: VALUATION_STATUS.GROUNDED,
            source: "stockData.beta",
            timestamp
        };

        signals.push({
            category: RISK_CATEGORIES.MARKET_RISK,
            metric: "beta",
            value: beta,
            status: VALUATION_STATUS.CALCULATED,
            severity,
            direction,
            formula: "Covariance(Asset, Market) / Variance(Market)",
            reason,
            provenance: { source: "stockData.beta", timestamp }
        });
    } else {
        metrics.beta = {
            value: null,
            status: VALUATION_STATUS.UNAVAILABLE,
            reason: "Beta volatility data is unavailable in primary stock feed.",
            timestamp
        };
    }

    // 2. 52-Week Maximum Drawdown from Peak
    if (currentPrice !== null && high52 !== null) {
        const drawdown52wPct = Number((((currentPrice - high52) / high52) * 100).toFixed(2));
        metrics.drawdown52w = {
            value: drawdown52wPct,
            status: VALUATION_STATUS.CALCULATED,
            formula: "((CurrentPrice - 52WeekHigh) / 52WeekHigh) * 100",
            timestamp
        };

        let severity = SEVERITY_LEVELS.LOW;
        let direction = "NORMAL";
        let reason = `Current price trades within ${Math.abs(drawdown52wPct).toFixed(1)}% of its 52-week high.`;

        if (drawdown52wPct <= RISK_THRESHOLDS.drawdown52w.critical) {
            severity = SEVERITY_LEVELS.CRITICAL;
            direction = "SEVERE_DRAWDOWN";
            reason = `Severe Price Impairment: Stock is down ${Math.abs(drawdown52wPct).toFixed(1)}% from its 52-week peak (<= ${RISK_THRESHOLDS.drawdown52w.critical}%).`;
        } else if (drawdown52wPct <= RISK_THRESHOLDS.drawdown52w.high) {
            severity = SEVERITY_LEVELS.HIGH;
            direction = "DEEP_CORRECTION";
            reason = `Deep Correction: Stock is down ${Math.abs(drawdown52wPct).toFixed(1)}% from its 52-week peak.`;
        } else if (drawdown52wPct <= RISK_THRESHOLDS.drawdown52w.moderate) {
            severity = SEVERITY_LEVELS.MODERATE;
            direction = "MODERATE_PULLBACK";
            reason = `Moderate Pullback: Stock trades ${Math.abs(drawdown52wPct).toFixed(1)}% below 52-week peak.`;
        }

        signals.push({
            category: RISK_CATEGORIES.MARKET_RISK,
            metric: "drawdown52w",
            value: drawdown52wPct,
            status: VALUATION_STATUS.CALCULATED,
            severity,
            direction,
            formula: "((CurrentPrice - 52WeekHigh) / 52WeekHigh) * 100",
            reason,
            provenance: { source: "stockData.currentPrice & stockData.fiftyTwoWeekHigh", timestamp }
        });
    } else {
        metrics.drawdown52w = {
            value: null,
            status: VALUATION_STATUS.UNAVAILABLE,
            reason: "Current price or 52-week high price boundary is unavailable.",
            timestamp
        };
    }

    // 3. 52-Week Distance from Low
    if (currentPrice !== null && low52 !== null) {
        const distanceFromLowPct = Number((((currentPrice - low52) / low52) * 100).toFixed(2));
        metrics.distanceFromLow52w = {
            value: distanceFromLowPct,
            status: VALUATION_STATUS.CALCULATED,
            formula: "((CurrentPrice - 52WeekLow) / 52WeekLow) * 100",
            timestamp
        };
    } else {
        metrics.distanceFromLow52w = {
            value: null,
            status: VALUATION_STATUS.UNAVAILABLE,
            reason: "Current price or 52-week low is unavailable.",
            timestamp
        };
    }

    // Determine category severity from maximum active signal severity
    let overallSeverity = SEVERITY_LEVELS.UNKNOWN;
    if (signals.length > 0) {
        if (signals.some(s => s.severity === SEVERITY_LEVELS.CRITICAL)) overallSeverity = SEVERITY_LEVELS.CRITICAL;
        else if (signals.some(s => s.severity === SEVERITY_LEVELS.HIGH)) overallSeverity = SEVERITY_LEVELS.HIGH;
        else if (signals.some(s => s.severity === SEVERITY_LEVELS.MODERATE)) overallSeverity = SEVERITY_LEVELS.MODERATE;
        else overallSeverity = SEVERITY_LEVELS.LOW;
    }

    return {
        category: RISK_CATEGORIES.MARKET_RISK,
        status: signals.length > 0 ? VALUATION_STATUS.CALCULATED : VALUATION_STATUS.UNAVAILABLE,
        severity: overallSeverity,
        metrics,
        signals,
        provenance: {
            source: "marketRisk.engine",
            timestamp
        }
    };
}
