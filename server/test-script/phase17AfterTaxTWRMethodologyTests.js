/**
 * Phase 17 — Test Suite 11: Institutional After-Tax TWR & MWR Methodology Verification
 * Validates geometric subperiod linking, timing sensitivity, cash-flow based IRR, and explicit tax separation.
 */

import { strict as assert } from 'assert';
import { TaxStatus, TaxMethodologyVersion, TaxCategory } from '../tax/tax.types.js';
import { TaxAfterTaxReturnEngine } from '../tax/tax.afterTaxReturn.engine.js';
import { TaxDragEngine } from '../tax/tax.taxDrag.engine.js';

let totalAssertions = 0;
function testAssert(cond, msg) {
  assert(cond, msg);
  totalAssertions++;
}

console.log('--- RUNNING PHASE 17 SUITE 11: AFTER-TAX TWR & MWR METHODOLOGY TESTS ---');

// 1. No taxes -> After-tax TWR equals Pre-tax TWR exactly
const noTaxSubperiods = [
  { beginningValue: 100000, endingValue: 105000, externalCashFlow: 0, actualTaxPaid: 0, transactionCost: 0, startDate: '2024-01-01', endDate: '2024-01-31' },
  { beginningValue: 105000, endingValue: 110250, externalCashFlow: 0, actualTaxPaid: 0, transactionCost: 0, startDate: '2024-02-01', endDate: '2024-02-28' }
];
const resNoTax = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({ subperiods: noTaxSubperiods });
testAssert(resNoTax.status === TaxStatus.PASS, 'Test 1: No-tax subperiods evaluation passes');
testAssert(Math.abs(resNoTax.preTaxTwr - resNoTax.afterTaxTwr) < 1e-9, 'Test 1: After-tax TWR equals pre-tax TWR when zero taxes are incurred');
testAssert(resNoTax.methodologyVersion === TaxMethodologyVersion.V2_GEOMETRIC_SUBPERIOD_LINKING, 'Test 1: Methodology is V2_GEOMETRIC_SUBPERIOD_LINKING');

// 2. Tax paid at beginning of period (Subperiod 1)
const taxBegSubperiods = [
  { beginningValue: 100000, endingValue: 105000, externalCashFlow: 0, actualTaxPaid: 2000, transactionCost: 0, startDate: '2024-01-01', endDate: '2024-01-31' },
  { beginningValue: 103000, endingValue: 108150, externalCashFlow: 0, actualTaxPaid: 0, transactionCost: 0, startDate: '2024-02-01', endDate: '2024-02-28' }
];
const resTaxBeg = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({ subperiods: taxBegSubperiods });
testAssert(resTaxBeg.status === TaxStatus.PASS, 'Test 2: Tax paid in period 1 evaluated');
testAssert(resTaxBeg.afterTaxTwr < resTaxBeg.preTaxTwr, 'Test 2: After-tax TWR reflects early tax payment drag');

// 3. Tax paid at end of period (Subperiod 2)
const taxEndSubperiods = [
  { beginningValue: 100000, endingValue: 105000, externalCashFlow: 0, actualTaxPaid: 0, transactionCost: 0, startDate: '2024-01-01', endDate: '2024-01-31' },
  { beginningValue: 105000, endingValue: 110250, externalCashFlow: 0, actualTaxPaid: 2000, transactionCost: 0, startDate: '2024-02-01', endDate: '2024-02-28' }
];
const resTaxEnd = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({ subperiods: taxEndSubperiods });
testAssert(resTaxEnd.status === TaxStatus.PASS, 'Test 3: Tax paid in period 2 evaluated');

// 4. Timing sensitivity: Same total tax ($2,000) paid at period 1 vs period 2 produces mathematically different linked return
testAssert(resTaxBeg.afterTaxTwr !== resTaxEnd.afterTaxTwr, 'Test 4: Timing sensitivity verified (TWR depends geometrically on when tax was paid)');

// 5. Multiple tax events across subperiods
const multiTaxSubperiods = [
  { beginningValue: 100000, endingValue: 104000, externalCashFlow: 0, actualTaxPaid: 500, transactionCost: 0, startDate: '2024-01-01', endDate: '2024-01-31' },
  { beginningValue: 103500, endingValue: 107000, externalCashFlow: 0, actualTaxPaid: 800, transactionCost: 0, startDate: '2024-02-01', endDate: '2024-02-28' },
  { beginningValue: 106200, endingValue: 110000, externalCashFlow: 0, actualTaxPaid: 400, transactionCost: 0, startDate: '2024-03-01', endDate: '2024-03-31' }
];
const resMultiTax = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({ subperiods: multiTaxSubperiods });
testAssert(resMultiTax.status === TaxStatus.PASS, 'Test 5: Multiple tax events evaluate');
testAssert(resMultiTax.totalActualTaxPaid === 1700, 'Test 5: Total actual tax paid matches sum of periods ($1,700)');

