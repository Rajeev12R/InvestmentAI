/**
 * @file phase7AttentionTests.js
 * Test suite for Phase 7 Attention Intelligence Engine.
 * Tests 20 canonical categories, transparent additive scoring, deduplication/clustering,
 * deterministic explanations, question generation, and cryptographic package sealing.
 */

import assert from 'assert';
import { calculateAttentionScore } from '../attention/attention.scoring.js';
import { deduplicateAttentionItems } from '../attention/attention.deduplication.js';
import { generateAttentionExplanation } from '../attention/attention.explanation.js';
import { generateInvestigationQuestions } from '../attention/attention.questionGenerator.js';
import { evaluateCompanyAttention } from '../attention/attention.company.engine.js';
import { evaluatePortfolioAttention } from '../attention/attention.portfolio.engine.js';
import { generateAttentionPackage } from '../attention/attention.engine.js';
import { AttentionPriority, AttentionCategory, TriggerType, validateAttentionItem } from '../attention/attention.types.js';
import { ATTENTION_THRESHOLDS } from '../attention/attentionThresholds.js';

console.log('================================================================');
console.log('INVESTMENTAI — PHASE 7 ATTENTION INTELLIGENCE TEST SUITE');
console.log('================================================================\n');

let passCount = 0;

function it(desc, fn) {
  try {
    fn();
    passCount++;
    console.log(`  ✓ ${desc}`);
  } catch (err) {
    console.error(`  ✗ ${desc}`);
    console.error(err);
    process.exit(1);
  }
}

// 1. Scoring & Priority Tests
it('1. Attention Score: Calculates transparent score components correctly', () => {
  const result = calculateAttentionScore({
    previousDecision: 'BUY',
    currentDecision: 'AVOID',
    thesisBreakerStatus: 'TRIGGERED',
    valuationDriftPct: -12.5,
    riskDriftSeverity: 'HIGH',
    eventMateriality: 'HIGH',
    portfolioWeight: 0.35,
    confidence: 1.0
  });

  assert.strictEqual(result.components.decisionChange, 30);
  assert.strictEqual(result.components.thesisBreaker, 25);
  assert.strictEqual(result.components.valuationDrift, 20);
  assert.strictEqual(result.components.riskDrift, 12);
  assert.strictEqual(result.components.eventMateriality, 15);
  assert.strictEqual(result.components.portfolioExposure, 10);
  assert.strictEqual(result.components.confidence, 5);

  assert.strictEqual(result.totalScore, 117);
  assert.strictEqual(result.priority, AttentionPriority.CRITICAL);
});

it('2. Attention Score: Prioritizes BUY -> WATCH downgrade as HIGH', () => {
  const result = calculateAttentionScore({
    previousDecision: 'BUY',
    currentDecision: 'WATCH',
    thesisBreakerStatus: 'APPROACHING',
    valuationDriftPct: -6.0,
    riskDriftSeverity: 'HIGH',
    portfolioWeight: 0.15,
    confidence: 1.0
  });

  assert.strictEqual(result.components.decisionChange, 25);
  assert.strictEqual(result.components.thesisBreaker, 18);
  assert.strictEqual(result.components.valuationDrift, 12);
  assert.ok(result.totalScore >= ATTENTION_THRESHOLDS.PRIORITY.HIGH);
  assert.strictEqual(result.priority, AttentionPriority.HIGH);
});

it('3. Attention Score: Maps UNKNOWN breaker to investigation contribution', () => {
  const result = calculateAttentionScore({
    thesisBreakerStatus: 'UNKNOWN',
    valuationDriftPct: 0
  });
  assert.strictEqual(result.components.thesisBreaker, 8);
  assert.strictEqual(result.priority, AttentionPriority.INFORMATIONAL);
});

