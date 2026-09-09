import assert from 'assert';
import { workspaceRepository } from '../workspace/workspace.repository.js';
import { workspaceEngine } from '../workspace/workspace.engine.js';
import { createSnapshotFromTruthPackage } from '../workspace/workspaceSnapshot.engine.js';
import { sealTruthPackage } from '../tools/evidence.tool.js';
import { EVENT_SEVERITY, TIMELINE_EVENT_TYPES, WATCHLIST_STATUS } from '../workspace/workspace.types.js';

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log('================================================================');
console.log('PHASE 5 — PERSISTENT INVESTMENT WORKSPACE & SNAPSHOT TESTS');
console.log('================================================================');

// Clear test storage
workspaceRepository.clearAll();

// 1. Workspace Lifecycle Tests
console.log('\n--- 1. Workspace Lifecycle & Persistence ---');

runTest('Create workspace with custom metadata', () => {
  const ws = workspaceRepository.createWorkspace({
    name: 'Institutional Tech Fund Workspace',
    description: 'Tech sector coverage and thesis drift monitoring'
  });
  assert.ok(ws.workspaceId.startsWith('WS_'));
  assert.strictEqual(ws.name, 'Institutional Tech Fund Workspace');
  assert.ok(Array.isArray(ws.watchlist));
  assert.strictEqual(ws.watchlist.length, 0);
});

runTest('Retrieve workspace by ID', () => {
  const ws = workspaceRepository.createWorkspace({ name: 'Alpha Workspace' });
  const retrieved = workspaceRepository.getWorkspace(ws.workspaceId);
  assert.strictEqual(retrieved.workspaceId, ws.workspaceId);
  assert.strictEqual(retrieved.name, 'Alpha Workspace');
});

runTest('Get all workspaces (returns non-empty array)', () => {
  const list = workspaceRepository.getAllWorkspaces();
  assert.ok(list.length >= 2);
});

runTest('Update workspace metadata', () => {
  const ws = workspaceRepository.createWorkspace({ name: 'Temp WS' });
  ws.name = 'Updated Temp WS';
  const updated = workspaceRepository.updateWorkspace(ws);
  assert.strictEqual(updated.name, 'Updated Temp WS');
  const fetched = workspaceRepository.getWorkspace(ws.workspaceId);
  assert.strictEqual(fetched.name, 'Updated Temp WS');
});

// 2. Watchlist Management Tests
console.log('\n--- 2. Watchlist Management & Deduplication ---');

runTest('Add ticker to watchlist', () => {
  const ws = workspaceEngine.addWatchlistTicker('WS_TEST_1', 'AAPL', ['TECH', 'MEGA_CAP']);
  assert.ok(ws.watchlist.some(w => w.ticker === 'AAPL'));
  const item = ws.watchlist.find(w => w.ticker === 'AAPL');
  assert.strictEqual(item.status, WATCHLIST_STATUS.ACTIVE);
  assert.deepStrictEqual(item.tags, ['TECH', 'MEGA_CAP']);
});

runTest('Deduplicate ticker addition to watchlist', () => {
  workspaceEngine.addWatchlistTicker('WS_TEST_1', 'AAPL');
  const ws = workspaceEngine.addWatchlistTicker('WS_TEST_1', 'AAPL');
  const count = ws.watchlist.filter(w => w.ticker === 'AAPL').length;
  assert.strictEqual(count, 1, 'Ticker must not be duplicated in watchlist');
});

runTest('Add multiple distinct tickers', () => {
  workspaceEngine.addWatchlistTicker('WS_TEST_1', 'MSFT');
  workspaceEngine.addWatchlistTicker('WS_TEST_1', 'JPM');
  const ws = workspaceRepository.getWorkspace('WS_TEST_1');
  assert.ok(ws.watchlist.some(w => w.ticker === 'MSFT'));
  assert.ok(ws.watchlist.some(w => w.ticker === 'JPM'));
});

runTest('Remove ticker from watchlist', () => {
  const ws = workspaceEngine.removeWatchlistTicker('WS_TEST_1', 'MSFT');
  assert.ok(!ws.watchlist.some(w => w.ticker === 'MSFT'));
  assert.ok(ws.watchlist.some(w => w.ticker === 'AAPL'));
});

