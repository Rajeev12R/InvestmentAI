/**
 * server/test-script/test-earnings-events-schema.js
 * 
 * Phase 21: Corporate Event Ingestion, Schema & Deduplication Tests
 */

import assert from 'assert';
import { CorporateEventStore } from '../earnings/earnings.eventStore.js';
import { validateCorporateEvent, validateGuidancePayload } from '../earnings/earnings.schema.js';
import { CorporateEventType, EventClassification } from '../earnings/earnings.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 21 EVENT SCHEMA & DEDUPLICATION TESTS ---');

const eventStore = new CorporateEventStore();
const tenantId = 'TENANT-EVENT-SCHEMA';

// 1. Ingest Valid Quarterly Earnings Event
const validEvent = {
  eventId: 'EVNT-AAPL-2025Q4-001',
  securityId: 'AAPL',
  eventType: CorporateEventType.QUARTERLY_EARNINGS,
  eventTimestamp: '2025-10-30T20:30:00Z',
  reportingPeriod: 'Q4-2025',
  publicationTimestamp: '2025-10-30T21:00:00Z',
  sourceId: 'SRC-SEC-EDGAR-10Q',
  sourceTier: 'TIER_1_REGULATORY_FILING',
  payload: {
    revenue: 94930000000,
    eps: 1.64,
    netIncome: 24730000000
  }
};

const ingestRes1 = eventStore.ingestEvent(tenantId, validEvent);
testAssert(ingestRes1.isDuplicate === false, 'First ingestion is not duplicate');
testAssert(ingestRes1.event.eventId === 'EVNT-AAPL-2025Q4-001', 'Event ID preserved');
testAssert(ingestRes1.event.classification === EventClassification.REAL_DATA, 'Classification is REAL_DATA');
testAssert(typeof ingestRes1.event.canonicalHash === 'string' && ingestRes1.event.canonicalHash.length === 64, 'Canonical hash present');

// Immutability check
let mutErr = false;
try {
  ingestRes1.event.payload.revenue = 999;
} catch {
  mutErr = true;
}
testAssert(mutErr, 'Stored event is deeply frozen/immutable');

// 2. Ingest Exact Duplicate Event -> Returns duplicate flag without mutating store
const duplicateRes = eventStore.ingestEvent(tenantId, validEvent);
testAssert(duplicateRes.isDuplicate === true, 'Duplicate payload correctly identified');
testAssert(duplicateRes.event.eventId === 'EVNT-AAPL-2025Q4-001', 'Existing duplicate returned');

// 3. Retrieve Event and Timeline
const retrieved = eventStore.getEvent(tenantId, 'EVNT-AAPL-2025Q4-001');
testAssert(retrieved !== null, 'Event retrieved by ID');

const timeline = eventStore.getTimeline(tenantId, 'AAPL');
testAssert(timeline.length === 1, 'Timeline contains 1 event');

// 4. Schema Rejection Tests
const badEvents = [
  null,
  {},
  { eventId: '' },
  { eventId: 'E1', securityId: '' },
  { eventId: 'E1', securityId: 'AAPL', eventType: 'INVALID_EVENT' },
  { eventId: 'E1', securityId: 'AAPL', eventType: CorporateEventType.QUARTERLY_EARNINGS, eventTimestamp: 'invalid-date' },
  { eventId: 'E1', securityId: 'AAPL', eventType: CorporateEventType.QUARTERLY_EARNINGS, eventTimestamp: '2025-01-01T00:00:00Z', publicationTimestamp: 'invalid-date' },
  { eventId: 'E1', securityId: 'AAPL', eventType: CorporateEventType.QUARTERLY_EARNINGS, eventTimestamp: '2025-01-01T00:00:00Z', publicationTimestamp: '2025-01-01T00:00:00Z', reportingPeriod: '' }
];

for (const bad of badEvents) {
  let errCaught = false;
  try {
    validateCorporateEvent(bad);
  } catch {
    errCaught = true;
  }
  testAssert(errCaught, `Schema rejected invalid event: ${JSON.stringify(bad)}`);
}

// 5. Guidance Payload Validation Tests
const validGuidance = { metric: 'REVENUE', period: 'FY2026', low: 100, high: 110 };
testAssert(validateGuidancePayload(validGuidance) === true, 'Valid guidance passes validation');

let badGuidanceErr = false;
try {
  validateGuidancePayload({ metric: 'REVENUE', period: 'FY2026', low: 120, high: 100 }); // inverted
} catch {
  badGuidanceErr = true;
}
testAssert(badGuidanceErr, 'Rejects inverted guidance low > high');

console.log(`[PASS] Phase 21 Event Schema & Dedup tests passed: ${assertionCount} assertions`);

export default { assertionCount };
