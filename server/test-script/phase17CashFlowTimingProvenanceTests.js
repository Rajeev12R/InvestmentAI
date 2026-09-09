/**
 * Phase 17 — Test Suite 12: Cash-Flow Timing, Tax-Rate Semantics & Evidence Provenance Hardening
 * Rigorously verifies deterministic cash-flow timing, rate semantics, structured provenance, and boundary isolation.
 */

import { strict as assert } from 'assert';
import {
  AfterTaxReturnMethodology,
  CashFlowClassification,
  CashFlowTiming,
  CostBasisMethod,
  JurisdictionStatus,
  RateType,
  SecurityType,
  TaxPaymentSource,
  TaxStatus,
  ValuationBoundary
} from '../tax/tax.types.js';
import { TaxAfterTaxReturnEngine } from '../tax/tax.afterTaxReturn.engine.js';
import { JURISDICTIONS, TaxJurisdictionEngine } from '../tax/tax.jurisdiction.js';
import { TaxHoldingPeriodEngine } from '../tax/tax.holdingPeriod.engine.js';
import { TaxRealizedGainEngine } from '../tax/tax.realizedGain.engine.js';
import { TaxDividendEngine } from '../tax/tax.dividend.engine.js';
import { TaxWashSaleEngine } from '../tax/tax.washSale.engine.js';
import { TaxEffectLedger } from '../tax/tax.ledger.js';
import { TaxIntelligencePackageBuilder } from '../tax/tax.package.js';

let totalAssertions = 0;
function testAssert(cond, msg) {
  assert(cond, msg);
  totalAssertions++;
}

console.log('--- RUNNING PHASE 17 SUITE 12: CASH-FLOW TIMING, RATE SEMANTICS & PROVENANCE TESTS ---');

// === 1. CASH-FLOW TIMING GOLDEN TESTS ===

// Test A: No external cash flow (Beg 100, End 110 -> 10%)
const resA = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({
  subperiods: [{ beginningValue: 100, endingValue: 110, externalCashFlow: 0, actualTaxPaid: 0, transactionCost: 0 }]
});
testAssert(resA.status === TaxStatus.PASS, 'Test A: No external cash flow passes');
testAssert(Math.abs(resA.afterTaxTwr - 0.10) < 1e-6, 'Test A: Return is exactly 10.00%');

// Test B: Beginning contribution (Initial 100, Beginning contribution 100, Portfolio grows 10%, Ending 220 -> TWR 10%)
const resB = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({
  subperiods: [{
    beginningValue: 100,
    endingValue: 220,
    externalCashFlow: 100,
    cashFlowTiming: CashFlowTiming.BEGINNING_OF_SUBPERIOD,
    actualTaxPaid: 0,
    transactionCost: 0
  }]
});
testAssert(resB.status === TaxStatus.PASS, 'Test B: Beginning contribution passes');
testAssert(Math.abs(resB.afterTaxTwr - 0.10) < 1e-6, 'Test B: TWR is exactly 10.00% on beginning capital base');

// Test C: End contribution (Initial 100, Portfolio grows 10%, Pre-contribution 110, End contribution 100, Ending 210 -> TWR 10%)
const resC = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({
  subperiods: [{
    beginningValue: 100,
    endingValue: 210,
    externalCashFlow: 100,
    cashFlowTiming: CashFlowTiming.END_OF_SUBPERIOD,
    actualTaxPaid: 0,
    transactionCost: 0
  }]
});
testAssert(resC.status === TaxStatus.PASS, 'Test C: End contribution passes');
testAssert(Math.abs(resC.afterTaxTwr - 0.10) < 1e-6, 'Test C: TWR is exactly 10.00% on ending capital base');

