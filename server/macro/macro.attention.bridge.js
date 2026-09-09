/**
 * server/macro/macro.attention.bridge.js
 * 
 * Phase 22: Macro Attention Intelligence Bridge (Phase 7 Integration)
 * Computes deterministic additive attention scores for macro shocks and regime transitions.
 */

import { MacroClassification, deepFreeze } from './macro.types.js';

export function evaluateMacroAttentionImpact(macroSignals = {}) {
  const baseScore = 20;
  let totalScore = baseScore;
  const contributions = [];

  // 1. Regime Change Contribution
  if (macroSignals.hasRegimeTransition === true) {
    totalScore += 45;
    contributions.push({
      category: 'MACRO_REGIME_CHANGE',
      scoreContribution: 45,
      formula: 'base + 45 (Regime Transition Detected)',
      evidence: `Regime transitioned from ${macroSignals.previousRegime || 'UNKNOWN'} to ${macroSignals.currentRegime || 'UNKNOWN'}`
    });
  }

  // 2. Credit Stress Shock
  if (macroSignals.creditSpreadWideningBps && macroSignals.creditSpreadWideningBps >= 75) {
    totalScore += 55;
    contributions.push({
      category: 'CREDIT_STRESS',
      scoreContribution: 55,
      formula: 'base + 55 (Credit OAS Widening >= 75 bps)',
      evidence: `Credit spreads widened by ${macroSignals.creditSpreadWideningBps} bps`
    });
  }

  // 3. Rate Shock
  if (macroSignals.rateShockBps && Math.abs(macroSignals.rateShockBps) >= 50) {
    totalScore += 40;
    contributions.push({
      category: 'RATE_SHOCK',
      scoreContribution: 40,
      formula: 'base + 40 (Benchmark Yield Shock >= 50 bps)',
      evidence: `Benchmark rate changed by ${macroSignals.rateShockBps} bps`
    });
  }

  // 4. Yield Curve Inversion
  if (macroSignals.yieldCurveInverted === true) {
    totalScore += 40;
    contributions.push({
      category: 'YIELD_CURVE_INVERSION',
      scoreContribution: 40,
      formula: 'base + 40 (10Y-2Y Yield Curve Inverted)',
      evidence: 'Yield curve slope is inverted'
    });
  }

  // 5. Commodity Shock
  if (macroSignals.commodityShockPct && Math.abs(macroSignals.commodityShockPct) >= 0.15) {
    totalScore += 30;
    contributions.push({
      category: 'COMMODITY_SHOCK',
      scoreContribution: 30,
      formula: 'base + 30 (Commodity Shock >= 15%)',
      evidence: `Commodity moved by ${(macroSignals.commodityShockPct * 100).toFixed(1)}%`
    });
  }

  const finalScore = Math.max(0, Math.min(100, totalScore));

  let attentionLevel = 'LOW';
  if (finalScore >= 80) {
    attentionLevel = 'CRITICAL';
  } else if (finalScore >= 65) {
    attentionLevel = 'HIGH';
  } else if (finalScore >= 40) {
    attentionLevel = 'MEDIUM';
  }

  return deepFreeze({
    baseScore,
    attentionScore: finalScore,
    attentionLevel,
    triggers: contributions.map(c => ({ reason: c.category, detail: c.evidence })),
    contributions: Object.freeze(contributions),
    classification: MacroClassification.DERIVED
  });
}

export function generateMacroAttentionSignal(params = {}) {
  const { macroMetric, surpriseMagnitude, regimeChange, previousRegime, newRegime } = params;
  let score = 30;

  if (regimeChange) {
    score += 45;
  }
  if (typeof surpriseMagnitude === 'number' && surpriseMagnitude > 0.5) {
    score += 20;
  }

  const rationale = `Regime change from ${previousRegime || 'PREV'} to ${newRegime || 'NEW'} with ${macroMetric || 'metric'} surprise ${surpriseMagnitude ?? 0}`;

  return deepFreeze({
    attentionScore: Math.min(100, score),
    additive: true,
    rationale,
    classification: 'MODEL_ESTIMATE'
  });
}

