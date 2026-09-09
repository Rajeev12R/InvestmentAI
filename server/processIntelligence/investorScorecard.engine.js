/**
 * Phase 13 - Investor Scorecard & Learning Loop Engine
 * 
 * Computes aggregate institutional process scorecard, learning loop insights,
 * and survivorship/selection bias metrics.
 */

import { deepFreeze, computeDeterministicHash } from './process.types.js';
import { PROCESS_THRESHOLDS_V1 } from './processConfig.js';

export class InvestorScorecardEngine {
  /**
   * Compute comprehensive aggregate investor scorecard
   */
  computeScorecard(params) {
    const {
      workspaceId,
      evaluatedDecisions = [],
      allDecisions = [], // for survivorship and selection bias checks
      scoredForecasts = [],
      calibrationSummary = null,
      driftSummary = null
    } = params;

    // 1. Dataset Completeness & Survivorship Bias Metrics
    const totalEligibleDecisions = (allDecisions.length > 0 ? allDecisions : evaluatedDecisions).length;
    const evaluatedCount = evaluatedDecisions.length;
    const evaluationCoverage = totalEligibleDecisions > 0 ? Math.round((evaluatedCount / totalEligibleDecisions) * 1000) / 1000 : 1.0;

    const closedDecisionsCount = evaluatedDecisions.filter(d => d.decisionSnapshot && d.decisionSnapshot.decisionStatus === 'CLOSED').length;
    const openDecisionsCount = evaluatedDecisions.filter(d => d.decisionSnapshot && d.decisionSnapshot.decisionStatus === 'ACTIVE').length;
    const unresolvedDecisionsCount = evaluatedDecisions.filter(d => !d.decisionVsOutcome || d.decisionVsOutcome.isGoodOutcome === null).length;
    const missingObservationsCount = evaluatedDecisions.filter(d => !d.outcomeObservation || d.outcomeObservation.actualValue === null).length;

    // 2. Scorecard Dimensions Calculation
    const scores = [];

    // Decision Quality Average
    const validDQ = evaluatedDecisions
      .map(d => d.decisionQuality ? d.decisionQuality.overallScore : null)
      .filter(s => typeof s === 'number');
    const avgDQ = validDQ.length > 0 ? Math.round((validDQ.reduce((a, b) => a + b, 0) / validDQ.length) * 10) / 10 : null;
    scores.push({
      dimension: 'Decision Quality',
      score: avgDQ,
      sampleSize: validDQ.length,
      formula: 'MEAN(overallScore for all evaluated decisions)',
      confidence: validDQ.length >= 5 ? 'HIGH' : (validDQ.length >= 2 ? 'MODERATE' : 'LOW')
    });

    // Thesis Quality Average
    const validThesis = evaluatedDecisions
      .map(d => d.thesisEvaluation ? d.thesisEvaluation.score : null)
      .filter(s => typeof s === 'number');
    const avgThesis = validThesis.length > 0 ? Math.round((validThesis.reduce((a, b) => a + b, 0) / validThesis.length) * 100) : null;
    scores.push({
      dimension: 'Thesis Quality',
      score: avgThesis,
      sampleSize: validThesis.length,
      formula: 'MEAN(thesisScore for all evaluated theses) * 100',
      confidence: validThesis.length >= 5 ? 'HIGH' : (validThesis.length >= 2 ? 'MODERATE' : 'LOW')
    });

    // Forecast Accuracy
    const resolvedForecasts = scoredForecasts.filter(f => f.status === 'VALIDATED' || f.status === 'PARTIALLY_VALIDATED' || f.status === 'FALSIFIED');
    const validatedForecasts = scoredForecasts.filter(f => f.status === 'VALIDATED' || f.status === 'PARTIALLY_VALIDATED');
    const forecastAccuracy = resolvedForecasts.length > 0 ? Math.round((validatedForecasts.length / resolvedForecasts.length) * 1000) / 10 : null;
    scores.push({
      dimension: 'Forecast Accuracy',
      score: forecastAccuracy,
      sampleSize: resolvedForecasts.length,
      formula: 'validatedForecasts / resolvedForecasts * 100',
      confidence: resolvedForecasts.length >= 10 ? 'HIGH' : (resolvedForecasts.length >= 4 ? 'MODERATE' : 'LOW')
    });

    // Forecast Calibration Score
    let calScore = null;
    if (calibrationSummary && calibrationSummary.overallCalibrationError !== null) {
      calScore = Math.max(0, Math.round((1.0 - calibrationSummary.overallCalibrationError) * 1000) / 10);
    }
    scores.push({
      dimension: 'Forecast Calibration',
      score: calScore,
      sampleSize: (calibrationSummary && calibrationSummary.brierSampleCount) || 0,
      formula: 'MAX(0, (1 - calibrationError) * 100)',
      confidence: (calibrationSummary && calibrationSummary.isSufficientSample) ? 'HIGH' : 'LOW'
    });

    // Risk Discipline
    const riskDisciplinePasses = evaluatedDecisions.filter(d => {
      const snap = d.decisionSnapshot;
      return snap && typeof snap.positionSize === 'number' && snap.positionSize <= 0.25;
    }).length;
    const riskScore = evaluatedCount > 0 ? Math.round((riskDisciplinePasses / evaluatedCount) * 1000) / 10 : null;
    scores.push({
      dimension: 'Risk Discipline',
      score: riskScore,
      sampleSize: evaluatedCount,
      formula: 'decisionsWithAppropriateRisk / totalDecisions * 100',
      confidence: evaluatedCount >= 5 ? 'HIGH' : 'LOW'
    });

    // Overall Aggregate Score
    const availableScores = scores.filter(s => s.score !== null);
    const overallProcessScore = availableScores.length >= 3 
      ? Math.round((availableScores.reduce((a, b) => a + b.score, 0) / availableScores.length) * 10) / 10 
      : null;

    // 3. Generate Learning Loop Insights (Strictly grounded in deterministic evidence)
    const insights = [];

    // Calibration Insight
    if (calibrationSummary && calibrationSummary.buckets) {
      const highBucket = calibrationSummary.buckets.find(b => b.bucket === '80-89%' || b.bucket === '90-100%');
      if (highBucket && highBucket.isSufficientSample) {
        insights.push({
          insightId: 'INSIGHT_CALIBRATION_HIGH_CONFIDENCE',
          type: 'CALIBRATION',
          message: `Your ${highBucket.bucket} confidence forecasts have historically been validated ${Math.round(highBucket.empiricalAccuracy * 100)}% of the time across ${highBucket.forecastCount} forecasts.`,
          supportingEvidenceIds: []
        });
      }
    }

    // Good Decision vs Bad Outcome Insight
    const goodDecisionBadOutcomes = evaluatedDecisions.filter(d => d.decisionVsOutcome && d.decisionVsOutcome.classification === 'GOOD_DECISION_BAD_OUTCOME');
    if (goodDecisionBadOutcomes.length > 0) {
      insights.push({
        insightId: 'INSIGHT_GOOD_DECISION_BAD_OUTCOME',
        type: 'PROCESS_RESILIENCE',
        message: `${goodDecisionBadOutcomes.length} investment decisions demonstrated robust process quality (disciplined valuation, verified thesis) despite suffering unfavorable market returns due to external benchmark/sector drawdowns.`,
        supportingEvidenceIds: goodDecisionBadOutcomes.map(d => d.decisionSnapshot ? d.decisionSnapshot.decisionId : d.decisionId).filter(Boolean)
      });
    }

    // Bad Decision vs Good Outcome Insight (Speculative Luck)
    const badDecisionGoodOutcomes = evaluatedDecisions.filter(d => d.decisionVsOutcome && d.decisionVsOutcome.classification === 'BAD_DECISION_GOOD_OUTCOME');
    if (badDecisionGoodOutcomes.length > 0) {
      insights.push({
        insightId: 'INSIGHT_BAD_DECISION_GOOD_OUTCOME',
        type: 'LUCK_DETECTION',
        message: `${badDecisionGoodOutcomes.length} profitable investments were generated under weak process discipline (unsupported thesis or excessive risk), indicating outcome luck rather than repeatable skill.`,
        supportingEvidenceIds: badDecisionGoodOutcomes.map(d => d.decisionSnapshot ? d.decisionSnapshot.decisionId : d.decisionId).filter(Boolean)
      });
    }

    // Process Drift Insight
    if (driftSummary && driftSummary.patternsDetected && driftSummary.patternsDetected.length > 0) {
      for (const p of driftSummary.patternsDetected) {
        insights.push({
          insightId: `INSIGHT_DRIFT_${p.patternId}`,
          type: 'PROCESS_DRIFT',
          message: `${p.name}: ${p.description}`,
          supportingEvidenceIds: p.supportingDecisionIds || []
        });
      }
    }

    const payloadToHash = {
      workspaceId,
      overallProcessScore,
      isSufficientData: availableScores.length >= 3,
      dimensions: scores,
      learningInsights: insights,
      biasControls: {
        totalEligibleDecisions,
        eligibleDecisions: totalEligibleDecisions,
        evaluatedDecisionsCount: evaluatedCount,
        evaluatedDecisions: evaluatedCount,
        evaluationCoverage,
        closedDecisionsCount,
        closedDecisions: closedDecisionsCount,
        openDecisionsCount,
        openDecisions: openDecisionsCount,
        unresolvedDecisionsCount,
        unresolvedDecisions: unresolvedDecisionsCount,
        missingObservationsCount,
        missingOutcomeCount: missingObservationsCount,
        isSurvivorshipBiasProtected: evaluationCoverage >= (PROCESS_THRESHOLDS_V1.biasControls.minSurvivorshipCoverage || 0.80)
      },
      thresholdConfigId: PROCESS_THRESHOLDS_V1.thresholdConfigId,
      computedAt: new Date().toISOString()
    };

    const packageHash = computeDeterministicHash(payloadToHash);

    const scorecard = {
      ...payloadToHash,
      packageHash
    };

    return deepFreeze(scorecard);
  }
}

export const investorScorecardEngine = new InvestorScorecardEngine();
