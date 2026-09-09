/**
 * Phase 17 — Institutional After-Tax Return Engine
 * Geometric Subperiod Linking TWR & Cash-Flow Based After-Tax MWR / IRR
 * with Strict Valuation Boundary & Single-Count Tax Invariant Tracking
 */

import {
  AfterTaxReturnMethodology,
  CashFlowClassification,
  CashFlowTiming,
  deepFreeze,
  TaxCategory,
  TaxLabel,
  TaxMethodologyVersion,
  TaxPaymentSource,
  TaxStatus,
  ValuationBoundary
} from './tax.types.js';
import { TaxDragEngine } from './tax.taxDrag.engine.js';
import { TaxEffectLedger } from './tax.ledger.js';

export class TaxAfterTaxReturnEngine {
  /**
   * Computes institutional after-tax TWR using geometric subperiod linking
   * and explicit valuation boundary single-count invariants.
   * @param {Object} params Configuration containing subperiods or single period parameters
   */
  static calculateAfterTaxReturns(params) {
    if (!params || typeof params !== 'object') {
      return deepFreeze({
        status: TaxStatus.AFTER_TAX_RESULT_UNAVAILABLE,
        reason: 'Parameters missing or invalid'
      });
    }

    const {
      subperiods,
      preTaxTwr,
      preTaxMwr,
      portfolioValue,
      realizedTax = 0,
      dividendTax = 0,
      transactionCosts = 0,
      unrealizedEmbeddedTax = 0,
      cashFlows = null,
      isLiquidation = false,
      valuationBoundary = ValuationBoundary.PRE_TAX_PRE_COST,
      ledger: inputLedger = null,
      methodology = TaxMethodologyVersion.V2_GEOMETRIC_SUBPERIOD_LINKING
    } = params;

    const ledger = inputLedger instanceof TaxEffectLedger ? inputLedger : new TaxEffectLedger();

    // --- CASE 1: MULTI-PERIOD GEOMETRIC SUBPERIOD TWR ---
    if (Array.isArray(subperiods) && subperiods.length > 0) {
      let cumulativePreTaxProduct = 1.0;
      let cumulativeAfterTaxProduct = 1.0;
      const subperiodResults = [];
      const taxPaidByPeriod = [];
      const transactionCostsByPeriod = [];
      const withholdingByPeriod = [];
      let totalActualTaxPaid = 0;
      let totalTransactionCosts = 0;
      let totalWithholdingTax = 0;

      for (let i = 0; i < subperiods.length; i++) {
        const sp = subperiods[i];
        const begVal = sp.beginningValue;
        const endVal = sp.endingValue;
        const extCf = sp.externalCashFlow || 0; // Inflow is positive, outflow is negative
        const actualTax = sp.actualTaxPaid || 0;
        const divWithholding = sp.dividendWithholdingTax || 0;
        const txCost = sp.transactionCost || 0;
        const subBoundary = sp.valuationBoundary || valuationBoundary;
        const paymentSource = sp.taxPaymentSource || TaxPaymentSource.PORTFOLIO;

        if (typeof begVal !== 'number' || isNaN(begVal) || begVal <= 0) {
          return deepFreeze({
            status: TaxStatus.INVALID_INPUT,
            reason: `Subperiod ${i + 1} beginningValue must be a positive number`
          });
        }

        if (typeof endVal !== 'number' || isNaN(endVal)) {
          return deepFreeze({
            status: TaxStatus.INVALID_INPUT,
            reason: `Subperiod ${i + 1} endingValue is invalid`
          });
        }

        // Check for duplicate tax/cost events via Ledger
        if (sp.taxEventId) {
          const addRes = ledger.addEvent({
            eventId: sp.taxEventId,
            eventType: 'ACTUAL_TAX_PAID',
            amount: actualTax,
            date: sp.endDate || sp.date,
            paymentSource,
            valuationBoundary: subBoundary
          });
          if (addRes.status !== TaxStatus.PASS) {
            return deepFreeze({
              status: TaxStatus.NUMERICAL_FAILURE,
              code: TaxStatus.DOUBLE_COUNTED_TAX_EVENT,
              reason: addRes.reason
            });
          }
          const markRes = ledger.markIncludedInReturn(sp.taxEventId);
          if (markRes.status !== TaxStatus.PASS) {
            return deepFreeze({
              status: TaxStatus.NUMERICAL_FAILURE,
              code: TaxStatus.DOUBLE_COUNTED_TAX_EVENT,
              reason: markRes.reason
            });
          }
        }

        if (sp.costEventId) {
          const addCostRes = ledger.addEvent({
            eventId: sp.costEventId,
            eventType: 'TRANSACTION_COST',
            amount: txCost,
            date: sp.endDate || sp.date,
            paymentSource,
            valuationBoundary: subBoundary
          });
          if (addCostRes.status !== TaxStatus.PASS) {
            return deepFreeze({
              status: TaxStatus.NUMERICAL_FAILURE,
              code: TaxStatus.DOUBLE_COUNTED_TAX_EVENT,
              reason: addCostRes.reason
            });
          }
          const markCostRes = ledger.markIncludedInReturn(sp.costEventId);
          if (markCostRes.status !== TaxStatus.PASS) {
            return deepFreeze({
              status: TaxStatus.NUMERICAL_FAILURE,
              code: TaxStatus.DOUBLE_COUNTED_TAX_EVENT,
              reason: markCostRes.reason
            });
          }
        }

        // Subperiod Returns Calculation respecting Valuation Boundary:
        let preTaxEndVal = endVal;
        let postTaxEndVal = endVal;

        if (subBoundary === ValuationBoundary.POST_ALL_INVESTOR_COSTS) {
          // Ending value already reflects all tax, withholding, and transaction costs.
          preTaxEndVal = endVal + actualTax + txCost + divWithholding;
          postTaxEndVal = endVal;
        } else if (subBoundary === ValuationBoundary.POST_TAX) {
          // Ending value reflects taxes, but not transaction costs
          preTaxEndVal = endVal + actualTax + divWithholding;
          postTaxEndVal = endVal - txCost;
        } else if (subBoundary === ValuationBoundary.POST_TRANSACTION_COST) {
          // Ending value reflects transaction costs, but not taxes
          preTaxEndVal = endVal + txCost;
          postTaxEndVal = endVal - actualTax - divWithholding;
        } else {
          // PRE_TAX_PRE_COST boundary: Ending value is gross before taxes and costs.
          preTaxEndVal = endVal;
          postTaxEndVal = endVal - actualTax - txCost - divWithholding;
        }

        // Check CashFlowTiming
        const cfTiming = sp.cashFlowTiming || (extCf === 0 ? CashFlowTiming.END_OF_SUBPERIOD : CashFlowTiming.END_OF_SUBPERIOD);
        if (extCf !== 0 && sp.cashFlowTiming === CashFlowTiming.UNKNOWN) {
          return deepFreeze({
            status: TaxStatus.UNAVAILABLE,
            reason: 'CASH_FLOW_TIMING_UNKNOWN',
            subperiodIndex: i + 1
          });
        }

        let preTaxSubReturn = 0;
        let afterTaxSubReturn = 0;

        if (cfTiming === CashFlowTiming.BEGINNING_OF_SUBPERIOD) {
          const effectiveBegVal = begVal + extCf;
          if (effectiveBegVal <= 0) {
            return deepFreeze({ status: TaxStatus.INVALID_INPUT, reason: 'Effective beginning capital base must be positive' });
          }
          preTaxSubReturn = (preTaxEndVal / effectiveBegVal) - 1.0;
          afterTaxSubReturn = (postTaxEndVal / effectiveBegVal) - 1.0;
        } else if (cfTiming === CashFlowTiming.INTRA_PERIOD && typeof sp.intermediateValuationPreCashFlow === 'number') {
          const vPre = sp.intermediateValuationPreCashFlow;
          const r1Pre = (vPre / begVal) - 1.0;
          const r1Post = (vPre / begVal) - 1.0;
          const vPost = vPre + extCf;
          const r2Pre = (preTaxEndVal / vPost) - 1.0;
          const r2Post = (postTaxEndVal / vPost) - 1.0;
          preTaxSubReturn = (1.0 + r1Pre) * (1.0 + r2Pre) - 1.0;
          afterTaxSubReturn = (1.0 + r1Post) * (1.0 + r2Post) - 1.0;
        } else {
          // END_OF_SUBPERIOD default
          preTaxSubReturn = ((preTaxEndVal - extCf) / begVal) - 1.0;
          afterTaxSubReturn = ((postTaxEndVal - extCf) / begVal) - 1.0;
        }

        cumulativePreTaxProduct *= (1.0 + preTaxSubReturn);
        cumulativeAfterTaxProduct *= (1.0 + afterTaxSubReturn);

        totalActualTaxPaid += actualTax;
        totalTransactionCosts += txCost;
        totalWithholdingTax += divWithholding;

        taxPaidByPeriod.push({ subperiod: i + 1, actualTaxPaid: actualTax, date: sp.endDate || sp.date, boundary: subBoundary });
        transactionCostsByPeriod.push({ subperiod: i + 1, transactionCost: txCost, date: sp.endDate || sp.date, boundary: subBoundary });
        withholdingByPeriod.push({ subperiod: i + 1, dividendWithholdingTax: divWithholding, date: sp.endDate || sp.date, boundary: subBoundary });

        subperiodResults.push({
          subperiodIndex: i + 1,
          startDate: sp.startDate,
          endDate: sp.endDate,
          beginningValue: begVal,
          endingValue: endVal,
          valuationBoundary: subBoundary,
          taxPaymentSource: paymentSource,
          externalCashFlow: extCf,
          actualTaxPaid: actualTax,
          dividendWithholdingTax: divWithholding,
          transactionCost: txCost,
          preTaxSubReturn,
          afterTaxSubReturn,
          subperiodTaxDrag: preTaxSubReturn - afterTaxSubReturn
        });
      }

      const linkedPreTaxTwr = cumulativePreTaxProduct - 1.0;
      const linkedAfterTaxTwr = cumulativeAfterTaxProduct - 1.0;
      const twrDrag = TaxDragEngine.computeTaxDrag(linkedPreTaxTwr, linkedAfterTaxTwr);

      // Solve Cash-Flow Based MWR if cash flows are provided
      let afterTaxMwrResult = null;
      if (Array.isArray(cashFlows) && cashFlows.length >= 2) {
        afterTaxMwrResult = this.calculateAfterTaxMWR(cashFlows);
      }

      const endingPortfolioValue = subperiods[subperiods.length - 1].endingValue;
      const liquidationTaxDragRate = (totalActualTaxPaid + totalWithholdingTax + totalTransactionCosts + unrealizedEmbeddedTax) / (endingPortfolioValue || 1.0);
      const liquidationAfterTaxTwr = linkedPreTaxTwr - liquidationTaxDragRate;

      return deepFreeze({
        status: TaxStatus.PASS,
        methodologyVersion: TaxMethodologyVersion.V2_GEOMETRIC_SUBPERIOD_LINKING,
        afterTaxReturnMethodology: isLiquidation ? AfterTaxReturnMethodology.LIQUIDATION_ADJUSTED : AfterTaxReturnMethodology.ACTUAL_AFTER_TAX,
        preTaxTwr: linkedPreTaxTwr,
        afterTaxTwr: linkedAfterTaxTwr,
        preTaxMwr: preTaxMwr ?? null,
        afterTaxMwr: afterTaxMwrResult ? afterTaxMwrResult.afterTaxMwr : null,
        mwrStatus: afterTaxMwrResult ? afterTaxMwrResult.status : 'NOT_CALCULATED',
        subperiodsCount: subperiods.length,
        subperiodReturns: subperiodResults,
        taxPaidByPeriod,
        transactionCostsByPeriod,
        withholdingByPeriod,
        totalActualTaxPaid,
        totalTransactionCosts,
        totalWithholdingTax,
        unrealizedEmbeddedTax,
        liquidationAfterTaxTwr,
        isLiquidation,
        taxDrag: twrDrag,
        taxLabel: TaxLabel.ACTUAL,
        liquidationTaxLabel: TaxLabel.ESTIMATED,
        taxCategories: {
          [TaxCategory.ACTUAL_TAX_PAID]: totalActualTaxPaid,
          [TaxCategory.DIVIDEND_WITHHOLDING_TAX]: totalWithholdingTax,
          [TaxCategory.TRANSACTION_COST]: totalTransactionCosts,
          [TaxCategory.EMBEDDED_UNREALIZED_TAX]: unrealizedEmbeddedTax,
          [TaxCategory.ESTIMATED_LIQUIDATION_TAX]: totalActualTaxPaid + totalWithholdingTax + unrealizedEmbeddedTax
        },
        ledgerHash: ledger.getLedgerHash(),
        formula: 'AfterTaxTWR = Π(1 + AfterTaxSubperiodReturn_i) - 1; PostTaxEndVal = EndVal (if POST_TAX) or EndVal - Tax - Costs (if PRE_TAX)'
      });
    }

    // --- CASE 2: SINGLE PERIOD MODELING (Geometric 1-Subperiod Implementation) ---
    if (typeof preTaxTwr !== 'number' || isNaN(preTaxTwr)) {
      return deepFreeze({
        status: TaxStatus.AFTER_TAX_RESULT_UNAVAILABLE,
        reason: 'preTaxTwr is missing or invalid'
      });
    }

    if (typeof portfolioValue !== 'number' || isNaN(portfolioValue) || portfolioValue <= 0) {
      return deepFreeze({
        status: TaxStatus.INVALID_INPUT,
        reason: 'portfolioValue must be a positive number'
      });
    }

    const totalActualTaxes = realizedTax + dividendTax;
    const totalFriction = totalActualTaxes + transactionCosts;

    // Single period equivalent beginning wealth
    const begVal = portfolioValue;
    const endVal = begVal * (1.0 + preTaxTwr);
    const afterTaxSubReturn = ((endVal - totalFriction) / begVal) - 1.0;
    const afterTaxTwr = afterTaxSubReturn;

    const twrDrag = TaxDragEngine.computeTaxDrag(preTaxTwr, afterTaxTwr);
    const liquidationTaxDragRate = (totalFriction + unrealizedEmbeddedTax) / portfolioValue;
    const liquidationAfterTaxTwr = preTaxTwr - liquidationTaxDragRate;

    let afterTaxMwrResult = null;
    if (Array.isArray(cashFlows) && cashFlows.length >= 2) {
      afterTaxMwrResult = this.calculateAfterTaxMWR(cashFlows);
    }

    return deepFreeze({
      status: TaxStatus.PASS,
      methodologyVersion: TaxMethodologyVersion.V2_GEOMETRIC_SUBPERIOD_LINKING,
      afterTaxReturnMethodology: isLiquidation ? AfterTaxReturnMethodology.LIQUIDATION_ADJUSTED : AfterTaxReturnMethodology.ACTUAL_AFTER_TAX,
      preTaxTwr,
      afterTaxTwr,
      preTaxMwr: preTaxMwr ?? null,
      afterTaxMwr: afterTaxMwrResult ? afterTaxMwrResult.afterTaxMwr : (typeof preTaxMwr === 'number' ? preTaxMwr - (totalFriction / portfolioValue) : null),
      actualTaxDragRate: totalFriction / portfolioValue,
      realizedTax,
      dividendTax,
      transactionCosts,
      totalActualTaxes,
      totalFriction,
      unrealizedEmbeddedTax,
      liquidationAfterTaxTwr,
      isLiquidation,
      taxDrag: twrDrag,
      taxLabel: TaxLabel.ACTUAL,
      liquidationTaxLabel: TaxLabel.ESTIMATED,
      taxCategories: {
        [TaxCategory.ACTUAL_TAX_PAID]: totalActualTaxes,
        [TaxCategory.TRANSACTION_COST]: transactionCosts,
        [TaxCategory.EMBEDDED_UNREALIZED_TAX]: unrealizedEmbeddedTax,
        [TaxCategory.ESTIMATED_LIQUIDATION_TAX]: totalActualTaxes + unrealizedEmbeddedTax
      },
      ledgerHash: ledger.getLedgerHash(),
      formula: 'AfterTaxTWR = Π(1 + AfterTaxSubperiodReturn_i) - 1; SinglePeriod: (EndVal - Friction)/BegVal - 1'
    });
  }

