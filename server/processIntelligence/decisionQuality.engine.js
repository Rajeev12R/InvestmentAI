/**
 * Phase 13 - Decision Quality Engine
 * 
 * Computes deterministic multi-dimensional Process Quality independent of outcome.
 * Implements the 2x2 Decision Quality vs Outcome Matrix.
 * Config-versioned scoring and thresholds.
 * 
 * Decision quality != investment outcome.
 */

import {
  deepFreeze,
  computeDeterministicHash,
  DecisionOutcomeClassification,
  RiskDisciplineClassification
} from './process.types.js';
import { PROCESS_SCORE_CONFIG_V1, getScoringConfig } from './processConfig.js';

export class DecisionQualityEngine {
  /**
   * Evaluate multi-dimensional decision quality score (0-100)
   */
  evaluateDecisionQuality(params) {
    const {
      decisionSnapshot,
      thesisVersion,
      valuationDisciplineScore = null, // 0-100 or null
      riskDisciplineScore = null,      // 0-100 or null
      evidenceQualityScore = null,     // 0-100 or null
      evidenceCoverageScore = null,    // 0-100 or null
      falsificationAwarenessScore = null, // 0-100 or null
      forecastQualityScore = null,     // 0-100 or null
      scoringConfig = PROCESS_SCORE_CONFIG_V1
    } = params;

    if (!decisionSnapshot) {
      throw new Error('DecisionSnapshot is required for evaluating decision quality');
    }

    const config = typeof scoringConfig === 'string' ? getScoringConfig(scoringConfig) : (scoringConfig || PROCESS_SCORE_CONFIG_V1);

    const dimensions = [];
    let weightedSum = 0;
    let totalWeight = 0;

    // Dimension 1: Evidence Quality
    const wEv = config.evidenceWeight;
    if (evidenceQualityScore !== null && typeof evidenceQualityScore === 'number') {
      dimensions.push({ name: 'Evidence Quality', weight: wEv, score: evidenceQualityScore, status: 'AVAILABLE' });
      weightedSum += evidenceQualityScore * wEv;
      totalWeight += wEv;
    } else {
      // Derive from evidence count / package presence
      const hasEvPackage = Boolean(decisionSnapshot.evidencePackageHash);
      const evCount = (decisionSnapshot.evidenceIds || []).length;
      const derivedScore = hasEvPackage ? Math.min(100, 50 + evCount * 10) : (evCount > 0 ? 50 : null);
      if (derivedScore !== null) {
        dimensions.push({ name: 'Evidence Quality', weight: wEv, score: derivedScore, status: 'DERIVED' });
        weightedSum += derivedScore * wEv;
        totalWeight += wEv;
      } else {
        dimensions.push({ name: 'Evidence Quality', weight: wEv, score: null, status: 'UNAVAILABLE', reasonCode: 'NO_EVIDENCE_RECORDED' });
      }
    }

    // Dimension 2: Evidence Coverage
    const wCov = config.coverageWeight;
    if (evidenceCoverageScore !== null && typeof evidenceCoverageScore === 'number') {
      dimensions.push({ name: 'Evidence Coverage', weight: wCov, score: evidenceCoverageScore, status: 'AVAILABLE' });
      weightedSum += evidenceCoverageScore * wCov;
      totalWeight += wCov;
    } else {
      const drivers = decisionSnapshot.expectedDrivers || [];
      const coveredDrivers = drivers.filter(d => (d.evidenceIds && d.evidenceIds.length > 0) || (decisionSnapshot.evidenceIds && decisionSnapshot.evidenceIds.length > 0)).length;
      const coverageRatio = drivers.length > 0 ? coveredDrivers / drivers.length : ((decisionSnapshot.evidenceIds && decisionSnapshot.evidenceIds.length > 0) ? 0.8 : null);
      if (coverageRatio !== null) {
        const derivedScore = Math.round(coverageRatio * 100);
        dimensions.push({ name: 'Evidence Coverage', weight: wCov, score: derivedScore, status: 'DERIVED' });
        weightedSum += derivedScore * wCov;
        totalWeight += wCov;
      } else {
        dimensions.push({ name: 'Evidence Coverage', weight: wCov, score: null, status: 'UNAVAILABLE', reasonCode: 'NO_DRIVER_EVIDENCE_LINK' });
      }
    }

    // Dimension 3: Valuation Discipline
    const wVal = config.valuationWeight;
    if (valuationDisciplineScore !== null && typeof valuationDisciplineScore === 'number') {
      dimensions.push({ name: 'Valuation Discipline', weight: wVal, score: valuationDisciplineScore, status: 'AVAILABLE' });
      weightedSum += valuationDisciplineScore * wVal;
      totalWeight += wVal;
    } else if (decisionSnapshot.valuationState) {
      const v = decisionSnapshot.valuationState;
      let valScore = 70;
      if (v.fairValue && decisionSnapshot.decisionPrice) {
        const discount = (v.fairValue - decisionSnapshot.decisionPrice) / v.fairValue;
        if (discount >= 0.15) valScore = 90; // bought at significant margin of safety
        else if (discount >= 0.0) valScore = 75;
        else valScore = 40; // bought above fair value
      }
      dimensions.push({ name: 'Valuation Discipline', weight: wVal, score: valScore, status: 'DERIVED' });
      weightedSum += valScore * wVal;
      totalWeight += wVal;
    } else {
      dimensions.push({ name: 'Valuation Discipline', weight: wVal, score: null, status: 'UNAVAILABLE', reasonCode: 'NO_HISTORICAL_VALUATION_RECORD' });
    }

    // Dimension 4: Risk Discipline
    const wRisk = config.riskWeight;
    if (riskDisciplineScore !== null && typeof riskDisciplineScore === 'number') {
      dimensions.push({ name: 'Risk Discipline', weight: wRisk, score: riskDisciplineScore, status: 'AVAILABLE' });
      weightedSum += riskDisciplineScore * wRisk;
      totalWeight += wRisk;
    } else if (decisionSnapshot.riskState) {
      let rScore = 75;
      if (decisionSnapshot.positionSize && decisionSnapshot.positionSize > 0.25) {
        rScore = 40; // oversized position relative to single stock risk limit
      }
      dimensions.push({ name: 'Risk Discipline', weight: wRisk, score: rScore, status: 'DERIVED' });
      weightedSum += rScore * wRisk;
      totalWeight += wRisk;
    } else {
      dimensions.push({ name: 'Risk Discipline', weight: wRisk, score: null, status: 'UNAVAILABLE', reasonCode: 'NO_HISTORICAL_RISK_RECORD' });
    }

    // Dimension 5: Thesis Clarity
    const wTh = config.thesisWeight;
    const hasStatement = thesisVersion && thesisVersion.thesisStatement && thesisVersion.thesisStatement.length > 20;
    const hasDrivers = thesisVersion && (thesisVersion.expectedDrivers || []).length > 0;
    const hasFalsification = thesisVersion && (thesisVersion.falsificationConditions || []).length > 0;
    if (hasStatement && hasDrivers && hasFalsification) {
      const tScore = 95;
      dimensions.push({ name: 'Thesis Clarity', weight: wTh, score: tScore, status: 'DERIVED' });
      weightedSum += tScore * wTh;
      totalWeight += wTh;
    } else if (hasStatement || hasDrivers) {
      const tScore = 65;
      dimensions.push({ name: 'Thesis Clarity', weight: wTh, score: tScore, status: 'DERIVED' });
      weightedSum += tScore * wTh;
      totalWeight += wTh;
    } else {
      dimensions.push({ name: 'Thesis Clarity', weight: wTh, score: null, status: 'UNAVAILABLE', reasonCode: 'INSUFFICIENT_THESIS_STRUCTURE' });
    }

    // Dimension 6: Falsification Awareness
    const wFals = config.falsificationWeight;
    if (falsificationAwarenessScore !== null && typeof falsificationAwarenessScore === 'number') {
      dimensions.push({ name: 'Falsification Awareness', weight: wFals, score: falsificationAwarenessScore, status: 'AVAILABLE' });
      weightedSum += falsificationAwarenessScore * wFals;
      totalWeight += wFals;
    } else {
      const fCount = (decisionSnapshot.falsificationTriggers || []).length + ((thesisVersion && thesisVersion.falsificationConditions) || []).length;
      if (fCount >= 2) {
        dimensions.push({ name: 'Falsification Awareness', weight: wFals, score: 90, status: 'DERIVED' });
        weightedSum += 90 * wFals;
        totalWeight += wFals;
      } else if (fCount === 1) {
        dimensions.push({ name: 'Falsification Awareness', weight: wFals, score: 70, status: 'DERIVED' });
        weightedSum += 70 * wFals;
        totalWeight += wFals;
      } else {
        dimensions.push({ name: 'Falsification Awareness', weight: wFals, score: null, status: 'UNAVAILABLE', reasonCode: 'NO_FALSIFICATION_CONDITIONS_DEFINED' });
      }
    }

    // Dimension 7: Forecast Quality
    const wFc = config.forecastWeight;
    if (forecastQualityScore !== null && typeof forecastQualityScore === 'number') {
      dimensions.push({ name: 'Forecast Quality', weight: wFc, score: forecastQualityScore, status: 'AVAILABLE' });
      weightedSum += forecastQualityScore * wFc;
      totalWeight += wFc;
    } else {
      const fIds = decisionSnapshot.forecastIds || [];
      if (fIds.length >= 2) {
        dimensions.push({ name: 'Forecast Quality', weight: wFc, score: 85, status: 'DERIVED' });
        weightedSum += 85 * wFc;
        totalWeight += wFc;
      } else if (fIds.length === 1) {
        dimensions.push({ name: 'Forecast Quality', weight: wFc, score: 65, status: 'DERIVED' });
        weightedSum += 65 * wFc;
        totalWeight += wFc;
      } else {
        dimensions.push({ name: 'Forecast Quality', weight: wFc, score: null, status: 'UNAVAILABLE', reasonCode: 'NO_EXPLICIT_FORECASTS' });
      }
    }

    // Calculate final overall score
    let overallScore = null;
    let isSufficientData = totalWeight >= (config.minEvaluatedWeightThreshold || 0.50);

    if (isSufficientData && totalWeight > 0) {
      overallScore = Math.round((weightedSum / totalWeight) * 100) / 100;
    }

    const isGoodDecision = overallScore !== null && overallScore >= config.goodDecisionThreshold;

    return deepFreeze({
      decisionId: decisionSnapshot.decisionId,
      workspaceId: decisionSnapshot.workspaceId,
      ticker: decisionSnapshot.ticker,
      overallScore,
      isGoodDecision,
      isSufficientData,
      totalEvaluatedWeight: Math.round(totalWeight * 100) / 100,
      dimensions,
      scoringConfigId: config.configId,
      scoringConfigVersion: config.version,
      evaluatedAt: new Date().toISOString()
    });
  }

