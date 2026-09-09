/**
 * server/earnings/earnings.risk.engine.js
 * 
 * Phase 21: Deterministic Event-Driven Risk Engine
 * Computes risk score shifts across Financial Risk, Quality Risk, Growth Risk, Valuation Risk, and Event Risk.
 */

import { EventClassification } from './earnings.types.js';

/**
 * Computes event-driven risk adjustments deterministically across 5 dimensions:
 * 1. Financial Risk
 * 2. Quality Risk
 * 3. Growth Risk
 * 4. Valuation Risk
 * 5. Event Risk
 * 
 * Invariant: previousScore + eventContribution = newScore (Bounded strictly [0, 100])
 * 
 * @param {Object} baselineRiskScores - { financialRisk, qualityRisk, growthRisk, valuationRisk, eventRisk }
 * @param {Object} eventSignals - { surpriseReport, qualityAssessment, guidanceRecord, leverageDelta }
 * @returns {Object} Updated risk profile with delta explanations
 */
export function evaluateEventRiskDrift(baselineRiskScores = {}, eventSignals = {}) {
  const clamp = (val) => Math.max(0, Math.min(100, Number.isFinite(val) ? val : 50));

  const baseFinancial = clamp(typeof baselineRiskScores.financialRisk === 'number' ? baselineRiskScores.financialRisk : 40);
  const baseQuality = clamp(typeof baselineRiskScores.qualityRisk === 'number' ? baselineRiskScores.qualityRisk : 30);
  const baseGrowth = clamp(typeof baselineRiskScores.growthRisk === 'number' ? baselineRiskScores.growthRisk : 35);
  const baseValuation = clamp(typeof baselineRiskScores.valuationRisk === 'number' ? baselineRiskScores.valuationRisk : 45);
  const baseEvent = clamp(typeof baselineRiskScores.eventRisk === 'number' ? baselineRiskScores.eventRisk : 20);

  let deltaFinancial = 0;
  let deltaQuality = 0;
  let deltaGrowth = 0;
  let deltaValuation = 0;
  let deltaEvent = 0;

  const riskDrivers = [];

  // 1. Quality Dimension (Weight: 1.0, Threshold: Accrual Anomaly or Low CFO/NI)
  if (eventSignals.qualityAssessment && !eventSignals.qualityAssessment.isHighQuality) {
    deltaQuality += 15;
    riskDrivers.push({
      dimension: 'QUALITY_RISK',
      previousScore: baseQuality,
      eventContribution: 15,
      newScore: clamp(baseQuality + deltaQuality),
      formula: 'previousScore + 15 (Quality Grade Downgrade)',
      weight: 1.0,
      threshold: 'accrualRatio > 0.10 OR cfoToNi < 0.80',
      evidence: eventSignals.qualityAssessment.flags?.join(', ') || 'Quality downgrade'
    });
  }

  // 2. Growth Dimension (Weight: 1.0, Threshold: Revenue Miss or Guidance Cut)
  if (eventSignals.surpriseReport?.surprises?.REVENUE?.isMiss || eventSignals.surpriseReport?.surprises?.DILUTED_EPS?.isMiss) {
    deltaGrowth += 10;
    deltaEvent += 15;
    riskDrivers.push({
      dimension: 'GROWTH_RISK',
      previousScore: baseGrowth,
      eventContribution: 10,
      newScore: clamp(baseGrowth + 10),
      formula: 'previousScore + 10 (Quarterly Top/Bottom Line Miss)',
      weight: 1.0,
      threshold: 'actual < consensus',
      evidence: 'Quarterly financial miss increased forward growth uncertainty'
    });
  }

  if (eventSignals.guidanceRecord?.revisionDirection === 'CUT') {
    deltaGrowth += 10;
    riskDrivers.push({
      dimension: 'GROWTH_RISK',
      previousScore: baseGrowth + deltaGrowth - 10,
      eventContribution: 10,
      newScore: clamp(baseGrowth + deltaGrowth),
      formula: 'previousScore + 10 (Guidance Cut)',
      weight: 1.0,
      threshold: 'guidanceMidpointDelta < 0',
      evidence: 'Forward guidance cut by management'
    });
  }

  // 3. Financial Dimension (Leverage / Cash Flow drift)
  if (eventSignals.leverageDelta && typeof eventSignals.leverageDelta === 'number' && eventSignals.leverageDelta > 0.5) {
    deltaFinancial += 10;
    riskDrivers.push({
      dimension: 'FINANCIAL_RISK',
      previousScore: baseFinancial,
      eventContribution: 10,
      newScore: clamp(baseFinancial + deltaFinancial),
      formula: 'previousScore + 10 (Debt Leverage Expansion > 0.5x)',
      weight: 1.0,
      threshold: 'leverageDelta > 0.5',
      evidence: `Net Debt / EBITDA expanded by ${eventSignals.leverageDelta.toFixed(2)}x`
    });
  }

  // 4. Valuation Dimension (Multiple Expansion / Compression Normalized Drift)
  // Invariant:
  // If PriorForwardPE <= 0 -> MultipleDriftPct = UNAVAILABLE, RiskContribution = 0, ValuationRiskNew = BaseValuationRisk
  // If PriorForwardPE > 0  -> MultipleDriftPct = (Current - Prior) / Prior
  //                           RiskContribution = clamp(round(DriftPct * 20), -20, 20)
  //                           ValuationRiskNew = clamp(BaseValuationRisk + RiskContribution, 0, 100)
  if (eventSignals.valuationDrift && typeof eventSignals.valuationDrift === 'object') {
    const { currentMultiple, priorMultiple, multipleMetric = 'FORWARD_PE' } = eventSignals.valuationDrift;
    if (typeof priorMultiple === 'number' && Number.isFinite(priorMultiple) && priorMultiple <= 0) {
      riskDrivers.push({
        dimension: 'VALUATION_RISK',
        previousScore: baseValuation,
        eventContribution: 0,
        multipleDriftPct: 'UNAVAILABLE',
        status: 'UNAVAILABLE_NON_POSITIVE_PRIOR_MULTIPLE',
        newScore: baseValuation,
        formula: 'PriorMultiple <= 0 -> MultipleDriftPct = UNAVAILABLE, RiskContribution = 0',
        weight: 1.0,
        threshold: 'PriorMultiple <= 0',
        evidence: `${multipleMetric} prior multiple is non-positive (${priorMultiple}x); multiple drift is UNAVAILABLE, base risk unchanged`
      });
    } else if (typeof currentMultiple === 'number' && typeof priorMultiple === 'number' && Number.isFinite(currentMultiple) && Number.isFinite(priorMultiple) && priorMultiple > 0) {
      const driftPct = (currentMultiple - priorMultiple) / priorMultiple;
      const riskContribution = Math.max(-20, Math.min(20, Math.round(driftPct * 20)));
      deltaValuation += riskContribution;
      riskDrivers.push({
        dimension: 'VALUATION_RISK',
        previousScore: baseValuation,
        eventContribution: riskContribution,
        multipleDriftPct: driftPct,
        newScore: clamp(baseValuation + deltaValuation),
        formula: `previousScore + clamp(round(((current - prior)/prior) * 20), -20, 20) [${multipleMetric}]`,
        weight: 1.0,
        threshold: 'Multiple drift percentage',
        evidence: `${multipleMetric} drifted from ${priorMultiple.toFixed(2)}x to ${currentMultiple.toFixed(2)}x (${(driftPct * 100).toFixed(2)}%)`
      });
    } else {
      riskDrivers.push({
        dimension: 'VALUATION_RISK',
        previousScore: baseValuation,
        eventContribution: 0,
        multipleDriftPct: 'UNAVAILABLE',
        status: 'UNAVAILABLE_INVALID_OR_MISSING_DATA',
        newScore: baseValuation,
        formula: 'MultipleDriftPct = UNAVAILABLE, RiskContribution = 0',
        weight: 1.0,
        threshold: 'Missing or non-finite multiple values',
        evidence: `${multipleMetric} inputs invalid or missing; multiple drift is UNAVAILABLE, base risk unchanged`
      });
    }
  } else if (typeof eventSignals.multipleDrift === 'number' && Number.isFinite(eventSignals.multipleDrift)) {
    deltaValuation += Math.max(-20, Math.min(20, eventSignals.multipleDrift));
  }

  const newFinancial = clamp(baseFinancial + deltaFinancial);
  const newQuality = clamp(baseQuality + deltaQuality);
  const newGrowth = clamp(baseGrowth + deltaGrowth);
  const newValuation = clamp(baseValuation + deltaValuation);
  const newEvent = clamp(baseEvent + deltaEvent);

  const compositeRiskScore = (newFinancial + newQuality + newGrowth + newValuation + newEvent) / 5.0;

  return Object.freeze({
    baselineRiskScores: {
      financialRisk: baseFinancial,
      qualityRisk: baseQuality,
      growthRisk: baseGrowth,
      valuationRisk: baseValuation,
      eventRisk: baseEvent
    },
    updatedRiskScores: {
      financialRisk: newFinancial,
      qualityRisk: newQuality,
      growthRisk: newGrowth,
      valuationRisk: newValuation,
      eventRisk: newEvent
    },
    deltas: {
      financialRiskDelta: deltaFinancial,
      qualityRiskDelta: deltaQuality,
      growthRiskDelta: deltaGrowth,
      valuationRiskDelta: deltaValuation,
      eventRiskDelta: deltaEvent
    },
    compositeRiskScore,
    riskDrivers,
    configVersion: '21.1.0',
    classification: EventClassification.DERIVED
  });
}