// 3. Snapshot Creation & Versioning Tests
console.log('\n--- 3. Immutable Snapshot Versioning & Cryptographic Integrity ---');

function createMockTruthPackage(ticker = 'AAPL', fairValue = 180, rev = 400e9, fcf = 100e9, decision = 'BUY') {
  const pkg = {
    company: { ticker, name: `${ticker} Corp`, currentPrice: 150, currency: 'USD' },
    financialFacts: [
      { id: 'financial.revenue', value: rev, source: 'SEC_10K', period: 'FY2025' },
      { id: 'financial.freeCashFlow', value: fcf, source: 'SEC_10K', period: 'FY2025' },
      { id: 'financial.totalDebt', value: 100e9, source: 'SEC_10K', period: 'FY2025' },
      { id: 'financial.totalCash', value: 30e9, source: 'SEC_10K', period: 'FY2025' },
      { id: 'financial.operatingMargin', value: 0.30, source: 'SEC_10K', period: 'FY2025' }
    ],
    calculatedMetrics: [
      { id: 'financial.netDebt', value: 70e9, source: 'CALCULATED', period: 'FY2025' },
      { id: 'financial.fcfMargin', value: 0.25, source: 'CALCULATED', period: 'FY2025' }
    ],
    valuationModels: {
      dcf: { fairValue, upside: ((fairValue - 150) / 150) * 100 },
      reverseDcf: { impliedGrowthRate: 8.5 },
      valuationSummary: { compositeFairValue: fairValue, currentPrice: 150, modelAgreement: 'STRONG' }
    },
    riskSignals: {
      overallScore: 25,
      overallCategory: 'LOW',
      financialRisk: { level: 'LOW', debtToEbitda: 1.2 },
      marketRisk: { level: 'LOW' },
      liquidityRisk: { level: 'LOW' }
    },
    decision: {
      decision,
      conviction: { score: 85, level: 'HIGH' },
      primaryDrivers: ['Strong FCF margin', 'DCF valuation upside']
    },
    confidence: { overall: 90, dataCompleteness: 95 }
  };
  const seal = sealTruthPackage(pkg);
  pkg.integrity = seal;
  return pkg;
}

runTest('Create immutable snapshot from sealed Truth Package', () => {
  const pkg = createMockTruthPackage('AAPL', 180, 400e9, 100e9, 'BUY');
  const snap = createSnapshotFromTruthPackage({
    workspaceId: 'WS_SNAP_TEST',
    truthPackage: pkg
  });

  assert.strictEqual(snap.ticker, 'AAPL');
  assert.strictEqual(snap.workspaceId, 'WS_SNAP_TEST');
  assert.strictEqual(snap.valuationState.dcfFairValue, 180);
  assert.strictEqual(snap.financialState.revenue, 400e9);
  assert.strictEqual(snap.decisionState.decision, 'BUY');
  assert.ok(snap.truthPackageHash);
});

runTest('Save snapshot to repository and verify SHA-256 hash', () => {
  const pkg = createMockTruthPackage('AAPL', 180, 400e9, 100e9, 'BUY');
  const snap = createSnapshotFromTruthPackage({
    workspaceId: 'WS_SNAP_TEST',
    truthPackage: pkg,
    customSnapshotId: 'SNAP_AAPL_T0'
  });
  const saved = workspaceRepository.saveSnapshot(snap);
  assert.strictEqual(saved.snapshotId, 'SNAP_AAPL_T0');
  assert.ok(saved.snapshotHash);
  assert.strictEqual(typeof saved.snapshotHash, 'string');
  assert.strictEqual(saved.snapshotHash.length, 64); // SHA-256 hex string
});

runTest('Immutability invariant: Overwriting existing snapshot throws error', () => {
  const pkg = createMockTruthPackage('AAPL', 180, 400e9, 100e9, 'BUY');
  const snap = createSnapshotFromTruthPackage({
    workspaceId: 'WS_SNAP_TEST',
    truthPackage: pkg,
    customSnapshotId: 'SNAP_AAPL_T0'
  });

  assert.throws(() => {
    workspaceRepository.saveSnapshot(snap);
  }, /Immutability violation/);
});

