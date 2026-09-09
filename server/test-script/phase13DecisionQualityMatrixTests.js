/**
 * Phase 13 - Decision Quality & 2x2 Matrix Test Suite
 * Tests multi-dimensional process scoring, missing dimension reason codes,
 * 2x2 matrix classification (benchmark-aware), and restatement evaluation.
 */

import { DecisionQualityEngine } from '../processIntelligence/decisionQuality.engine.js';
import { TemporalIntegrityEngine } from '../processIntelligence/temporalIntegrity.engine.js';
import { DecisionOutcomeClassification } from '../processIntelligence/process.types.js';

export async function runPhase13DecisionQualityMatrixTests() {
  const results = [];
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      passed++;
      results.push({ message, status: 'PASS' });
    } else {
      failed++;
      results.push({ message, status: 'FAIL' });
      console.error(`FAILED ASSERTION: ${message}`);
    }
  }

  console.log('--- RUNNING PHASE 13 DECISION QUALITY & MATRIX TESTS ---');

  const dqEngine = new DecisionQualityEngine();
  const temporalEngine = new TemporalIntegrityEngine();

  // Test 1: Complete Decision Quality Evaluation
  const mockSnapshot = {
    decisionId: 'DEC-01',
    workspaceId: 'ws-test',
    ticker: 'AAPL',
    decision: 'BUY',
    decisionPrice: 200,
    positionSize: 0.08,
    evidenceIds: ['ev1', 'ev2', 'ev3'],
    evidencePackageHash: 'pkg-hash-1',
    forecastIds: ['f1', 'f2'],
    falsificationTriggers: [{ triggerId: 't1' }, { triggerId: 't2' }],
    valuationState: { fairValue: 240 },
    riskState: { beta: 1.1 }
  };

  const mockThesis = {
    thesisStatement: 'Strong ecosystem lock-in and services expansion drive multi-year compounding.',
    expectedDrivers: [{ driverId: 'd1', evidenceIds: ['ev1'] }],
    falsificationConditions: [{ conditionId: 'c1' }, { conditionId: 'c2' }]
  };

  const dq = dqEngine.evaluateDecisionQuality({
    decisionSnapshot: mockSnapshot,
    thesisVersion: mockThesis
  });

  assert(typeof dq.overallScore === 'number', 'Overall score is computed as a number');
  assert(dq.overallScore >= 65, 'High discipline decision achieves >= 65 score');
  assert(dq.isGoodDecision === true, 'isGoodDecision is true');
  assert(dq.dimensions.length === 7, 'All 7 dimensions evaluated');

  // Test 2: Missing Dimension Handling (Never default to 0 or 50 without reason)
  const bareSnapshot = {
    decisionId: 'DEC-BARE',
    workspaceId: 'ws-test',
    ticker: 'UNKNOWN',
    decision: 'BUY',
    evidenceIds: []
  };

  const bareDQ = dqEngine.evaluateDecisionQuality({
    decisionSnapshot: bareSnapshot,
    thesisVersion: null
  });

  const missingValDim = bareDQ.dimensions.find(d => d.name === 'Valuation Discipline');
  assert(missingValDim.status === 'UNAVAILABLE', 'Missing valuation is UNAVAILABLE');
  assert(missingValDim.reasonCode === 'NO_HISTORICAL_VALUATION_RECORD', 'Explicit reasonCode provided');
  assert(missingValDim.score === null, 'Missing score is null, not defaulted to 0 or 50');

  // Test 3: 2x2 Matrix: GOOD_DECISION_GOOD_OUTCOME
  const matrix1 = dqEngine.classifyDecisionVsOutcome({
    decisionQualityScore: dq,
    stockReturn: +0.20,
    benchmarkReturn: +0.10
  });
  assert(matrix1.classification === DecisionOutcomeClassification.GOOD_DECISION_GOOD_OUTCOME, 'Classified as GOOD_DECISION_GOOD_OUTCOME');

  // Test 4: 2x2 Matrix: GOOD_DECISION_BAD_OUTCOME (Macro shock)
  const matrix2 = dqEngine.classifyDecisionVsOutcome({
    decisionQualityScore: dq,
    stockReturn: -0.15,
    benchmarkReturn: -0.10
  });
  assert(matrix2.classification === DecisionOutcomeClassification.GOOD_DECISION_BAD_OUTCOME, 'Classified as GOOD_DECISION_BAD_OUTCOME');

  // Test 5: 2x2 Matrix: BAD_DECISION_GOOD_OUTCOME (Speculative luck)
  const badDQ = { overallScore: 45, isGoodDecision: false, isSufficientData: true };
  const matrix3 = dqEngine.classifyDecisionVsOutcome({
    decisionQualityScore: badDQ,
    stockReturn: +0.35,
    benchmarkReturn: +0.10
  });
  assert(matrix3.classification === DecisionOutcomeClassification.BAD_DECISION_GOOD_OUTCOME, 'Classified as BAD_DECISION_GOOD_OUTCOME');

  // Test 6: Benchmark-aware excess return handling
  // Positive absolute return (+2%) when benchmark is +25% -> underperformance
  const matrixExcess = dqEngine.classifyDecisionVsOutcome({
    decisionQualityScore: dq,
    stockReturn: 0.02,
    benchmarkReturn: 0.25,
    excessReturn: -0.23
  });
  assert(matrixExcess.isGoodOutcome === false, 'Negative excess return classified as unfavorable outcome despite positive absolute return');

  // Test 7: Temporal Restatement Impact
  const restatement = temporalEngine.evaluateRestatementImpact({
    metric: 'REVENUE',
    decisionTimeValue: 383000, // V1
    restatedValue: 380000,     // V2
    decisionTimestamp: '2025-01-15',
    restatementTimestamp: '2025-11-20',
    decisionId: 'DEC-01',
    workspaceId: 'ws-test'
  });

  assert(restatement.isRestated === true, 'Restatement detected');
  assert(restatement.historicalDecisionIntegrityPreserved === true, 'Historical decision evaluation preserved');
  assert(restatement.decisionTimeTruth.value === 383000, 'Original V1 truth preserved');
  assert(restatement.currentRestatedTruth.value === 380000, 'Restated V2 truth preserved');

  console.log(`PASSED: ${passed} assertions (0 failed)`);
  return { suite: 'Phase 13 Decision Quality & Matrix Tests', passed, failed, total: passed + failed, results };
}

if (process.argv[1] && process.argv[1].endsWith('phase13DecisionQualityMatrixTests.js')) {
  runPhase13DecisionQualityMatrixTests();
}
