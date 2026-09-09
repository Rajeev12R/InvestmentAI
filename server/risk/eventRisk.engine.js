/**
 * Event & Headline Risk Engine
 * Structures corporate, legal, earnings, and regulatory events with sentiment impact.
 */

import { RISK_CATEGORIES, SEVERITY_LEVELS } from "./risk.types.js";
import { VALUATION_STATUS } from "../valuation/valuation.types.js";

/**
 * Evaluates news and corporate event risk
 * @param {Array<Object>} newsData - Grounded news articles with sentiment and category
 * @returns {Object} Structured event risk profile
 */
export function evaluateEventRisk(newsData = []) {
    const timestamp = new Date().toISOString();
    const articles = Array.isArray(newsData) ? newsData : [];

    if (articles.length === 0) {
        return {
            category: RISK_CATEGORIES.EVENT_RISK,
            status: VALUATION_STATUS.UNAVAILABLE,
            severity: SEVERITY_LEVELS.UNKNOWN,
            reason: "No grounded news or event publications retrieved.",
            metrics: { eventCount: 0, negativeEventCount: 0 },
            signals: [],
            provenance: { source: "newsData", timestamp }
        };
    }

    const negativeEvents = articles.filter(item =>
        item.sentiment === "NEGATIVE" || (item.severity !== undefined && Number(item.severity) < -0.2)
    );

    const categories = {};
    articles.forEach(a => {
        const cat = a.category || "General";
        categories[cat] = (categories[cat] || 0) + 1;
    });

    let severity = SEVERITY_LEVELS.LOW;
    let direction = "NORMAL_HEADLINES";
    let reason = `${articles.length} news items analyzed with normalized sentiment.`;

    if (negativeEvents.length >= 4) {
        severity = SEVERITY_LEVELS.CRITICAL;
        direction = "SEVERE_HEADLINE_VELOCITY";
        reason = `High Headline Risk: ${negativeEvents.length} severe negative news publications detected across recent news cycle.`;
    } else if (negativeEvents.length >= 2) {
        severity = SEVERITY_LEVELS.HIGH;
        direction = "ELEVATED_HEADLINE_VELOCITY";
        reason = `Moderate-to-High Headline Risk: ${negativeEvents.length} negative news items detected.`;
    } else if (negativeEvents.length === 1) {
        severity = SEVERITY_LEVELS.MODERATE;
        direction = "ISOLATED_NEGATIVE_EVENT";
        reason = `Single isolated negative headline detected.`;
    }

    const signals = [{
        category: RISK_CATEGORIES.EVENT_RISK,
        metric: "headlineVelocity",
        value: negativeEvents.length,
        status: VALUATION_STATUS.CALCULATED,
        severity,
        direction,
        formula: "Count(NegativeNewsEvents)",
        reason,
        provenance: { source: "newsData", timestamp }
    }];

    return {
        category: RISK_CATEGORIES.EVENT_RISK,
        status: VALUATION_STATUS.CALCULATED,
        severity,
        metrics: {
            totalEvents: articles.length,
            negativeEvents: negativeEvents.length,
            categoryDistribution: categories
        },
        signals,
        provenance: { source: "eventRisk.engine", timestamp }
    };
}