// Test D: Mid-period contribution (Intra-period split into two subperiods)
// Subperiod 1: Beg 100, grows to 110 (10%). Mid contribution +100 -> New base 210.
// Subperiod 2: Base 210, grows to 231 (10%).
// Overall TWR = (1 + 0.10)*(1 + 0.10) - 1 = 21.00%.
const resD = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({
  subperiods: [
    { beginningValue: 100, endingValue: 110, externalCashFlow: 0, actualTaxPaid: 0, transactionCost: 0 },
    { beginningValue: 210, endingValue: 231, externalCashFlow: 0, actualTaxPaid: 0, transactionCost: 0 }
  ]
});
testAssert(resD.status === TaxStatus.PASS, 'Test D: Mid-period multi-subperiod passes');
testAssert(Math.abs(resD.afterTaxTwr - 0.21) < 1e-6, 'Test D: Geometric TWR across mid-period boundary is 21.00%');

// Test D2: Intra-period contribution with intermediate valuation
const resD2 = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({
  subperiods: [{
    beginningValue: 100,
    endingValue: 231,
    externalCashFlow: 100,
    cashFlowTiming: CashFlowTiming.INTRA_PERIOD,
    intermediateValuationPreCashFlow: 110,
    actualTaxPaid: 0,
    transactionCost: 0
  }]
});
testAssert(resD2.status === TaxStatus.PASS, 'Test D2: INTRA_PERIOD with intermediate valuation passes');
testAssert(Math.abs(resD2.afterTaxTwr - 0.21) < 1e-6, 'Test D2: INTRA_PERIOD return is 21.00%');

// Test E: Unknown timing rejection
const resE = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({
  subperiods: [{
    beginningValue: 100,
    endingValue: 210,
    externalCashFlow: 100,
    cashFlowTiming: CashFlowTiming.UNKNOWN
  }]
});
testAssert(resE.status === TaxStatus.UNAVAILABLE, 'Test E: Unknown cash flow timing rejected as UNAVAILABLE');
testAssert(resE.reason === 'CASH_FLOW_TIMING_UNKNOWN', 'Test E: Reason is CASH_FLOW_TIMING_UNKNOWN');

// Test F: Portfolio-paid tax (Beg 100, Gross End 110, Tax 2, Actual End 108 -> AfterTaxTWR 8%, NOT 6%)
const resF = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({
  subperiods: [{
    beginningValue: 100,
    endingValue: 108,
    valuationBoundary: ValuationBoundary.POST_ALL_INVESTOR_COSTS,
    actualTaxPaid: 2,
    taxPaymentSource: TaxPaymentSource.PORTFOLIO,
    taxEventId: 'EVT-F-01',
    externalCashFlow: 0
  }]
});
testAssert(resF.status === TaxStatus.PASS, 'Test F: Portfolio-paid tax passes');
testAssert(Math.abs(resF.afterTaxTwr - 0.08) < 1e-6, 'Test F: Single-count verified: After-tax return is 8.00%');
testAssert(Math.abs(resF.preTaxTwr - 0.10) < 1e-6, 'Test F: Pre-tax reconstructed return is 10.00%');

// Test G: External tax (Beg 100, End 110, Investor externally pays 2)
// Portfolio ending value remains 110. Portfolio return is 10%.
const resG = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({
  subperiods: [{
    beginningValue: 100,
    endingValue: 110,
    valuationBoundary: ValuationBoundary.POST_ALL_INVESTOR_COSTS,
    actualTaxPaid: 2,
    taxPaymentSource: TaxPaymentSource.INVESTOR_EXTERNAL,
    taxEventId: 'EVT-G-01',
    externalCashFlow: 0
  }]
});
testAssert(resG.status === TaxStatus.PASS, 'Test G: External tax passes');
testAssert(Math.abs(resG.afterTaxTwr - 0.10) < 1e-6, 'Test G: Portfolio after-tax return is 10.00% (tax not deducted from portfolio value)');