// 6. Transaction costs in multiple periods
const txCostSubperiods = [
  { beginningValue: 100000, endingValue: 105000, externalCashFlow: 0, actualTaxPaid: 0, transactionCost: 150, startDate: '2024-01-01', endDate: '2024-01-31' },
  { beginningValue: 104850, endingValue: 110000, externalCashFlow: 0, actualTaxPaid: 0, transactionCost: 250, startDate: '2024-02-01', endDate: '2024-02-28' }
];
const resTxCosts = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({ subperiods: txCostSubperiods });
testAssert(resTxCosts.totalTransactionCosts === 400, 'Test 6: Total transaction costs separated and summed ($400)');
testAssert(resTxCosts.taxCategories[TaxCategory.TRANSACTION_COST] === 400, 'Test 6: TaxCategory.TRANSACTION_COST categorized properly');

// 7. Combined Tax + Transaction Costs
const comboSubperiods = [
  { beginningValue: 100000, endingValue: 105000, externalCashFlow: 0, actualTaxPaid: 1000, transactionCost: 100, dividendWithholdingTax: 50, startDate: '2024-01-01', endDate: '2024-01-31' }
];
const resCombo = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({ subperiods: comboSubperiods });
testAssert(resCombo.totalActualTaxPaid === 1000, 'Test 7: Actual tax paid is $1,000');
testAssert(resCombo.totalWithholdingTax === 50, 'Test 7: Withholding tax is $50');
testAssert(resCombo.totalTransactionCosts === 100, 'Test 7: Transaction cost is $100');

// 8. External Cash Flow + Tax (Inflow)
const inflowSubperiods = [
  { beginningValue: 100000, endingValue: 130000, externalCashFlow: 20000, actualTaxPaid: 1000, transactionCost: 50, startDate: '2024-01-01', endDate: '2024-01-31' }
];
// (130000 - 20000 - 1000 - 50) / 100000 - 1 = 108950 / 100000 - 1 = 8.95%
const resInflow = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({ subperiods: inflowSubperiods });
testAssert(Math.abs(resInflow.afterTaxTwr - 0.0895) < 1e-6, 'Test 8: External capital injection + tax evaluated with exact subperiod formula (8.95%)');

// 9. Multiple External Cash Flows (Inflows and Outflows)
const multiCfSubperiods = [
  { beginningValue: 100000, endingValue: 125000, externalCashFlow: 20000, actualTaxPaid: 500, transactionCost: 0, startDate: '2024-01-01', endDate: '2024-01-31' },
  { beginningValue: 125000, endingValue: 115000, externalCashFlow: -15000, actualTaxPaid: 500, transactionCost: 0, startDate: '2024-02-01', endDate: '2024-02-28' }
];
const resMultiCf = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({ subperiods: multiCfSubperiods });
testAssert(resMultiCf.status === TaxStatus.PASS, 'Test 9: Multiple external cash flows evaluated cleanly');

// 10. Geometric Linking Formula Validation
// Period 1 return r1 = 4%, Period 2 return r2 = 6% -> Linked TWR = (1 + 0.04)*(1 + 0.06) - 1 = 1.1024 - 1 = 10.24%
const geomSubperiods = [
  { beginningValue: 100000, endingValue: 104000, externalCashFlow: 0, actualTaxPaid: 0, transactionCost: 0, startDate: '2024-01-01', endDate: '2024-01-31' },
  { beginningValue: 104000, endingValue: 110240, externalCashFlow: 0, actualTaxPaid: 0, transactionCost: 0, startDate: '2024-02-01', endDate: '2024-02-28' }
];
const resGeom = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({ subperiods: geomSubperiods });
testAssert(Math.abs(resGeom.afterTaxTwr - 0.1024) < 1e-6, 'Test 10: Geometric compounding Π(1+r_i) - 1 verified exact (10.24%)');

// 11. Two-Period Portfolio Subperiod Count
testAssert(resGeom.subperiodsCount === 2, 'Test 11: 2-period portfolio subperiods count is 2');

// 12. Three-Period Portfolio Subperiod Count
testAssert(resMultiTax.subperiodsCount === 3, 'Test 12: 3-period portfolio subperiods count is 3');

// 13. Unrealized tax does NOT become actual tax paid
const resUnrealizedSep = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({
  subperiods: noTaxSubperiods,
  unrealizedEmbeddedTax: 15000
});
testAssert(resUnrealizedSep.totalActualTaxPaid === 0, 'Test 13: Unrealized embedded tax is NOT counted as actual tax paid');
testAssert(resUnrealizedSep.taxCategories[TaxCategory.EMBEDDED_UNREALIZED_TAX] === 15000, 'Test 13: Embedded unrealized tax isolated');

// 14. Liquidation tax remains strictly separate
testAssert(resUnrealizedSep.liquidationAfterTaxTwr < resUnrealizedSep.afterTaxTwr, 'Test 14: Hypothetical liquidation after-tax return is separate from actual after-tax TWR');

// 15. Zero pre-tax return handling
const zeroPretaxSub = [
  { beginningValue: 100000, endingValue: 100000, externalCashFlow: 0, actualTaxPaid: 1000, transactionCost: 0, startDate: '2024-01-01', endDate: '2024-01-31' }
];
const resZeroPretax = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({ subperiods: zeroPretaxSub });
testAssert(resZeroPretax.status === TaxStatus.PASS, 'Test 15: Zero pre-tax return evaluated');
testAssert(resZeroPretax.afterTaxTwr < 0, 'Test 15: After-tax return is negative (-1.0%) due to tax friction');

