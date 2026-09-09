/**
 * Data Quality & Completeness Risk Engine
 * Measures grounded fact completeness and penalizes missing core parameters.
 */

import { RISK_CATEGORIES, SEVERITY_LEVELS } from "./risk.types.js";
import { VALUATION_STATUS } from "../valuation/valuation.types.js";

export function evaluateDataQualityRisk(state = {}) {
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
      dataCoverageRatio: completenessRatio,
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
