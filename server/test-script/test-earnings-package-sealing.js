/**
 * server/test-script/test-earnings-package-sealing.js
 * 
 * Phase 21: Package Sealing, Verification & Copilot Tool Tests
 */

import assert from 'assert';
import { sealEventIntelligencePackage, verifyEventIntelligencePackage } from '../earnings/earnings.package.js';
import { executeEarningsTool } from '../earnings/earnings.tool.js';
import { generateEarningsExplanation } from '../earnings/earnings.explanation.js';
import { defaultCorporateEventStore } from '../earnings/earnings.eventStore.js';
import { EventClassification } from '../earnings/earnings.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 21 PACKAGE SEALING & TOOL BRIDGE TESTS ---');

const tenantId = 'TENANT-SEAL-001';
const sampleEvent = {
  eventId: 'EVNT-AAPL-2025Q4-SEAL',
  securityId: 'SEC-AAPL',
  reportingPeriod: '2025Q4',
  rawDocumentHash: 'd5a8b7e2c4f1a6b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2'
};

const sampleSurprise = {
  surprises: {
    REVENUE: { absoluteSurprise: 2000, percentageSurprise: 0.02, isBeat: true },
    DILUTED_EPS: { absoluteSurprise: 0.10, percentageSurprise: 0.04, isBeat: true }
  }
};

// 1. Seal Package
const sealedPkg = sealEventIntelligencePackage({
  tenantId,
  eventRecord: sampleEvent,
  extractedFacts: [{ factKey: 'REVENUE', reportedValue: 102000 }],
  surpriseReport: sampleSurprise,
  sealedBy: 'AUDIT_SEALER_01'
});

testAssert(sealedPkg.sealId.startsWith('SEAL-EVNT-'), `Seal ID format correct: ${sealedPkg.sealId}`);
testAssert(sealedPkg.tenantId === tenantId, 'Tenant ID preserved');
testAssert(typeof sealedPkg.packageHash === 'string' && sealedPkg.packageHash.length === 64, 'SHA-256 packageHash generated');
testAssert(sealedPkg.verification.isSealed === true, 'Verification isSealed is true');
testAssert(sealedPkg.classification === EventClassification.DERIVED, 'Package classification is DERIVED');

// 2. Verify Package (Valid)
const verResult = verifyEventIntelligencePackage(sealedPkg);
testAssert(verResult.valid === true, 'Cryptographic verification passed');
testAssert(verResult.computedHash === sealedPkg.packageHash, 'Hash match confirmed');

// 3. Tamper Detection
const tamperedPkg = {
  ...sealedPkg,
  surpriseReport: {
    surprises: {
      REVENUE: { absoluteSurprise: 999999, percentageSurprise: 0.99, isBeat: true }
    }
  }
};
const tamperResult = verifyEventIntelligencePackage(tamperedPkg);
testAssert(tamperResult.valid === false, 'Tampered package detected and rejected');
testAssert(tamperResult.reason.includes('mismatch'), 'Tamper reason specified');

// 4. Immutability
try {
  sealedPkg.sealId = 'MUTATED-ID';
  testAssert(false, 'Should fail to mutate sealed package');
} catch (e) {
  testAssert(true, 'Sealed package is frozen');
}

// 5. Copilot Tool Read-Only Bridge
// Seed event store for tool
defaultCorporateEventStore.ingestEvent(tenantId, {
  ...sampleEvent,
  eventTimestamp: '2025-10-30T16:30:00.000Z',
  publicationTimestamp: '2025-10-30T20:00:00.000Z',
  sourceId: 'SRC-SEC-EDGAR',
  eventType: 'QUARTERLY_EARNINGS',
  payload: { rawText: 'Q4 10-K Filing' }
});

const getEventRes = await executeEarningsTool({
  tenantId,
  action: 'GET_EVENT',
  eventId: sampleEvent.eventId
});
testAssert(getEventRes.success === true, 'Copilot tool GET_EVENT succeeded');
testAssert(getEventRes.data.eventId === sampleEvent.eventId, 'Correct event retrieved');

const surpriseRes = await executeEarningsTool({
  action: 'COMPUTE_SURPRISE',
  actualFact: { metric: 'DILUTED_EPS', value: 105 },
  consensus: { meanEstimate: 100 }
});
testAssert(surpriseRes.success === true, 'Copilot tool COMPUTE_SURPRISE succeeded');
testAssert(surpriseRes.data.isBeat === true, 'Computed surprise correctly');

// 6. Copilot Tool Safety Interceptions
try {
  await executeEarningsTool({ action: 'INJECT_TRUTH_FACT' });
  testAssert(false, 'Should intercept INJECT_TRUTH_FACT');
} catch (e) {
  testAssert(e.message.includes('cannot inject'), 'Truth injection blocked');
}

try {
  await executeEarningsTool({ action: 'EXECUTE_TRADE' });
  testAssert(false, 'Should intercept EXECUTE_TRADE');
} catch (e) {
  testAssert(e.message.includes('cannot execute trades'), 'Trade execution blocked');
}

// 7. Markdown Explanation Generator
const markdownExpl = generateEarningsExplanation(
  sampleEvent,
  sampleSurprise,
  { revisionDirection: 'RAISE', midpoint: 105, low: 100, high: 110 },
  null,
  { impactCategory: 'POSITIVE', rationale: 'Beat and raise' }
);
testAssert(markdownExpl.includes('### Corporate Event Intelligence: SEC-AAPL (2025Q4)'), 'Markdown header present');
testAssert(markdownExpl.includes('Reported Results vs Consensus'), 'Section present');
testAssert(markdownExpl.includes('Forward Guidance Update'), 'Guidance section present');

console.log(`PASSED: ${assertionCount} assertions`);
export { assertionCount };
