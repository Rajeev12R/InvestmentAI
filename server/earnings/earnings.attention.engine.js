/**
 * server/earnings/earnings.attention.engine.js
 * 
 * Phase 21: Event Attention & Catalyst Trigger Engine (Phase 7 Integration)
 * Computes deterministic attention scores based on earnings misses, guidance cuts, and quality anomalies.
 */

import { EventClassification } from './earnings.types.js';
import { EARNINGS_CONFIG } from './earnings.config.js';

export function evaluateEarningsAttentionImpact(ticker, surpriseReport = {}, guidanceRecord = null, qualityAssessment = null, extraSignals = {}) {
  const baseScore = 20; // baseline neutral
  let totalScore = baseScore;
  const contributions = [];

  // 1. EPS Miss Contribution (Magnitude-based)
  const epsSurprise = surpriseReport?.surprises?.DILUTED_EPS || surpriseReport?.surprises?.EPS;
  if (epsSurprise?.isMiss) {
    const missPct = typeof epsSurprise.percentageSurprise === 'number' ? Math.abs(epsSurprise.percentageSurprise) : 0.05;
    const addScore = missPct >= 0.05 ? 55 : 45;
    totalScore += addScore;
    contributions.push({
      category: 'EPS_MISS',
      scoreContribution: addScore,
      formula: `base + ${addScore} (EPS Miss ${missPct >= 0.05 ? '>= 5%' : '< 5%'})`,
      threshold: 'Reported EPS < Consensus EPS',
      evidence: `Reported EPS missed by $${Math.abs(epsSurprise.absoluteSurprise || 0).toFixed(2)}`
    });
  }

  // 2. Revenue Miss Contribution
  const revSurprise = surpriseReport?.surprises?.REVENUE;
  if (revSurprise?.isMiss) {
    const missPct = typeof revSurprise.percentageSurprise === 'number' ? Math.abs(revSurprise.percentageSurprise) : 0.02;
    const addScore = missPct >= 0.02 ? 25 : 15;
    totalScore += addScore;
    contributions.push({
      category: 'REVENUE_MISS',
      scoreContribution: addScore,
      formula: `base + ${addScore} (Revenue Miss ${missPct >= 0.02 ? '>= 2%' : '< 2%'})`,
      threshold: 'Reported Revenue < Consensus Revenue',
      evidence: `Reported revenue missed consensus`
    });
  }

  // 3. Guidance Cut Contribution
  if (guidanceRecord?.revisionDirection === 'CUT') {
    const cutPct = typeof guidanceRecord.pctRevision === 'number' ? Math.abs(guidanceRecord.pctRevision) : 0.05;
    const addScore = cutPct >= 0.05 ? 65 : 50;
    totalScore += addScore;
    contributions.push({
      category: 'GUIDANCE_CUT',
      scoreContribution: addScore,
      formula: `base + ${addScore} (Guidance Cut ${cutPct >= 0.05 ? '>= 5%' : '< 5%'})`,
      threshold: 'Guidance Midpoint Delta < 0',
      evidence: `Management reduced guidance midpoint by ${(cutPct * 100).toFixed(2)}%`
    });
  }

  // 4. Quality Anomaly Contribution
  if (qualityAssessment && qualityAssessment.qualityGrade && qualityAssessment.qualityGrade !== 'HIGH') {
    const addScore = qualityAssessment.qualityGrade === 'LOW' ? 45 : 25;
    totalScore += addScore;
    contributions.push({
      category: 'EARNINGS_QUALITY_ANOMALY',
      scoreContribution: addScore,
      formula: `base + ${addScore} (Quality Grade ${qualityAssessment.qualityGrade})`,
      threshold: 'QualityGrade != HIGH',
      evidence: qualityAssessment.flags?.join(', ') || 'Quality downgraded'
    });
  }

  // 5. Source Observation Conflict Contribution
  if (extraSignals.hasSourceConflict) {
    totalScore += 15;
    contributions.push({
      category: 'SOURCE_OBSERVATION_CONFLICT',
      scoreContribution: 15,
      formula: 'base + 15 (Direct exchange vs Vendor conflict)',
      threshold: 'Discrepant values across feeds',
      evidence: extraSignals.conflictDetail || 'Multi-source observation divergence'
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

  return Object.freeze({
    ticker: ticker.toUpperCase(),
    baseScore,
    attentionScore: finalScore,
    attentionLevel,
    triggers: contributions.map(c => ({ reason: c.category, detail: c.evidence })),
    contributions,
    timestamp: new Date().toISOString(),
    classification: EventClassification.DERIVED
  });
}
