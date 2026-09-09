/**
 * Growth & Operational Trend Risk Engine
 * Analyzes top-line momentum, margin trajectories, and revenue cyclicality.
 */

import { RISK_CATEGORIES, SEVERITY_LEVELS } from "./risk.types.js";
import { VALUATION_STATUS } from "../valuation/valuation.types.js";

/**
 * Evaluates growth trends and operational volatility
 * @param {Object} financials - Grounded financial data
 * @returns {Object} Structured growth risk profile
 */
export function evaluateGrowthRisk(financials = {}) {
    const timestamp = new Date().toISOString();

    const revGrowth = (financials.revenueGrowth !== null && financials.revenueGrowth !== undefined && !isNaN(Number(financials.revenueGrowth)))
        ? Number(financials.revenueGrowth)
        : null;

    const opMargin = (financials.operatingMargin !== null && financials.operatingMargin !== undefined && !isNaN(Number(financials.operatingMargin)))
        ? Number(financials.operatingMargin)
        : null;

    const signals = [];
    const metrics = {};

    // 1. Revenue Growth Trajectory
    if (revGrowth !== null) {
        const revGrowthPct = Number((revGrowth * (Math.abs(revGrowth) < 1 ? 100 : 1)).toFixed(2));
        metrics.revenueGrowth = {
            value: revGrowthPct,
            status: VALUATION_STATUS.GROUNDED,
            source: "financials.revenueGrowth",
            timestamp
        };

        let severity = SEVERITY_LEVELS.LOW;
        let direction = "EXPANSION";
        let reason = `Top-line revenue grew by +${revGrowthPct}% YoY.`;

        if (revGrowthPct <= -15.0) {
            severity = SEVERITY_LEVELS.CRITICAL;
            direction = "SEVERE_CONTRACTION";
            reason = `Severe Revenue Contraction: Top-line fell ${Math.abs(revGrowthPct)}% YoY.`;
        } else if (revGrowthPct < 0) {
            severity = SEVERITY_LEVELS.HIGH;
            direction = "REVENUE_DECLINE";
            reason = `Negative Revenue Growth: Top-line contracted by ${Math.abs(revGrowthPct)}% YoY.`;
        } else if (revGrowthPct < 4.0) {
            severity = SEVERITY_LEVELS.MODERATE;
            direction = "STAGNANT_GROWTH";
            reason = `Subdued Growth: Revenue growth is muted at +${revGrowthPct}% YoY.`;
        }

        signals.push({
            category: RISK_CATEGORIES.GROWTH_RISK,
            metric: "revenueGrowth",
            value: revGrowthPct,
            status: VALUATION_STATUS.CALCULATED,
            severity,
            direction,
            formula: "(Revenue_t - Revenue_t-1) / Revenue_t-1",
            reason,
            provenance: { source: "financials.revenueGrowth", timestamp }
        });
    } else {
        metrics.revenueGrowth = {
            value: null,
            status: VALUATION_STATUS.UNAVAILABLE,
            reason: "Revenue growth data unavailable.",
            timestamp
        };
    }

    // 2. Operating Margin Cushion
    if (opMargin !== null) {
        const opMarginPct = Number((opMargin * (Math.abs(opMargin) < 1 ? 100 : 1)).toFixed(2));
        metrics.operatingMargin = {
            value: opMarginPct,
            status: VALUATION_STATUS.GROUNDED,
            source: "financials.operatingMargin",
            timestamp
        };

        let severity = SEVERITY_LEVELS.LOW;
        let direction = "PROFITABLE";
        let reason = `Operating margin is healthy at ${opMarginPct}%.`;

        if (opMarginPct <= 0) {
            severity = SEVERITY_LEVELS.CRITICAL;
            direction = "OPERATING_LOSS";
            reason = `Operating Loss: Core operations are loss-making (${opMarginPct}% margin).`;
        } else if (opMarginPct < 5.0) {
            severity = SEVERITY_LEVELS.HIGH;
            direction = "RAZOR_THIN_MARGIN";
            reason = `Compressed Margins: Operating margin is tight at ${opMarginPct}%, sensitive to cost shocks.`;
        } else if (opMarginPct < 10.0) {
            severity = SEVERITY_LEVELS.MODERATE;
            direction = "MODERATE_MARGIN";
            reason = `Moderate Operating Margin: ${opMarginPct}%.`;
        }

        signals.push({
            category: RISK_CATEGORIES.GROWTH_RISK,
            metric: "operatingMargin",
            value: opMarginPct,
            status: VALUATION_STATUS.CALCULATED,
            severity,
            direction,
            formula: "OperatingIncome / TotalRevenue",
            reason,
            provenance: { source: "financials.operatingMargin", timestamp }
        });
    } else {
        metrics.operatingMargin = {
            value: null,
            status: VALUATION_STATUS.UNAVAILABLE,
            reason: "Operating margin data unavailable.",
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
        category: RISK_CATEGORIES.GROWTH_RISK,
        status: signals.length > 0 ? VALUATION_STATUS.CALCULATED : VALUATION_STATUS.UNAVAILABLE,
        severity: overallSeverity,
        metrics,
        signals,
        provenance: {
            source: "growthRisk.engine",
            timestamp
        }
    };
}
