/**
 * Financial Solvency & Leverage Risk Engine
 * Quantifies balance sheet leverage, debt coverage, interest safety, and working capital liquidity.
 */

import { RISK_CATEGORIES, SEVERITY_LEVELS, RISK_THRESHOLDS } from "./risk.types.js";
import { VALUATION_STATUS } from "../valuation/valuation.types.js";

/**
 * Evaluates balance sheet leverage and solvency metrics
 * @param {Object} financials - Grounded financial facts
 * @param {string} sector - Canonical sector classification
 * @returns {Object} Structured financial risk profile
 */
export function evaluateFinancialRisk(financials = {}, sector = "Unknown") {
    const timestamp = new Date().toISOString();
    const isBanking = String(sector).toLowerCase().includes("bank") || String(sector).toLowerCase().includes("financial");

    const debt = (financials.totalDebt !== null && financials.totalDebt !== undefined && !isNaN(Number(financials.totalDebt)))
        ? Number(financials.totalDebt)
        : null;

    const cash = (financials.totalCash !== null && financials.totalCash !== undefined && !isNaN(Number(financials.totalCash)))
        ? Number(financials.totalCash)
        : null;

    const ebitda = (financials.ebitda !== null && financials.ebitda !== undefined && !isNaN(Number(financials.ebitda)))
        ? Number(financials.ebitda)
        : null;

    const equity = (financials.totalStockholderEquity !== null && financials.totalStockholderEquity !== undefined && !isNaN(Number(financials.totalStockholderEquity)))
        ? Number(financials.totalStockholderEquity)
        : ((financials.marketCap && financials.priceToBook && Number(financials.priceToBook) > 0)
            ? Number((financials.marketCap / financials.priceToBook).toFixed(2))
            : null);

    const interestExpense = (financials.interestExpense !== null && financials.interestExpense !== undefined && !isNaN(Number(financials.interestExpense)))
        ? Number(financials.interestExpense)
        : null;

    const ebit = (financials.operatingIncome !== null && financials.operatingIncome !== undefined)
        ? Number(financials.operatingIncome)
        : ((financials.operatingMargins !== null && financials.totalRevenue !== null)
            ? Number(financials.totalRevenue) * Number(financials.operatingMargins)
            : null);

    const currentRatio = (financials.currentRatio !== null && financials.currentRatio !== undefined && !isNaN(Number(financials.currentRatio)))
        ? Number(Number(financials.currentRatio).toFixed(2))
        : null;

    const quickRatio = (financials.quickRatio !== null && financials.quickRatio !== undefined && !isNaN(Number(financials.quickRatio)))
        ? Number(Number(financials.quickRatio).toFixed(2))
        : null;

    const fcf = (financials.freeCashFlow !== null && financials.freeCashFlow !== undefined && !isNaN(Number(financials.freeCashFlow)))
        ? Number(financials.freeCashFlow)
        : null;

    const netIncome = (financials.netIncome !== null && financials.netIncome !== undefined && !isNaN(Number(financials.netIncome)))
        ? Number(financials.netIncome)
        : null;

    const signals = [];
    const metrics = {};

    // 1. Net Debt / EBITDA (Prohibited for Banks)
    if (isBanking) {
        metrics.netDebtToEbitda = {
            value: null,
            status: VALUATION_STATUS.NOT_APPROPRIATE,
            reason: "Net Debt / EBITDA is prohibited for banking institutions where debt represents operating funding/deposits.",
            timestamp
        };
    } else if (debt !== null && cash !== null && ebitda !== null && ebitda > 0) {
        const netDebt = debt - cash;
        const netDebtToEbitda = Number((netDebt / ebitda).toFixed(2));
        metrics.netDebtToEbitda = {
            value: netDebtToEbitda,
            status: VALUATION_STATUS.CALCULATED,
            formula: "(TotalDebt - TotalCash) / EBITDA",
            inputs: { totalDebt: debt, totalCash: cash, ebitda },
            timestamp
        };

        let severity = SEVERITY_LEVELS.LOW;
        let direction = "SAFE";
        let reason = `Net Debt / EBITDA of ${netDebtToEbitda}x is within safe operational thresholds.`;

        if (netDebtToEbitda >= RISK_THRESHOLDS.netDebtToEbitda.critical) {
            severity = SEVERITY_LEVELS.CRITICAL;
            direction = "EXTREME_LEVERAGE";
            reason = `Critical Leverage: Net Debt/EBITDA is ${netDebtToEbitda}x (>= ${RISK_THRESHOLDS.netDebtToEbitda.critical}x), indicating high debt distress risk.`;
        } else if (netDebtToEbitda >= RISK_THRESHOLDS.netDebtToEbitda.high) {
            severity = SEVERITY_LEVELS.HIGH;
            direction = "HIGH_LEVERAGE";
            reason = `Elevated Leverage: Net Debt/EBITDA of ${netDebtToEbitda}x exceeds prudent benchmark (${RISK_THRESHOLDS.netDebtToEbitda.high}x).`;
        } else if (netDebtToEbitda >= RISK_THRESHOLDS.netDebtToEbitda.moderate) {
            severity = SEVERITY_LEVELS.MODERATE;
            direction = "MODERATE_LEVERAGE";
            reason = `Moderate Leverage: Net Debt/EBITDA is ${netDebtToEbitda}x.`;
        } else if (netDebtToEbitda <= 0) {
            direction = "NET_CASH";
            reason = `Fortress Solvency: Company holds net cash reserves (Total Cash > Total Debt).`;
        }

        signals.push({
            category: RISK_CATEGORIES.FINANCIAL_RISK,
            metric: "netDebtToEbitda",
            value: netDebtToEbitda,
            status: VALUATION_STATUS.CALCULATED,
            severity,
            direction,
            formula: "(TotalDebt - TotalCash) / EBITDA",
            reason,
            provenance: { source: "financials.totalDebt, financials.totalCash, financials.ebitda", timestamp }
        });
    } else {
        metrics.netDebtToEbitda = {
            value: null,
            status: VALUATION_STATUS.UNAVAILABLE,
            reason: ebitda !== null && ebitda <= 0 ? "EBITDA is non-positive; ratio invalid." : "Debt, cash, or EBITDA data unavailable.",
            timestamp
        };
    }

    // 2. Debt to Equity
    if (debt !== null && equity !== null && equity > 0) {
        const debtToEquity = Number((debt / equity).toFixed(2));
        metrics.debtToEquity = {
            value: debtToEquity,
            status: VALUATION_STATUS.CALCULATED,
            formula: "TotalDebt / StockholdersEquity",
            inputs: { totalDebt: debt, stockholdersEquity: equity },
            timestamp
        };

        let severity = SEVERITY_LEVELS.LOW;
        if (debtToEquity >= RISK_THRESHOLDS.debtToEquity.critical) severity = SEVERITY_LEVELS.CRITICAL;
        else if (debtToEquity >= RISK_THRESHOLDS.debtToEquity.high) severity = SEVERITY_LEVELS.HIGH;
        else if (debtToEquity >= RISK_THRESHOLDS.debtToEquity.moderate) severity = SEVERITY_LEVELS.MODERATE;

        signals.push({
            category: RISK_CATEGORIES.FINANCIAL_RISK,
            metric: "debtToEquity",
            value: debtToEquity,
            status: VALUATION_STATUS.CALCULATED,
            severity,
            direction: debtToEquity > 2.0 ? "ELEVATED" : "HEALTHY",
            formula: "TotalDebt / StockholdersEquity",
            reason: `Debt to Equity is ${debtToEquity}x.`,
            provenance: { source: "financials.totalDebt & balanceSheet.equity", timestamp }
        });
    } else {
        metrics.debtToEquity = {
            value: null,
            status: VALUATION_STATUS.UNAVAILABLE,
            reason: equity !== null && equity <= 0 ? "Negative book equity." : "Debt or equity data unavailable.",
            timestamp
        };
    }

    // 3. Current Ratio & Quick Ratio
    if (currentRatio !== null) {
        metrics.currentRatio = {
            value: currentRatio,
            status: VALUATION_STATUS.GROUNDED,
            source: "financials.currentRatio",
            timestamp
        };

        let severity = SEVERITY_LEVELS.LOW;
        let direction = "ADEQUATE";
        let reason = `Current Ratio of ${currentRatio}x provides adequate short-term liquidity.`;

        if (currentRatio <= RISK_THRESHOLDS.currentRatio.critical) {
            severity = SEVERITY_LEVELS.CRITICAL;
            direction = "SEVERE_LIQUIDITY_DEFICIT";
            reason = `Severe Working Capital Deficit: Current ratio is ${currentRatio}x (<= ${RISK_THRESHOLDS.currentRatio.critical}x).`;
        } else if (currentRatio <= RISK_THRESHOLDS.currentRatio.high) {
            severity = SEVERITY_LEVELS.HIGH;
            direction = "LIQUIDITY_PRESSURE";
            reason = `Working Capital Strain: Current ratio is ${currentRatio}x (< 1.05x).`;
        } else if (currentRatio <= RISK_THRESHOLDS.currentRatio.moderate) {
            severity = SEVERITY_LEVELS.MODERATE;
            direction = "TIGHT_LIQUIDITY";
            reason = `Moderate Working Capital Buffer: Current ratio is ${currentRatio}x.`;
        }

        signals.push({
            category: RISK_CATEGORIES.FINANCIAL_RISK,
            metric: "currentRatio",
            value: currentRatio,
            status: VALUATION_STATUS.CALCULATED,
            severity,
            direction,
            formula: "CurrentAssets / CurrentLiabilities",
            reason,
            provenance: { source: "financials.currentRatio", timestamp }
        });
    } else {
        metrics.currentRatio = {
            value: null,
            status: VALUATION_STATUS.UNAVAILABLE,
            reason: "Current ratio unavailable in primary financial statement feeds.",
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
    } else {
        metrics.quickRatio = {
            value: null,
            status: VALUATION_STATUS.UNAVAILABLE,
            reason: "Quick ratio unavailable in primary financial statement feeds.",
            timestamp
        };
    }

    // 4. Interest Coverage Ratio
    if (ebit !== null && interestExpense !== null && interestExpense > 0) {
        const interestCoverage = Number((ebit / interestExpense).toFixed(2));
        metrics.interestCoverage = {
            value: interestCoverage,
            status: VALUATION_STATUS.CALCULATED,
            formula: "EBIT / InterestExpense",
            inputs: { ebit, interestExpense },
            timestamp
        };

        let severity = SEVERITY_LEVELS.LOW;
        if (interestCoverage <= RISK_THRESHOLDS.interestCoverage.critical) severity = SEVERITY_LEVELS.CRITICAL;
        else if (interestCoverage <= RISK_THRESHOLDS.interestCoverage.high) severity = SEVERITY_LEVELS.HIGH;
        else if (interestCoverage <= RISK_THRESHOLDS.interestCoverage.moderate) severity = SEVERITY_LEVELS.MODERATE;

        signals.push({
            category: RISK_CATEGORIES.FINANCIAL_RISK,
            metric: "interestCoverage",
            value: interestCoverage,
            status: VALUATION_STATUS.CALCULATED,
            severity,
            direction: interestCoverage < 2.5 ? "INTEREST_STRESS" : "HEALTHY",
            formula: "EBIT / InterestExpense",
            reason: `Interest Coverage is ${interestCoverage}x.`,
            provenance: { source: "financials.operatingIncome & financials.interestExpense", timestamp }
        });
    } else {
        metrics.interestCoverage = {
            value: null,
            status: VALUATION_STATUS.UNAVAILABLE,
            reason: interestExpense === null ? "Interest expense unavailable or zero debt." : "EBIT unavailable.",
            timestamp
        };
    }

    // 5. FCF Conversion Ratio
    if (fcf !== null && netIncome !== null && netIncome > 0) {
        const fcfConversion = Number((fcf / netIncome).toFixed(4));
        metrics.fcfConversion = {
            value: fcfConversion,
            status: VALUATION_STATUS.CALCULATED,
            formula: "FreeCashFlow / NetIncome",
            inputs: { freeCashFlow: fcf, netIncome },
            timestamp
        };
    } else {
        metrics.fcfConversion = {
            value: null,
            status: VALUATION_STATUS.UNAVAILABLE,
            reason: netIncome !== null && netIncome <= 0 ? "Non-positive Net Income." : "FCF or Net Income unavailable.",
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
        category: RISK_CATEGORIES.FINANCIAL_RISK,
        status: signals.length > 0 ? VALUATION_STATUS.CALCULATED : VALUATION_STATUS.UNAVAILABLE,
        severity: overallSeverity,
        metrics,
        signals,
        provenance: {
            source: "financialRisk.engine",
            timestamp
        }
    };
}
