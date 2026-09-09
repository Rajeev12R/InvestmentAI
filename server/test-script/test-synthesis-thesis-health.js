/**
 * test-synthesis-thesis-health.js
 * Suite 6: Deterministic Thesis Health Evaluation Tests
 */

import assert from 'assert';
import { defaultThesisDecisionReviewEngine } from '../researchSynthesis/synthesis.thesisDecision.engine.js';
import { ThesisHealthStatus } from '../researchSynthesis/synthesis.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 6: Thesis Health Synthesis Tests ---');

// 1. Supported Thesis (all drivers confirmed, no breakers)
const supportedThesis = {
  thesisId: 'TH_AI_CHIPS',
  expectedDrivers: [
    { driver: 'GPU volume growth', status: 'CONFIRMED' },
    { driver: 'Gross margin expansion', status: 'ON_TRACK' }
  ],
  breakers: [
    { breaker: 'Margin drop below 60%', status: 'UNTRIGGERED' }
  ]
};
const res1 = defaultThesisDecisionReviewEngine.evaluateThesisHealth(supportedThesis);
testAssert(res1.healthStatus === ThesisHealthStatus.SUPPORTED, 'Thesis evaluated as SUPPORTED');
testAssert(res1.confirmedDriversCount === 2, '2 confirmed drivers');

// 2. Weakening Thesis (failing drivers)
const weakeningThesis = {
  thesisId: 'TH_LEGACY_TELCO',
  expectedDrivers: [
    { driver: '5G ARPU expansion', status: 'FAILED' },
    { driver: 'Fiber subscriber growth', status: 'FAILED' },
    { driver: 'Cost reduction', status: 'ON_TRACK' }
  ],
  breakers: [
    { breaker: 'Dividend cut', status: 'UNTRIGGERED' }
  ]
};
const res2 = defaultThesisDecisionReviewEngine.evaluateThesisHealth(weakeningThesis);
testAssert(res2.healthStatus === ThesisHealthStatus.WEAKENING, 'Thesis evaluated as WEAKENING');
testAssert(res2.failingDriversCount === 2, '2 failing drivers');

// 3. Invalidated Thesis (Triggered breaker)
const invalidatedThesis = {
  thesisId: 'TH_BIOTECH_DRUG',
  expectedDrivers: [
    { driver: 'Phase 3 trial success', status: 'FAILED' }
  ],
  breakers: [
    { breaker: 'FDA trial failure', status: 'TRIGGERED', isTriggered: true }
  ]
};
const res3 = defaultThesisDecisionReviewEngine.evaluateThesisHealth(invalidatedThesis);
testAssert(res3.healthStatus === ThesisHealthStatus.INVALIDATED, 'Thesis evaluated as INVALIDATED');
testAssert(res3.triggeredBreakersCount === 1, '1 triggered breaker');

// 4. Insufficient Evidence
const emptyThesis = { thesisId: 'TH_EMPTY', expectedDrivers: [] };
const res4 = defaultThesisDecisionReviewEngine.evaluateThesisHealth(emptyThesis);
testAssert(res4.healthStatus === ThesisHealthStatus.INSUFFICIENT_EVIDENCE, 'Empty thesis evaluated as INSUFFICIENT_EVIDENCE');

console.log(`[PASS] Suite 6 Thesis Health Synthesis passed: ${assertionCount} assertions`);
export default { assertionCount };