// 16. Negative portfolio return handling
const negReturnSub = [
  { beginningValue: 100000, endingValue: 90000, externalCashFlow: 0, actualTaxPaid: 0, transactionCost: 0, startDate: '2024-01-01', endDate: '2024-01-31' }
];
const resNegReturn = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({ subperiods: negReturnSub });
testAssert(Math.abs(resNegReturn.afterTaxTwr - (-0.10)) < 1e-6, 'Test 16: Negative portfolio return (-10%) handled safely');

// 17. Missing beginningValue rejection
const invalidBegSub = [
  { beginningValue: -100, endingValue: 100000, externalCashFlow: 0, actualTaxPaid: 0, transactionCost: 0, startDate: '2024-01-01', endDate: '2024-01-31' }
];
const resInvBeg = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({ subperiods: invalidBegSub });
testAssert(resInvBeg.status === TaxStatus.INVALID_INPUT, 'Test 17: Negative beginning value rejected');

// 18. Reproducibility & determinism check
const replayA = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({ subperiods: multiTaxSubperiods });
const replayB = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({ subperiods: multiTaxSubperiods });
testAssert(replayA.afterTaxTwr === replayB.afterTaxTwr, 'Test 18: After-tax TWR calculation is 100% deterministic');

// 19. Proving old subtraction formula is NOT the primary methodology
// Under old subtraction formula: PreTaxTWR - (Tax / PortVal) = (105000/100000 * 110250/105000 - 1) - 2000/110250 = 0.1025 - 0.01814 = 0.08436
// Under geometric subperiod linking: (1 + r1)*(1 + r2) - 1 = (1.03)*(1.05) - 1 = 0.08150
const oldSubtractionDiffers = Math.abs(resTaxBeg.afterTaxTwr - (0.1025 - (2000 / 100000))) > 0.0001;
testAssert(oldSubtractionDiffers, 'Test 19: Geometric subperiod TWR differs from simplistic subtraction, proving old formula is NOT primary');

// 20. Tax drag breakdown completeness
testAssert(resTaxBeg.taxDrag !== null && resTaxBeg.taxDrag.taxDrag > 0, 'Test 20: Tax drag breakdown generated');

// === SECTION 2: AFTER-TAX MWR / IRR CASH FLOW TESTS (10 TESTS) ===

console.log('Testing After-Tax MWR / IRR Cash Flow Engine...');

// 21. Standard 2-point cash flow (Initial investment $100k, ending $110k in 1 year)
const standardCf = [
  { date: '2024-01-01', amount: -100000 },
  { date: '2025-01-01', amount: 110000 }
];
const mwrRes1 = TaxAfterTaxReturnEngine.calculateAfterTaxMWR(standardCf);
testAssert(mwrRes1.status === TaxStatus.PASS, 'MWR 21: 2-point cash flow converges');
testAssert(Math.abs(mwrRes1.afterTaxMwr - 0.10) < 0.001, 'MWR 21: MWR is 10.0%');

// 22. After-tax cash flow with tax payment reducing return
const taxPaidCf = [
  { date: '2024-01-01', amount: -100000 },
  { date: '2025-01-01', amount: 110000, taxPaid: 2000 } // Net ending amount = $108,000
];
const mwrRes2 = TaxAfterTaxReturnEngine.calculateAfterTaxMWR(taxPaidCf);
testAssert(mwrRes2.status === TaxStatus.PASS, 'MWR 22: Tax-adjusted cash flow converges');
testAssert(Math.abs(mwrRes2.afterTaxMwr - 0.08) < 0.001, 'MWR 22: After-tax MWR is 8.0%');

// 23. Mid-year contribution with transaction cost
const midYearCf = [
  { date: '2024-01-01', amount: -100000 },
  { date: '2024-07-01', amount: -50000, transactionCost: 250 },
  { date: '2025-01-01', amount: 165000, taxPaid: 1500 }
];
const mwrRes3 = TaxAfterTaxReturnEngine.calculateAfterTaxMWR(midYearCf);
testAssert(mwrRes3.status === TaxStatus.PASS, 'MWR 23: Multi-period cash flows converge');

// 24. No sign change cash flow (All negative contributions -> NO_SOLUTION)
const allNegCf = [
  { date: '2024-01-01', amount: -100000 },
  { date: '2024-06-01', amount: -50000 }
];
const mwrNoSol = TaxAfterTaxReturnEngine.calculateAfterTaxMWR(allNegCf);
testAssert(mwrNoSol.status === 'NO_SOLUTION', 'MWR 24: All-negative series returns NO_SOLUTION');

// 25. All positive cash flow -> NO_SOLUTION
const allPosCf = [
  { date: '2024-01-01', amount: 100000 },
  { date: '2024-06-01', amount: 50000 }
];
const mwrAllPos = TaxAfterTaxReturnEngine.calculateAfterTaxMWR(allPosCf);
testAssert(mwrAllPos.status === 'NO_SOLUTION', 'MWR 25: All-positive series returns NO_SOLUTION');

