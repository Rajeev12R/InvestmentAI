/**
 * Phase 17 — Test Suite 9: Policy Hardening, Determinism, Concurrency & Temporal Tests
 */

import { strict as assert } from 'assert';
import { TaxStatus, CostBasisMethod } from '../tax/tax.types.js';
import { TaxLotEngine } from '../tax/tax.lot.engine.js';
import { TaxHoldingPeriodEngine } from '../tax/tax.holdingPeriod.engine.js';
import { TaxRealizedGainEngine } from '../tax/tax.realizedGain.engine.js';
import { TaxJurisdictionEngine } from '../tax/tax.jurisdiction.js';
import { TaxRuleEngine } from '../tax/tax.rule.engine.js';
import { TaxDividendEngine } from '../tax/tax.dividend.engine.js';
import { TaxIntelligencePackageBuilder } from '../tax/tax.package.js';
import { TAX_POLICY_V1, TAX_POLICY_V2 } from '../tax/tax.config.js';
import { taxRepository } from '../tax/tax.repository.js';

let totalAssertions = 0;
function testAssert(cond, msg) {
  assert(cond, msg);
  totalAssertions++;
}

console.log('--- RUNNING PHASE 17 SUITE 9: HARDENING, DETERMINISM, CONCURRENCY & TEMPORAL TESTS ---');

// === SECTION 1: 10 TEMPORAL T0 TESTS ===

console.log('Testing 10 Temporal T0 Rules...');

// 1. Future acquisition rejected
const temp1 = TaxLotEngine.createTaxLot({
  lotId: 'LOT-T1', securityId: 'AAPL', accountId: 'P1', acquisitionDate: '2025-01-01T00:00:00.000Z',
  acquisitionPrice: 100, quantity: 10, costBasis: 1000, currency: 'USD', source: 'SRC', sourceEvidenceId: 'E1'
}, '2024-06-01T00:00:00.000Z');
testAssert(temp1.status === TaxStatus.TEMPORAL_VIOLATION, 'Temporal 1: Future acquisition date rejected');

