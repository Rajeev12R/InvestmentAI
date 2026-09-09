/**
 * server/test-script/test-earnings-fact-extraction.js
 * 
 * Phase 21: Deterministic Fact Extraction & TruthUpdateCandidate Tests
 */

import assert from 'assert';
import { EarningsFactExtractor } from '../earnings/earnings.extractor.js';
import { CorporateEventType, EventClassification } from '../earnings/earnings.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 21 FACT EXTRACTION TESTS ---');

const extractor = new EarningsFactExtractor();

const sampleEvent = {
  eventId: 'EVNT-MSFT-FY25Q3-001',
  securityId: 'MSFT',
  eventType: CorporateEventType.QUARTERLY_EARNINGS,
  eventTimestamp: '2025-04-25T20:00:00Z',
  reportingPeriod: 'Q3-FY2025',
  publicationTimestamp: '2025-04-25T20:30:00Z',
  sourceId: 'SRC-SEC-10Q',
  sourceTier: 'TIER_1_REGULATORY_FILING',
  evidenceId: 'EVID-SEC-MSFT-10Q',
  evidenceHash: 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
  payload: {
    revenue: 61858000000,
    eps: 2.94,
    netIncome: 21939000000,
    ebitda: 31000000000,
    ebit: 27581000000,
    cfo: 25000000000,
    capex: 10000000000,
    fcf: 15000000000,
    shares: 7460000000
  }
};

const candidates = extractor.extractFacts(sampleEvent);

testAssert(candidates.length === 9, `Extracted 9 canonical facts, got ${candidates.length}`);

// Validate Revenue Candidate
const revCand = candidates.find(c => c.metric === 'REVENUE');
testAssert(revCand !== undefined, 'Revenue candidate extracted');
testAssert(revCand.value === 61858000000, 'Revenue value matches');
testAssert(revCand.ticker === 'MSFT', 'Ticker is MSFT');
testAssert(revCand.period === 'Q3-FY2025', 'Period matches');
testAssert(revCand.classification === EventClassification.REAL_DATA, 'Classification is REAL_DATA');
testAssert(typeof revCand.canonicalHash === 'string' && revCand.canonicalHash.length === 64, 'Canonical hash present');

// Validate EPS Candidate
const epsCand = candidates.find(c => c.metric === 'DILUTED_EPS');
testAssert(epsCand !== undefined, 'EPS candidate extracted');
testAssert(epsCand.value === 2.94, 'EPS value is $2.94');

// Validate FCF Candidate
const fcfCand = candidates.find(c => c.metric === 'FREE_CASH_FLOW');
testAssert(fcfCand !== undefined, 'FCF candidate extracted');
testAssert(fcfCand.value === 15000000000, 'FCF value is $15B');

// Rejection on non-finite number
const badEventPayload = {
  ...sampleEvent,
  payload: { revenue: NaN }
};
let errCaught = false;
try {
  extractor.extractFacts(badEventPayload);
} catch {
  errCaught = true;
}
testAssert(errCaught, 'Extractor rejected non-finite number (NaN)');

console.log(`[PASS] Phase 21 Fact Extraction tests passed: ${assertionCount} assertions`);

export default { assertionCount };