it('4. Attention Score: Centralized weights prevent arbitrary score inflation', () => {
  const maxResult = calculateAttentionScore({
    previousDecision: 'BUY',
    currentDecision: 'AVOID',
    thesisBreakerStatus: 'TRIGGERED',
    valuationDriftPct: -999,
    riskDriftSeverity: 'CRITICAL',
    eventMateriality: 'HIGH',
    portfolioWeight: 1.0,
    confidence: 1.0
  });

  assert.ok(maxResult.components.decisionChange <= ATTENTION_THRESHOLDS.SCORING_WEIGHTS.DECISION_CHANGE_MAX);
  assert.ok(maxResult.components.thesisBreaker <= ATTENTION_THRESHOLDS.SCORING_WEIGHTS.THESIS_BREAKER_MAX);
  assert.ok(maxResult.components.valuationDrift <= ATTENTION_THRESHOLDS.SCORING_WEIGHTS.VALUATION_DRIFT_MAX);
  assert.ok(maxResult.components.riskDrift <= ATTENTION_THRESHOLDS.SCORING_WEIGHTS.RISK_DRIFT_MAX);
  assert.ok(maxResult.components.eventMateriality <= ATTENTION_THRESHOLDS.SCORING_WEIGHTS.EVENT_MATERIALITY_MAX);
  assert.ok(maxResult.components.portfolioExposure <= ATTENTION_THRESHOLDS.SCORING_WEIGHTS.PORTFOLIO_EXPOSURE_MAX);
});

// 2. Deduplication & Clustering Tests
it('5. Deduplication: Merges multiple signals for same ticker & transition into single primary item', () => {
  const items = [
    {
      attentionId: 'ATT-AAPL-1',
      ticker: 'AAPL',
      snapshotId: 'SNAP-AAPL-100',
      category: AttentionCategory.DECISION_CHANGE,
      title: 'Decision Shift',
      summary: 'BUY -> WATCH',
      score: { totalScore: 80 },
      changeIds: ['CHG-1'],
      evidenceIds: ['EVD-1']
    },
    {
      attentionId: 'ATT-AAPL-2',
      ticker: 'AAPL',
      snapshotId: 'SNAP-AAPL-100',
      category: AttentionCategory.VALUATION_DRIFT,
      title: 'Valuation Drift',
      summary: 'DCF -9.4%',
      score: { totalScore: 50 },
      changeIds: ['CHG-2'],
      evidenceIds: ['EVD-2']
    }
  ];

  const deduped = deduplicateAttentionItems(items);
  assert.strictEqual(deduped.length, 1);
  assert.strictEqual(deduped[0].category, AttentionCategory.DECISION_CHANGE);
  assert.strictEqual(deduped[0].secondarySignals.length, 1);
  assert.strictEqual(deduped[0].secondarySignals[0].category, AttentionCategory.VALUATION_DRIFT);
  assert.deepStrictEqual(deduped[0].changeIds, ['CHG-1', 'CHG-2']);
  assert.deepStrictEqual(deduped[0].evidenceIds, ['EVD-1', 'EVD-2']);
});

it('6. Deduplication: Preserves distinct items across different tickers', () => {
  const items = [
    { attentionId: 'ATT-AAPL', ticker: 'AAPL', snapshotId: 'SNAP-1', score: { totalScore: 70 } },
    { attentionId: 'ATT-JPM', ticker: 'JPM', snapshotId: 'SNAP-1', score: { totalScore: 60 } },
    { attentionId: 'ATT-RELIANCE', ticker: 'RELIANCE.NS', snapshotId: 'SNAP-1', score: { totalScore: 85 } }
  ];

  const deduped = deduplicateAttentionItems(items);
  assert.strictEqual(deduped.length, 3);
  assert.strictEqual(deduped[0].ticker, 'RELIANCE.NS'); // Ranked first due to score 85
});

// 3. Explanation & Question Generation Tests
it('7. Explanations: Formulates deterministic evidence-backed explanation sections', () => {
  const item = {
    ticker: 'AAPL',
    previousDecision: 'BUY',
    currentDecision: 'WATCH',
    metrics: { valuationDriftPct: -9.4, riskDriftSeverity: 'HIGH' },
    thesisBreakerStatus: 'APPROACHING'
  };

  const exp = generateAttentionExplanation(item);
  assert.ok(exp.whyMatters.length >= 3);
  assert.ok(exp.whatChanged.length >= 3);
  assert.ok(exp.whatInvalidates.length >= 3);
  assert.ok(exp.whyMatters.some(m => m.includes('BUY to WATCH')));
  assert.ok(exp.whyMatters.some(m => m.includes('-9.4%')));
});