// Test G2: External tax in investor-level MWR
const mwrG2 = TaxAfterTaxReturnEngine.calculateAfterTaxMWR([
  { date: '2024-01-01', amount: -100, classification: CashFlowClassification.INVESTOR_CONTRIBUTION },
  { date: '2024-06-01', amount: 2, classification: CashFlowClassification.TAX_PAID_EXTERNAL },
  { date: '2025-01-01', amount: 110, classification: CashFlowClassification.ENDING_PORTFOLIO_VALUE, valuationBoundary: ValuationBoundary.POST_ALL_INVESTOR_COSTS }
]);
testAssert(mwrG2.status === TaxStatus.PASS, 'Test G2: External tax reflected in MWR cash flows');
testAssert(mwrG2.afterTaxMwr < 0.10, 'Test G2: External tax out-of-pocket reduces investor-level MWR');

// === 2. US TAX-RATE SEMANTICS & SCOPING TESTS ===

console.log('Testing US Tax-Rate Semantics & Scoping...');

const usRule = TaxJurisdictionEngine.getJurisdictionRule('US', '2024-06-01T00:00:00.000Z', SecurityType.EQUITY);
testAssert(usRule.status === TaxStatus.PASS, 'US Rule: Evaluates cleanly');
testAssert(usRule.rule.stcgTaxTreatment === 'ORDINARY_INCOME', 'US Rule: STCG treatment is ORDINARY_INCOME');
testAssert(usRule.rule.stcgRateType === 'CONFIGURED_ASSUMPTION', 'US Rule: STCG rateType is CONFIGURED_ASSUMPTION (not universal statutory)');
testAssert(usRule.rule.ltcgTaxTreatment === 'CAPITAL_GAIN', 'US Rule: LTCG treatment is CAPITAL_GAIN');
testAssert(usRule.rule.ltcgRateType === 'CONFIGURED_ASSUMPTION', 'US Rule: LTCG rateType is CONFIGURED_ASSUMPTION');
testAssert(Array.isArray(usRule.rule.ltcgConfiguredRateSchedule), 'US Rule: Configured rate schedule [0%, 15%, 20%] exists');

// Security-type scoping in US
const usReitRule = TaxJurisdictionEngine.getJurisdictionRule('US', '2024-06-01T00:00:00.000Z', SecurityType.REIT);
testAssert(usReitRule.rule.holdingRuleId === 'RULE-US-REIT-365', 'US REIT: Scoped holding rule ID matches');

const usBondRule = TaxJurisdictionEngine.getJurisdictionRule('US', '2024-06-01T00:00:00.000Z', SecurityType.BOND);
testAssert(usBondRule.rule.holdingRuleId === 'RULE-US-BOND-365', 'US Bond: Scoped holding rule ID matches');

// === 3. INDIA TAX-RATE SEMANTICS & SCOPING TESTS ===

console.log('Testing India Tax-Rate Semantics & Scoping...');

const inEqRule = TaxJurisdictionEngine.getJurisdictionRule('IN', '2024-08-01T00:00:00.000Z', SecurityType.EQUITY);
testAssert(inEqRule.status === TaxStatus.PASS, 'IN Equity: Evaluates cleanly');
testAssert(inEqRule.rule.stcgTaxTreatment === 'SPECIAL_RATE_SECTION_111A', 'IN Equity: STCG treatment is SPECIAL_RATE_SECTION_111A');
testAssert(inEqRule.rule.stcgRateType === 'STATUTORY_FIXED', 'IN Equity: STCG rateType is STATUTORY_FIXED (20%)');
testAssert(inEqRule.rule.ltcgTaxTreatment === 'SPECIAL_RATE_SECTION_112A', 'IN Equity: LTCG treatment is SPECIAL_RATE_SECTION_112A (12.5%)');

