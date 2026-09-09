/**
 * server/macro/macro.derived.engine.js
 * 
 * Phase 22: Deterministic Macro Derived Metrics Engine
 * Calculates growth rates, slopes, real rates, spreads, momentum, and surprises with fully disclosed formulas.
 */

import { MacroClassification, deepFreeze } from './macro.types.js';

/**
 * Computes deterministic derived metrics from macro time series and snapshots
 */
export class MacroDerivedEngine {
  /**
   * Growth rate calculation: (Current - Prior) / |Prior|
   */
  computeGrowthRate(currentValue, priorValue, periodType = 'YOY') {
    if (typeof currentValue !== 'number' || typeof priorValue !== 'number' || !Number.isFinite(currentValue) || !Number.isFinite(priorValue)) {
      return {
        growthRate: 'UNAVAILABLE',
        status: 'UNAVAILABLE_NON_NUMERIC_INPUTS',
        formula: '(current - prior) / |prior|',
        classification: MacroClassification.DERIVED
      };
    }

    if (priorValue === 0) {
      return {
        growthRate: 'UNAVAILABLE',
        status: 'UNAVAILABLE_DIVISOR_ZERO',
        formula: '(current - prior) / |prior|',
        classification: MacroClassification.DERIVED
      };
    }

    const growthRate = (currentValue - priorValue) / Math.abs(priorValue);

    return {
      growthRate,
      currentValue,
      priorValue,
      periodType,
      formula: '(currentValue - priorValue) / Math.abs(priorValue)',
      classification: MacroClassification.DERIVED
    };
  }

  /**
   * Yield curve slope calculation: 10Y yield - 2Y yield (in BPS and %)
   */
  computeYieldCurveSlope(yield10Y, yield2Y) {
    if (typeof yield10Y !== 'number' || typeof yield2Y !== 'number' || !Number.isFinite(yield10Y) || !Number.isFinite(yield2Y)) {
      return {
        slopePct: 'UNAVAILABLE',
        slopeBps: 'UNAVAILABLE',
        isInverted: 'UNAVAILABLE',
        status: 'UNAVAILABLE_MISSING_YIELDS',
        formula: 'yield10Y - yield2Y',
        classification: MacroClassification.DERIVED
      };
    }

    const slopePct = yield10Y - yield2Y;
    const slopeBps = Math.round(slopePct * 100);
    const isInverted = slopeBps <= 0;

    return {
      yield10Y,
      yield2Y,
      slopePct,
      slopeBps,
      isInverted,
      curveStatus: isInverted ? 'INVERTED' : (slopeBps < 50 ? 'FLAT' : 'NORMAL_STEEP'),
      formula: 'yield10Y - yield2Y',
      classification: MacroClassification.DERIVED
    };
  }

  /**
   * Real-rate proxy: Nominal Policy Rate - Core Inflation
   */
  computeRealRateProxy(nominalRate, inflationRate) {
    if (typeof nominalRate !== 'number' || typeof inflationRate !== 'number' || !Number.isFinite(nominalRate) || !Number.isFinite(inflationRate)) {
      return {
        realRate: 'UNAVAILABLE',
        status: 'UNAVAILABLE_MISSING_INPUTS',
        formula: 'nominalRate - inflationRate',
        classification: MacroClassification.DERIVED
      };
    }

    const realRate = nominalRate - inflationRate;
    return {
      nominalRate,
      inflationRate,
      realRate,
      isRestrictive: realRate > 0.015, // Real rate > 1.5% is restrictive
      formula: 'nominalRate - inflationRate',
      classification: MacroClassification.DERIVED
    };
  }

  /**
   * Credit spread change and momentum
   */
  computeCreditSpreadChange(currentSpreadBps, priorSpreadBps) {
    if (typeof currentSpreadBps !== 'number' || typeof priorSpreadBps !== 'number' || !Number.isFinite(currentSpreadBps) || !Number.isFinite(priorSpreadBps)) {
      return {
        spreadChangeBps: 'UNAVAILABLE',
        status: 'UNAVAILABLE_MISSING_SPREADS',
        formula: 'currentSpreadBps - priorSpreadBps',
        classification: MacroClassification.DERIVED
      };
    }

    const spreadChangeBps = currentSpreadBps - priorSpreadBps;
    const isWidening = spreadChangeBps > 0;
    const isSevereWidening = spreadChangeBps >= 75;

    return {
      currentSpreadBps,
      priorSpreadBps,
      spreadChangeBps,
      isWidening,
      isSevereWidening,
      formula: 'currentSpreadBps - priorSpreadBps',
      classification: MacroClassification.DERIVED
    };
  }

  /**
   * Macro Surprise vs expected / prior consensus
   */
  computeMacroSurprise(actualValue, expectedValue) {
    if (typeof actualValue !== 'number' || typeof expectedValue !== 'number' || !Number.isFinite(actualValue) || !Number.isFinite(expectedValue)) {
      return {
        absoluteSurprise: 'UNAVAILABLE',
        percentageSurprise: 'UNAVAILABLE',
        status: 'UNAVAILABLE_MISSING_EXPECTED',
        formula: 'actual - expected',
        classification: MacroClassification.DERIVED
      };
    }

    const absoluteSurprise = actualValue - expectedValue;
    const percentageSurprise = expectedValue !== 0 ? (absoluteSurprise / Math.abs(expectedValue)) : 'UNAVAILABLE_DIVISOR_ZERO';

    return {
      actualValue,
      expectedValue,
      absoluteSurprise,
      percentageSurprise,
      direction: absoluteSurprise > 0 ? 'BEAT_ABOVE' : (absoluteSurprise < 0 ? 'MISS_BELOW' : 'IN_LINE'),
      formula: 'actualValue - expectedValue',
      classification: MacroClassification.DERIVED
    };
  }
}

export const defaultMacroDerivedEngine = new MacroDerivedEngine();

export function calculateGrowth(current, prior) {
  if (typeof current !== 'number' || typeof prior !== 'number' || !Number.isFinite(current) || !Number.isFinite(prior) || prior === 0) {
    return null;
  }
  return (current - prior) / Math.abs(prior);
}

export function calculateSpread(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number' || !Number.isFinite(a) || !Number.isFinite(b)) {
    return null;
  }
  return Math.round((a - b) * 10000) / 10000;
}

export function calculateRealRate(nominal, inflation) {
  if (typeof nominal !== 'number' || typeof inflation !== 'number' || !Number.isFinite(nominal) || !Number.isFinite(inflation)) {
    return null;
  }
  return Math.round((nominal - inflation) * 10000) / 10000;
}

export function calculateSurprise(actual, consensus) {
  if (typeof actual !== 'number' || typeof consensus !== 'number' || !Number.isFinite(actual) || !Number.isFinite(consensus)) {
    return null;
  }
  return Math.round((actual - consensus) * 10000) / 10000;
}
