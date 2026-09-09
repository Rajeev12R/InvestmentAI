/**
 * Liquidity Risk Engine
 * Assesses both balance sheet short-term solvency and market trading liquidity/depth.
 */

import { RISK_CATEGORIES, SEVERITY_LEVELS, RISK_THRESHOLDS } from "./risk.types.js";
import { VALUATION_STATUS } from "../valuation/valuation.types.js";

/**
 * Evaluates operational and trading liquidity
 * @param {Object} financials - Grounded financial data
 * @param {Object} stockData - Stock market data (volume, price, marketCap)
 * @returns {Object} Structured liquidity risk profile
 */
export function evaluateLiquidityRisk(financials = {}, stockData = {}) {
    const timestamp = new Date().toISOString();

    const currentRatio = (financials.currentRatio !== null && financials.currentRatio !== undefined && !isNaN(Number(financials.currentRatio)))
        ? Number(Number(financials.currentRatio).toFixed(2))
        : null;

    const quickRatio = (financials.quickRatio !== null && financials.quickRatio !== undefined && !isNaN(Number(financials.quickRatio)))
        ? Number(Number(financials.quickRatio).toFixed(2))
        : null;

    const currentPrice = (stockData.currentPrice !== null && stockData.currentPrice !== undefined && Number(stockData.currentPrice) > 0)
        ? Number(stockData.currentPrice)
        : null;

    const averageVolume = (stockData.averageVolume !== null && stockData.averageVolume !== undefined && Number(stockData.averageVolume) > 0)
        ? Number(stockData.averageVolume)
        : null;

    const marketCap = (stockData.marketCap !== null && stockData.marketCap !== undefined && Number(stockData.marketCap) > 0)
        ? Number(stockData.marketCap)
        : (financials.marketCap ? Number(financials.marketCap) : null);

    const signals = [];
    const metrics = {};

    // 1. Balance Sheet Liquidity (Current & Quick Ratios)
    if (currentRatio !== null) {
        metrics.currentRatio = {
            value: currentRatio,
            status: VALUATION_STATUS.GROUNDED,
            source: "financials.currentRatio",
            timestamp
        };

        let severity = SEVERITY_LEVELS.LOW;
        if (currentRatio <= RISK_THRESHOLDS.currentRatio.critical) severity = SEVERITY_LEVELS.CRITICAL;
        else if (currentRatio <= RISK_THRESHOLDS.currentRatio.high) severity = SEVERITY_LEVELS.HIGH;
        else if (currentRatio <= RISK_THRESHOLDS.currentRatio.moderate) severity = SEVERITY_LEVELS.MODERATE;

        signals.push({
            category: RISK_CATEGORIES.LIQUIDITY_RISK,
            metric: "currentRatio",
            value: currentRatio,
            status: VALUATION_STATUS.CALCULATED,
            severity,
            direction: currentRatio < 1.0 ? "WORKING_CAPITAL_PRESSURE" : "AMPLE",
            formula: "CurrentAssets / CurrentLiabilities",
            reason: `Current ratio is ${currentRatio}x.`,
            provenance: { source: "financials.currentRatio", timestamp }
        });
    } else {
        metrics.currentRatio = {
            value: null,
            status: VALUATION_STATUS.UNAVAILABLE,
            reason: "Current ratio unavailable.",
            timestamp
        };
    }

    if (quickRatio !== null) {
        metrics.quickRatio = {
            value: quickRatio,
            status: VALUATION_STATUS.GROUNDED,
            source: "financials.quickRatio",
            timestamp
        };

        let severity = SEVERITY_LEVELS.LOW;
        if (quickRatio <= RISK_THRESHOLDS.quickRatio.critical) severity = SEVERITY_LEVELS.CRITICAL;
        else if (quickRatio <= RISK_THRESHOLDS.quickRatio.high) severity = SEVERITY_LEVELS.HIGH;
        else if (quickRatio <= RISK_THRESHOLDS.quickRatio.moderate) severity = SEVERITY_LEVELS.MODERATE;

        signals.push({
            category: RISK_CATEGORIES.LIQUIDITY_RISK,
            metric: "quickRatio",
            value: quickRatio,
            status: VALUATION_STATUS.CALCULATED,
            severity,
            direction: quickRatio < 1.0 ? "TIGHT" : "AMPLE",
            formula: "(Cash + MarketableSecurities + Receivables) / CurrentLiabilities",
            reason: `Quick ratio is ${quickRatio}x.`,
            provenance: { source: "financials.quickRatio", timestamp }
        });
    } else {
        metrics.quickRatio = {
            value: null,
            status: VALUATION_STATUS.UNAVAILABLE,
            reason: "Quick ratio unavailable.",
            timestamp
        };
    }

    // 2. Market Trading Depth & Daily Dollar Volume
    if (averageVolume !== null && currentPrice !== null) {
        const dailyDollarTurnover = Math.round(averageVolume * currentPrice);
        metrics.dailyDollarTurnover = {
            value: dailyDollarTurnover,
            status: VALUATION_STATUS.CALCULATED,
            formula: "AverageDailyVolume * CurrentPrice",
            timestamp
        };

        let severity = SEVERITY_LEVELS.LOW;
        let direction = "LIQUID";
        let reason = `Active secondary trading depth ($${(dailyDollarTurnover / 1e6).toFixed(1)}M daily volume).`;

        // Less than $500k daily dollar volume represents severe trading illiquidity
        if (dailyDollarTurnover < 500000) {
            severity = SEVERITY_LEVELS.CRITICAL;
            direction = "SEVERE_ILLIQUIDITY";
            reason = `Extreme Illiquidity: Average daily turnover is under $500k ($${(dailyDollarTurnover / 1e3).toFixed(0)}k), creating slippage and exit risk.`;
        } else if (dailyDollarTurnover < 2500000) {
            severity = SEVERITY_LEVELS.HIGH;
            direction = "LOW_LIQUIDITY";
            reason = `Low Market Turnover: Daily trading depth is under $2.5M.`;
        } else if (dailyDollarTurnover < 10000000) {
            severity = SEVERITY_LEVELS.MODERATE;
            direction = "MODERATE_LIQUIDITY";
            reason = `Moderate Market Liquidity: Daily volume is $${(dailyDollarTurnover / 1e6).toFixed(1)}M.`;
        }

        signals.push({
            category: RISK_CATEGORIES.LIQUIDITY_RISK,
            metric: "dailyDollarTurnover",
            value: dailyDollarTurnover,
            status: VALUATION_STATUS.CALCULATED,
            severity,
            direction,
            formula: "AverageVolume * CurrentPrice",
            reason,
            provenance: { source: "stockData.averageVolume & stockData.currentPrice", timestamp }
        });
    } else {
        metrics.dailyDollarTurnover = {
            value: null,
            status: VALUATION_STATUS.UNAVAILABLE,
            reason: "Average trading volume or price unavailable.",
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
        category: RISK_CATEGORIES.LIQUIDITY_RISK,
        status: signals.length > 0 ? VALUATION_STATUS.CALCULATED : VALUATION_STATUS.UNAVAILABLE,
        severity: overallSeverity,
        metrics,
        signals,
        provenance: {
            source: "liquidityRisk.engine",
            timestamp
        }
    };
}