runTest('Retrieve snapshot history in chronological order', () => {
  const pkg1 = createMockTruthPackage('AAPL', 185, 410e9, 105e9, 'BUY');
  const snap1 = createSnapshotFromTruthPackage({
    workspaceId: 'WS_SNAP_TEST',
    truthPackage: pkg1,
    customSnapshotId: 'SNAP_AAPL_T1'
  });
  workspaceRepository.saveSnapshot(snap1);

  const history = workspaceRepository.getSnapshotHistory('WS_SNAP_TEST', 'AAPL');
  assert.strictEqual(history.length, 2);
  assert.strictEqual(history[0].snapshotId, 'SNAP_AAPL_T0');
  assert.strictEqual(history[1].snapshotId, 'SNAP_AAPL_T1');
});

runTest('Get latest and previous snapshot queries', () => {
  const latest = workspaceRepository.getLatestSnapshot('WS_SNAP_TEST', 'AAPL');
  const prev = workspaceRepository.getPreviousSnapshot('WS_SNAP_TEST', 'AAPL');
  assert.strictEqual(latest.snapshotId, 'SNAP_AAPL_T1');
  assert.strictEqual(prev.snapshotId, 'SNAP_AAPL_T0');
});

// 4. Timeline Event Tests
console.log('\n--- 4. Timeline Events & Chronological History ---');

runTest('Save and retrieve structured timeline events', () => {
  workspaceRepository.saveTimelineEvent({
    workspaceId: 'WS_SNAP_TEST',
    ticker: 'AAPL',
    type: TIMELINE_EVENT_TYPES.MATERIAL_CHANGE,
    severity: EVENT_SEVERITY.MEDIUM,
    title: 'Revenue Acceleration Detected',
    summary: 'Revenue grew +8.5% YoY, exceeding forecast expectations.',
    evidenceIds: ['financial.revenue']
  });

  const timeline = workspaceRepository.getTimeline('WS_SNAP_TEST', 'AAPL');
  assert.ok(timeline.length >= 1);
  assert.strictEqual(timeline[0].ticker, 'AAPL');
  assert.strictEqual(timeline[0].severity, EVENT_SEVERITY.MEDIUM);
  assert.ok(timeline[0].eventId.startsWith('EVT_'));
});

// 5. Alert Repository Tests
console.log('\n--- 5. Alert Engine Persistence & Acknowledgement ---');

runTest('Save and filter alerts by workspace & ticker', () => {
  workspaceRepository.saveAlert({
    workspaceId: 'WS_SNAP_TEST',
    ticker: 'AAPL',
    type: 'DECISION_DOWNGRADE',
    severity: EVENT_SEVERITY.HIGH,
    title: 'Decision Downgraded to HOLD',
    trigger: 'Price reached intrinsic fair value'
  });

  const allAlerts = workspaceRepository.getAlerts('WS_SNAP_TEST');
  assert.ok(allAlerts.length >= 1);
  assert.strictEqual(allAlerts[0].ticker, 'AAPL');
  assert.strictEqual(allAlerts[0].acknowledged, false);
});

runTest('Acknowledge alert and verify state update', () => {
  const allAlerts = workspaceRepository.getAlerts('WS_SNAP_TEST');
  const alertId = allAlerts[0].alertId;
  const acked = workspaceRepository.acknowledgeAlert('WS_SNAP_TEST', alertId);
  assert.strictEqual(acked.acknowledged, true);
  assert.ok(acked.acknowledgedAt);

  const unack = workspaceRepository.getAlerts('WS_SNAP_TEST', { unacknowledgedOnly: true });
  assert.ok(!unack.some(a => a.alertId === alertId));
});

// 6. Multi-Ticker Isolation Tests
console.log('\n--- 6. Multi-Ticker Workspace Isolation ---');

runTest('Ensure snapshots for distinct tickers never collide', () => {
  const jpmPkg = createMockTruthPackage('JPM', 220, 160e9, 45e9, 'BUY');
  const jpmSnap = createSnapshotFromTruthPackage({
    workspaceId: 'WS_SNAP_TEST',
    truthPackage: jpmPkg,
    customSnapshotId: 'SNAP_JPM_T0'
  });
  workspaceRepository.saveSnapshot(jpmSnap);

  const aaplHistory = workspaceRepository.getSnapshotHistory('WS_SNAP_TEST', 'AAPL');
  const jpmHistory = workspaceRepository.getSnapshotHistory('WS_SNAP_TEST', 'JPM');

  assert.strictEqual(aaplHistory.every(s => s.ticker === 'AAPL'), true);
  assert.strictEqual(jpmHistory.every(s => s.ticker === 'JPM'), true);
  assert.strictEqual(jpmHistory.length, 1);
});

