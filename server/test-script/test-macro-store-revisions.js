/**
 * test-macro-store-revisions.js
 * Suite 3: Macro Store, Revision Tracking & Point-in-Time Cutoff Tests
 */

import assert from 'assert';
import { createMacroStore } from '../macro/macro.store.js';
import { MacroEnums } from '../macro/macro.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 3: Macro Store & Revisions Tests ---');

const store = createMacroStore();
const tenantId = 'tenant-macro-1';

// 1. Ingest initial observation
const obs1 = store.ingestObservation({
  tenantId,
  seriesId: 'US_CPI_YOY',
  timestamp: '2026-01-01T00:00:00.000Z',
  value: 3.2,
  unit: '%',
  provenance: {
    sourceId: 'BLS',
    asOf: '2026-01-15T12:00:00.000Z',
    verified: true,
    authority: 'US_BLS'
  }
});

testAssert(obs1.revision === 1, 'Initial observation is revision 1');
testAssert(obs1.classification === 'REAL_DATA', 'Classification is REAL_DATA');
testAssert(obs1.provenance.tier === 'TIER_1_DIRECT_AUTHORITY', 'BLS is Tier 1 authority');

// 2. Ingest restatement/revision for identical point in time
const obs2 = store.ingestObservation({
  tenantId,
  seriesId: 'US_CPI_YOY',
  timestamp: '2026-01-01T00:00:00.000Z',
  value: 3.4, // revised higher
  unit: '%',
  provenance: {
    sourceId: 'BLS',
    asOf: '2026-02-15T12:00:00.000Z',
    verified: true,
    authority: 'US_BLS'
  }
});

testAssert(obs2.revision === 2, 'Restatement increments revision to 2');
testAssert(obs2.value === 3.4, 'New value is 3.4');

// 3. Point-in-Time Query: Before restatement as-of cutoff
const pitBefore = store.getPointInTime(
  tenantId,
  'US_CPI_YOY',
  '2026-01-01T00:00:00.000Z',
  '2026-01-31T23:59:59.000Z' // Query as-of Jan 31
);
testAssert(pitBefore !== null, 'Found PIT observation before cutoff');
testAssert(pitBefore.value === 3.2, 'As-of Jan 31 returned initial value 3.2');
testAssert(pitBefore.revision === 1, 'As-of Jan 31 returned revision 1');

// 4. Point-in-Time Query: After restatement as-of cutoff
const pitAfter = store.getPointInTime(
  tenantId,
  'US_CPI_YOY',
  '2026-01-01T00:00:00.000Z',
  '2026-02-28T23:59:59.000Z' // Query as-of Feb 28
);
testAssert(pitAfter !== null, 'Found PIT observation after cutoff');
testAssert(pitAfter.value === 3.4, 'As-of Feb 28 returned revised value 3.4');
testAssert(pitAfter.revision === 2, 'As-of Feb 28 returned revision 2');

// 5. Ingestion with unverified source downgrades provenance
const unverifiedObs = store.ingestObservation({
  tenantId,
  seriesId: 'US_10Y_YIELD',
  timestamp: '2026-01-01T00:00:00.000Z',
  value: 4.25,
  unit: '%',
  provenance: {
    sourceId: 'RANDOM_BLOG',
    verified: false
  }
});
testAssert(unverifiedObs.provenance.tier === 'UNVERIFIED_SOURCE', 'Unverified source assigned UNVERIFIED tier');

console.log(`[PASS] Suite 3 Macro Store & Revisions passed: ${assertionCount} assertions`);
export default { assertionCount };
