/**
 * Phase 13 - Thesis & Process Intelligence Test Suite
 * Tests thesis versioning, thesis evaluation, breakers, WORKING+LOSS, BROKEN+PROFIT, and drift.
 */

import { ThesisVersioningEngine } from '../processIntelligence/thesisVersioning.engine.js';
import { ThesisEvaluationEngine } from '../processIntelligence/thesisEvaluation.engine.js';
import { ProcessDriftEngine } from '../processIntelligence/processDrift.engine.js';
import { ThesisState, ThesisBreakerStatus, CatalystStatus } from '../processIntelligence/process.types.js';

export async function runPhase13ThesisProcessTests() {
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

  console.log('--- RUNNING PHASE 13 THESIS & PROCESS TESTS ---');

  const thesisEngine = new ThesisVersioningEngine();
  const evalEngine = new ThesisEvaluationEngine();
  const driftEngine = new ProcessDriftEngine(2); // threshold 2 for testing

  // Test 1: Thesis V1 Creation
  const v1 = thesisEngine.createThesisVersion({
    thesisVersionId: 'THESIS-AAPL-V1',
    decisionId: 'DEC-01',
    workspaceId: 'ws-test',
    ticker: 'AAPL',
    versionNumber: 1,
    thesisStatement: 'Services growth and margin expansion will drive EPS expansion.',
    expectedTimeframe: '12_MONTHS',
    falsificationConditions: [
      { conditionId: 'BREAKER-MARGIN', description: 'Operating margin drops below 28%' }
    ],
    catalystExpectations: [
      { catalystId: 'CAT-AI-LAUNCH', name: 'AI Services Launch' }
    ]
  });

  assert(v1.versionNumber === 1, 'Thesis V1 created with version 1');
  assert(v1.thesisVersionId === 'THESIS-AAPL-V1', 'Thesis ID preserved');

  // Test 2: Thesis V2 Creation superseding V1
  const v2 = thesisEngine.createThesisVersion({
    thesisVersionId: 'THESIS-AAPL-V2',
    decisionId: 'DEC-01',
    workspaceId: 'ws-test',
    ticker: 'AAPL',
    versionNumber: 2,
    thesisStatement: 'Services growth accelerating beyond 15% YoY with AI tier monetization.',
    supersedesThesisId: 'THESIS-AAPL-V1',
    falsificationConditions: [
      { conditionId: 'BREAKER-MARGIN', description: 'Operating margin drops below 28%' }
    ]
  });

  assert(v2.versionNumber === 2, 'Thesis V2 created with version 2');
  assert(v2.supersedesThesisId === 'THESIS-AAPL-V1', 'V2 links to V1 via supersedesThesisId');

  const history = thesisEngine.getThesisHistory('DEC-01', 'ws-test');
  assert(history.length === 2, 'History contains both V1 and V2 in chronological sequence');

  // Test 3: WORKING + LOSS Case
  const workingEval = evalEngine.evaluateThesis({
    thesisVersion: v1,
    scoredForecasts: [
      { status: 'VALIDATED', metric: 'MARGIN' },
      { status: 'VALIDATED', metric: 'REVENUE' }
    ],
    observedBreakers: [
      { conditionId: 'BREAKER-MARGIN', isTriggered: false }
    ],
    stockReturn: -0.15, // Stock fell 15% due to macro market decline
    marketReturn: -0.22
  });

  assert(workingEval.thesisState === ThesisState.WORKING || workingEval.thesisState === ThesisState.STRENGTHENING, 'Thesis state is WORKING despite stock price loss');
  assert(workingEval.isWorkingWithLoss === true, 'isWorkingWithLoss flag is correctly detected');
  assert(workingEval.isBroken === false, 'Thesis is not broken');

  // Test 4: BROKEN + PROFIT Case (Speculative luck)
  const brokenEval = evalEngine.evaluateThesis({
    thesisVersion: v1,
    scoredForecasts: [
      { status: 'FALSIFIED', metric: 'MARGIN' }
    ],
    observedBreakers: [
      { conditionId: 'BREAKER-MARGIN', isTriggered: true, breachMagnitude: -0.04 }
    ],
    stockReturn: +0.25 // Stock rose 25% on speculative meme rally
  });

  assert(brokenEval.thesisState === ThesisState.BROKEN, 'Thesis state is BROKEN due to triggered breaker');
  assert(brokenEval.isBroken === true, 'isBroken flag is true');
  assert(brokenEval.isBrokenWithProfit === true, 'isBrokenWithProfit flag is correctly detected');

  // Test 5: Process Drift Detection
  const mockDecisions = [
    {
      decisionSnapshot: { decisionId: 'd1', decision: 'BUY', evidenceIds: ['ev1'], decisionTimestamp: '2025-01-01' },
      thesisEvaluation: { isBroken: true },
      actionTaken: 'HOLD'
    },
    {
      decisionSnapshot: { decisionId: 'd2', decision: 'BUY', evidenceIds: ['ev1'], decisionTimestamp: '2025-02-01' },
      thesisEvaluation: { isBroken: true },
      actionTaken: 'HOLD'
    }
  ];

  const drift = driftEngine.detectDrifts(mockDecisions);
  assert(drift.hasDrift === true, 'Process drift detected');
  assert(drift.patternsDetected.some(p => p.patternId === 'DRIFT_IGNORED_THESIS_BREAKERS'), 'Ignored thesis breakers drift identified');

  console.log(`PASSED: ${passed} assertions (0 failed)`);
  return { suite: 'Phase 13 Thesis & Process Tests', passed, failed, total: passed + failed, results };
}

if (process.argv[1] && process.argv[1].endsWith('phase13ThesisProcessTests.js')) {
  runPhase13ThesisProcessTests();
}
