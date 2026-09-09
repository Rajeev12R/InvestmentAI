/**
 * server/test-script/test-earnings-surprise-engine.js
 * 
 * Phase 21: Fundamentals Surprise Engine & Edge Case Unit Tests
 */

import assert from 'assert';
import { computeEarningsSurprise, computeComprehensiveSurpriseReport } from '../earnings/earnings.surprise.engine.js';
import { EventClassification } from '../earnings/earnings.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 21 SURPRISE ENGINE TESTS ---');

// 1. Standard EPS Beat
const actualEPS = { ticker: 'AAPL', metric: 'DILUTED_EPS', period: 'Q4-2025', value: 1.64 };
const consensusEPS = { meanEstimate: 1.60 };

const epsSurprise = computeEarningsSurprise(actualEPS, consensusEPS);
testAssert(Math.abs(epsSurprise.absoluteSurprise - 0.04) < 1e-6, `Absolute surprise is +$0.04, got ${epsSurprise.absoluteSurprise}`);
testAssert(Math.abs(epsSurprise.percentageSurprise - (0.04 / 1.60)) < 1e-6, 'Percentage surprise is +2.5%');
testAssert(epsSurprise.direction === 'BEAT', 'Direction is BEAT');
testAssert(epsSurprise.isBeat === true, 'isBeat is true');
testAssert(epsSurprise.classification === EventClassification.DERIVED, 'Classification is DERIVED');

// 2. Standard Revenue Miss
const actualRev = { ticker: 'NVDA', metric: 'REVENUE', period: 'Q3-2025', value: 34000000000 };
const consensusRev = { meanEstimate: 35000000000 };

const revSurprise = computeEarningsSurprise(actualRev, consensusRev);
testAssert(revSurprise.absoluteSurprise === -1000000000, 'Absolute surprise is -$1B');
testAssert(revSurprise.direction === 'MISS', 'Direction is MISS');
testAssert(revSurprise.isMiss === true, 'isMiss is true');

// 3. Negative Consensus Denominator (e.g. Negative Consensus EPS)
const actualLoss = { ticker: 'LOSS_CO', metric: 'DILUTED_EPS', period: 'Q1-2025', value: -0.20 };
const consensusLoss = { meanEstimate: -0.50 };

const lossSurprise = computeEarningsSurprise(actualLoss, consensusLoss);
testAssert(Math.abs(lossSurprise.absoluteSurprise - 0.30) < 1e-6, 'Absolute surprise is +$0.30 (better than expected)');
testAssert(lossSurprise.percentageSurprise === 'UNAVAILABLE', 'Percentage surprise is UNAVAILABLE for negative consensus');
testAssert(lossSurprise.percentageSurpriseStatus === 'UNAVAILABLE_NEGATIVE_CONSENSUS_DENOMINATOR', 'Explicit negative denominator status');

// 4. Zero Consensus Denominator (Division by Zero Defense)
const actualZero = { ticker: 'ZERO_CO', metric: 'DILUTED_EPS', period: 'Q1-2025', value: 0.15 };
const consensusZero = { meanEstimate: 0.0 };

const zeroSurprise = computeEarningsSurprise(actualZero, consensusZero);
testAssert(zeroSurprise.percentageSurprise === 'UNAVAILABLE', 'Zero consensus returns UNAVAILABLE for percentage surprise');
testAssert(zeroSurprise.percentageSurpriseStatus === 'UNAVAILABLE_ZERO_CONSENSUS_DENOMINATOR', 'Explicit zero denominator status');

// 5. Missing Consensus Handled Cleanly
const noConsensusSurprise = computeEarningsSurprise(actualEPS, null);
testAssert(noConsensusSurprise.status === 'UNAVAILABLE_MISSING_CONSENSUS', 'Missing consensus returns UNAVAILABLE');
testAssert(noConsensusSurprise.direction === 'UNKNOWN', 'Direction is UNKNOWN');

// 6. Comprehensive Multi-Metric Report
const actualsMap = {
  REVENUE: { value: 100000, metric: 'REVENUE' },
  DILUTED_EPS: { value: 5.0, metric: 'DILUTED_EPS' }
};
const consensusMap = {
  REVENUE: { meanEstimate: 95000 },
  DILUTED_EPS: { meanEstimate: 4.8 }
};
const report = computeComprehensiveSurpriseReport(actualsMap, consensusMap);
testAssert(report.surprises.REVENUE.isBeat === true, 'Revenue beat in comprehensive report');
testAssert(report.surprises.DILUTED_EPS.isBeat === true, 'EPS beat in comprehensive report');

console.log(`[PASS] Phase 21 Surprise Engine tests passed: ${assertionCount} assertions`);

export default { assertionCount };