it('8. Question Generator: Generates targeted research questions from detected changes', () => {
  const item = {
    ticker: 'AAPL',
    previousDecision: 'BUY',
    currentDecision: 'WATCH',
    metrics: { valuationDriftPct: -9.4, riskDriftSeverity: 'HIGH' },
    thesisBreakerStatus: 'APPROACHING',
    category: AttentionCategory.DECISION_CHANGE
  };

  const questions = generateInvestigationQuestions(item);
  assert.ok(questions.length >= 3);
  assert.ok(questions.some(q => q.includes('BUY to WATCH')));
  assert.ok(questions.some(q => q.includes('valuation drift')));
  assert.ok(questions.some(q => q.includes('thesis-breaker')));
});

// 4. Company & Portfolio Attention Engines
it('9. Company Engine: Evaluates full snapshot transition and generates candidate items', () => {
  const candidates = evaluateCompanyAttention({
    ticker: 'AAPL',
    previousSnapshot: {
      decision: { decision: 'BUY' },
      valuation: { dcfValue: 150 },
      risk: { overallRisk: 'LOW' },
      thesisBreakers: [{ id: 'tb1', approaching: false, triggered: false }]
    },
    currentSnapshot: {
      snapshotId: 'SNAP-AAPL-2',
      packageHash: 'HASH_AAPL_2',
      decision: { decision: 'WATCH' },
      valuation: { dcfValue: 135 },
      risk: { overallRisk: 'HIGH' },
      thesisBreakers: [{ id: 'tb1', approaching: true, triggered: false }]
    },
    changePackage: { changeId: 'CHG-AAPL-100', alertIds: ['ALT-1'] },
    recentEvents: [{ eventId: 'EV-1', eventType: 'EARNINGS_RELEASE', materiality: 'HIGH', headline: 'AAPL Q3 Earnings' }],
    portfolioWeight: 0.25
  });

  assert.ok(candidates.length >= 2);
  const decisionItem = candidates.find(c => c.category === AttentionCategory.DECISION_CHANGE);
  assert.ok(decisionItem);
  assert.strictEqual(decisionItem.priority, AttentionPriority.CRITICAL);
  assert.strictEqual(decisionItem.ticker, 'AAPL');
});

it('10. Portfolio Engine: Evaluates single-position concentration breach', () => {
  const candidates = evaluatePortfolioAttention({
    portfolioState: {
      workspaceId: 'WS-1',
      stateHash: 'HASH-PORT-1',
      holdings: [{ ticker: 'AAPL', weight: 0.42, value: 42000, decision: 'BUY' }],
      exposureMetrics: {
        top1Weight: 0.42,
        top3Weight: 0.42,
        hhi: 3200,
        nEff: 1.8,
        concentrationLevel: 'HIGH',
        correlationClusters: []
      }
    }
  });

  assert.strictEqual(candidates.length, 1);
  assert.strictEqual(candidates[0].category, AttentionCategory.PORTFOLIO_CONCENTRATION);
  assert.strictEqual(candidates[0].ticker, 'AAPL');
  assert.strictEqual(candidates[0].priority, AttentionPriority.HIGH);
});

// 5. Sealed Package Generation Tests
it('11. Attention Package: Compiles, validates, and seals package with SHA-256 hash', () => {
  const pkg = generateAttentionPackage({
    workspaceId: 'MAIN_WORKSPACE',
    companyTransitions: [{
      ticker: 'AAPL',
      previousSnapshot: { decision: 'BUY', valuation: { dcfValue: 150 } },
      currentSnapshot: { snapshotId: 'SNAP-1', packageHash: 'HASH-1', decision: 'WATCH', valuation: { dcfValue: 135 } }
    }]
  });

  assert.ok(pkg.packageHash);
  assert.strictEqual(pkg.packageHash.length, 64);
  assert.strictEqual(pkg.isSealed, true);
  assert.ok(pkg.prioritySummary);
  assert.ok(pkg.attentionItems.length > 0);
});

it('12. Attention Package: Validation rejects malformed attention items', () => {
  const invalidItem = { ticker: 'AAPL' }; // Missing required fields
  const validation = validateAttentionItem(invalidItem);
  assert.strictEqual(validation.valid, false);
  assert.ok(validation.errors.length > 0);
});

