/**
 * Risk Aggregation Engine
 * Synthesizes modular risk signals across 9 canonical categories into an inspectable Risk Profile.
 */

import { RISK_CATEGORIES, SEVERITY_LEVELS, RISK_THRESHOLDS } from "./risk.types.js";
import { evaluateMarketRisk } from "./marketRisk.engine.js";
import { evaluateFinancialRisk } from "./financialRisk.engine.js";
import { evaluateLiquidityRisk } from "./liquidityRisk.engine.js";
import { evaluateEarningsQuality } from "./earningsQuality.engine.js";
import { evaluateGrowthRisk } from "./growthRisk.engine.js";
import { evaluateEventRisk } from "./eventRisk.engine.js";
import { VALUATION_STATUS } from "../valuation/valuation.types.js";

/**
 * Evaluates valuation risk from Phase 2A & 2B outputs
 */
function evaluateValuationRisk(valuation = {}) {
    const timestamp = new Date().toISOString();
    const upside = (valuation.upsidePotential !== null && valuation.upsidePotential !== undefined && !isNaN(Number(valuation.upsidePotential)))
        ? Number(valuation.upsidePotential)
        : null;

    const modelAgreement = valuation.modelAgreement || {};
    const cv = (modelAgreement.coefficientOfVariation !== null && modelAgreement.coefficientOfVariation !== undefined)
        ? Number(modelAgreement.coefficientOfVariation)
        : null;

    const revDcf = valuation.reverseDcf || {};
    const impliedGrowth = (revDcf.impliedGrowthPercent !== null && revDcf.impliedGrowthPercent !== undefined)
        ? Number(revDcf.impliedGrowthPercent)
        : null;

    const signals = [];
    const metrics = {};

    if (upside !== null) {
        metrics.upside = {
            value: upside,
            status: VALUATION_STATUS.CALCULATED,
            formula: "((FairValue - MarketPrice) / MarketPrice) * 100",
            timestamp
        };

        let severity = SEVERITY_LEVELS.LOW;
        let direction = "UNDERVALUED";
        let reason = `Synthesized fair value offers +${upside}% upside to current market price.`;

        if (upside <= RISK_THRESHOLDS.valuationUpside.critical) {
            severity = SEVERITY_LEVELS.CRITICAL;
            direction = "SEVERE_OVERVALUATION";
            reason = `Severe Valuation Premium: Current market price trades ${Math.abs(upside)}% above fundamental fair value (<= ${RISK_THRESHOLDS.valuationUpside.critical}% upside).`;
        } else if (upside <= RISK_THRESHOLDS.valuationUpside.high) {
            severity = SEVERITY_LEVELS.HIGH;
            direction = "ELEVATED_PREMIUM";
            reason = `Elevated Valuation: Stock trades at ${Math.abs(upside)}% premium to fair value.`;
        } else if (upside <= RISK_THRESHOLDS.valuationUpside.moderate) {
            severity = SEVERITY_LEVELS.MODERATE;
            direction = "MODEST_PREMIUM";
            reason = `Modest Valuation Premium: Price is slightly above base fair value (${upside}%).`;
        }

        signals.push({
            category: RISK_CATEGORIES.VALUATION_RISK,
            metric: "valuationUpside",
            value: upside,
            status: VALUATION_STATUS.CALCULATED,
            severity,
            direction,
            formula: "((FairValue - CurrentPrice) / CurrentPrice) * 100",
            reason,
            provenance: { source: "valuation.fairValuePriceTarget & stockData.currentPrice", timestamp }
        });
    } else {
        metrics.upside = {
            value: null,
            status: VALUATION_STATUS.UNAVAILABLE,
            reason: "Fundamental fair value is unavailable.",
            timestamp
        };
    }

    if (cv !== null && modelAgreement.validModelCount >= 2) {
        metrics.modelDispersionCV = {
            value: cv,
            status: VALUATION_STATUS.CALCULATED,
            formula: "stdDev(validModels) / mean(validModels)",
            timestamp
        };

        if (cv > RISK_THRESHOLDS.modelDisagreementCV.high) {
            signals.push({
                category: RISK_CATEGORIES.VALUATION_RISK,
                metric: "modelDispersion",
                value: Number((cv * 100).toFixed(1)),
                status: VALUATION_STATUS.CALCULATED,
                severity: SEVERITY_LEVELS.HIGH,
                direction: "HIGH_MODEL_DISAGREEMENT",
                formula: "CV = stdDev / mean",
                reason: `High Valuation Model Disagreement: ${(cv * 100).toFixed(1)}% dispersion across DCF and Relative models.`,
                provenance: { source: "modelAgreement.engine", timestamp }
            });
        }
    }

    if (impliedGrowth !== null && impliedGrowth > 30.0) {
        signals.push({
            category: RISK_CATEGORIES.VALUATION_RISK,
            metric: "reverseDcfHurdle",
            value: impliedGrowth,
            status: VALUATION_STATUS.CALCULATED,
            severity: SEVERITY_LEVELS.MODERATE,
            direction: "HIGH_GROWTH_HURDLE",
            formula: "Reverse DCF Exact Bisection Root Solver",
            reason: `High Market Hurdle: Current market price embeds elevated growth expectations (+${impliedGrowth}% annual FCF CAGR).`,
            provenance: { source: "reverseDcf.engine", timestamp }
        });
    }

    let overallSeverity = SEVERITY_LEVELS.UNKNOWN;
    if (signals.length > 0) {
        if (signals.some(s => s.severity === SEVERITY_LEVELS.CRITICAL)) overallSeverity = SEVERITY_LEVELS.CRITICAL;
        else if (signals.some(s => s.severity === SEVERITY_LEVELS.HIGH)) overallSeverity = SEVERITY_LEVELS.HIGH;
        else if (signals.some(s => s.severity === SEVERITY_LEVELS.MODERATE)) overallSeverity = SEVERITY_LEVELS.MODERATE;
        else overallSeverity = SEVERITY_LEVELS.LOW;
    }

    return {
        category: RISK_CATEGORIES.VALUATION_RISK,
        status: signals.length > 0 ? VALUATION_STATUS.CALCULATED : VALUATION_STATUS.UNAVAILABLE,
        severity: overallSeverity,
        metrics,
        signals,
        provenance: { source: "valuationRisk.engine", timestamp }
    };
}

