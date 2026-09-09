/**
 * @file attention.company.engine.js
 * Evaluates company-level state transitions, snapshot changes, and Phase 6 events
 * to generate candidate AttentionItems.
 */

import { calculateAttentionScore } from './attention.scoring.js';
import { generateAttentionExplanation } from './attention.explanation.js';
import { generateInvestigationQuestions } from './attention.questionGenerator.js';
import { AttentionCategory, TriggerType } from './attention.types.js';

/**
 * Evaluates snapshot transitions and events for a single company.
 * @param {Object} params
 * @param {string} params.ticker
 * @param {Object} [params.previousSnapshot]
 * @param {Object} params.currentSnapshot
 * @param {Object} [params.changePackage] Output from Phase 5 change.engine.js
 * @param {Array<Object>} [params.recentEvents] Recent Phase 6 events
 * @param {number} [params.portfolioWeight]
 * @returns {Array<Object>} Candidate AttentionItems
 */
export function evaluateCompanyAttention({
  ticker,
  previousSnapshot,
  currentSnapshot,
  changePackage,
  recentEvents = [],
  portfolioWeight = 0,
  generatedAt = null
}) {
  if (!ticker || !currentSnapshot) return [];

  const candidates = [];
  const pkgHash = currentSnapshot.packageHash || currentSnapshot.hash || 'UNKNOWN_HASH';
  const snapshotId = currentSnapshot.snapshotId || currentSnapshot.id || 'SNAPSHOT_LATEST';
  const detectedAt = currentSnapshot.detectedAt || currentSnapshot.timestamp || currentSnapshot.createdAt || currentSnapshot.asOf || generatedAt || new Date().toISOString();

  // Extract previous vs current states
  const prevDecision = previousSnapshot?.decision?.decision || previousSnapshot?.decision || null;
  const currDecision = currentSnapshot?.decision?.decision || currentSnapshot?.decision || null;

  const prevValuation = previousSnapshot?.valuation?.dcfValue || previousSnapshot?.valuation?.fairValue || null;
  const currValuation = currentSnapshot?.valuation?.dcfValue || currentSnapshot?.valuation?.fairValue || null;

  let valDriftPct = 0;
  if (prevValuation && currValuation && prevValuation > 0) {
    valDriftPct = ((currValuation - prevValuation) / prevValuation) * 100;
  }

  const prevRisk = previousSnapshot?.risk?.overallRisk || previousSnapshot?.risk?.riskLevel || null;
  const currRisk = currentSnapshot?.risk?.overallRisk || currentSnapshot?.risk?.riskLevel || null;

  // Extract thesis breaker status
  const thesisBreakers = currentSnapshot?.thesisBreakers || currentSnapshot?.thesis?.breakers || [];
  let breakerStatus = 'STABLE';
  if (thesisBreakers.some(b => b.triggered || b.status === 'TRIGGERED')) {
    breakerStatus = 'TRIGGERED';
  } else if (thesisBreakers.some(b => b.approaching || b.status === 'APPROACHING')) {
    breakerStatus = 'APPROACHING';
  } else if (thesisBreakers.length === 0 && currentSnapshot?.thesis) {
    breakerStatus = 'UNKNOWN';
  }

  // 1. Check for Decision Change
  if (prevDecision && currDecision && prevDecision !== currDecision) {
    const scoreResult = calculateAttentionScore({
      previousDecision: prevDecision,
      currentDecision: currDecision,
      thesisBreakerStatus: breakerStatus,
      valuationDriftPct: valDriftPct,
      riskDriftSeverity: currRisk,
      portfolioWeight,
      detectedAt,
      confidence: 1.0
    });

    const item = {
      attentionId: `ATT-${ticker}-DECISION-${snapshotId}`,
      ticker,
      entityType: 'COMPANY',
      priority: scoreResult.priority,
      score: scoreResult,
      severity: scoreResult.priority,
      category: AttentionCategory.DECISION_CHANGE,
      title: `${ticker} Decision Shift: ${prevDecision} → ${currDecision}`,
      summary: `Deterministic investment decision changed from ${prevDecision} to ${currDecision}.`,
      triggerType: TriggerType.SNAPSHOT_TRANSITION,
      detectedAt,
      changeIds: changePackage?.changeId ? [changePackage.changeId] : [],
      eventIds: recentEvents.map(e => e.eventId || e.id).filter(Boolean),
      alertIds: changePackage?.alertIds || [],
      evidenceIds: currentSnapshot?.evidenceIds || [],
      metrics: {
        valuationDriftPct: valDriftPct,
        riskDriftSeverity: currRisk,
        portfolioWeight
      },
      previousDecision: prevDecision,
      currentDecision: currDecision,
      previousValuation: prevValuation,
      currentValuation: currValuation,
      previousRisk: prevRisk,
      currentRisk: currRisk,
      thesisStatus: currentSnapshot?.thesis?.status || 'ACTIVE',
      thesisBreakerStatus: breakerStatus,
      recommendedAction: currDecision === 'AVOID' ? 'CONSIDER_EXIT' : 'REVIEW_POSITION',
      packageHash: pkgHash,
      snapshotId
    };

    const explanation = generateAttentionExplanation(item);
    item.whyMatters = explanation.whyMatters;
    item.whatChanged = explanation.whatChanged;
    item.whatInvalidates = explanation.whatInvalidates;
    item.investigationQuestions = generateInvestigationQuestions(item);

    candidates.push(item);
  }

  // 2. Check for Thesis Breaker Alert
  if (breakerStatus === 'TRIGGERED' || breakerStatus === 'APPROACHING') {
    const scoreResult = calculateAttentionScore({
      previousDecision: prevDecision,
      currentDecision: currDecision,
      thesisBreakerStatus: breakerStatus,
      valuationDriftPct: valDriftPct,
      portfolioWeight,
      detectedAt,
      confidence: 0.95
    });

    const item = {
      attentionId: `ATT-${ticker}-BREAKER-${snapshotId}`,
      ticker,
      entityType: 'COMPANY',
      priority: scoreResult.priority,
      score: scoreResult,
      severity: scoreResult.priority,
      category: AttentionCategory.THESIS_BREAKER,
      title: `${ticker} Thesis Breaker ${breakerStatus}`,
      summary: `Investment thesis-breaker condition is currently ${breakerStatus.toLowerCase()}.`,
      triggerType: TriggerType.SNAPSHOT_TRANSITION,
      detectedAt,
      changeIds: changePackage?.changeId ? [changePackage.changeId] : [],
      eventIds: recentEvents.map(e => e.eventId || e.id).filter(Boolean),
      alertIds: changePackage?.alertIds || [],
      evidenceIds: currentSnapshot?.evidenceIds || [],
      metrics: {
        valuationDriftPct: valDriftPct,
        portfolioWeight
      },
      previousDecision: prevDecision,
      currentDecision: currDecision,
      previousValuation: prevValuation,
      currentValuation: currValuation,
      previousRisk: prevRisk,
      currentRisk: currRisk,
      thesisStatus: breakerStatus === 'TRIGGERED' ? 'BROKEN' : 'AT_RISK',
      thesisBreakerStatus: breakerStatus,
      recommendedAction: breakerStatus === 'TRIGGERED' ? 'REASSESS_THESIS' : 'MONITOR_METRIC',
      packageHash: pkgHash,
      snapshotId
    };

    const explanation = generateAttentionExplanation(item);
    item.whyMatters = explanation.whyMatters;
    item.whatChanged = explanation.whatChanged;
    item.whatInvalidates = explanation.whatInvalidates;
    item.investigationQuestions = generateInvestigationQuestions(item);

    candidates.push(item);
  }

  // 3. Check for Significant Valuation Drift (>= 5%)
  if (Math.abs(valDriftPct) >= 5.0) {
    const scoreResult = calculateAttentionScore({
      valuationDriftPct: valDriftPct,
      portfolioWeight,
      detectedAt,
      confidence: 0.90
    });

    const item = {
      attentionId: `ATT-${ticker}-VALUATION-${snapshotId}`,
      ticker,
      entityType: 'COMPANY',
      priority: scoreResult.priority,
      score: scoreResult,
      severity: scoreResult.priority,
      category: AttentionCategory.VALUATION_DRIFT,
      title: `${ticker} Valuation Drift: ${valDriftPct > 0 ? '+' : ''}${valDriftPct.toFixed(1)}%`,
      summary: `DCF / Fair Value estimate drifted by ${valDriftPct > 0 ? '+' : ''}${valDriftPct.toFixed(1)}%.`,
      triggerType: TriggerType.SNAPSHOT_TRANSITION,
      detectedAt,
      changeIds: changePackage?.changeId ? [changePackage.changeId] : [],
      eventIds: recentEvents.map(e => e.eventId || e.id).filter(Boolean),
      alertIds: changePackage?.alertIds || [],
      evidenceIds: currentSnapshot?.evidenceIds || [],
      metrics: {
        valuationDriftPct: valDriftPct,
        portfolioWeight
      },
      previousDecision: prevDecision,
      currentDecision: currDecision,
      previousValuation: prevValuation,
      currentValuation: currValuation,
      previousRisk: prevRisk,
      currentRisk: currRisk,
      thesisStatus: currentSnapshot?.thesis?.status || 'ACTIVE',
      thesisBreakerStatus: breakerStatus,
      recommendedAction: 'REVIEW_VALUATION_ASSUMPTIONS',
      packageHash: pkgHash,
      snapshotId
    };

    const explanation = generateAttentionExplanation(item);
    item.whyMatters = explanation.whyMatters;
    item.whatChanged = explanation.whatChanged;
    item.whatInvalidates = explanation.whatInvalidates;
    item.investigationQuestions = generateInvestigationQuestions(item);

    candidates.push(item);
  }

  // 4. Check for Recent Material Events
  for (const ev of recentEvents) {
    const mat = String(ev.materiality || '').toUpperCase();
    if (mat === 'CRITICAL' || mat === 'HIGH' || mat === 'MEDIUM') {
      const scoreResult = calculateAttentionScore({
        eventMateriality: mat,
        portfolioWeight,
        detectedAt: ev.discoveredAt || ev.publishedAt || detectedAt,
        confidence: 0.95
      });

      const evId = ev.eventId || ev.id || 'EVENT';
      const item = {
        attentionId: `ATT-${ticker}-EVENT-${evId}`,
        ticker,
        entityType: 'COMPANY',
        priority: scoreResult.priority,
        score: scoreResult,
        severity: scoreResult.priority,
        category: ev.eventType === 'EARNINGS_RELEASE' ? AttentionCategory.EARNINGS_CHANGE :
                  ev.eventType === 'GUIDANCE_UPDATE' ? AttentionCategory.GUIDANCE_CHANGE :
                  AttentionCategory.MATERIAL_EVENT,
        title: `${ticker} Event: ${ev.headline || ev.eventType || 'Material Update'}`,
        summary: ev.summary || ev.headline || 'Verified external event ingested.',
        triggerType: TriggerType.EXTERNAL_EVENT,
        detectedAt: ev.discoveredAt || ev.publishedAt || detectedAt,
        changeIds: changePackage?.changeId ? [changePackage.changeId] : [],
        eventIds: [ev.eventId || ev.id].filter(Boolean),
        alertIds: [],
        evidenceIds: ev.evidenceIds || [],
        metrics: {
          eventMateriality: ev.materiality,
          portfolioWeight
        },
        previousDecision: prevDecision,
        currentDecision: currDecision,
        previousValuation: prevValuation,
        currentValuation: currValuation,
        previousRisk: prevRisk,
        currentRisk: currRisk,
        thesisStatus: currentSnapshot?.thesis?.status || 'ACTIVE',
        thesisBreakerStatus: breakerStatus,
        recommendedAction: 'EVALUATE_EVENT_IMPACT',
        packageHash: pkgHash,
        snapshotId
      };

      const explanation = generateAttentionExplanation(item);
      item.whyMatters = explanation.whyMatters;
      item.whatChanged = explanation.whatChanged;
      item.whatInvalidates = explanation.whatInvalidates;
      item.investigationQuestions = generateInvestigationQuestions(item);

      candidates.push(item);
    }
  }

  return candidates;
}