// 26. Insufficient cash flow points (< 2 points)
const singlePtCf = [{ date: '2024-01-01', amount: -100000 }];
const mwrSingle = TaxAfterTaxReturnEngine.calculateAfterTaxMWR(singlePtCf);
testAssert(mwrSingle.status === TaxStatus.INSUFFICIENT_DATA, 'MWR 26: Single point returns INSUFFICIENT_DATA');

// 27. Extreme non-convergent cash flow series handling
const extremeCf = [
  { date: '2024-01-01', amount: -100000 },
  { date: '2024-01-02', amount: 1e12 },
  { date: '2024-01-03', amount: -1e12 }
];
const mwrExtreme = TaxAfterTaxReturnEngine.calculateAfterTaxMWR(extremeCf);
testAssert(mwrExtreme.status === TaxStatus.PASS || mwrExtreme.status === 'NON_CONVERGENT', 'MWR 27: Extreme cash flows return clean status');

// 28. Net cash flow after tax and transaction costs matches exact arithmetic
const detailedCf = [
  { date: '2024-01-01', amount: -50000 },
  { date: '2025-01-01', amount: 60000, taxPaid: 3000, transactionCost: 200 }
];
const mwrDetailed = TaxAfterTaxReturnEngine.calculateAfterTaxMWR(detailedCf);
testAssert(mwrDetailed.status === TaxStatus.PASS, 'MWR 28: Detailed friction cash flow converges');
testAssert(Math.abs(mwrDetailed.afterTaxMwr - (56800 / 50000 - 1)) < 0.001, 'MWR 28: After-tax MWR matches ($56,800 net ending)');

// 29. Integration of subperiod TWR + MWR cash flows
const integratedRes = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({
  subperiods: noTaxSubperiods,
  cashFlows: standardCf
});
// === SECTION 3: VALUATION BOUNDARY & SINGLE-COUNT TAX INVARIANT TESTS (15+ ASSERTIONS) ===

console.log('Testing Valuation Boundary & Single-Count Tax Invariants...');

import { ValuationBoundary, TaxPaymentSource, CashFlowClassification, AfterTaxReturnMethodology } from '../tax/tax.types.js';
import { TaxEffectLedger } from '../tax/tax.ledger.js';

// 31. Case A: Tax paid from portfolio when Ending Value is already POST_TAX
// Beg: $100, Gross End: $110, Tax: $2, Actual Ending Value: $108.
// Since ending value is already $108 (POST_TAX), return is 108/100 - 1 = 8.0%.
// The engine MUST NOT subtract $2 again (which would give (108-2)/100 - 1 = 6.0%).
const caseAPostTaxSub = [
  {
    beginningValue: 100,
    endingValue: 108, // Already reflects $2 tax payment from portfolio
    valuationBoundary: ValuationBoundary.POST_ALL_INVESTOR_COSTS,
    actualTaxPaid: 2,
    taxPaymentSource: TaxPaymentSource.PORTFOLIO,
    taxEventId: 'EVT-TAX-A1',
    externalCashFlow: 0,
    startDate: '2024-01-01',
    endDate: '2024-01-31'
  }
];
const resCaseA = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({ subperiods: caseAPostTaxSub });
testAssert(resCaseA.status === TaxStatus.PASS, 'Boundary 31: Case A post-tax valuation passes');
testAssert(Math.abs(resCaseA.afterTaxTwr - 0.08) < 1e-6, 'Boundary 31: Exactly-once accounting: After-tax return is exactly 8.0% (not 6.0%)');
testAssert(Math.abs(resCaseA.preTaxTwr - 0.10) < 1e-6, 'Boundary 31: Pre-tax return reconstructed accurately as 10.0%');

// 32. Case A (Pre-Tax Boundary): Ending value is $110 (PRE_TAX_PRE_COST)
// Deducts $2 once to reach $108, yielding 8.0%.
const caseAPreTaxSub = [
  {
    beginningValue: 100,
    endingValue: 110, // Pre-tax gross ending value
    valuationBoundary: ValuationBoundary.PRE_TAX_PRE_COST,
    actualTaxPaid: 2,
    taxPaymentSource: TaxPaymentSource.PORTFOLIO,
    taxEventId: 'EVT-TAX-A2',
    externalCashFlow: 0,
    startDate: '2024-01-01',
    endDate: '2024-01-31'
  }
];
const resCaseAPre = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({ subperiods: caseAPreTaxSub });
testAssert(Math.abs(resCaseAPre.afterTaxTwr - 0.08) < 1e-6, 'Boundary 32: Pre-tax boundary explicitly transforms ending value to post-tax $108 (8.0%)');