const inBondRule = TaxJurisdictionEngine.getJurisdictionRule('IN', '2024-08-01T00:00:00.000Z', SecurityType.BOND);
testAssert(inBondRule.status === TaxStatus.PASS, 'IN Bond: Evaluates cleanly');
testAssert(inBondRule.rule.securityTypeRules[SecurityType.BOND].taxTreatment === 'ORDINARY_INCOME', 'IN Bond: STCG treatment is ORDINARY_INCOME');
testAssert(inBondRule.rule.securityTypeRules[SecurityType.BOND].rateType === 'TAXPAYER_SLICE', 'IN Bond: STCG rateType is TAXPAYER_SLICE (not universal 30%)');
testAssert(inBondRule.rule.securityTypeRules[SecurityType.BOND].configuredMarginalRate === 0.30, 'IN Bond: 30% is configuredMarginalRate assumption');

// Wash-sale statute isolation
testAssert(inEqRule.rule.hasWashSaleStatute === false, 'IN Rule: hasWashSaleStatute is false');
testAssert(inEqRule.rule.washSaleStatusText === 'NO_CONFIGURED_WASH_SALE_RULE', 'IN Rule: washSaleStatusText is NO_CONFIGURED_WASH_SALE_RULE');

// === 4. STRUCTURED PROVENANCE SCHEMA TESTS ===

console.log('Testing Structured Provenance Schema...');

for (const jurCode of ['US', 'IN']) {
  const ruleObj = JURISDICTIONS[jurCode];
  testAssert(typeof ruleObj.sourceAuthority === 'string' && ruleObj.sourceAuthority.length > 0, `Provenance ${jurCode}: sourceAuthority present`);
  testAssert(typeof ruleObj.sourceDocument === 'string' && ruleObj.sourceDocument.length > 0, `Provenance ${jurCode}: sourceDocument present`);
  testAssert(typeof ruleObj.sourceSection === 'string' && ruleObj.sourceSection.length > 0, `Provenance ${jurCode}: sourceSection present`);
  testAssert(typeof ruleObj.sourceURI === 'string' && ruleObj.sourceURI.startsWith('http'), `Provenance ${jurCode}: sourceURI is valid URL`);
  testAssert(typeof ruleObj.sourceEffectiveDate === 'string', `Provenance ${jurCode}: sourceEffectiveDate present`);
  testAssert(typeof ruleObj.sourceRetrievedAt === 'string', `Provenance ${jurCode}: sourceRetrievedAt present`);
  testAssert(typeof ruleObj.evidenceId === 'string' && ruleObj.evidenceId.startsWith('EVID-'), `Provenance ${jurCode}: evidenceId valid`);
  testAssert(typeof ruleObj.evidenceHash === 'string' && ruleObj.evidenceHash.length === 64, `Provenance ${jurCode}: evidenceHash is SHA-256`);
  testAssert(typeof ruleObj.taxRuleVersion === 'string', `Provenance ${jurCode}: taxRuleVersion present`);
  testAssert(ruleObj.status === JurisdictionStatus.CONFIGURED, `Provenance ${jurCode}: status is CONFIGURED (not REAL_DATA)`);
}

// === 5. TEMPORAL BOUNDARY TESTING ===

console.log('Testing Temporal Boundaries (effectiveFrom / effectiveTo / Boundaries)...');

// Rule effective exactly at effectiveFrom
const tExactFrom = TaxJurisdictionEngine.getJurisdictionRule('US', '2024-01-01T00:00:00.000Z');
testAssert(tExactFrom.status === TaxStatus.PASS, 'Temporal: Exact effectiveFrom date passes');

// Rule effective exactly at effectiveTo
const tExactTo = TaxJurisdictionEngine.getJurisdictionRule('US', '2026-12-31T23:59:59.999Z');
testAssert(tExactTo.status === TaxStatus.PASS, 'Temporal: Exact effectiveTo date passes');

// Rule evaluated before effectiveFrom (Pre-effective India rule at 2024-01-01)
const tPreEffective = TaxJurisdictionEngine.getJurisdictionRule('IN', '2024-01-01T00:00:00.000Z');
testAssert(tPreEffective.status === TaxStatus.TEMPORAL_VIOLATION, 'Temporal: Pre-effective date rejected with TEMPORAL_VIOLATION');