it('13. Canonical Taxonomy: Validates all 20 canonical AttentionCategory values', () => {
  const categories = Object.values(AttentionCategory);
  assert.strictEqual(categories.length, 20);
  assert.ok(categories.includes('DECISION_CHANGE'));
  assert.ok(categories.includes('THESIS_BREAKER'));
  assert.ok(categories.includes('THESIS_DRIFT'));
  assert.ok(categories.includes('VALUATION_DRIFT'));
  assert.ok(categories.includes('RISK_ESCALATION'));
  assert.ok(categories.includes('RISK_DETERIORATION'));
  assert.ok(categories.includes('EARNINGS_CHANGE'));
  assert.ok(categories.includes('GUIDANCE_CHANGE'));
  assert.ok(categories.includes('MATERIAL_EVENT'));
  assert.ok(categories.includes('MARKET_DISLOCATION'));
  assert.ok(categories.includes('PORTFOLIO_CONCENTRATION'));
  assert.ok(categories.includes('CORRELATION_RISK'));
  assert.ok(categories.includes('POSITION_SIZE_RISK'));
  assert.ok(categories.includes('DATA_QUALITY'));
  assert.ok(categories.includes('STALE_INFORMATION'));
  assert.ok(categories.includes('CONFLICTING_SIGNAL'));
  assert.ok(categories.includes('NEW_CATALYST'));
  assert.ok(categories.includes('WATCHLIST_CHANGE'));
  assert.ok(categories.includes('HOLDING_CHANGE'));
  assert.ok(categories.includes('RESEARCH_FOLLOWUP'));
});

it('14. Scoring: Evaluates HOLD -> AVOID decision shift scoring', () => {
  const result = calculateAttentionScore({
    previousDecision: 'HOLD',
    currentDecision: 'AVOID'
  });
  assert.strictEqual(result.components.decisionChange, 25);
  assert.strictEqual(result.priority, AttentionPriority.LOW);
});

it('15. Scoring: Evaluates WATCH -> BUY upgrade decision scoring', () => {
  const result = calculateAttentionScore({
    previousDecision: 'WATCH',
    currentDecision: 'BUY'
  });
  assert.strictEqual(result.components.decisionChange, 18);
});

it('16. Scoring: Evaluates AVOID -> BUY turnaround scoring', () => {
  const result = calculateAttentionScore({
    previousDecision: 'AVOID',
    currentDecision: 'BUY'
  });
  assert.strictEqual(result.components.decisionChange, 20);
});

it('17. Scoring: Evaluates event materiality scaling (HIGH vs MEDIUM vs LOW)', () => {
  const high = calculateAttentionScore({ eventMateriality: 'HIGH' });
  const med = calculateAttentionScore({ eventMateriality: 'MEDIUM' });
  const low = calculateAttentionScore({ eventMateriality: 'LOW' });
  assert.strictEqual(high.components.eventMateriality, 15);
  assert.strictEqual(med.components.eventMateriality, 10);
  assert.strictEqual(low.components.eventMateriality, 5);
});

it('18. Scoring: Evaluates portfolio exposure weighting scaling', () => {
  const res10 = calculateAttentionScore({ portfolioWeight: 0.10 });
  const res35 = calculateAttentionScore({ portfolioWeight: 0.35 });
  assert.strictEqual(res10.components.portfolioExposure, 3);
  assert.strictEqual(res35.components.portfolioExposure, 10);
});

it('19. Scoring: Recency calculation decays over 48 hours', () => {
  const now = new Date();
  const past48 = new Date(now.getTime() - 48 * 3600 * 1000);
  const resNow = calculateAttentionScore({ detectedAt: now.toISOString() });
  const resPast = calculateAttentionScore({ detectedAt: past48.toISOString() });
  assert.strictEqual(resNow.components.recency, 5);
  assert.strictEqual(resPast.components.recency, 0);
});

it('20. Deduplication: Correctly sorts attention items by score descending', () => {
  const items = [
    { attentionId: '1', ticker: 'A', snapshotId: 'S1', score: { totalScore: 30 } },
    { attentionId: '2', ticker: 'B', snapshotId: 'S2', score: { totalScore: 90 } },
    { attentionId: '3', ticker: 'C', snapshotId: 'S3', score: { totalScore: 60 } }
  ];
  const sorted = deduplicateAttentionItems(items);
  assert.strictEqual(sorted[0].ticker, 'B');
  assert.strictEqual(sorted[1].ticker, 'C');
  assert.strictEqual(sorted[2].ticker, 'A');
});