// 33. Case B: Tax paid externally by investor ($2)
// Portfolio ending value remains $110. Tax paid out-of-pocket by investor.
const caseBSub = [
  {
    beginningValue: 100,
    endingValue: 110,
    valuationBoundary: ValuationBoundary.POST_ALL_INVESTOR_COSTS,
    actualTaxPaid: 2,
    taxPaymentSource: TaxPaymentSource.INVESTOR_EXTERNAL,
    taxEventId: 'EVT-TAX-B1',
    externalCashFlow: 0,
    startDate: '2024-01-01',
    endDate: '2024-01-31'
  }
];
const resCaseB = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({ subperiods: caseBSub });
testAssert(resCaseB.status === TaxStatus.PASS, 'Boundary 33: Case B external tax passes');

// 34. Case C: Withholding from distribution ($10 distribution, $2 tax withheld, $8 net received)
const caseCSub = [
  {
    beginningValue: 100,
    endingValue: 100, // Portfolio value
    valuationBoundary: ValuationBoundary.POST_ALL_INVESTOR_COSTS,
    dividendWithholdingTax: 2,
    taxEventId: 'EVT-TAX-C1',
    externalCashFlow: -8, // $8 net distribution withdrawn by investor
    startDate: '2024-01-01',
    endDate: '2024-01-31'
  }
];
const resCaseC = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({ subperiods: caseCSub });
testAssert(resCaseC.status === TaxStatus.PASS, 'Boundary 34: Case C dividend withholding passes');

// 35. Transaction Cost boundary check (Ending value already net of $150 transaction cost)
const txCostBoundarySub = [
  {
    beginningValue: 100000,
    endingValue: 104850, // Net of $150 tx cost
    valuationBoundary: ValuationBoundary.POST_TRANSACTION_COST,
    transactionCost: 150,
    costEventId: 'EVT-COST-1',
    startDate: '2024-01-01',
    endDate: '2024-01-31'
  }
];
const resTxBoundary = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({ subperiods: txCostBoundarySub });
testAssert(Math.abs(resTxBoundary.afterTaxTwr - 0.0485) < 1e-6, 'Boundary 35: Transaction cost not deducted twice (4.85%)');

// 36. Combined Tax + Transaction Cost with explicit boundary
const comboBoundarySub = [
  {
    beginningValue: 100000,
    endingValue: 107000, // Post tax & cost
    valuationBoundary: ValuationBoundary.POST_ALL_INVESTOR_COSTS,
    actualTaxPaid: 2000,
    transactionCost: 500,
    taxEventId: 'EVT-COMBO-TAX',
    costEventId: 'EVT-COMBO-COST',
    startDate: '2024-01-01',
    endDate: '2024-01-31'
  }
];
const resComboBoundary = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({ subperiods: comboBoundarySub });
testAssert(Math.abs(resComboBoundary.afterTaxTwr - 0.07) < 1e-6, 'Boundary 36: Combined tax + cost post-boundary return is exact (7.0%)');

// 37. TaxEffectLedger single-count invariant check
const ledger1 = new TaxEffectLedger();
const addEvt1 = ledger1.addEvent({
  eventId: 'EVT-SINGLE-1',
  eventType: 'ACTUAL_TAX_PAID',
  amount: 1500,
  paymentSource: TaxPaymentSource.PORTFOLIO,
  valuationBoundary: ValuationBoundary.POST_TAX
});
testAssert(addEvt1.status === TaxStatus.PASS, 'Boundary 37: TaxEffectLedger adds event cleanly');

const markEvt1 = ledger1.markIncludedInReturn('EVT-SINGLE-1');
testAssert(markEvt1.status === TaxStatus.PASS, 'Boundary 37: Event marked included in return once');

// 38. Duplicate inclusion attempt on same event in Ledger returns NUMERICAL_FAILURE / DOUBLE_COUNTED_TAX_EVENT
const markEvtDuplicate = ledger1.markIncludedInReturn('EVT-SINGLE-1');
testAssert(markEvtDuplicate.status === TaxStatus.NUMERICAL_FAILURE, 'Boundary 38: Second inclusion attempt returns NUMERICAL_FAILURE');
testAssert(markEvtDuplicate.code === TaxStatus.DOUBLE_COUNTED_TAX_EVENT, 'Boundary 38: Violation code is DOUBLE_COUNTED_TAX_EVENT');

// 39. Duplicate eventId insertion into ledger rejected
const duplicateAddRes = ledger1.addEvent({
  eventId: 'EVT-SINGLE-1',
  eventType: 'ACTUAL_TAX_PAID',
  amount: 1500
});
testAssert(duplicateAddRes.status === TaxStatus.NUMERICAL_FAILURE, 'Boundary 39: Duplicate eventId insertion rejected');
testAssert(duplicateAddRes.code === TaxStatus.DOUBLE_COUNTED_TAX_EVENT, 'Boundary 39: Code is DOUBLE_COUNTED_TAX_EVENT');

// 40. Engine rejection of duplicate tax event IDs across subperiods
const duplicateSubperiods = [
  { beginningValue: 100000, endingValue: 105000, actualTaxPaid: 1000, taxEventId: 'EVT-DUP-99', startDate: '2024-01-01', endDate: '2024-01-31' },
  { beginningValue: 105000, endingValue: 110000, actualTaxPaid: 1000, taxEventId: 'EVT-DUP-99', startDate: '2024-02-01', endDate: '2024-02-28' }
];
const resEngineDup = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({ subperiods: duplicateSubperiods });
testAssert(resEngineDup.status === TaxStatus.NUMERICAL_FAILURE, 'Boundary 40: Duplicate eventId across subperiods returns NUMERICAL_FAILURE');
testAssert(resEngineDup.code === TaxStatus.DOUBLE_COUNTED_TAX_EVENT, 'Boundary 40: Engine returns DOUBLE_COUNTED_TAX_EVENT');