// Rule evaluated after effectiveTo (Future US rule at 2030-01-01)
const tPostExpired = TaxJurisdictionEngine.getJurisdictionRule('US', '2030-01-01T00:00:00.000Z');
testAssert(tPostExpired.status === TaxStatus.TEMPORAL_VIOLATION, 'Temporal: Post-expiration date rejected with TEMPORAL_VIOLATION');

// === 6. JURISDICTION ISOLATION & BOUNDARY DEFENSE ===

console.log('Testing Jurisdiction Isolation & Boundary Defense...');

// US wash sale evaluation
const usWash = TaxWashSaleEngine.evaluateWashSale({ securityId: 'AAPL', saleDate: '2024-06-15T00:00:00.000Z', isLoss: true }, [{ securityId: 'AAPL', side: 'BUY', date: '2024-06-01T00:00:00.000Z', quantity: 10 }], 'US');
testAssert(usWash.washSaleStatus === 'DISALLOWED', 'Jurisdiction: US wash sale triggered on 14-day lookback');

// India wash sale evaluation (no restriction)
const inWash = TaxWashSaleEngine.evaluateWashSale({ securityId: 'RELIANCE', saleDate: '2024-08-15T00:00:00.000Z', isLoss: true }, [{ securityId: 'RELIANCE', side: 'BUY', date: '2024-08-01T00:00:00.000Z', quantity: 10 }], 'IN');
testAssert(inWash.washSaleStatus === 'ALLOWED' && inWash.disallowedLoss === 0, 'Jurisdiction: India has ALLOWED wash sale');

// Unsupported jurisdiction
const unsuppJur = TaxJurisdictionEngine.getJurisdictionRule('UNKNOWN_COUNTRY', '2024-06-01T00:00:00.000Z');
testAssert(unsuppJur.status === TaxStatus.JURISDICTION_UNAVAILABLE, 'Jurisdiction: Unsupported country returns JURISDICTION_UNAVAILABLE');

// Unsupported security type for jurisdiction (REIT in India)
const inReit = TaxJurisdictionEngine.getJurisdictionRule('IN', '2024-08-01T00:00:00.000Z', SecurityType.REIT);
testAssert(inReit.status === TaxStatus.TAX_RULE_UNAVAILABLE, 'Jurisdiction: Unsupported security type for India returns TAX_RULE_UNAVAILABLE');

// === 7. SEALED PACKAGE EVIDENCE TRACEABILITY ===

console.log('Testing Sealed Package Provenance Traceability...');

const sealedPkgTest = TaxIntelligencePackageBuilder.sealPackage({
  packageVersion: '1.0.0',
  policyVersion: 'TAX_POLICY_V1',
  workspaceId: 'WS-PROVENANCE',
  portfolioId: 'PORT-PROV-01',
  asOf: '2024-06-01T00:00:00.000Z',
  jurisdiction: 'US',
  taxLots: [],
  ledgerHash: 'abc123hash',
  afterTaxReturnMethodology: AfterTaxReturnMethodology.ACTUAL_AFTER_TAX
});

// === 8. WITHDRAWAL CASH FLOW TIMING & TRACEABILITY TESTS ===

console.log('Testing Withdrawal Timing & Full Chain Traceability...');

// Test H: Beginning withdrawal (Beg 200, Withdrawal -100 at beginning -> Base 100, grows 10% to 110 -> TWR 10%)
const resWithdrawBeg = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({
  subperiods: [{
    beginningValue: 200,
    endingValue: 110,
    externalCashFlow: -100,
    cashFlowTiming: CashFlowTiming.BEGINNING_OF_SUBPERIOD,
    actualTaxPaid: 0,
    transactionCost: 0
  }]
});
testAssert(resWithdrawBeg.status === TaxStatus.PASS, 'Test H: Beginning withdrawal passes');
testAssert(Math.abs(resWithdrawBeg.afterTaxTwr - 0.10) < 1e-6, 'Test H: TWR is 10.00% on reduced capital base');

