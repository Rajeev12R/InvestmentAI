/**
 * Phase 17 — Test Suite 2: Realized & Unrealized Gains, Dividends, Tax Drag, and After-Tax Performance
 */

import { strict as assert } from 'assert';
import { TaxStatus, HoldingPeriodClass, DividendClassification, TaxLabel } from '../tax/tax.types.js';
import { TaxHoldingPeriodEngine } from '../tax/tax.holdingPeriod.engine.js';
import { TaxRealizedGainEngine } from '../tax/tax.realizedGain.engine.js';
import { TaxUnrealizedGainEngine } from '../tax/tax.unrealizedGain.engine.js';
import { TaxDividendEngine } from '../tax/tax.dividend.engine.js';
import { TaxTransactionTaxEngine } from '../tax/tax.transactionTax.engine.js';
import { TaxDragEngine } from '../tax/tax.taxDrag.engine.js';
import { TaxJurisdictionEngine } from '../tax/tax.jurisdiction.js';
import { TaxAfterTaxReturnEngine } from '../tax/tax.afterTaxReturn.engine.js';
import { TaxAfterTaxExpectedReturnEngine } from '../tax/tax.afterTaxExpectedReturn.engine.js';

let totalAssertions = 0;
function testAssert(cond, msg) {
  assert(cond, msg);
  totalAssertions++;
}

console.log('--- RUNNING PHASE 17 SUITE 2: REALIZED, UNREALIZED, DIVIDENDS & AFTER-TAX TESTS ---');

// 1. Holding Period: US STCG (364 days held)
const hpUsStcg = TaxHoldingPeriodEngine.evaluateHoldingPeriod('2023-06-01T00:00:00.000Z', '2024-05-30T00:00:00.000Z', 'US');
testAssert(hpUsStcg.status === TaxStatus.PASS, 'US holding period evaluates');
testAssert(hpUsStcg.holdingClass === HoldingPeriodClass.SHORT_TERM, '364 days is SHORT_TERM in US');

// 2. Holding Period: US LTCG (366 days held)
const hpUsLtcg = TaxHoldingPeriodEngine.evaluateHoldingPeriod('2023-06-01T00:00:00.000Z', '2024-06-02T00:00:00.000Z', 'US');
testAssert(hpUsLtcg.status === TaxStatus.PASS, 'US holding period evaluates');
testAssert(hpUsLtcg.holdingClass === HoldingPeriodClass.LONG_TERM, '366 days is LONG_TERM in US');

// 3. Holding Period: Temporal violation (Realization before Acquisition)
const hpTemporalFail = TaxHoldingPeriodEngine.evaluateHoldingPeriod('2024-06-01T00:00:00.000Z', '2023-06-01T00:00:00.000Z', 'US');
testAssert(hpTemporalFail.status === TaxStatus.TEMPORAL_VIOLATION, 'Temporal violation detected');

// 4. Realized Gain Calculation (US: STCG + LTCG lots)
const allocatedLots = [
  { lotId: 'LOT-1', securityId: 'AAPL', acquisitionDate: '2023-01-01T00:00:00.000Z', acquisitionPrice: 100.0, allocatedQuantity: 50, allocatedCostBasis: 5000.0 }, // LTCG (held > 365d)
  { lotId: 'LOT-2', securityId: 'AAPL', acquisitionDate: '2024-03-01T00:00:00.000Z', acquisitionPrice: 150.0, allocatedQuantity: 50, allocatedCostBasis: 7500.0 }  // STCG (held < 365d)
];

const realizedRes = TaxRealizedGainEngine.calculateRealizedGain({
  securityId: 'AAPL',
  disposalQuantity: 100,
  salePrice: 200.0,
  allocatedLots,
  disposalDate: '2024-06-01T00:00:00.000Z',
  jurisdiction: 'US',
  accountType: 'TAXABLE',
  transactionCosts: 20.0
});

