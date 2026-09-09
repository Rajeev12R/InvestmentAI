/**
 * @file decisionReview.engine.js
 * Generates actionable items for the Decision Review Queue based on decision changes,
 * thesis-breaker breaches, and material valuation shifts.
 */

import { WorkflowStatus, RecommendedReviewAction, validateDecisionReviewItem } from './operations.types.js';
import { calculateOperationalUrgency } from './priority.engine.js';

/**
 * Evaluates attention items and snapshots to generate DecisionReviewItems.
 * @param {Array<Object>} attentionItems Array of AttentionItem from attention.engine.js
 * @returns {Array<Object>} DecisionReviewItems
 */
export function generateDecisionReviews(attentionItems = []) {
  const reviews = [];
  const now = new Date().toISOString();

  for (const item of attentionItems) {
    let shouldReview = false;
    let recommendedAction = RecommendedReviewAction.NO_ACTION_REQUIRED;
    let reason = '';

    // 1. Decision changed
    if (item.previousDecision && item.currentDecision && item.previousDecision !== item.currentDecision) {
      shouldReview = true;
      reason = `Decision changed from ${item.previousDecision} to ${item.currentDecision}.`;
      if (item.currentDecision === 'AVOID') {
        recommendedAction = RecommendedReviewAction.CONSIDER_EXIT;
      } else if (item.currentDecision === 'WATCH') {
        recommendedAction = RecommendedReviewAction.MONITOR_METRICS;
      } else {
        recommendedAction = RecommendedReviewAction.REVIEW_POSITION_SIZING;
      }
    }

    // 2. Thesis breaker triggered or approaching
    if (item.thesisBreakerStatus === 'TRIGGERED') {
      shouldReview = true;
      reason = (reason ? reason + ' ' : '') + 'Core investment thesis breaker was triggered.';
      if (recommendedAction === RecommendedReviewAction.NO_ACTION_REQUIRED) {
        recommendedAction = RecommendedReviewAction.REASSESS_THESIS;
      }
    } else if (item.thesisBreakerStatus === 'APPROACHING' && !shouldReview) {
      shouldReview = true;
      reason = 'Operating metrics are approaching thesis breaker threshold.';
      recommendedAction = RecommendedReviewAction.MONITOR_METRICS;
    }

    // 3. Significant valuation drift
    if (!shouldReview && item.metrics?.valuationDriftPct && Math.abs(item.metrics.valuationDriftPct) >= 10.0) {
      shouldReview = true;
      reason = `Fair value estimate drifted ${item.metrics.valuationDriftPct > 0 ? '+' : ''}${item.metrics.valuationDriftPct.toFixed(1)}%.`;
      recommendedAction = RecommendedReviewAction.REVIEW_VALUATION;
    }

    // 4. Portfolio concentration breach
    if (!shouldReview && item.category === 'PORTFOLIO_CONCENTRATION') {
      shouldReview = true;
      reason = `Portfolio concentration threshold exceeded for ${item.ticker}.`;
      recommendedAction = RecommendedReviewAction.REVIEW_POSITION_SIZING;
    }

    if (shouldReview) {
      const urgency = calculateOperationalUrgency({
        previousDecision: item.previousDecision,
        currentDecision: item.currentDecision,
        thesisBreakerStatus: item.thesisBreakerStatus,
        valuationDriftPct: item.metrics?.valuationDriftPct
      });

      const reviewId = item.attentionId ? `REV-${item.attentionId}` : `REV-${item.ticker}-${item.snapshotId || 'LATEST'}`;
      const reviewItem = {
        reviewId,
        attentionId: item.attentionId,
        ticker: item.ticker,
        currentDecision: item.currentDecision || 'UNKNOWN',
        previousDecision: item.previousDecision || null,
        reason,
        urgency,
        status: WorkflowStatus.REVIEW,
        recommendedAction,
        evidenceIds: item.evidenceIds || [],
        changeIds: item.changeIds || [],
        eventIds: item.eventIds || [],
        snapshotId: item.snapshotId || null,
        packageHash: item.packageHash || 'HASH_UNKNOWN',
        createdAt: now,
        updatedAt: now
      };

      const val = validateDecisionReviewItem(reviewItem);
      if (!val.valid) {
        throw new Error(`Invalid DecisionReviewItem: ${val.errors.join(', ')}`);
      }

      reviews.push(reviewItem);
    }
  }

  // Sort by urgency: IMMEDIATE -> HIGH -> NORMAL -> LOW
  const urgencyOrder = { IMMEDIATE: 4, HIGH: 3, NORMAL: 2, LOW: 1 };
  reviews.sort((a, b) => (urgencyOrder[b.urgency] || 0) - (urgencyOrder[a.urgency] || 0));

  return reviews;
}