// Test I: End withdrawal (Beg 100, grows 10% to 110, End withdrawal -50 -> Ending 60 -> TWR 10%)
const resWithdrawEnd = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({
  subperiods: [{
    beginningValue: 100,
    endingValue: 60,
    externalCashFlow: -50,
    cashFlowTiming: CashFlowTiming.END_OF_SUBPERIOD,
    actualTaxPaid: 0,
    transactionCost: 0
  }]
});
testAssert(resWithdrawEnd.status === TaxStatus.PASS, 'Test I: End withdrawal passes');
testAssert(Math.abs(resWithdrawEnd.afterTaxTwr - 0.10) < 1e-6, 'Test I: TWR is 10.00% before end withdrawal');

// Test J: Full Auditor Traceability Chain
// Tax Result -> Tax Rule -> Rule Version -> Evidence ID -> Source Document -> Source Section -> Source URI -> Evidence Hash
const taxDisposal = TaxRealizedGainEngine.calculateRealizedGain({
  securityId: 'AAPL',
  disposalQuantity: 10,
  salePrice: 200.0,
  allocatedLots: [{ lotId: 'LOT-TR-1', securityId: 'AAPL', acquisitionDate: '2023-01-01T00:00:00.000Z', acquisitionPrice: 100.0, allocatedQuantity: 10, allocatedCostBasis: 1000.0 }],
  disposalDate: '2024-06-01T00:00:00.000Z',
  jurisdiction: 'US',
  accountType: 'TAXABLE'
});
testAssert(taxDisposal.status === TaxStatus.PASS, 'Traceability: Realized tax calculated');
const tracedRule = TaxJurisdictionEngine.getJurisdictionRule(taxDisposal.jurisdiction, '2024-06-01T00:00:00.000Z', SecurityType.EQUITY);
testAssert(tracedRule.rule.taxRuleVersion === 'US-IRC-2024.1', 'Traceability: Rule Version is US-IRC-2024.1');
testAssert(tracedRule.rule.evidenceId === 'EVID-SRC-US-IRC-2024', 'Traceability: Evidence ID is EVID-SRC-US-IRC-2024');
testAssert(tracedRule.rule.sourceAuthority.includes('Internal Revenue Service'), 'Traceability: Source Authority verified');
testAssert(tracedRule.rule.sourceSection.includes('1(h)'), 'Traceability: Source Section verified');
testAssert(tracedRule.rule.sourceURI.includes('uscode.house.gov'), 'Traceability: Source URI verified');
testAssert(tracedRule.rule.evidenceHash.length === 64, 'Traceability: Evidence Hash verified');

// Test K: Multi-period mixed cash flow timings
const resMixedTiming = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({
  subperiods: [
    { beginningValue: 100, endingValue: 220, externalCashFlow: 100, cashFlowTiming: CashFlowTiming.BEGINNING_OF_SUBPERIOD }, // 10% on 200
    { beginningValue: 220, endingValue: 242, externalCashFlow: 0, cashFlowTiming: CashFlowTiming.END_OF_SUBPERIOD }           // 10% on 220
  ]
});
testAssert(resMixedTiming.status === TaxStatus.PASS, 'Test K: Multi-period mixed timing passes');
testAssert(Math.abs(resMixedTiming.afterTaxTwr - 0.21) < 1e-6, 'Test K: Compound return is 21.00%');

// Test L: Sealed Package Traceability & Evidence Graph integrity
testAssert(sealedPkgTest.policyVersion === 'TAX_POLICY_V1', 'Package Trace: Policy version preserved');
testAssert(sealedPkgTest.afterTaxReturnMethodology === 'ACTUAL_AFTER_TAX', 'Package Trace: Methodology preserved');
testAssert(sealedPkgTest.ledgerHash === 'abc123hash', 'Package Trace: Ledger hash preserved');

console.log(`PASSED: Suite 12 completed with ${totalAssertions} assertions.`);