testAssert(realizedRes.status === TaxStatus.PASS, 'Realized gain calculation passes');
testAssert(realizedRes.grossProceeds === 20000.0, 'Gross proceeds is $20,000');
testAssert(realizedRes.totalAllocatedCostBasis === 12500.0, 'Total cost basis is $12,500');
testAssert(realizedRes.netRealizedGainLoss === (20000.0 - 12500.0 - 20.0), 'Net realized gain after fees is $7,480');
testAssert(realizedRes.totalLtcgGain === (50 * 200 - 5000), 'LTCG gain is $5,000');
testAssert(realizedRes.totalStcgGain === (50 * 200 - 7500), 'STCG gain is $2,500');
// US Rates: 20% LTCG, 37% STCG -> 5000 * 0.20 + 2500 * 0.37 = 1000 + 925 = 1925
testAssert(Math.abs(realizedRes.estimatedTax - 1925.0) < 0.01, 'US estimated tax is exact ($1,925)');

// 5. Realized Gain in India (Section 111A STCG 20%, Section 112A LTCG 12.5%, STT 0.1%)
const realizedIndiaRes = TaxRealizedGainEngine.calculateRealizedGain({
  securityId: 'RELIANCE.NS',
  disposalQuantity: 100,
  salePrice: 2000.0,
  allocatedLots: [
    { lotId: 'LOT-IN-1', securityId: 'RELIANCE.NS', acquisitionDate: '2023-01-01T00:00:00.000Z', acquisitionPrice: 1500.0, allocatedQuantity: 50, allocatedCostBasis: 75000.0 }, // LTCG
    { lotId: 'LOT-IN-2', securityId: 'RELIANCE.NS', acquisitionDate: '2024-05-01T00:00:00.000Z', acquisitionPrice: 1800.0, allocatedQuantity: 50, allocatedCostBasis: 90000.0 }  // STCG
  ],
  disposalDate: '2024-08-01T00:00:00.000Z',
  jurisdiction: 'IN',
  accountType: 'TAXABLE',
  transactionCosts: 100.0
});

testAssert(realizedIndiaRes.status === TaxStatus.PASS, 'India realized gain calculation passes');
// LTCG gain = 100000 - 75000 = 25000 * 12.5% = 3125
// STCG gain = 100000 - 90000 = 10000 * 20.0% = 2000
// STT = 200000 * 0.1% = 200
// Total estimated tax = 3125 + 2000 + 200 = 5325
testAssert(Math.abs(realizedIndiaRes.estimatedTax - 5325.0) < 0.01, 'India tax calculation is exact (₹5,325)');

// 6. Unrealized Gains & Mark-to-Market
const openLotsMkt = [
  { lotId: 'LOT-U1', securityId: 'AAPL', acquisitionDate: '2023-01-01T00:00:00.000Z', acquisitionPrice: 100.0, quantity: 100, costBasis: 10000.0 },
  { lotId: 'LOT-U2', securityId: 'MSFT', acquisitionDate: '2024-02-01T00:00:00.000Z', acquisitionPrice: 400.0, quantity: 50, costBasis: 20000.0 }
];

const unrealizedRes = TaxUnrealizedGainEngine.calculateUnrealizedGains(
  openLotsMkt,
  { AAPL: 180.0, MSFT: 450.0 },
  '2024-06-01T00:00:00.000Z',
  'US',
  'TAXABLE'
);

testAssert(unrealizedRes.status === TaxStatus.PASS, 'Unrealized gain calculation passes');
testAssert(unrealizedRes.totalMarketValue === (100 * 180 + 50 * 450), 'Total market value is $40,500');
testAssert(unrealizedRes.netUnrealizedGainLoss === (40500 - 30000), 'Net unrealized gain is $10,500');
// AAPL is LTCG (8000 * 0.20 = 1600), MSFT is STCG (2500 * 0.37 = 925) -> Embedded tax = 2525
testAssert(Math.abs(unrealizedRes.totalEmbeddedTaxLiability - 2525.0) < 0.01, 'Embedded tax liability is $2,525');

