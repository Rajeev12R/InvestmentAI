/**
 * Phase 17 — Test Suite 1: Tax Lot Lifecycle & Cost Basis Allocation Tests
 */

import { strict as assert } from 'assert';
import { TaxStatus, CostBasisMethod, AccountType } from '../tax/tax.types.js';
import { TaxLotEngine } from '../tax/tax.lot.engine.js';
import { TaxCostBasisEngine } from '../tax/tax.costBasis.engine.js';
import { TaxAccountEngine } from '../tax/tax.account.js';
import { TaxValidationEngine } from '../tax/tax.validation.engine.js';
import { taxRepository } from '../tax/tax.repository.js';

let totalAssertions = 0;
function testAssert(cond, msg) {
  assert(cond, msg);
  totalAssertions++;
}

console.log('--- RUNNING PHASE 17 SUITE 1: TAX LOT & COST BASIS TESTS ---');

// 1. Valid Tax Lot Creation
const validLotData = {
  lotId: 'LOT-AAPL-001',
  securityId: 'AAPL',
  accountId: 'PORT-MAIN',
  acquisitionDate: '2024-03-01T10:00:00.000Z',
  acquisitionPrice: 150.0,
  quantity: 100,
  costBasis: 15000.0,
  currency: 'USD',
  source: 'BROKER_CUSTODIAN_CONFIRM',
  sourceEvidenceId: 'EVID-LOT-001'
};

const lotRes = TaxLotEngine.createTaxLot(validLotData, '2024-06-01T00:00:00.000Z');
testAssert(lotRes.status === TaxStatus.PASS, 'Valid lot should pass creation');
testAssert(lotRes.lot.lotHash !== undefined, 'Lot should have canonical SHA-256 hash');
testAssert(lotRes.lot.version === 1, 'Initial lot version should be 1');
testAssert(Object.isFrozen(lotRes), 'Lot result should be deepFrozen');

// 2. Immutability check
assert.throws(() => {
  lotRes.lot.quantity = 999;
}, 'Mutating lot should throw');
totalAssertions++;

// 3. Negative quantity rejection
const negQtyLot = { ...validLotData, lotId: 'LOT-ERR-1', quantity: -10, costBasis: -1500 };
const negQtyRes = TaxLotEngine.createTaxLot(negQtyLot, '2024-06-01T00:00:00.000Z');
testAssert(negQtyRes.status === TaxStatus.INVALID_INPUT, 'Negative quantity rejected');

// 4. Missing cost basis rejection
const noBasisLot = { ...validLotData, lotId: 'LOT-ERR-2', costBasis: null };
const noBasisRes = TaxLotEngine.createTaxLot(noBasisLot, '2024-06-01T00:00:00.000Z');
testAssert(noBasisRes.status === TaxStatus.COST_BASIS_UNAVAILABLE, 'Null cost basis rejected');

// 5. Cost basis mismatch rejection
const mismatchBasisLot = { ...validLotData, lotId: 'LOT-ERR-3', costBasis: 25000.0 }; // 100 * 150 = 15000 != 25000
const mismatchRes = TaxLotEngine.createTaxLot(mismatchBasisLot, '2024-06-01T00:00:00.000Z');
testAssert(mismatchRes.status === TaxStatus.CONFLICT, 'Mismatched cost basis rejected with CONFLICT');

// 6. Future acquisition date rejection (Temporal violation)
const futureLot = { ...validLotData, lotId: 'LOT-ERR-4', acquisitionDate: '2025-01-01T00:00:00.000Z' };
const futureRes = TaxLotEngine.createTaxLot(futureLot, '2024-06-01T00:00:00.000Z');
testAssert(futureRes.status === TaxStatus.TEMPORAL_VIOLATION, 'Future acquisition date rejected');

// 7. Missing source evidence ID
const noEvidLot = { ...validLotData, lotId: 'LOT-ERR-5', sourceEvidenceId: null };
const noEvidRes = TaxLotEngine.createTaxLot(noEvidLot, '2024-06-01T00:00:00.000Z');
testAssert(noEvidRes.status === TaxStatus.INSUFFICIENT_DATA, 'Missing source evidence rejected');

// 8. Tax Lot Correction Chain (V1 -> V2)
const correctedRes = TaxLotEngine.correctTaxLot(lotRes.lot, { acquisitionPrice: 151.0, costBasis: 15100.0 }, '2024-06-02T00:00:00.000Z', 'Broker price adjustment');
testAssert(correctedRes.status === TaxStatus.PASS, 'Correction should create valid V2 lot');
testAssert(correctedRes.lot.version === 2, 'Corrected lot version should be 2');
testAssert(correctedRes.lot.supersedesLotId === 'LOT-AAPL-001', 'V2 points to V1 lotId');
testAssert(correctedRes.lot.previousHash === lotRes.lot.lotHash, 'V2 points to V1 previousHash');

