/**
 * server/test-script/test-forecast-assumptions-revisions.js
 * 
 * Phase 20: Explicit Assumptions Registry & Forecast Revisions Unit Tests
 */

import assert from 'assert';
import { AssumptionRegistry } from '../forecasting/forecast.assumptions.js';
import { ForecastRevisionEngine } from '../forecasting/forecast.revisions.engine.js';
import { ForecastClassification } from '../forecasting/forecast.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 20 ASSUMPTIONS & REVISIONS TESTS ---');

// 1. Assumption Registry Tests
const registry = new AssumptionRegistry();
const tenantId = 'TENANT-ALPHA';

const assumption1 = registry.registerAssumption(tenantId, {
  assumptionId: 'ASSUMP-REV-01',
  metric: 'REVENUE_GROWTH',
  value: 0.12,
  unit: 'PERCENT',
  period: 'FY2027',
  rationale: 'Cloud customer net expansion rate momentum'
}, 'ANALYST-LEAD');

testAssert(assumption1.assumptionId === 'ASSUMP-REV-01', 'Assumption ID preserved');
testAssert(assumption1.value === 0.12, 'Assumption value is 0.12 (12%)');
testAssert(assumption1.classification === ForecastClassification.ASSUMPTION, 'Classification is ASSUMPTION');
testAssert(typeof assumption1.hash === 'string' && assumption1.hash.length === 64, 'Canonical hash computed');

// Immutability test
let mutErr = false;
try {
  assumption1.value = 0.20;
} catch {
  mutErr = true;
}
testAssert(mutErr, 'Registered assumption is deeply frozen/immutable');

// Listing assumptions
const allAssumps = registry.listAssumptions(tenantId);
testAssert(allAssumps.length === 1, 'Lists registered assumption');
testAssert(registry.getAssumption(tenantId, 'ASSUMP-REV-01') !== null, 'Retrieves assumption by ID');

// 2. Revision Engine Tests
const revisionEngine = new ForecastRevisionEngine();

// Record V1
const v1 = revisionEngine.recordForecastVersion(tenantId, {
  ticker: 'MSFT',
  metric: 'REVENUE',
  period: 'FY2027',
  forecastValue: 280000,
  assumptions: {
    revenueGrowthRate: 0.10,
    operatingMargin: 0.40
  }
});
testAssert(v1.version === 1, 'First version is V1');
testAssert(v1.versionTag === 'V1', 'Version tag is V1');

// Record V2 (Upgrade: growth 10% -> 12%, margin 40% -> 42%)
const v2 = revisionEngine.recordForecastVersion(tenantId, {
  ticker: 'MSFT',
  metric: 'REVENUE',
  period: 'FY2027',
  forecastValue: 300000,
  assumptions: {
    revenueGrowthRate: 0.12,
    operatingMargin: 0.42
  }
});
testAssert(v2.version === 2, 'Second version is V2');

// Record V3 (Downgrade: revenue 300k -> 290k)
const v3 = revisionEngine.recordForecastVersion(tenantId, {
  ticker: 'MSFT',
  metric: 'REVENUE',
  period: 'FY2027',
  forecastValue: 290000,
  assumptions: {
    revenueGrowthRate: 0.11,
    operatingMargin: 0.42
  }
});
testAssert(v3.version === 3, 'Third version is V3');

// History check
const history = revisionEngine.getVersionHistory(tenantId, 'MSFT', 'REVENUE', 'FY2027');
testAssert(history.length === 3, 'History contains 3 versions');
testAssert(history[0].forecastValue === 280000, 'V1 value preserved immutably');
testAssert(history[1].forecastValue === 300000, 'V2 value preserved immutably');
testAssert(history[2].forecastValue === 290000, 'V3 value preserved immutably');

// Revision Attribution: V1 vs V2
const attr1to2 = revisionEngine.attributeRevision(v1, v2);
testAssert(attr1to2.direction === 'UPGRADE', 'V1 to V2 is an UPGRADE');
testAssert(attr1to2.deltaDollar === 20000, 'Revision delta is +$20,000');
testAssert(Math.abs(attr1to2.deltaPercent - (20000 / 280000)) < 1e-6, 'Revision percent delta matches');
testAssert(attr1to2.driverAttribution.length === 2, '2 driver differences identified');

const revGrowthDriver = attr1to2.driverAttribution.find(d => d.driver === 'revenueGrowthRate');
testAssert(Math.abs(revGrowthDriver.delta - 0.02) < 1e-6, 'Revenue growth driver revision is +200 bps');

// Revision Attribution: V2 vs V3
const attr2to3 = revisionEngine.attributeRevision(v2, v3);
testAssert(attr2to3.direction === 'DOWNGRADE', 'V2 to V3 is a DOWNGRADE');
testAssert(attr2to3.deltaDollar === -10000, 'Revision delta is -$10,000');

console.log(`[PASS] Phase 20 Assumptions & Revisions tests passed: ${assertionCount} assertions`);

export default { assertionCount };