/**
 * Evaluates data quality and completeness risk
 */
function evaluateDataQualityRisk(state = {}) {
    const timestamp = new Date().toISOString();
    const fin = state.financials || {};
    const stock = state.stockData || {};

    const criticalKeys = [
        { key: "freeCashFlow", label: "Free Cash Flow", val: fin.freeCashFlow },
        { key: "totalDebt", label: "Total Debt", val: fin.totalDebt },
        { key: "totalCash", label: "Total Cash", val: fin.totalCash },
        { key: "sharesOutstanding", label: "Shares Outstanding", val: stock.sharesOutstanding },
        { key: "currentPrice", label: "Market Price", val: stock.currentPrice },
        { key: "beta", label: "Beta Volatility", val: stock.beta }
    ];

    const missing = criticalKeys.filter(k => k.val === null || k.val === undefined || isNaN(Number(k.val)));
    const completenessRatio = Number(((criticalKeys.length - missing.length) / criticalKeys.length).toFixed(2));

    let severity = SEVERITY_LEVELS.LOW;
    let reason = `Data completeness is high (${completenessRatio * 100}% of critical inputs verified).`;

    if (missing.length >= 3) {
        severity = SEVERITY_LEVELS.CRITICAL;
        reason = `High Data Quality Risk: ${missing.length} critical financial facts are missing (${missing.map(m => m.label).join(", ")}). Missing data increases uncertainty.`;
    } else if (missing.length >= 1) {
        severity = SEVERITY_LEVELS.MODERATE;
        reason = `Moderate Data Coverage: Missing ${missing.map(m => m.label).join(", ")}.`;
    }

    return {
        category: RISK_CATEGORIES.DATA_QUALITY_RISK,
        status: VALUATION_STATUS.CALCULATED,
        severity,
        metrics: {
            completenessRatio,
            missingFields: missing.map(m => m.key),
            totalCriticalFields: criticalKeys.length
        },
        signals: [{
            category: RISK_CATEGORIES.DATA_QUALITY_RISK,
            metric: "dataCompleteness",
            value: completenessRatio,
            status: VALUATION_STATUS.CALCULATED,
            severity,
            direction: missing.length > 0 ? "PARTIAL_COVERAGE" : "COMPLETE_COVERAGE",
            formula: "AvailableCriticalFacts / TotalCriticalFacts",
            reason,
            provenance: { source: "dataQuality.engine", timestamp }
        }],
        provenance: { source: "dataQuality.engine", timestamp }
    };
}