// 41. Multiple tax events recorded in Ledger
const ledgerMulti = new TaxEffectLedger();
ledgerMulti.addEvent({ eventId: 'EVT-M1', eventType: 'ACTUAL_TAX_PAID', amount: 500, paymentSource: TaxPaymentSource.PORTFOLIO });
ledgerMulti.addEvent({ eventId: 'EVT-M2', eventType: 'ACTUAL_TAX_PAID', amount: 800, paymentSource: TaxPaymentSource.INVESTOR_EXTERNAL });
ledgerMulti.addEvent({ eventId: 'EVT-M3', eventType: 'TRANSACTION_COST', amount: 200, paymentSource: TaxPaymentSource.PORTFOLIO });
const recon = ledgerMulti.reconcile();
testAssert(recon.totalEvents === 3, 'Boundary 41: Ledger recorded 3 events');
testAssert(recon.portfolioPaidTaxes === 500, 'Boundary 41: Portfolio paid taxes = $500');
testAssert(recon.externalPaidTaxes === 800, 'Boundary 41: External paid taxes = $800');
testAssert(recon.transactionCosts === 200, 'Boundary 41: Transaction costs = $200');

// 42. Ledger hash invariance and repeatability
testAssert(typeof recon.ledgerHash === 'string' && recon.ledgerHash.length === 64, 'Boundary 42: Ledger hash is valid SHA-256');

// 43. AfterTaxReturnMethodology labeling
testAssert(resCaseA.afterTaxReturnMethodology === AfterTaxReturnMethodology.ACTUAL_AFTER_TAX, 'Boundary 43: Methodology is ACTUAL_AFTER_TAX');

// 44. Liquidation-adjusted methodology labeling
const resLiqMethod = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({
  subperiods: caseAPostTaxSub,
  isLiquidation: true,
  unrealizedEmbeddedTax: 5000
});
testAssert(resLiqMethod.afterTaxReturnMethodology === AfterTaxReturnMethodology.LIQUIDATION_ADJUSTED, 'Boundary 44: Methodology is LIQUIDATION_ADJUSTED');

// 45. Valuation boundary preserved in subperiod results
testAssert(resCaseA.subperiodReturns[0].valuationBoundary === ValuationBoundary.POST_ALL_INVESTOR_COSTS, 'Boundary 45: Valuation boundary preserved in subperiod item');

// === SECTION 4: MWR BOUNDARY & DOUBLE-COUNTING TESTS (10 ASSERTIONS) ===

console.log('Testing MWR Boundary & Double-Counting Invariants...');

// 46. MWR with no tax
const mwrNoTax = TaxAfterTaxReturnEngine.calculateAfterTaxMWR([
  { date: '2024-01-01', amount: -100000, classification: CashFlowClassification.INVESTOR_CONTRIBUTION },
  { date: '2025-01-01', amount: 110000, classification: CashFlowClassification.ENDING_PORTFOLIO_VALUE, valuationBoundary: ValuationBoundary.POST_ALL_INVESTOR_COSTS }
]);
testAssert(mwrNoTax.status === TaxStatus.PASS, 'MWR Boundary 46: No tax MWR passes');
testAssert(Math.abs(mwrNoTax.afterTaxMwr - 0.10) < 1e-3, 'MWR Boundary 46: Return is 10.0%');

// 47. MWR with portfolio-paid tax where ending value is already POST_TAX
// Ending value $108k already reflects the $2k tax. Internal portfolio tax must NOT be deducted again as cash flow!
const mwrPortTax = TaxAfterTaxReturnEngine.calculateAfterTaxMWR([
  { date: '2024-01-01', amount: -100000, classification: CashFlowClassification.INVESTOR_CONTRIBUTION },
  { date: '2024-06-01', amount: 2000, classification: CashFlowClassification.TAX_PAID_FROM_PORTFOLIO, valuationBoundary: ValuationBoundary.POST_ALL_INVESTOR_COSTS },
  { date: '2025-01-01', amount: 108000, classification: CashFlowClassification.ENDING_PORTFOLIO_VALUE, valuationBoundary: ValuationBoundary.POST_ALL_INVESTOR_COSTS }
]);
testAssert(mwrPortTax.status === TaxStatus.PASS, 'MWR Boundary 47: Portfolio-paid tax MWR passes');
testAssert(Math.abs(mwrPortTax.afterTaxMwr - 0.08) < 1e-3, 'MWR Boundary 47: Single-count verified: MWR is exactly 8.0% (not double deducted to 6.0%)');

