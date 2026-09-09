import crypto from "crypto";

/**
 * Phase 14 — Institutional Portfolio Construction & Optimization Types & Enums
 */

export const OptimizationMethod = Object.freeze({
  EQUAL_WEIGHT: "EQUAL_WEIGHT",
  MINIMUM_VARIANCE: "MINIMUM_VARIANCE",
  MEAN_VARIANCE: "MEAN_VARIANCE",
  RISK_PARITY: "RISK_PARITY",
  MAXIMUM_DIVERSIFICATION: "MAXIMUM_DIVERSIFICATION",
  CONVICTION_WEIGHTED: "CONVICTION_WEIGHTED",
  VALUATION_CONVICTION_HYBRID: "VALUATION_CONVICTION_HYBRID"
});

export const OptimizationStatus = Object.freeze({
  OPTIMAL: "OPTIMAL",
  FEASIBLE: "FEASIBLE",
  INFEASIBLE_CONSTRAINTS: "INFEASIBLE_CONSTRAINTS",
  NON_CONVERGENT: "NON_CONVERGENT",
  NUMERICAL_FAILURE: "NUMERICAL_FAILURE",
  INVALID_INPUT: "INVALID_INPUT",
  INSUFFICIENT_DATA: "INSUFFICIENT_DATA",
  STALE_INPUT: "STALE_INPUT",
  UNAVAILABLE: "UNAVAILABLE",
  OPTIMIZATION_INVALID: "OPTIMIZATION_INVALID"
});

export const ExecutionStatus = Object.freeze({
  PROPOSED: "PROPOSED",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  HUMAN_APPROVED: "HUMAN_APPROVED",
  EXECUTION_NOT_CONNECTED: "EXECUTION_NOT_CONNECTED",
  EXECUTED_EXTERNALLY: "EXECUTED_EXTERNALLY"
});

export const ConstraintType = Object.freeze({
  POSITION_WEIGHT: "POSITION_WEIGHT",
  SECTOR_WEIGHT: "SECTOR_WEIGHT",
  GEOGRAPHY_WEIGHT: "GEOGRAPHY_WEIGHT",
  CASH_BOUNDS: "CASH_BOUNDS",
  TURNOVER_LIMIT: "TURNOVER_LIMIT",
  LIQUIDITY_LIMIT: "LIQUIDITY_LIMIT",
  VOLATILITY_LIMIT: "VOLATILITY_LIMIT",
  RISK_CONTRIBUTION_LIMIT: "RISK_CONTRIBUTION_LIMIT",
  LEVERAGE_LIMIT: "LEVERAGE_LIMIT",
  SHORTING_LIMIT: "SHORTING_LIMIT",
  CONCENTRATION_LIMIT: "CONCENTRATION_LIMIT"
});

export const ExpectedReturnSource = Object.freeze({
  VALUATION_DCF: "VALUATION_DCF",
  SCENARIO_PROBABILITY_WEIGHTED: "SCENARIO_PROBABILITY_WEIGHTED",
  PROCESS_FORECAST_LEDGER: "PROCESS_FORECAST_LEDGER",
  HISTORICAL_MEAN: "HISTORICAL_MEAN",
  UNAVAILABLE: "UNAVAILABLE"
});

export const UniverseType = Object.freeze({
  CURRENT_PORTFOLIO: "CURRENT_PORTFOLIO",
  EXPANDED_CANDIDATE: "EXPANDED_CANDIDATE",
  HISTORICAL_UNIVERSE: "HISTORICAL_UNIVERSE",
  SURVIVORSHIP_ADJUSTED: "SURVIVORSHIP_ADJUSTED",
  HISTORICAL_UNIVERSE_INCOMPLETE: "HISTORICAL_UNIVERSE_INCOMPLETE"
});

export const ScenarioType = Object.freeze({
  HISTORICAL: "HISTORICAL",
  HYPOTHETICAL: "HYPOTHETICAL",
  MODELLED: "MODELLED",
  UNAVAILABLE: "UNAVAILABLE"
});

/**
 * Deep freezes an object recursively to guarantee immutability.
 */
export function deepFreeze(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    const prop = obj[key];
    if (prop !== null && typeof prop === "object" && !Object.isFrozen(prop)) {
      deepFreeze(prop);
    }
  }
  return obj;
}

/**
 * Produces a deterministic SHA-256 hash of any JavaScript structure with sorted keys.
 */
export function canonicalHash(data) {
  function stringifyCanonical(val) {
    if (val === null || typeof val !== "object") {
      return JSON.stringify(val);
    }
    if (Array.isArray(val)) {
      return "[" + val.map(stringifyCanonical).join(",") + "]";
    }
    const keys = Object.keys(val).sort();
    return "{" + keys.map(k => JSON.stringify(k) + ":" + stringifyCanonical(val[k])).join(",") + "}";
  }

  const serialized = stringifyCanonical(data);
  return crypto.createHash("sha256").update(serialized).digest("hex");
}
