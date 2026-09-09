/**
 * @file attention.portfolio.engine.js
 * Generates portfolio-level AttentionItems for multi-asset concentration, correlation,
 * and structural exposure changes.
 */

import { calculateAttentionScore } from './attention.scoring.js';
import { generateAttentionExplanation } from './attention.explanation.js';
import { generateInvestigationQuestions } from './attention.questionGenerator.js';
import { AttentionCategory, TriggerType } from './attention.types.js';
import { ATTENTION_THRESHOLDS } from './attentionThresholds.js';

/**
 * Evaluates portfolio state and exposure metrics to generate portfolio AttentionItems.
 * @param {Object} params
 * @param {Object} params.portfolioState Output from portfolioIntelligence.engine.js
 * @returns {Array<Object>} Portfolio-level AttentionItems
 */
export function evaluatePortfolioAttention({ portfolioState }) {
  if (!portfolioState || !portfolioState.exposureMetrics) return [];

  const candidates = [];
  const exp = portfolioState.exposureMetrics;
  const detectedAt = portfolioState.generatedAt || new Date().toISOString();
  const pkgHash = portfolioState.stateHash || 'PORTFOLIO_STATE_LATEST';

  // 1. Single Position Concentration Attention
  if (exp.top1Weight >= ATTENTION_THRESHOLDS.PORTFOLIO_CONCENTRATION_THRESHOLDS.TOP_1_HIGH) {
    const topHolding = (portfolioState.holdings || []).sort((a, b) => (b.weight || 0) - (a.weight || 0))[0];
    const ticker = topHolding?.ticker || 'TOP_HOLDING';

    const scoreResult = calculateAttentionScore({
      portfolioWeight: exp.top1Weight,
      detectedAt,
      confidence: 1.0
    });

    // Boost score for severe concentration
    scoreResult.components.portfolioExposure = Math.max(scoreResult.components.portfolioExposure, 10);
    scoreResult.totalScore = Math.max(scoreResult.totalScore, 68);
    scoreResult.priority = scoreResult.totalScore >= 65 ? 'HIGH' : 'MEDIUM';

    const item = {
      attentionId: `ATT-PORTFOLIO-CONC-${portfolioState.workspaceId || 'WORKSPACE'}-${ticker}`,
      ticker,
      entityType: 'PORTFOLIO',
      priority: scoreResult.priority,
      score: scoreResult,
      severity: scoreResult.priority,
      category: AttentionCategory.PORTFOLIO_CONCENTRATION,
      title: `Excessive Portfolio Concentration: ${ticker} at ${(exp.top1Weight * 100).toFixed(1)}%`,
      summary: `Single holding ${ticker} represents ${(exp.top1Weight * 100).toFixed(1)}% of total portfolio value (HHI: ${exp.hhi}).`,
      triggerType: TriggerType.PORTFOLIO_DRIFT,
      detectedAt,
      changeIds: [],
      eventIds: [],
      alertIds: (portfolioState.portfolioAlerts || []).map(a => a.alertId),
      evidenceIds: [],
      metrics: {
        portfolioWeight: exp.top1Weight,
        hhi: exp.hhi,
        top1Weight: exp.top1Weight,
        top3Weight: exp.top3Weight
      },
      previousDecision: topHolding?.decision || null,
      currentDecision: topHolding?.decision || null,
      recommendedAction: 'REVIEW_POSITION_SIZING',
      packageHash: pkgHash,
      snapshotId: portfolioState.workspaceId || 'WORKSPACE_LATEST'
    };

    const explanation = generateAttentionExplanation(item);
    item.whyMatters = explanation.whyMatters;
    item.whatChanged = explanation.whatChanged;
    item.whatInvalidates = explanation.whatInvalidates;
    item.investigationQuestions = generateInvestigationQuestions(item);

    candidates.push(item);
  }

  // 2. Correlation Cluster Attention
  if (exp.correlationClusters && exp.correlationClusters.length > 0) {
    const cluster = exp.correlationClusters[0];
    const scoreResult = calculateAttentionScore({
      detectedAt,
      confidence: 0.90
    });
    scoreResult.totalScore = Math.max(scoreResult.totalScore, 66);
    scoreResult.priority = 'HIGH';

    const item = {
      attentionId: `ATT-PORTFOLIO-CORR-${portfolioState.workspaceId || 'WORKSPACE'}`,
      ticker: 'PORTFOLIO',
      entityType: 'PORTFOLIO',
      priority: scoreResult.priority,
      score: scoreResult,
      severity: scoreResult.priority,
      category: AttentionCategory.CORRELATION_RISK,
      title: `Elevated Correlation Cluster (${cluster.pairs.length} pairs >= 0.80)`,
      summary: `High pairwise correlation detected across multiple holdings, dampening true portfolio diversification.`,
      triggerType: TriggerType.PORTFOLIO_DRIFT,
      detectedAt,
      changeIds: [],
      eventIds: [],
      alertIds: (portfolioState.portfolioAlerts || []).map(a => a.alertId),
      evidenceIds: [],
      metrics: {
        correlationPairsCount: cluster.pairs.length,
        nEff: exp.nEff,
        correlationLevel: exp.correlationLevel
      },
      recommendedAction: 'REVIEW_FACTOR_EXPOSURE',
      packageHash: pkgHash,
      snapshotId: portfolioState.workspaceId || 'WORKSPACE_LATEST'
    };

    const explanation = generateAttentionExplanation(item);
    item.whyMatters = explanation.whyMatters;
    item.whatChanged = explanation.whatChanged;
    item.whatInvalidates = explanation.whatInvalidates;
    item.investigationQuestions = generateInvestigationQuestions(item);

    candidates.push(item);
  }

  return candidates;
}
