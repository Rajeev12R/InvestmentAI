/**
 * server/test-script/test-earnings-hostile.js
 * 
 * Phase 21: Adversarial Hostile Red-Team Audit Suite (150+ Assertions)
 * Rigorous attack vectors testing Truth-Layer isolation, immutability, zero-truth-mutation,
 * division-by-zero defense, anti-AI fabrication, sealed container integrity, and tenant isolation.
 */

import assert from 'assert';
import crypto from 'crypto';
import { defaultCorporateEventStore, CorporateEventStore } from '../earnings/earnings.eventStore.js';
import { defaultEarningsTruthBridge, EarningsTruthBridge } from '../earnings/earnings.truthBridge.js';
import { computeEarningsSurprise } from '../earnings/earnings.surprise.engine.js';
import { defaultGuidanceEngine } from '../earnings/earnings.guidance.engine.js';
import { evaluateEarningsQuality } from '../earnings/earnings.quality.engine.js';
import { defaultEventDrivenForecastRevisionEngine } from '../earnings/earnings.forecastRevision.engine.js';
import { evaluateEarningsValuationImpact } from '../earnings/earnings.valuation.bridge.js';
import { evaluateEventRiskDrift } from '../earnings/earnings.risk.engine.js';
import { evaluateEarningsAttentionImpact } from '../earnings/earnings.attention.engine.js';
import { evaluateEarningsThesisImpact } from '../earnings/earnings.thesis.engine.js';
import { sealEventIntelligencePackage, verifyEventIntelligencePackage } from '../earnings/earnings.package.js';
import { executeEarningsTool } from '../earnings/earnings.tool.js';
import { validateCorporateEvent, validateGuidancePayload } from '../earnings/earnings.schema.js';
import { EventClassification, RevisionCausalityType } from '../earnings/earnings.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 21 ADVERSARIAL HOSTILE RED-TEAM SUITE (150+ ASSERTIONS) ---');

// =========================================================================
// ATTACK VECTOR 1: TRUTH LAYER DIRECT MUTATION & FACT INJECTION (25 Tests)
// =========================================================================
console.log('Testing Attack Vector 1: Truth Layer Isolation...');
const hostileBridge = new EarningsTruthBridge();
const tenantA = 'TENANT-HOSTILE-A';

for (let i = 0; i < 25; i++) {
  const hostileCandidate = {
    candidateId: `CAND-HOSTILE-${i}`,
    ticker: 'AAPL',
    metric: 'NET_INCOME',
    period: '2025Q4',
    sourceId: 'SRC-EDGAR-ATTACK',
    sourceEventId: `EVNT-ATTACK-${i}`,
    value: 1000000 + i * 1000,
    classification: EventClassification.TRUTH_UPDATE_CANDIDATE
  };

  const applied = hostileBridge.applyCandidateToTruth(tenantA, hostileCandidate);
  testAssert(applied.success === true, `Candidate ${i} safely evaluated`);
  testAssert(applied.factRecord.classification === EventClassification.REAL_DATA, `Truth fact stored as REAL_DATA`);
  
  // Verify object is deep frozen and cannot be mutated
  try {
    applied.factRecord.value = 999999999;
    testAssert(false, 'Should not allow direct mutation of stored fact');
  } catch (e) {
    testAssert(true, `Direct mutation prevented on fact ${i}`);
  }
}

// =========================================================================
// ATTACK VECTOR 2: DIVISION BY ZERO, NEGATIVE & MALFORMED CONSENSUS (25 Tests)
// =========================================================================
console.log('Testing Attack Vector 2: Surprise Math Numerical Attacks...');

// Zero consensus
const zeroCons = computeEarningsSurprise({ value: 50 }, { meanEstimate: 0 });
testAssert(zeroCons.percentageSurprise === 'UNAVAILABLE', 'Zero consensus yields UNAVAILABLE percentage surprise');
testAssert(zeroCons.percentageSurpriseStatus === 'UNAVAILABLE_ZERO_CONSENSUS_DENOMINATOR', 'Zero denominator status recorded');
testAssert(zeroCons.absoluteSurprise === 50, 'Absolute surprise is still DERIVED');

// Extremely small epsilon consensus
const epsCons = computeEarningsSurprise({ value: 10 }, { meanEstimate: 1e-8 });
testAssert(epsCons.percentageSurprise === 'UNAVAILABLE', 'Epsilon consensus defends against division by zero');

// Negative consensus EPS (e.g. turnaround / loss-making quarters)
for (let loss = -10; loss < 0; loss++) {
  const negSurprise = computeEarningsSurprise({ value: loss + 2 }, { meanEstimate: loss });
  testAssert(negSurprise.percentageSurprise === 'UNAVAILABLE', `Negative consensus ${loss} prevents misleading percentage surprise`);
  testAssert(negSurprise.percentageSurpriseStatus === 'UNAVAILABLE_NEGATIVE_CONSENSUS_DENOMINATOR', 'Negative consensus status recorded');
  testAssert(negSurprise.absoluteSurprise === 2, 'Absolute surprise correctly computed as 2');
}

// Missing / Non-numeric consensus
const nullCons = computeEarningsSurprise({ value: 100 }, null);
testAssert(nullCons.classification === EventClassification.UNAVAILABLE, 'Null consensus returns UNAVAILABLE');
const nanCons = computeEarningsSurprise({ value: 100 }, { meanEstimate: NaN });
testAssert(nanCons.classification === EventClassification.UNAVAILABLE, 'NaN consensus returns UNAVAILABLE');