// 7. Missing market price for unrealized
const missingPriceRes = TaxUnrealizedGainEngine.calculateUnrealizedGains(
  openLotsMkt,
  { AAPL: 180.0 }, // MSFT missing
  '2024-06-01T00:00:00.000Z',
  'US',
  'TAXABLE'
);
testAssert(missingPriceRes.status === TaxStatus.AFTER_TAX_RESULT_UNAVAILABLE, 'Missing price yields AFTER_TAX_RESULT_UNAVAILABLE');

// 8. Dividend Tax: Qualified vs Non-Qualified
const qualDivRes = TaxDividendEngine.evaluateDividendTax({
  dividendId: 'DIV-001',
  securityId: 'AAPL',
  accountId: 'PORT-MAIN',
  amount: 1000.0,
  dividendDate: '2024-05-15T00:00:00.000Z',
  classification: DividendClassification.QUALIFIED,
  jurisdiction: 'US',
  accountType: 'TAXABLE'
});
testAssert(qualDivRes.status === TaxStatus.PASS, 'Qualified dividend evaluates');
testAssert(qualDivRes.appliedRate === 0.20 && qualDivRes.estimatedTax === 200.0, 'Qualified dividend taxed at 20% ($200)');

const nonQualDivRes = TaxDividendEngine.evaluateDividendTax({
  dividendId: 'DIV-002',
  securityId: 'AAPL',
  accountId: 'PORT-MAIN',
  amount: 1000.0,
  dividendDate: '2024-05-15T00:00:00.000Z',
  classification: DividendClassification.NON_QUALIFIED,
  jurisdiction: 'US',
  accountType: 'TAXABLE'
});
testAssert(nonQualDivRes.appliedRate === 0.37 && nonQualDivRes.estimatedTax === 370.0, 'Non-qualified dividend taxed at 37% ($370)');

// 9. Pre-trade Transaction Tax
const preTradeBuy = TaxTransactionTaxEngine.evaluateTransactionTax({
  securityId: 'AAPL',
  side: 'BUY',
  quantity: 100,
  price: 150.0,
  asOf: '2024-06-01T00:00:00.000Z',
  jurisdiction: 'US'
});
testAssert(preTradeBuy.status === TaxStatus.PASS && preTradeBuy.side === 'BUY', 'Pre-trade BUY passes');

// 10. Tax Drag Engine
const dragNormal = TaxDragEngine.computeTaxDrag(0.12, 0.10);
testAssert(dragNormal.status === TaxStatus.PASS, 'Tax drag scalar computes');
testAssert(Math.abs(dragNormal.taxDrag - 0.02) < 0.00001, 'Tax drag is 2.0%');
testAssert(Math.abs(dragNormal.taxDragPercent - (0.02 / 0.12)) < 0.0001, 'Tax drag percent is 16.67%');

const dragZero = TaxDragEngine.computeTaxDrag(0.0, 0.0);
testAssert(dragZero.taxDragPercentStatus === 'ZERO_PRETAX_RETURN', 'Zero pretax return handled safely');

// 11. After-Tax Return Engine
const afterTaxRes = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({
  preTaxTwr: 0.15,
  preTaxMwr: 0.14,
  portfolioValue: 1000000,
  realizedTax: 10000,
  dividendTax: 5000,
  transactionCosts: 2000,
  unrealizedEmbeddedTax: 8000
});
testAssert(afterTaxRes.status === TaxStatus.PASS, 'After-tax return computes');
testAssert(afterTaxRes.totalActualTaxes === 15000, 'Total actual taxes is $15,000');
testAssert(afterTaxRes.totalFriction === 17000, 'Total friction is $17,000');
testAssert(Math.abs(afterTaxRes.actualTaxDragRate - 0.017) < 0.0001, 'Tax drag rate is 1.7%');
testAssert(Math.abs(afterTaxRes.afterTaxTwr - (0.15 - 0.017)) < 0.0001, 'After-tax TWR is 13.3%');