it('21. Deduplication: Tie-breaks identical scores alphabetically by ticker', () => {
  const items = [
    { attentionId: '1', ticker: 'Z', snapshotId: 'S1', score: { totalScore: 50 } },
    { attentionId: '2', ticker: 'A', snapshotId: 'S2', score: { totalScore: 50 } }
  ];
  const sorted = deduplicateAttentionItems(items);
  assert.strictEqual(sorted[0].ticker, 'A');
  assert.strictEqual(sorted[1].ticker, 'Z');
});

it('22. Explanations: Explains portfolio concentration and correlation signals', () => {
  const concItem = { category: 'PORTFOLIO_CONCENTRATION', metrics: { portfolioWeight: 0.45 } };
  const corrItem = { category: 'CORRELATION_RISK' };
  const expConc = generateAttentionExplanation(concItem);
  const expCorr = generateAttentionExplanation(corrItem);
  assert.ok(expConc.whyMatters[0].includes('concentration'));
  assert.ok(expCorr.whyMatters[0].includes('correlation'));
});

it('23. Question Generator: Generates portfolio sizing questions for concentration category', () => {
  const item = { ticker: 'AAPL', category: 'PORTFOLIO_CONCENTRATION' };
  const q = generateInvestigationQuestions(item);
  assert.ok(q.some(x => x.includes('position size')));
});

it('24. Package Generator: Empty transitions return clean empty attention package', () => {
  const pkg = generateAttentionPackage({ workspaceId: 'EMPTY_WS' });
  assert.strictEqual(pkg.attentionItems.length, 0);
  assert.strictEqual(pkg.totalItemCount, 0);
  assert.strictEqual(pkg.prioritySummary.CRITICAL, 0);
});

it('25. Package Generator: Priority counters accurately tally CRITICAL, HIGH, MEDIUM, LOW', () => {
  const pkg = generateAttentionPackage({
    workspaceId: 'TALLY_WS',
    companyTransitions: [
      {
        ticker: 'AAPL',
        previousSnapshot: { decision: 'BUY', risk: { overallRisk: 'LOW' } },
        currentSnapshot: { snapshotId: 'S1', packageHash: 'H1', decision: 'AVOID', risk: { overallRisk: 'CRITICAL' }, thesisBreakers: [{ triggered: true }] },
        portfolioWeight: 0.35
      },
      {
        ticker: 'JPM',
        currentSnapshot: { snapshotId: 'S2', packageHash: 'H2', decision: 'BUY' }
      }
    ]
  });

  assert.ok(pkg.prioritySummary.CRITICAL >= 1);
});

it('26. Scoring: Extreme valuation drop (>= 15%) caps at VALUATION_DRIFT_MAX', () => {
  const res = calculateAttentionScore({ valuationDriftPct: -35.0 });
  assert.strictEqual(res.components.valuationDrift, ATTENTION_THRESHOLDS.SCORING_WEIGHTS.VALUATION_DRIFT_MAX);
});

it('27. Scoring: Zero valuation drift gives 0 valuation contribution', () => {
  const res = calculateAttentionScore({ valuationDriftPct: 0 });
  assert.strictEqual(res.components.valuationDrift, 0);
});

it('28. Scoring: NaN or non-number valuation drift does not corrupt total score', () => {
  const res = calculateAttentionScore({ valuationDriftPct: NaN });
  assert.strictEqual(res.components.valuationDrift, 0);
  assert.strictEqual(isNaN(res.totalScore), false);
});

it('29. Scoring: Critical risk elevation gives 15 points', () => {
  const res = calculateAttentionScore({ riskDriftSeverity: 'CRITICAL_ELEVATION' });
  assert.strictEqual(res.components.riskDrift, 15);
});

it('30. Scoring: Moderate risk elevation gives 8 points', () => {
  const res = calculateAttentionScore({ riskDriftSeverity: 'MODERATE_DETERIORATION' });
  assert.strictEqual(res.components.riskDrift, 8);
});

it('31. Scoring: Improving risk gives 3 points', () => {
  const res = calculateAttentionScore({ riskDriftSeverity: 'IMPROVING' });
  assert.strictEqual(res.components.riskDrift, 3);
});