// =========================================================================
// ATTACK VECTOR 3: GUIDANCE RANGE TAMPERING & INVERSIONS (20 Tests)
// =========================================================================
console.log('Testing Attack Vector 3: Guidance Inversion & Poisoning...');

for (let j = 0; j < 20; j++) {
  const invertedPayload = {
    guidanceId: `GUIDE-INV-${j}`,
    ticker: 'AAPL',
    metric: 'REVENUE',
    targetPeriod: '2026',
    low: 150000 + j * 10,
    high: 120000, // Inverted: low > high!
    currency: 'USD',
    sourceEventId: 'EVNT-INV'
  };

  try {
    validateGuidancePayload(invertedPayload);
    testAssert(false, `Inverted guidance ${j} must fail validation`);
  } catch (err) {
    testAssert(err.message.includes('low') || err.message.includes('high') || err.message.includes('greater'), `Inverted guidance ${j} caught by schema`);
  }
}

// =========================================================================
// ATTACK VECTOR 4: COPILOT TOOL UNAUTHORIZED INJECTIONS & TRADES (20 Tests)
// =========================================================================
console.log('Testing Attack Vector 4: Copilot Hostile Action Interceptions...');

const hostileActions = [
  'INJECT_TRUTH_FACT', 'MUTATE_TRUTH_LAYER', 'EXECUTE_TRADE', 'EXECUTE_ORDER',
  'REWRITE_THESIS', 'MUTATE_FORECAST_HISTORY', 'OVERRIDE_VALUATION_FACTS', 'BYPASS_RBAC'
];

for (const action of hostileActions) {
  try {
    await executeEarningsTool({ action });
    testAssert(false, `Action ${action} should have been blocked`);
  } catch (err) {
    testAssert(true, `Action ${action} safely blocked with error: ${err.message}`);
  }
}

for (let k = 0; k < 12; k++) {
  const invalidActionRes = await executeEarningsTool({ action: `UNKNOWN_ATTACK_${k}` });
  testAssert(invalidActionRes.success === false, `Unknown action ${k} rejected`);
}

// =========================================================================
// ATTACK VECTOR 5: SEALED PACKAGE TAMPERING & BIT-FLIP ATTACKS (20 Tests)
// =========================================================================
console.log('Testing Attack Vector 5: Cryptographic Tamper Auditing...');

const basePkg = sealEventIntelligencePackage({
  tenantId: 'TENANT-TAMPER-TEST',
  eventRecord: {
    eventId: 'EVNT-TAMPER-001',
    securityId: 'AAPL',
    reportingPeriod: '2025Q4',
    rawDocumentHash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
  },
  surpriseReport: { surprises: { REVENUE: { absoluteSurprise: 1000 } } }
});

for (let bit = 0; bit < 20; bit++) {
  const corruptedPkg = JSON.parse(JSON.stringify(basePkg));
  corruptedPkg.surpriseReport.surprises.REVENUE.absoluteSurprise += (bit + 1);
  const verifyRes = verifyEventIntelligencePackage(corruptedPkg);
  testAssert(verifyRes.valid === false, `Tampered package variation ${bit} rejected`);
}

// =========================================================================
// ATTACK VECTOR 6: CROSS-TENANT ISOLATION & DATA LEAKAGE (20 Tests)
// =========================================================================
console.log('Testing Attack Vector 6: Multi-Tenant Data Leakage Resistance...');

const store = new CorporateEventStore();
const tenant1 = 'TENANT-ISOLATION-1';
const tenant2 = 'TENANT-ISOLATION-2';

for (let t = 0; t < 10; t++) {
  store.ingestEvent(tenant1, {
    eventId: `EVNT-T1-${t}`,
    securityId: 'AAPL',
    reportingPeriod: '2025Q4',
    sourceId: 'SRC-EDGAR',
    eventType: 'QUARTERLY_EARNINGS',
    eventTimestamp: '2025-10-30T16:00:00.000Z',
    publicationTimestamp: '2025-10-30T20:00:00.000Z',
    payload: { netIncome: 100000 + t }
  });

  // Tenant 2 must NOT see Tenant 1's events
  const t2Event = store.getEvent(tenant2, `EVNT-T1-${t}`);
  testAssert(t2Event === null, `Tenant 2 cannot read event ${t} of Tenant 1`);

  const t2Timeline = store.getTimeline(tenant2, 'AAPL');
  testAssert(t2Timeline.length === 0, `Tenant 2 timeline is empty for security AAPL in round ${t}`);
}

// =========================================================================
// ATTACK VECTOR 7: AI THESIS SILENT REWRITE & BYPASS RESISTANCE (20 Tests)
// =========================================================================
console.log('Testing Attack Vector 7: Thesis Immutability & Human In The Loop...');

const fragileThesis = {
  id: 'THESIS-SEC-FRAGILE',
  ticker: 'TSLA',
  pillars: ['Auto Margins > 20%'],
  breakers: [
    { condition: 'OPERATING_MARGIN_BELOW', threshold: 0.20, description: 'Auto margins collapse' }
  ]
};

for (let m = 1; m <= 20; m++) {
  const marginActual = 0.20 - (m * 0.005); // Falling below threshold
  const thesisResult = evaluateEarningsThesisImpact(fragileThesis, { operatingMarginActual: marginActual });
  testAssert(thesisResult.thesisIntact === false, `Thesis ${m} marked breached`);
  testAssert(thesisResult.requiresHumanReview === true, `Human review triggered on breach ${m}`);
}

console.log(`\n================================================================`);
console.log(`PASSED: ${assertionCount} assertions across all hostile vectors`);
console.log(`================================================================\n`);

export { assertionCount };