// 7. Full Workspace Ingestion Flow Tests
console.log('\n--- 7. Full Workspace Ingestion & Lifecycle Flow ---');

runTest('ingestTruthPackage runs snapshot creation, change analysis, and timeline logging', () => {
  const ws = workspaceRepository.createWorkspace({ workspaceId: 'WS_INGEST_TEST', name: 'Ingest WS' });
  const pkg1 = createMockTruthPackage('AAPL', 180, 400e9, 100e9, 'BUY');
  const res1 = workspaceEngine.ingestTruthPackage('WS_INGEST_TEST', pkg1);

  assert.strictEqual(res1.snapshot.ticker, 'AAPL');
  assert.strictEqual(res1.changeReport.isBaseline, true);
  assert.strictEqual(res1.alerts.length, 0);

  // Ingest updated T1 package
  const pkg2 = createMockTruthPackage('AAPL', 160, 420e9, 85e9, 'HOLD');
  const res2 = workspaceEngine.ingestTruthPackage('WS_INGEST_TEST', pkg2);

  assert.strictEqual(res2.changeReport.isBaseline, false);
  assert.strictEqual(res2.changeReport.decisionDrift.hasChanged, true);
  assert.strictEqual(res2.changeReport.decisionDrift.transitionType, 'DOWNGRADE');
  assert.ok(res2.alerts.length >= 1);

  const timeline = workspaceRepository.getTimeline('WS_INGEST_TEST', 'AAPL');
  assert.ok(timeline.length >= 2);
  assert.ok(timeline.some(e => e.type === TIMELINE_EVENT_TYPES.DECISION_TRANSITION));
});

runTest('Filter alerts by severity and unacknowledged status', () => {
  workspaceRepository.saveAlert({
    workspaceId: 'WS_ALERT_TEST',
    ticker: 'NVDA',
    type: 'RISK_CRITICAL',
    severity: EVENT_SEVERITY.CRITICAL,
    title: 'Critical Risk Spike'
  });
  workspaceRepository.saveAlert({
    workspaceId: 'WS_ALERT_TEST',
    ticker: 'NVDA',
    type: 'MATERIAL_CHANGE',
    severity: EVENT_SEVERITY.LOW,
    title: 'Low priority note'
  });

  const criticals = workspaceRepository.getAlerts('WS_ALERT_TEST', { severity: EVENT_SEVERITY.CRITICAL });
  assert.strictEqual(criticals.length, 1);
  assert.strictEqual(criticals[0].severity, EVENT_SEVERITY.CRITICAL);

  const tickerAlerts = workspaceRepository.getAlerts('WS_ALERT_TEST', { ticker: 'NVDA' });
  assert.strictEqual(tickerAlerts.length, 2);
});

runTest('Handle non-existent snapshot lookups gracefully', () => {
  const missing = workspaceRepository.getSnapshot('WS_EMPTY', 'XYZ', 'SNAP_NONE');
  assert.strictEqual(missing, null);
  const history = workspaceRepository.getSnapshotHistory('WS_EMPTY', 'XYZ');
  assert.deepStrictEqual(history, []);
});

runTest('Empty timeline lookup returns empty array', () => {
  const timeline = workspaceRepository.getTimeline('WS_EMPTY', 'XYZ');
  assert.deepStrictEqual(timeline, []);
});

runTest('Workspace tags and watchlist metadata update properly', () => {
  const ws = workspaceEngine.addWatchlistTicker('WS_TAG_TEST', 'RELIANCE.NS', ['ENERGY', 'INDIA_NIFTY50']);
  const item = ws.watchlist.find(w => w.ticker === 'RELIANCE.NS');
  assert.ok(item);
  assert.deepStrictEqual(item.tags, ['ENERGY', 'INDIA_NIFTY50']);
});

console.log('================================================================');
console.log(`WORKSPACE TESTS COMPLETE: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================');

if (failed > 0) process.exit(1);