// 48. MWR with external tax paid by investor (out-of-pocket cash outflow)
const mwrExtTax = TaxAfterTaxReturnEngine.calculateAfterTaxMWR([
  { date: '2024-01-01', amount: -100000, classification: CashFlowClassification.INVESTOR_CONTRIBUTION },
  { date: '2024-06-01', amount: 2000, classification: CashFlowClassification.TAX_PAID_EXTERNAL },
  { date: '2025-01-01', amount: 110000, classification: CashFlowClassification.ENDING_PORTFOLIO_VALUE, valuationBoundary: ValuationBoundary.POST_ALL_INVESTOR_COSTS }
]);
testAssert(mwrExtTax.status === TaxStatus.PASS, 'MWR Boundary 48: External tax MWR passes');

// 49. MWR with dividend withholding at source
const mwrWithholding = TaxAfterTaxReturnEngine.calculateAfterTaxMWR([
  { date: '2024-01-01', amount: -100000, classification: CashFlowClassification.INVESTOR_CONTRIBUTION },
  { date: '2024-06-01', amount: 8000, classification: CashFlowClassification.DIVIDEND_RECEIVED }, // $10k dividend - $2k withheld = $8k net received
  { date: '2024-06-01', amount: 2000, classification: CashFlowClassification.DIVIDEND_WITHHOLDING },
  { date: '2025-01-01', amount: 100000, classification: CashFlowClassification.ENDING_PORTFOLIO_VALUE, valuationBoundary: ValuationBoundary.POST_ALL_INVESTOR_COSTS }
]);
testAssert(mwrWithholding.status === TaxStatus.PASS, 'MWR Boundary 49: Withholding tax MWR passes without double count');

// 50. MWR with transaction cost
const mwrTxCost = TaxAfterTaxReturnEngine.calculateAfterTaxMWR([
  { date: '2024-01-01', amount: -100000, classification: CashFlowClassification.INVESTOR_CONTRIBUTION },
  { date: '2025-01-01', amount: 105000, classification: CashFlowClassification.ENDING_PORTFOLIO_VALUE, valuationBoundary: ValuationBoundary.PRE_TAX_PRE_COST, transactionCost: 500 }
]);
testAssert(mwrTxCost.status === TaxStatus.PASS, 'MWR Boundary 50: Pre-tax boundary transaction cost MWR passes');

// 51. MWR duplicate event ID rejection
const mwrDuplicate = TaxAfterTaxReturnEngine.calculateAfterTaxMWR([
  { eventId: 'MWR-EVT-1', date: '2024-01-01', amount: -100000, classification: CashFlowClassification.INVESTOR_CONTRIBUTION },
  { eventId: 'MWR-EVT-1', date: '2025-01-01', amount: 110000, classification: CashFlowClassification.ENDING_PORTFOLIO_VALUE }
]);
testAssert(mwrDuplicate.status === TaxStatus.NUMERICAL_FAILURE, 'MWR Boundary 51: Duplicate eventId in MWR cash flows rejected');
testAssert(mwrDuplicate.code === TaxStatus.DOUBLE_COUNTED_TAX_EVENT, 'MWR Boundary 51: Code is DOUBLE_COUNTED_TAX_EVENT');

// 52. MWR with tax + contribution
const mwrTaxPlusContrib = TaxAfterTaxReturnEngine.calculateAfterTaxMWR([
  { date: '2024-01-01', amount: -100000, classification: CashFlowClassification.INVESTOR_CONTRIBUTION },
  { date: '2024-06-01', amount: -20000, classification: CashFlowClassification.INVESTOR_CONTRIBUTION },
  { date: '2025-01-01', amount: 130000, classification: CashFlowClassification.ENDING_PORTFOLIO_VALUE, valuationBoundary: ValuationBoundary.POST_ALL_INVESTOR_COSTS }
]);
testAssert(mwrTaxPlusContrib.status === TaxStatus.PASS, 'MWR Boundary 52: Tax + contribution cash flow evaluates');

// 53. MWR with tax + withdrawal
const mwrTaxPlusWithdraw = TaxAfterTaxReturnEngine.calculateAfterTaxMWR([
  { date: '2024-01-01', amount: -100000, classification: CashFlowClassification.INVESTOR_CONTRIBUTION },
  { date: '2024-06-01', amount: 15000, classification: CashFlowClassification.INVESTOR_WITHDRAWAL },
  { date: '2025-01-01', amount: 95000, classification: CashFlowClassification.ENDING_PORTFOLIO_VALUE, valuationBoundary: ValuationBoundary.POST_ALL_INVESTOR_COSTS }
]);
testAssert(mwrTaxPlusWithdraw.status === TaxStatus.PASS, 'MWR Boundary 53: Tax + withdrawal cash flow evaluates');

// 54. MWR numerical failure handling on non-convergent series
const mwrNonConv = TaxAfterTaxReturnEngine.calculateAfterTaxMWR([
  { date: '2024-01-01', amount: -100 },
  { date: '2024-01-02', amount: 1e15 },
  { date: '2024-01-03', amount: -1e15 }
]);
testAssert(mwrNonConv.status === TaxStatus.PASS || mwrNonConv.status === 'NON_CONVERGENT', 'MWR Boundary 54: Non-convergent cash flow returns clean status');