/**
 * Aggregates all modular risk categories into a complete Institutional Risk Profile
 * @param {Object} state - Analysis state
 * @returns {Object} Structured institutional risk profile
 */
export function buildRiskProfile(state = {}) {
    const fin = state.financials || {};
    const stock = state.stockData || {};
    const news = state.newsData || [];
    const valuation = state.valuation || {};
    const profile = state.companyProfile || {};
    const sector = profile.sector || fin.sector || "Unknown";
    const timestamp = new Date().toISOString();

    const marketRisk = evaluateMarketRisk(stock);
    const financialRisk = evaluateFinancialRisk(fin, sector);
    const liquidityRisk = evaluateLiquidityRisk(fin, stock);
    const earningsQuality = evaluateEarningsQuality(fin);
    const growthRisk = evaluateGrowthRisk(fin);
    const valuationRisk = evaluateValuationRisk(valuation);
    const eventRisk = evaluateEventRisk(news);
    const dataQualityRisk = evaluateDataQualityRisk(state);
    const governanceRisk = {
        category: RISK_CATEGORIES.GOVERNANCE_RISK,
        status: VALUATION_STATUS.UNAVAILABLE,
        severity: SEVERITY_LEVELS.UNKNOWN,
        reason: "Promoter pledging and audited board governance feeds unavailable in current primary pipeline.",
        metrics: {},
        signals: [],
        provenance: { source: "governanceRisk.engine", timestamp }
    };

    const categories = {
        market: marketRisk,
        financial: financialRisk,
        liquidity: liquidityRisk,
        earningsQuality: earningsQuality,
        growth: growthRisk,
        valuation: valuationRisk,
        event: eventRisk,
        governance: governanceRisk,
        dataQuality: dataQualityRisk
    };

    // Collect all active flags from all categories
    const allSignals = Object.values(categories).flatMap(c => c.signals || []);
    const criticalFlags = allSignals.filter(s => s.severity === SEVERITY_LEVELS.CRITICAL || s.severity === SEVERITY_LEVELS.HIGH);

    // Map severity to score points strictly for auditable weighted synthesis
    const severityPoints = {
        [SEVERITY_LEVELS.LOW]: 25,
        [SEVERITY_LEVELS.MODERATE]: 50,
        [SEVERITY_LEVELS.HIGH]: 75,
        [SEVERITY_LEVELS.CRITICAL]: 95
    };

    const evaluatedCategories = Object.entries(categories)
        .filter(([_, cat]) => cat.status === VALUATION_STATUS.CALCULATED && cat.severity !== SEVERITY_LEVELS.UNKNOWN);

    let compositeScore = 50;
    if (evaluatedCategories.length > 0) {
        const sumPoints = evaluatedCategories.reduce((acc, [_, cat]) => acc + (severityPoints[cat.severity] || 50), 0);
        compositeScore = Math.round(sumPoints / evaluatedCategories.length);
    }

    let overallSeverity = SEVERITY_LEVELS.MODERATE;
    if (compositeScore >= 70 || allSignals.some(s => s.severity === SEVERITY_LEVELS.CRITICAL)) {
        overallSeverity = SEVERITY_LEVELS.HIGH;
    } else if (compositeScore <= 35) {
        overallSeverity = SEVERITY_LEVELS.LOW;
    }

    return {
        status: VALUATION_STATUS.CALCULATED,
        overallSeverity,
        overallRiskLevel: overallSeverity,
        compositeScore,
        compositeRiskScore: compositeScore,
        categories,
        categoryBreakdowns: categories,
        criticalFlags: criticalFlags.map(f => ({
            category: f.category,
            severity: f.severity,
            message: f.reason
        })),
        coverage: {
            evaluatedCategoriesCount: evaluatedCategories.length,
            totalCategoriesCount: Object.keys(categories).length,
            coverageRatio: Number((evaluatedCategories.length / Object.keys(categories).length).toFixed(2))
        },
        provenance: {
            source: "riskAggregation.engine",
            timestamp
        }
    };
}