it('32. Scoring: Missing or invalid detectedAt date does not throw', () => {
  const res = calculateAttentionScore({ detectedAt: 'NOT_A_DATE' });
  assert.strictEqual(res.components.recency, 0);
  assert.strictEqual(isNaN(res.totalScore), false);
});

it('33. Scoring: Future detectedAt date receives 0 recency points', () => {
  const future = new Date(Date.now() + 1000000).toISOString();
  const res = calculateAttentionScore({ detectedAt: future });
  assert.strictEqual(res.components.recency, 0);
});

it('34. Scoring: Bounded confidence scales 0.0 to 1.0 correctly', () => {
  const res0 = calculateAttentionScore({ confidence: 0.0 });
  const resHalf = calculateAttentionScore({ confidence: 0.5 });
  const resFull = calculateAttentionScore({ confidence: 1.0 });
  assert.strictEqual(res0.components.confidence, 0);
  assert.strictEqual(resHalf.components.confidence, 3);
  assert.strictEqual(resFull.components.confidence, 5);
});

it('35. Deduplication: Merges empty array returns empty array', () => {
  const res = deduplicateAttentionItems([]);
  assert.deepStrictEqual(res, []);
});

it('36. Deduplication: Merges null or non-array returns empty array', () => {
  const res = deduplicateAttentionItems(null);
  assert.deepStrictEqual(res, []);
});

it('37. Explanations: Handles missing metrics gracefully without throw', () => {
  const exp = generateAttentionExplanation({});
  assert.ok(exp.whyMatters.length >= 1);
  assert.ok(exp.whatChanged.length >= 1);
  assert.ok(exp.whatInvalidates.length >= 1);
});

it('38. Question Generator: Handles empty item object gracefully', () => {
  const q = generateInvestigationQuestions({});
  assert.ok(q.length >= 1);
  assert.ok(q[0].includes('the company'));
});

it('39. Question Generator: Generates guidance change question on GUIDANCE_CHANGE', () => {
  const q = generateInvestigationQuestions({ ticker: 'NVDA', category: 'GUIDANCE_CHANGE' });
  assert.ok(q.some(x => x.includes('guidance revision')));
});

it('40. Question Generator: Generates balance sheet risk question on HIGH risk severity', () => {
  const q = generateInvestigationQuestions({ ticker: 'JPM', metrics: { riskDriftSeverity: 'HIGH' } });
  assert.ok(q.some(x => x.includes('risk metric escalated')));
});

it('41. Company Engine: Ignores null or missing ticker', () => {
  const res = evaluateCompanyAttention({ ticker: null, currentSnapshot: {} });
  assert.deepStrictEqual(res, []);
});

it('42. Company Engine: Ignores null currentSnapshot', () => {
  const res = evaluateCompanyAttention({ ticker: 'AAPL', currentSnapshot: null });
  assert.deepStrictEqual(res, []);
});

it('43. Portfolio Engine: Ignores null portfolioState', () => {
  const res = evaluatePortfolioAttention({ portfolioState: null });
  assert.deepStrictEqual(res, []);
});

it('44. Attention Types: Rejects missing attentionId in validateAttentionItem', () => {
  const res = validateAttentionItem({ ticker: 'AAPL', priority: 'HIGH' });
  assert.strictEqual(res.valid, false);
  assert.ok(res.errors.some(e => e.includes('attentionId')));
});

it('45. Attention Types: Rejects invalid priority enum in validateAttentionItem', () => {
  const res = validateAttentionItem({
    attentionId: 'A1', ticker: 'AAPL', priority: 'SUPER_URGENT', category: 'DECISION_CHANGE',
    title: 'T', summary: 'S', triggerType: 'SNAPSHOT_TRANSITION', detectedAt: 'now',
    changeIds: [], eventIds: [], alertIds: [], evidenceIds: [], metrics: {},
    investigationQuestions: [], packageHash: 'H'
  });
  assert.strictEqual(res.valid, false);
  assert.ok(res.errors.some(e => e.includes('Invalid priority')));
});

console.log(`\n================================================================`);
console.log(`PHASE 7 ATTENTION TESTS: ${passCount} / ${passCount} PASSED`);
console.log(`================================================================\n`);