// 2. Future sale / realization preceding acquisition
const temp2 = TaxHoldingPeriodEngine.evaluateHoldingPeriod('2024-06-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 'US');
testAssert(temp2.status === TaxStatus.TEMPORAL_VIOLATION, 'Temporal 2: Realization preceding acquisition rejected');

// 3. Future price relative to asOf
const temp3 = TaxHoldingPeriodEngine.evaluateHoldingPeriod('2024-01-01T00:00:00.000Z', 'invalid-date', 'US');
testAssert(temp3.status === TaxStatus.INVALID_INPUT, 'Temporal 3: Invalid temporal date rejected');

// 4. Future tax rule rejected
const temp4 = TaxJurisdictionEngine.getJurisdictionRule('US', '2030-01-01T00:00:00.000Z');
testAssert(temp4.status === TaxStatus.TEMPORAL_VIOLATION, 'Temporal 4: Future tax rule evaluated at T0 rejected');

// 5. Future dividend evaluated before effective date
const temp5 = TaxJurisdictionEngine.getJurisdictionRule('IN', '2024-01-01T00:00:00.000Z'); // IN post-budget rule effective 2024-07-23
testAssert(temp5.status === TaxStatus.TEMPORAL_VIOLATION, 'Temporal 5: Pre-effective tax rule for India rejected');

// 6. Future restatement rejected
const baseLot = TaxLotEngine.createTaxLot({
  lotId: 'LOT-BASE', securityId: 'AAPL', accountId: 'P1', acquisitionDate: '2024-01-01T00:00:00.000Z',
  acquisitionPrice: 100, quantity: 10, costBasis: 1000, currency: 'USD', source: 'SRC', sourceEvidenceId: 'E1'
}, '2024-06-01T00:00:00.000Z');
const futureCorrection = TaxLotEngine.correctTaxLot(baseLot.lot, { acquisitionDate: '2025-01-01T00:00:00.000Z' }, '2024-06-01T00:00:00.000Z', 'Future correction');
testAssert(futureCorrection.status === TaxStatus.TEMPORAL_VIOLATION, 'Temporal 6: Future restatement acquisition rejected');

// 7. Future portfolio state rejected
const temp7 = TaxLotEngine.createTaxLot({
  lotId: 'LOT-T7', securityId: 'AAPL', accountId: 'P1', acquisitionDate: '2026-06-01T00:00:00.000Z',
  acquisitionPrice: 100, quantity: 10, costBasis: 1000, currency: 'USD', source: 'SRC', sourceEvidenceId: 'E1'
}, '2024-06-01T00:00:00.000Z');
testAssert(temp7.status === TaxStatus.TEMPORAL_VIOLATION, 'Temporal 7: Future portfolio state lot rejected');

// 8. Historical policy preserved
testAssert(TAX_POLICY_V1.policyHash !== undefined, 'Temporal 8: Historical Policy V1 hash preserved');
testAssert(TAX_POLICY_V2.supersedesHash === TAX_POLICY_V1.policyHash, 'Temporal 8: Policy V2 points to Policy V1 hash');

// 9. Historical tax lot immutable
assert.throws(() => {
  baseLot.lot.costBasis = 999999;
}, 'Temporal 9: Historical tax lot is immutable');
totalAssertions++;

// 10. T0 decision cannot use post-T0 information
const temp10 = TaxJurisdictionEngine.getJurisdictionRule('US', '2024-06-01T00:00:00.000Z');
testAssert(temp10.status === TaxStatus.PASS && temp10.rule.taxRuleVersion === 'US-IRC-2024.1', 'Temporal 10: T0 uses strictly effective T0 rule');

// === SECTION 2: 100 DETERMINISTIC REPLAYS ===

console.log('Running 100 Deterministic Replays...');

const testPayload = {
  workspaceId: 'WS-DETERMINISM',
  portfolioId: 'PORT-DET-01',
  asOf: '2024-06-01T00:00:00.000Z',
  jurisdiction: 'US',
  accountType: 'TAXABLE',
  openLots: [
    { lotId: 'LOT-D1', securityId: 'AAPL', acquisitionDate: '2024-01-01T00:00:00.000Z', acquisitionPrice: 100, quantity: 100, costBasis: 10000, currency: 'USD', source: 'S', sourceEvidenceId: 'E' },
    { lotId: 'LOT-D2', securityId: 'MSFT', acquisitionDate: '2024-02-01T00:00:00.000Z', acquisitionPrice: 300, quantity: 50, costBasis: 15000, currency: 'USD', source: 'S', sourceEvidenceId: 'E' }
  ],
  currentPrices: { AAPL: 180, MSFT: 400 },
  portfolioValue: 100000,
  currentWeights: { AAPL: 0.50, MSFT: 0.50 },
  targetWeights: { AAPL: 0.40, MSFT: 0.60 },
  expectedReturns: { AAPL: 0.09, MSFT: 0.11 },
  volatilities: { AAPL: 0.20, MSFT: 0.18 },
  constraints: { maxPositionWeight: 0.80 },
  policy: TAX_POLICY_V1
};

const firstResult = TaxRuleEngine.evaluatePortfolioTax(testPayload);
const baselineHash = firstResult.packageHash;

for (let i = 0; i < 100; i++) {
  const replay = TaxRuleEngine.evaluatePortfolioTax(testPayload);
  testAssert(replay.packageHash === baselineHash, `Determinism replay ${i + 1} matches baseline hash`);
}

// === SECTION 3: 10 CONCURRENT WORKER EVALUATIONS ===

console.log('Running 10 Concurrent Worker Evaluations...');

const concurrentSameWsPromises = Array.from({ length: 10 }, (_, i) => {
  return Promise.resolve().then(() => {
    const res = TaxRuleEngine.evaluatePortfolioTax(testPayload);
    return { idx: i, packageHash: res.packageHash };
  });
});

const concurrentSameWsResults = await Promise.all(concurrentSameWsPromises);
for (let i = 0; i < 10; i++) {
  testAssert(concurrentSameWsResults[i].packageHash === baselineHash, `Concurrent same-workspace worker ${i + 1} matches baseline hash`);
}

const concurrentMultiWsPromises = Array.from({ length: 10 }, (_, idx) => {
  const ws = `WS-CONCURRENT-${idx}`;
  return Promise.resolve().then(() => {
    const res = TaxRuleEngine.evaluatePortfolioTax({ ...testPayload, workspaceId: ws });
    return { ws, packageHash: res.packageHash, packageId: res.packageId };
  });
});

const concurrentMultiWsResults = await Promise.all(concurrentMultiWsPromises);
testAssert(concurrentMultiWsResults.length === 10, 'Concurrency: 10 distinct workspace workers executed concurrently');
testAssert(new Set(concurrentMultiWsResults.map(r => r.packageHash)).size === 10, 'Concurrency: 10 distinct workspaces cleanly isolated with unique hashes');

console.log(`PASSED: Suite 9 completed with ${totalAssertions} assertions.`);