  /**
   * Classify decision vs outcome in the 2x2 Matrix
   * Benchmark-aware: Positive return when benchmark is +30% and stock is +2% may be underperformance
   */
  classifyDecisionVsOutcome(params) {
    const {
      decisionQualityScore,
      stockReturn,
      benchmarkReturn = null,
      excessReturn = null
    } = params;

    if (!decisionQualityScore || decisionQualityScore.overallScore === null || !decisionQualityScore.isSufficientData) {
      return {
        classification: DecisionOutcomeClassification.INSUFFICIENT_DATA,
        reason: 'Insufficient decision quality data',
        isGoodDecision: null,
        isGoodOutcome: null
      };
    }

    if (typeof stockReturn !== 'number') {
      return {
        classification: DecisionOutcomeClassification.INSUFFICIENT_DATA,
        reason: 'Missing outcome return data',
        isGoodDecision: decisionQualityScore.isGoodDecision,
        isGoodOutcome: null
      };
    }

    const isGoodDecision = decisionQualityScore.isGoodDecision;

    // Benchmark-aware outcome determination
    let isGoodOutcome = false;
    if (typeof excessReturn === 'number') {
      isGoodOutcome = excessReturn >= 0.0;
    } else if (typeof benchmarkReturn === 'number') {
      isGoodOutcome = (stockReturn - benchmarkReturn) >= 0.0;
    } else {
      isGoodOutcome = stockReturn >= 0.0;
    }

    let classification;
    if (isGoodDecision && isGoodOutcome) {
      classification = DecisionOutcomeClassification.GOOD_DECISION_GOOD_OUTCOME;
    } else if (isGoodDecision && !isGoodOutcome) {
      classification = DecisionOutcomeClassification.GOOD_DECISION_BAD_OUTCOME;
    } else if (!isGoodDecision && isGoodOutcome) {
      classification = DecisionOutcomeClassification.BAD_DECISION_GOOD_OUTCOME;
    } else {
      classification = DecisionOutcomeClassification.BAD_DECISION_BAD_OUTCOME;
    }

    return deepFreeze({
      classification,
      isGoodDecision,
      isGoodOutcome,
      decisionScore: decisionQualityScore.overallScore,
      stockReturn,
      benchmarkReturn,
      excessReturn: typeof excessReturn === 'number' ? excessReturn : (typeof benchmarkReturn === 'number' ? stockReturn - benchmarkReturn : null),
      scoringConfigId: decisionQualityScore.scoringConfigId || 'PROCESS_SCORE_CONFIG_V1',
      evaluatedAt: new Date().toISOString()
    });
  }
}

export const decisionQualityEngine = new DecisionQualityEngine();