// 9. Cost Basis Allocation: FIFO
const openLots = [
  { lotId: 'LOT-1', securityId: 'AAPL', acquisitionDate: '2024-01-10T00:00:00.000Z', acquisitionPrice: 100.0, quantity: 50, costBasis: 5000.0, currency: 'USD' },
  { lotId: 'LOT-2', securityId: 'AAPL', acquisitionDate: '2024-02-10T00:00:00.000Z', acquisitionPrice: 120.0, quantity: 50, costBasis: 6000.0, currency: 'USD' },
  { lotId: 'LOT-3', securityId: 'AAPL', acquisitionDate: '2024-03-10T00:00:00.000Z', acquisitionPrice: 140.0, quantity: 50, costBasis: 7000.0, currency: 'USD' }
];

const fifoAlloc = TaxCostBasisEngine.allocateCostBasis(openLots, 75, CostBasisMethod.FIFO);
testAssert(fifoAlloc.status === TaxStatus.PASS, 'FIFO allocation succeeds');
testAssert(fifoAlloc.allocations.length === 2, 'FIFO consumes 2 lots');
testAssert(fifoAlloc.allocations[0].lotId === 'LOT-1' && fifoAlloc.allocations[0].allocatedQuantity === 50, 'FIFO takes full LOT-1');
testAssert(fifoAlloc.allocations[1].lotId === 'LOT-2' && fifoAlloc.allocations[1].allocatedQuantity === 25, 'FIFO takes partial LOT-2');
testAssert(fifoAlloc.totalAllocatedCostBasis === (50 * 100.0 + 25 * 120.0), 'FIFO cost basis arithmetic exact ($8000)');

// 10. Cost Basis Allocation: LIFO
const lifoAlloc = TaxCostBasisEngine.allocateCostBasis(openLots, 75, CostBasisMethod.LIFO);
testAssert(lifoAlloc.status === TaxStatus.PASS, 'LIFO allocation succeeds');
testAssert(lifoAlloc.allocations.length === 2, 'LIFO consumes 2 lots');
testAssert(lifoAlloc.allocations[0].lotId === 'LOT-3' && lifoAlloc.allocations[0].allocatedQuantity === 50, 'LIFO takes full LOT-3 first');
testAssert(lifoAlloc.allocations[1].lotId === 'LOT-2' && lifoAlloc.allocations[1].allocatedQuantity === 25, 'LIFO takes partial LOT-2');
testAssert(lifoAlloc.totalAllocatedCostBasis === (50 * 140.0 + 25 * 120.0), 'LIFO cost basis arithmetic exact ($10000)');

// 11. Cost Basis Allocation: SPECIFIC_LOT
const specAlloc = TaxCostBasisEngine.allocateCostBasis(openLots, 60, CostBasisMethod.SPECIFIC_LOT, [
  { lotId: 'LOT-2', quantity: 30 },
  { lotId: 'LOT-3', quantity: 30 }
]);
testAssert(specAlloc.status === TaxStatus.PASS, 'Specific lot allocation succeeds');
testAssert(specAlloc.totalAllocatedCostBasis === (30 * 120.0 + 30 * 140.0), 'Specific lot basis exact ($7800)');

// 12. Disposal quantity exceeding available lots
const excessAlloc = TaxCostBasisEngine.allocateCostBasis(openLots, 200, CostBasisMethod.FIFO);
testAssert(excessAlloc.status === TaxStatus.CONFLICT, 'Excess disposal quantity returns CONFLICT');

// 13. Unknown basis method
const unkBasisAlloc = TaxCostBasisEngine.allocateCostBasis(openLots, 50, 'AVERAGE_COST');
testAssert(unkBasisAlloc.status === TaxStatus.COST_BASIS_UNAVAILABLE, 'Unknown basis method returns COST_BASIS_UNAVAILABLE');

// 14. Account validation tests
const validAcct = {
  accountId: 'ACCT-001',
  workspaceId: 'WS-TAX',
  portfolioId: 'PORT-MAIN',
  jurisdiction: 'US',
  accountType: AccountType.TAXABLE
};
const acctRes = TaxAccountEngine.validateAccount(validAcct);
testAssert(acctRes.status === TaxStatus.PASS, 'Valid account profile passes');

const unkAcct = { ...validAcct, accountType: AccountType.UNKNOWN };
const unkAcctRes = TaxAccountEngine.validateAccount(unkAcct);
testAssert(unkAcctRes.status === TaxStatus.TAX_RULE_UNAVAILABLE, 'UNKNOWN account type returns TAX_RULE_UNAVAILABLE');

// 15. Zero fallback validation
const zeroFallbackCheck1 = TaxValidationEngine.checkZeroFallbackContract({ taxRate: 0, sourceProvesZeroRate: false });
testAssert(zeroFallbackCheck1.valid === false && zeroFallbackCheck1.status === TaxStatus.CONFLICT, 'Unproven zero tax rate rejected');

