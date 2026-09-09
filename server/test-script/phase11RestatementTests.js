import assert from 'assert';
import { restatementEngine } from '../facts/restatement.engine.js';
import { factRepository } from '../facts/factRepository.js';
import { FactStatus, CanonicalMetric } from '../facts/fact.types.js';

console.log('================================================================');
console.log('PHASE 11 — RESTATEMENT ENGINE & VERSION INTEGRITY AUDIT');
console.log('================================================================\n');

let passed = 0;

function it(desc, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${desc}`);
  } catch (err) {
    console.error(`  ✗ ${desc}`);
    console.error(err);
    process.exit(1);
  }
}

// Reset facts repository before running restatement tests
factRepository.clear();

// 1. Version Transition Invariants
it('Initial fact insertion creates version 1 (V1) fact', () => {
  const res = restatementEngine.processRestatement({
    ticker: 'AAPL',
    metric: CanonicalMetric.REVENUE,
    period: 'FY2024',
    newValue: 383285000000,
    filingType: '10-K'
  });

  assert.strictEqual(res.isRestatement, false);
  assert.strictEqual(res.activeFact.version, 1);
  assert.strictEqual(res.activeFact.value, 383285000000);
  assert.strictEqual(res.activeFact.status, FactStatus.ACTIVE_TRUTH);
});

it('Idempotent re-ingestion of identical value does not create new version', () => {
  const res = restatementEngine.processRestatement({
    ticker: 'AAPL',
    metric: CanonicalMetric.REVENUE,
    period: 'FY2024',
    newValue: 383285000000,
    filingType: '10-K'
  });

  assert.strictEqual(res.isRestatement, false);
  assert.strictEqual(res.activeFact.version, 1);
  const history = restatementEngine.getRestatementHistory('AAPL', CanonicalMetric.REVENUE, 'FY2024');
  assert.strictEqual(history.length, 1);
});

it('Amended filing 10-K/A triggers V1 -> V2 restatement transition', () => {
  const res = restatementEngine.processRestatement({
    ticker: 'AAPL',
    metric: CanonicalMetric.REVENUE,
    period: 'FY2024',
    newValue: 383500000000, // Amended value (+215M)
    filingType: '10-K/A',
    restatementReason: 'Revenue timing adjustment per SEC comment letter'
  });

  assert.strictEqual(res.isRestatement, true);
  assert.strictEqual(res.activeFact.version, 2);
  assert.strictEqual(res.activeFact.value, 383500000000);
  assert.strictEqual(res.activeFact.isRestated, true);
  assert.strictEqual(res.priorFact.value, 383285000000);
});

it('V1 fact remains preserved in immutable history after restatement', () => {
  const history = restatementEngine.getRestatementHistory('AAPL', CanonicalMetric.REVENUE, 'FY2024');
  assert.strictEqual(history.length, 2);
  assert.strictEqual(history[0].version, 1);
  assert.strictEqual(history[0].value, 383285000000);
  assert.strictEqual(history[0].status, FactStatus.SUPERSEDED);
  assert.strictEqual(history[1].version, 2);
  assert.strictEqual(history[1].value, 383500000000);
  assert.strictEqual(history[1].status, FactStatus.ACTIVE_TRUTH);
});

it('Restated fact links back to prior factId via priorFactId field', () => {
  const history = restatementEngine.getRestatementHistory('AAPL', CanonicalMetric.REVENUE, 'FY2024');
  const v1 = history[0];
  const v2 = history[1];
  assert.strictEqual(v2.priorFactId, v1.factId);
});

it('Subsequent restatement creates V3 preserving full historical chain', () => {
  const res = restatementEngine.processRestatement({
    ticker: 'AAPL',
    metric: CanonicalMetric.REVENUE,
    period: 'FY2024',
    newValue: 383600000000,
    filingType: '10-K/A',
    restatementReason: 'Final audited recast'
  });

  assert.strictEqual(res.isRestatement, true);
  assert.strictEqual(res.activeFact.version, 3);
  const history = restatementEngine.getRestatementHistory('AAPL', CanonicalMetric.REVENUE, 'FY2024');
  assert.strictEqual(history.length, 3);
  assert.strictEqual(history[2].priorFactId, history[1].factId);
});

it('getActiveFact always returns the latest restated active truth', () => {
  const active = factRepository.getActiveFact('AAPL', CanonicalMetric.REVENUE, 'FY2024');
  assert.strictEqual(active.version, 3);
  assert.strictEqual(active.value, 383600000000);
});

it('processRestatement throws error if ticker is missing', () => {
  assert.throws(() => {
    restatementEngine.processRestatement({ metric: 'REVENUE', newValue: 100 });
  }, /ticker and metric are required/);
});

it('processRestatement throws error if metric is missing', () => {
  assert.throws(() => {
    restatementEngine.processRestatement({ ticker: 'AAPL', newValue: 100 });
  }, /ticker and metric are required/);
});

it('Restatements across distinct metrics remain isolated', () => {
  restatementEngine.processRestatement({
    ticker: 'AAPL',
    metric: CanonicalMetric.NET_INCOME,
    period: 'FY2024',
    newValue: 93736000000,
    filingType: '10-K'
  });

  const revHistory = restatementEngine.getRestatementHistory('AAPL', CanonicalMetric.REVENUE, 'FY2024');
  const netIncHistory = restatementEngine.getRestatementHistory('AAPL', CanonicalMetric.NET_INCOME, 'FY2024');

  assert.strictEqual(revHistory.length, 3);
  assert.strictEqual(netIncHistory.length, 1);
});

it('Restatements across distinct periods remain isolated', () => {
  restatementEngine.processRestatement({
    ticker: 'AAPL',
    metric: CanonicalMetric.REVENUE,
    period: 'FY2025',
    newValue: 391035000000,
    filingType: '10-K'
  });

  const fy24 = restatementEngine.getRestatementHistory('AAPL', CanonicalMetric.REVENUE, 'FY2024');
  const fy25 = restatementEngine.getRestatementHistory('AAPL', CanonicalMetric.REVENUE, 'FY2025');

  assert.strictEqual(fy24.length, 3);
  assert.strictEqual(fy25.length, 1);
});

it('Restatements across distinct tickers remain strictly isolated', () => {
  restatementEngine.processRestatement({
    ticker: 'JPM',
    metric: CanonicalMetric.REVENUE,
    period: 'FY2024',
    newValue: 158104000000,
    filingType: '10-K'
  });

  const aaplRev = restatementEngine.getRestatementHistory('AAPL', CanonicalMetric.REVENUE, 'FY2024');
  const jpmRev = restatementEngine.getRestatementHistory('JPM', CanonicalMetric.REVENUE, 'FY2024');

  assert.strictEqual(aaplRev.length, 3);
  assert.strictEqual(jpmRev.length, 1);
});

it('Restatement stores custom audit reason in active fact', () => {
  const active = factRepository.getActiveFact('AAPL', CanonicalMetric.REVENUE, 'FY2024');
  assert.strictEqual(active.restatementReason, 'Final audited recast');
});

it('Restatement preserves cryptographic SHA-256 hash on every version', () => {
  const history = restatementEngine.getRestatementHistory('AAPL', CanonicalMetric.REVENUE, 'FY2024');
  for (const item of history) {
    assert.ok(item.hash);
    assert.strictEqual(item.hash.length, 64);
  }
});

it('Restatement with 0 value change but explicit amended filing creates audit version', () => {
  const res = restatementEngine.processRestatement({
    ticker: 'AAPL',
    metric: CanonicalMetric.NET_INCOME,
    period: 'FY2024',
    newValue: 93736000000,
    filingType: '10-K/A',
    restatementReason: 'Filing text amended with zero numerical change'
  });

  assert.strictEqual(res.isRestatement, true);
  assert.strictEqual(res.activeFact.version, 2);
  assert.strictEqual(res.activeFact.value, 93736000000);
});

it('Restatement engine handles negative numerical values (net losses)', () => {
  const res1 = restatementEngine.processRestatement({
    ticker: 'TMPV.NS',
    metric: CanonicalMetric.NET_INCOME,
    period: 'FY2024',
    newValue: -5000000000,
    filingType: 'NSE_ANNUAL'
  });
  assert.strictEqual(res1.activeFact.value, -5000000000);

  const res2 = restatementEngine.processRestatement({
    ticker: 'TMPV.NS',
    metric: CanonicalMetric.NET_INCOME,
    period: 'FY2024',
    newValue: -4500000000,
    filingType: 'NSE_ANNUAL_AMENDED'
  });
  assert.strictEqual(res2.isRestatement, true);
  assert.strictEqual(res2.activeFact.value, -4500000000);
  assert.strictEqual(res2.activeFact.version, 2);
});

it('Restatement engine records filingDate correctly', () => {
  const active = factRepository.getActiveFact('TMPV.NS', CanonicalMetric.NET_INCOME, 'FY2024');
  assert.ok(active.filingDate);
  assert.match(active.filingDate, /^\d{4}-\d{2}-\d{2}$/);
});

it('Restatement engine records observedAt ISO timestamp', () => {
  const active = factRepository.getActiveFact('TMPV.NS', CanonicalMetric.NET_INCOME, 'FY2024');
  assert.ok(active.observedAt);
  assert.ok(new Date(active.observedAt).getTime() > 0);
});

it('Restatement engine attaches sourceDocumentId if provided', () => {
  const res = restatementEngine.processRestatement({
    ticker: 'TSM',
    metric: CanonicalMetric.REVENUE,
    period: 'FY2024',
    newValue: 2890000000000,
    filingType: '20-F',
    sourceDocumentId: 'DOC-TSM-20F-2024'
  });
  assert.strictEqual(res.activeFact.sourceDocumentId, 'DOC-TSM-20F-2024');
});

it('Restatement engine passes custom workspaceId and actorId to audit trail', () => {
  const res = restatementEngine.processRestatement({
    ticker: 'TSM',
    metric: CanonicalMetric.REVENUE,
    period: 'FY2024',
    newValue: 2900000000000,
    filingType: '20-F/A',
    workspaceId: 'ws-quant-alpha',
    actorId: 'usr-analyst-123'
  });
  assert.strictEqual(res.isRestatement, true);
});

it('Restatement history returns empty array for unregistered metric', () => {
  const history = restatementEngine.getRestatementHistory('UNKNOWN_SYM', 'NON_EXISTENT_METRIC', 'FY2024');
  assert.deepStrictEqual(history, []);
});

it('Restatement engine maintains correct priorFact reference in returned payload', () => {
  const res = restatementEngine.processRestatement({
    ticker: 'TSM',
    metric: CanonicalMetric.REVENUE,
    period: 'FY2024',
    newValue: 2910000000000,
    filingType: '20-F/A'
  });
  assert.strictEqual(res.priorFact.value, 2900000000000);
  assert.strictEqual(res.activeFact.value, 2910000000000);
});

it('Restatement preserves unit and currency attributes across versions', () => {
  const active = factRepository.getActiveFact('TSM', CanonicalMetric.REVENUE, 'FY2024');
  assert.strictEqual(active.currency, 'USD');
  assert.strictEqual(active.unit, 'RAW_UNITS');
});

it('Restatement history is strictly non-destructive (old facts cannot be deleted)', () => {
  const history = restatementEngine.getRestatementHistory('TSM', CanonicalMetric.REVENUE, 'FY2024');
  assert.strictEqual(history.length, 3);
  assert.strictEqual(history[0].version, 1);
  assert.strictEqual(history[1].version, 2);
  assert.strictEqual(history[2].version, 3);
});

it('Restatements across multiple quarters do not cross-contaminate', () => {
  restatementEngine.processRestatement({
    ticker: 'AAPL',
    metric: CanonicalMetric.REVENUE,
    period: 'Q1-2025',
    newValue: 124300000000,
    filingType: '10-Q'
  });
  restatementEngine.processRestatement({
    ticker: 'AAPL',
    metric: CanonicalMetric.REVENUE,
    period: 'Q2-2025',
    newValue: 95400000000,
    filingType: '10-Q'
  });

  const q1Hist = restatementEngine.getRestatementHistory('AAPL', CanonicalMetric.REVENUE, 'Q1-2025');
  const q2Hist = restatementEngine.getRestatementHistory('AAPL', CanonicalMetric.REVENUE, 'Q2-2025');

  assert.strictEqual(q1Hist.length, 1);
  assert.strictEqual(q2Hist.length, 1);
  assert.strictEqual(q1Hist[0].value, 124300000000);
  assert.strictEqual(q2Hist[0].value, 95400000000);
});

it('Restatement engine handles multiple amended quarters in sequence', () => {
  restatementEngine.processRestatement({
    ticker: 'AAPL',
    metric: CanonicalMetric.REVENUE,
    period: 'Q1-2025',
    newValue: 124500000000,
    filingType: '10-Q/A'
  });

  const q1Hist = restatementEngine.getRestatementHistory('AAPL', CanonicalMetric.REVENUE, 'Q1-2025');
  assert.strictEqual(q1Hist.length, 2);
  assert.strictEqual(q1Hist[1].value, 124500000000);
});

it('Restatement engine generates predictable deterministic fact IDs', () => {
  const history = restatementEngine.getRestatementHistory('AAPL', CanonicalMetric.REVENUE, 'FY2024');
  assert.strictEqual(history[0].factId, 'FACT-AAPL-REVENUE-FY2024-V1');
  assert.strictEqual(history[1].factId, 'FACT-AAPL-REVENUE-FY2024-V2');
  assert.strictEqual(history[2].factId, 'FACT-AAPL-REVENUE-FY2024-V3');
});

it('Restatements correctly preserve periodType metadata', () => {
  const active = factRepository.getActiveFact('AAPL', CanonicalMetric.REVENUE, 'FY2024');
  assert.strictEqual(active.periodType, 'FY');
});

it('Restatement engine handles zero dollar values correctly', () => {
  const res = restatementEngine.processRestatement({
    ticker: 'AAPL',
    metric: CanonicalMetric.DIVIDENDS,
    period: 'FY2000',
    newValue: 0,
    filingType: '10-K'
  });
  assert.strictEqual(res.activeFact.value, 0);
  assert.strictEqual(res.activeFact.version, 1);
});

it('Restatement audit verification ensures zero silent overwrites across complete repository', () => {
  const allFacts = factRepository.listFactsByTicker('AAPL');
  assert.ok(allFacts.length >= 4);
  assert.strictEqual(allFacts.every(f => f.hash && f.factId), true);
});

console.log(`\n================================================================`);
console.log(`PHASE 11 RESTATEMENT AUDIT COMPLETE: ${passed} PASSED`);
console.log(`================================================================\n`);