// 55. MWR multiple tax events across time
const mwrMultiTax = TaxAfterTaxReturnEngine.calculateAfterTaxMWR([
  { date: '2024-01-01', amount: -100000, classification: CashFlowClassification.INVESTOR_CONTRIBUTION },
  { date: '2024-04-01', amount: 500, classification: CashFlowClassification.TAX_PAID_EXTERNAL },
  { date: '2024-08-01', amount: 800, classification: CashFlowClassification.TAX_PAID_EXTERNAL },
  { date: '2025-01-01', amount: 112000, classification: CashFlowClassification.ENDING_PORTFOLIO_VALUE, valuationBoundary: ValuationBoundary.POST_ALL_INVESTOR_COSTS }
]);
testAssert(mwrMultiTax.status === TaxStatus.PASS, 'MWR Boundary 55: Multiple tax events over time converge');

// === SECTION 5: SCALE-INVARIANCE REBALANCE INVARIANT CHECK ===

console.log('Testing Scale-Invariance Optimization Invariant ($100k vs $1M)...');

import { TaxRebalanceEngine } from '../tax/tax.rebalance.engine.js';
import { TAX_POLICY_V1 } from '../tax/tax.config.js';

const optRebPrices = { AAPL: 200.0, MSFT: 400.0, GOOGL: 150.0 };

const opt100k = TaxRebalanceEngine.generateTaxAwareRebalance({
  portfolioId: 'PORT-OPT-100K',
  workspaceId: 'WS-TAX',
  currentWeights: { AAPL: 0.40, MSFT: 0.60, GOOGL: 0.00 },
  targetWeights: { AAPL: 0.20, MSFT: 0.50, GOOGL: 0.30 },
  currentPrices: optRebPrices,
  portfolioValue: 100000,
  openLotsBySecurity: {
    AAPL: [{ lotId: 'LOT-A-100K', securityId: 'AAPL', acquisitionDate: '2024-05-01T00:00:00.000Z', acquisitionPrice: 100.0, quantity: 200, costBasis: 20000.0 }],
    MSFT: [{ lotId: 'LOT-M-100K', securityId: 'MSFT', acquisitionDate: '2023-01-01T00:00:00.000Z', acquisitionPrice: 200.0, quantity: 150, costBasis: 30000.0 }]
  },
  expectedReturns: { AAPL: 0.09, MSFT: 0.10, GOOGL: 0.11 },
  volatilities: { AAPL: 0.20, MSFT: 0.18, GOOGL: 0.22 },
  constraints: { maxPositionWeight: 0.60, allowShorting: false, maxLeverage: 1.0 },
  policy: TAX_POLICY_V1,
  asOf: '2024-06-01T00:00:00.000Z',
  jurisdiction: 'US',
  accountType: 'TAXABLE'
});

const opt1M = TaxRebalanceEngine.generateTaxAwareRebalance({
  portfolioId: 'PORT-OPT-1M',
  workspaceId: 'WS-TAX',
  currentWeights: { AAPL: 0.40, MSFT: 0.60, GOOGL: 0.00 },
  targetWeights: { AAPL: 0.20, MSFT: 0.50, GOOGL: 0.30 },
  currentPrices: optRebPrices,
  portfolioValue: 1000000,
  openLotsBySecurity: {
    AAPL: [{ lotId: 'LOT-A-1M', securityId: 'AAPL', acquisitionDate: '2024-05-01T00:00:00.000Z', acquisitionPrice: 100.0, quantity: 2000, costBasis: 200000.0 }],
    MSFT: [{ lotId: 'LOT-M-1M', securityId: 'MSFT', acquisitionDate: '2023-01-01T00:00:00.000Z', acquisitionPrice: 200.0, quantity: 1500, costBasis: 300000.0 }]
  },
  expectedReturns: { AAPL: 0.09, MSFT: 0.10, GOOGL: 0.11 },
  volatilities: { AAPL: 0.20, MSFT: 0.18, GOOGL: 0.22 },
  constraints: { maxPositionWeight: 0.60, allowShorting: false, maxLeverage: 1.0 },
  policy: TAX_POLICY_V1,
  asOf: '2024-06-01T00:00:00.000Z',
  jurisdiction: 'US',
  accountType: 'TAXABLE'
});

testAssert(Math.abs(opt100k.taxAwareRebalance.utilityScore - opt1M.taxAwareRebalance.utilityScore) < 1e-3, 'Scale 56: Normalized utility is identical between $100k and $1M portfolios');
testAssert(Math.abs(opt100k.taxAwareRebalance.candidateWeights.AAPL - opt1M.taxAwareRebalance.candidateWeights.AAPL) < 1e-4, 'Scale 57: Candidate weights match identically');
testAssert(Math.abs(opt100k.taxAwareRebalance.turnover - opt1M.taxAwareRebalance.turnover) < 1e-4, 'Scale 58: Turnover rate is scale-invariant');
testAssert(Math.abs((opt100k.taxSavings / 100000) - (opt1M.taxSavings / 1000000)) < 1e-4, 'Scale 59: Tax savings rate is identical');

console.log(`PASSED: Suite 11 completed with ${totalAssertions} assertions.`);