const zeroFallbackCheck2 = TaxValidationEngine.checkZeroFallbackContract({ costBasis: 0, sourceProvesZeroBasis: false });
testAssert(zeroFallbackCheck2.valid === false && zeroFallbackCheck2.status === TaxStatus.COST_BASIS_UNAVAILABLE, 'Unproven zero cost basis rejected');

// 16. Lot reconciliation
const reconPass = TaxValidationEngine.reconcileTaxLots({
  securityId: 'AAPL',
  openingQuantity: 100,
  purchasedQuantity: 50,
  soldQuantity: 30,
  closingQuantity: 120,
  openingCostBasis: 10000,
  purchasedCostBasis: 6000,
  disposedCostBasis: 3000,
  closingCostBasis: 13000
});
testAssert(reconPass.status === TaxStatus.PASS && reconPass.reconciled === true, 'Matching lot reconciliation passes');

const reconFail = TaxValidationEngine.reconcileTaxLots({
  securityId: 'AAPL',
  openingQuantity: 100,
  purchasedQuantity: 50,
  soldQuantity: 30,
  closingQuantity: 110, // Mismatch (expected 120)
  openingCostBasis: 10000,
  purchasedCostBasis: 6000,
  disposedCostBasis: 3000,
  closingCostBasis: 13000
});
testAssert(reconFail.status === TaxStatus.CONFLICT, 'Lot reconciliation mismatch returns CONFLICT');

// 17. Corporate Action Lot Reconciliation: 2-for-1 Stock Split with Rule
const reconCorpActionPass = TaxValidationEngine.reconcileTaxLots({
  securityId: 'AAPL',
  openingQuantity: 100,
  purchasedQuantity: 0,
  soldQuantity: 0,
  corporateActionAdjustmentsQuantity: 100, // +100 shares from 2-for-1 stock split
  closingQuantity: 200,
  openingCostBasis: 10000,
  purchasedCostBasis: 0,
  disposedCostBasis: 0,
  corporateActionAdjustmentsCostBasis: 0, // Cost basis unchanged in stock split
  closingCostBasis: 10000,
  corporateActionRule: { type: 'STOCK_SPLIT', ratio: '2:1', ruleId: 'CA-SPLIT-2-1' }
});
testAssert(reconCorpActionPass.status === TaxStatus.PASS && reconCorpActionPass.reconciled === true, 'Stock split lot reconciliation passes with rule');

// 18. Corporate Action without Rule rejection (TAX_RULE_UNAVAILABLE)
const reconCorpActionNoRule = TaxValidationEngine.reconcileTaxLots({
  securityId: 'AAPL',
  openingQuantity: 100,
  purchasedQuantity: 0,
  soldQuantity: 0,
  corporateActionAdjustmentsQuantity: 100,
  closingQuantity: 200,
  openingCostBasis: 10000,
  purchasedCostBasis: 0,
  disposedCostBasis: 0,
  closingCostBasis: 10000,
  corporateActionRule: null
});
testAssert(reconCorpActionNoRule.status === TaxStatus.TAX_RULE_UNAVAILABLE, 'Corporate action without rule returns TAX_RULE_UNAVAILABLE');

// 19. Basis Adjustment via Return of Capital with Rule
const reconRocPass = TaxValidationEngine.reconcileTaxLots({
  securityId: 'REIT_US',
  openingQuantity: 100,
  purchasedQuantity: 0,
  soldQuantity: 0,
  closingQuantity: 100,
  openingCostBasis: 10000,
  purchasedCostBasis: 0,
  disposedCostBasis: 0,
  corporateActionAdjustmentsCostBasis: -500, // $500 basis reduction from Return of Capital
  closingCostBasis: 9500,
  corporateActionRule: { type: 'RETURN_OF_CAPITAL', amount: 500, ruleId: 'CA-ROC-500' }
});
testAssert(reconRocPass.status === TaxStatus.PASS && reconRocPass.reconciled === true, 'Return of capital basis reduction passes with rule');

// 20. Basis Adjustment discrepancy rejection
const reconRocMismatch = TaxValidationEngine.reconcileTaxLots({
  securityId: 'REIT_US',
  openingQuantity: 100,
  purchasedQuantity: 0,
  soldQuantity: 0,
  closingQuantity: 100,
  openingCostBasis: 10000,
  purchasedCostBasis: 0,
  disposedCostBasis: 0,
  corporateActionAdjustmentsCostBasis: -500,
  closingCostBasis: 9000, // Mismatch (expected 9500)
  corporateActionRule: { type: 'RETURN_OF_CAPITAL', amount: 500, ruleId: 'CA-ROC-500' }
});
testAssert(reconRocMismatch.status === TaxStatus.CONFLICT, 'Basis adjustment discrepancy returns CONFLICT');

console.log(`PASSED: Suite 1 completed with ${totalAssertions} assertions.`);
