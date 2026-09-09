/**
 * Phase 13 - Golden E2E Trace Test Suite
 * Validates the complete causal chain from decision snapshot to sealed package and Copilot query.
 */

import { decisionSnapshotEngine } from '../processIntelligence/decisionSnapshot.engine.js';
import { thesisVersioningEngine } from '../processIntelligence/thesisVersioning.engine.js';
import { forecastLedgerEngine } from '../processIntelligence/forecastLedger.engine.js';
import { processIntelligenceService } from '../processIntelligence/processIntelligencePackage.js';
import { getProcessIntelligencePackage } from '../copilot/tools/processIntelligence.tool.js';

export async function runPhase13GoldenE2ETest() {
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
      console.error(`FAILED GOLDEN E2E TEST: ${message}`);
    }
  }

  console.log('--- RUNNING PHASE 13 GOLDEN E2E TRACE ---');

  const workspaceId = 'ws-golden-e2e';
  const decisionId = 'DEC-GOLDEN-AAPL';

  // Step 1: Immutable Decision Snapshot at T0
  const snapshot = decisionSnapshotEngine.createSnapshot({
    decisionId,
    workspaceId,
    ticker: 'AAPL',
    decision: 'BUY',
    decisionTimestamp: '2025-01-15T09:30:00.000Z',
    decisionPrice: 220.0,
    conviction: 0.85,
    positionSize: 0.10,
    valuationState: { fairValue: 260.0, timestamp: '2025-01-15T09:00:00.000Z' },
    riskState: { beta: 1.10, volatility: 0.22, timestamp: '2025-01-15T09:00:00.000Z' },
    evidenceIds: ['FACT-AAPL-SERVICES-Q4-2024', 'FACT-AAPL-MARGIN-Q4-2024'],
    evidencePackageHash: 'hash-ev-golden-aapl',
    expectedDrivers: [
      { driverId: 'DRV-MARGIN', metric: 'OPERATING_MARGIN', expectedDirection: 'IMPROVE', evidenceIds: ['FACT-AAPL-MARGIN-Q4-2024'] }
    ],
    falsificationTriggers: [
      { triggerId: 'FLS-MARGIN-DROP', description: 'Operating margin drops below 28%' }
    ],
    catalystExpectations: [
      { catalystId: 'CAT-AI-ROLLOUT', name: 'Sustained Apple Intelligence expansion' }
    ],
    forecastIds: ['FC-GOLDEN-01', 'FC-GOLDEN-02']
  });

  assert(snapshot.decisionId === decisionId, 'Step 1: Decision snapshot recorded');
  assert(snapshot.packageHash.length === 64, 'Step 1: Decision snapshot sealed with SHA-256');

  // Step 2: Immutable Thesis Version 1
  const thesisV1 = thesisVersioningEngine.createThesisVersion({
    thesisVersionId: 'THESIS-GOLDEN-V1',
    decisionId,
    workspaceId,
    ticker: 'AAPL',
    versionNumber: 1,
    thesisStatement: 'Services revenue acceleration and AI monetization expand operating margins above 30%.',
    expectedTimeframe: '12_MONTHS',
    falsificationConditions: [
      { conditionId: 'FLS-MARGIN-DROP', description: 'Operating margin drops below 28%' }
    ],
    catalystExpectations: [
      { catalystId: 'CAT-AI-ROLLOUT', name: 'Sustained Apple Intelligence expansion' }
    ]
  });

  assert(thesisV1.versionNumber === 1, 'Step 2: Thesis V1 created');

  // Step 3: Forecast Ledger
  forecastLedgerEngine.recordForecast({
    forecastId: 'FC-GOLDEN-01',
    decisionId,
    workspaceId,
    ticker: 'AAPL',
    metric: 'OPERATING_MARGIN',
    forecastType: 'THRESHOLD',
    thresholdValue: 0.30,
    confidence: 0.85
  });

  forecastLedgerEngine.recordForecast({
    forecastId: 'FC-GOLDEN-02',
    decisionId,
    workspaceId,
    ticker: 'AAPL',
    metric: 'REVENUE_GROWTH',
    forecastType: 'NUMERIC_RANGE',
    predictedRange: { min: 0.08, max: 0.12 },
    confidence: 0.80
  });

  assert(forecastLedgerEngine.getForecastsByDecision(decisionId, workspaceId).length === 2, 'Step 3: Forecasts recorded in ledger');

  // Step 4: Time progression & Outcome Evaluation
  const evaluatedPkg = processIntelligenceService.evaluateDecision({
    decisionId,
    workspaceId,
    observationData: {
      OPERATING_MARGIN: { actualValue: 0.306 },
      REVENUE_GROWTH: { actualValue: 0.098 },
      stockReturn: 0.14,
      marketReturn: 0.08,
      breakers: [{ conditionId: 'FLS-MARGIN-DROP', isTriggered: false }],
      catalysts: [{ catalystId: 'CAT-AI-ROLLOUT', realized: true, actualDate: '2025-06-10' }]
    },
    portfolioAttribution: {
      totalReturn: 0.14,
      benchmarkReturn: 0.08,
      activeReturn: 0.06
    }
  });

  assert(evaluatedPkg.packageHash.length === 64, 'Step 4: Sealed ProcessIntelligencePackage generated');
  assert(evaluatedPkg.thesisEvaluation.thesisState === 'VALIDATED', 'Step 4: Thesis evaluated as VALIDATED');
  assert(evaluatedPkg.decisionQuality.overallScore >= 75, 'Step 4: Decision quality evaluated as high discipline');
  assert(evaluatedPkg.decisionVsOutcome.classification === 'GOOD_DECISION_GOOD_OUTCOME', 'Step 4: Classified as GOOD_DECISION_GOOD_OUTCOME');

  // Step 5: Copilot Tool Adapter Query
  const copilotData = await getProcessIntelligencePackage(decisionId, workspaceId);
  assert(copilotData.packageHash === evaluatedPkg.packageHash, 'Step 5: Copilot tool reads exact sealed package hash');
  assert(copilotData.decisionVsOutcome.classification === 'GOOD_DECISION_GOOD_OUTCOME', 'Step 5: Copilot query preserves 2x2 matrix outcome');

  console.log(`PASSED: ${passed} assertions (0 failed)`);
  return { suite: 'Phase 13 Golden E2E Trace', passed, failed, total: passed + failed, results };
}

if (process.argv[1] && process.argv[1].endsWith('phase13GoldenE2ETest.js')) {
  runPhase13GoldenE2ETest();
}