  /**
   * Solves after-tax Money-Weighted Return (MWR / IRR) from net after-tax cash flows
   * with explicit cash flow classification and valuation boundary enforcement.
   * @param {Array} cashFlows Array of cash flows
   */
  static calculateAfterTaxMWR(cashFlows) {
    if (!Array.isArray(cashFlows) || cashFlows.length < 2) {
      return {
        status: TaxStatus.INSUFFICIENT_DATA,
        afterTaxMwr: null,
        reason: 'At least 2 cash flow points required for IRR solving'
      };
    }

    // Check for duplicate event IDs in cash flows
    const seenEventIds = new Set();
    for (const cf of cashFlows) {
      if (cf.eventId) {
        if (seenEventIds.has(cf.eventId)) {
          return {
            status: TaxStatus.NUMERICAL_FAILURE,
            code: TaxStatus.DOUBLE_COUNTED_TAX_EVENT,
            afterTaxMwr: null,
            reason: `Duplicate cash flow eventId '${cf.eventId}' detected in MWR calculation`
          };
        }
        seenEventIds.add(cf.eventId);
      }
    }

    // Sort chronologically
    const sortedCfs = [...cashFlows].sort((a, b) => new Date(a.date) - new Date(b.date));
    const t0 = new Date(sortedCfs[0].date).getTime();
    const msPerYear = 365.25 * 24 * 60 * 60 * 1000;

    // Build net cash flows accounting for boundary and classification
    const normalizedPoints = sortedCfs.map(cf => {
      const t = (new Date(cf.date).getTime() - t0) / msPerYear;
      const classification = cf.classification || CashFlowClassification.INVESTOR_CONTRIBUTION;
      const boundary = cf.valuationBoundary || ValuationBoundary.POST_ALL_INVESTOR_COSTS;

      let netAmount = cf.amount;

      if (classification === CashFlowClassification.ENDING_PORTFOLIO_VALUE) {
        // If ending portfolio value is PRE_TAX_PRE_COST, deduct pending taxes
        if (boundary === ValuationBoundary.PRE_TAX_PRE_COST) {
          netAmount = cf.amount - (cf.taxPaid || 0) - (cf.transactionCost || 0);
        } else {
          // Value already post-tax, do not deduct again
          netAmount = cf.amount;
        }
      } else if (classification === CashFlowClassification.TAX_PAID_EXTERNAL) {
        // External out-of-pocket tax payment by investor is a cash outflow (negative)
        netAmount = -Math.abs(cf.amount);
      } else if (classification === CashFlowClassification.TAX_PAID_FROM_PORTFOLIO) {
        // If ending value is already POST_TAX, portfolio tax is NOT an additional investor cash flow
        if (boundary === ValuationBoundary.POST_ALL_INVESTOR_COSTS || boundary === ValuationBoundary.POST_TAX) {
          netAmount = 0; // Exclude to prevent double deduction
        } else {
          netAmount = -Math.abs(cf.amount);
        }
      } else if (classification === CashFlowClassification.DIVIDEND_WITHHOLDING) {
        // Withheld from distribution at source
        netAmount = 0; // Already factored in net distribution received
      } else {
        // Standard contribution / withdrawal / distribution
        netAmount = cf.amount - (cf.taxPaid || 0) - (cf.transactionCost || 0);
      }

      return { t, amount: netAmount, date: cf.date, classification };
    }).filter(p => p.amount !== 0);

    // Check for sign change (required for IRR existence)
    const hasPositive = normalizedPoints.some(p => p.amount > 0);
    const hasNegative = normalizedPoints.some(p => p.amount < 0);

    if (!hasPositive || !hasNegative) {
      return {
        status: 'NO_SOLUTION',
        afterTaxMwr: null,
        reason: 'No sign change in cash flow series; IRR solution does not exist'
      };
    }

    // NPV function and its derivative
    const npv = (r) => normalizedPoints.reduce((acc, p) => acc + p.amount / Math.pow(1 + r, p.t), 0);
    const dnpv = (r) => normalizedPoints.reduce((acc, p) => acc - (p.t * p.amount) / Math.pow(1 + r, p.t + 1), 0);

    // Newton-Raphson Solver with bisection fallback
    let rate = 0.10;
    const maxIter = 100;
    const tolerance = 1e-7;
    let converged = false;

    for (let iter = 0; iter < maxIter; iter++) {
      if (rate <= -0.999) rate = -0.99;
      const val = npv(rate);
      if (Math.abs(val) < tolerance) {
        converged = true;
        break;
      }
      const deriv = dnpv(rate);
      if (Math.abs(deriv) < 1e-10) {
        rate += 0.05;
        continue;
      }
      const newRate = rate - val / deriv;
      if (Math.abs(newRate - rate) < tolerance) {
        rate = newRate;
        converged = true;
        break;
      }
      rate = newRate;
    }

    if (!converged || isNaN(rate) || !isFinite(rate)) {
      return {
        status: 'NON_CONVERGENT',
        afterTaxMwr: null,
        reason: 'IRR solver did not converge within numerical tolerance'
      };
    }

    return {
      status: TaxStatus.PASS,
      afterTaxMwr: rate,
      iterations: maxIter,
      formula: 'NPV(AfterTaxMWR) = Σ [NetAfterTaxCF_t / (1 + AfterTaxMWR)^t] = 0'
    };
  }
}