// 12. After-Tax Expected Return Engine
const expRetRes = TaxAfterTaxExpectedReturnEngine.computeAfterTaxExpectedReturn(0.095, 0.015);
testAssert(expRetRes.status === TaxStatus.PASS, 'Expected after-tax return passes');
testAssert(Math.abs(expRetRes.afterTaxExpectedReturn - 0.080) < 0.00001, 'Expected after-tax return is 8.0%');

// 13. Pre-trade SELL Transaction Tax
const preTradeSell = TaxTransactionTaxEngine.evaluateTransactionTax({
  securityId: 'AAPL',
  side: 'SELL',
  quantity: 50,
  price: 190.0,
  openLots: [{ lotId: 'LOT-SELL-1', securityId: 'AAPL', acquisitionDate: '2023-01-01T00:00:00.000Z', acquisitionPrice: 100.0, quantity: 50, costBasis: 5000.0 }],
  asOf: '2024-06-01T00:00:00.000Z',
  jurisdiction: 'US'
});
testAssert(preTradeSell.status === TaxStatus.PASS && preTradeSell.side === 'SELL', 'Pre-trade SELL passes');
testAssert(preTradeSell.estimatedTax === (50 * (190 - 100) * 0.20), 'Pre-trade SELL estimated tax is $900');

// 14. Realized Loss (Capital Loss Tax Shield)
const lossRes = TaxRealizedGainEngine.calculateRealizedGain({
  securityId: 'TSLA',
  disposalQuantity: 50,
  salePrice: 150.0,
  allocatedLots: [{ lotId: 'LOT-L1', securityId: 'TSLA', acquisitionDate: '2023-01-01T00:00:00.000Z', acquisitionPrice: 200.0, allocatedQuantity: 50, allocatedCostBasis: 10000.0 }],
  disposalDate: '2024-06-01T00:00:00.000Z',
  jurisdiction: 'US',
  accountType: 'TAXABLE'
});
testAssert(lossRes.status === TaxStatus.PASS, 'Realized loss evaluates');
testAssert(lossRes.netRealizedGainLoss === -2500.0, 'Realized loss is -$2,500');
testAssert(lossRes.totalLtcgLoss === 2500.0, 'LTCG loss is $2,500');
testAssert(lossRes.estimatedTax === 0, 'Estimated tax on realized loss is 0');

// 15. REIT Dividend (Non-Qualified / Ordinary Income at 37%)
const reitDiv = TaxDividendEngine.evaluateDividendTax({
  dividendId: 'DIV-REIT',
  securityId: 'PLD',
  accountId: 'PORT-MAIN',
  amount: 1000.0,
  dividendDate: '2024-05-15T00:00:00.000Z',
  classification: DividendClassification.NON_QUALIFIED,
  jurisdiction: 'US',
  accountType: 'TAXABLE'
});
testAssert(reitDiv.status === TaxStatus.PASS, 'REIT non-qualified dividend evaluates');
testAssert(reitDiv.appliedRate === 0.37 && reitDiv.estimatedTax === 370.0, 'REIT dividend taxed at 37%');

// 16. Rule Provenance & Evidence Verification
const ruleEvidence = TaxJurisdictionEngine.getJurisdictionRule('US', '2024-06-01T00:00:00.000Z');
testAssert(ruleEvidence.status === TaxStatus.PASS, 'Rule provenance evaluates');
testAssert(ruleEvidence.rule.sourceEvidenceId === 'EVID-SRC-US-IRC-2024', 'Source evidence ID matches IRC 2024 citation');

console.log(`PASSED: Suite 2 completed with ${totalAssertions} assertions.`);

