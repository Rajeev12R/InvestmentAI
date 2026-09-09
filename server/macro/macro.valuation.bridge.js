/**
 * server/macro/macro.valuation.bridge.js
 * 
 * Phase 22: Macro-to-Valuation Bridge Integration
 * Evaluates valuation adjustments (WACC, terminal growth, multiple impacts) driven by macro shifts.
 * Invariant: Produces MacroAdjustedValuationContext without mutating Phase 2 baseline valuation facts.
 */

import { MacroClassification, deepFreeze } from './macro.types.js';

export class MacroValuationBridge {
  /**
   * Computes macro-adjusted valuation context for a security
   */
  evaluateMacroValuationAdjustment(baseValuation = {}, macroShocks = {}) {
    const baseWacc = typeof baseValuation.wacc === 'number' ? baseValuation.wacc : 0.085;
    const baseTerminalGrowth = typeof baseValuation.terminalGrowthRate === 'number' ? baseValuation.terminalGrowthRate : 0.025;
    const basePriceTarget = typeof baseValuation.priceTarget === 'number' ? baseValuation.priceTarget : 100.0;
    const ticker = (baseValuation.ticker || 'UNKNOWN').toUpperCase();

    const rateShockPct = typeof macroShocks.riskFreeRateDelta === 'number' ? macroShocks.riskFreeRateDelta : 0.0;
    const creditSpreadDeltaPct = typeof macroShocks.creditSpreadDelta === 'number' ? macroShocks.creditSpreadDelta : 0.0;
    const terminalGrowthDeltaPct = typeof macroShocks.terminalGrowthDelta === 'number' ? macroShocks.terminalGrowthDelta : 0.0;

    const waccAdjustment = rateShockPct + creditSpreadDeltaPct;
    const adjustedWacc = Math.max(0.02, baseWacc + waccAdjustment);
    const adjustedTerminalGrowth = Math.max(0.0, baseTerminalGrowth + terminalGrowthDeltaPct);

    // Simplified DCF sensitivity approximation: -1 / (WACC - g) * deltaWacc
    const baseDenominator = Math.max(0.01, baseWacc - baseTerminalGrowth);
    const adjDenominator = Math.max(0.01, adjustedWacc - adjustedTerminalGrowth);
    const valuationMultiplier = baseDenominator / adjDenominator;

    const adjustedPriceTarget = basePriceTarget * valuationMultiplier;
    const priceTargetDeltaPct = (adjustedPriceTarget - basePriceTarget) / basePriceTarget;

    return deepFreeze({
      ticker,
      baselineValuation: {
        wacc: baseWacc,
        terminalGrowthRate: baseTerminalGrowth,
        priceTarget: basePriceTarget,
        classification: MacroClassification.MODEL_ESTIMATE
      },
      macroAdjustments: {
        riskFreeRateDelta: rateShockPct,
        creditSpreadDelta: creditSpreadDeltaPct,
        terminalGrowthDelta: terminalGrowthDeltaPct,
        waccAdjustmentTotal: waccAdjustment
      },
      adjustedValuation: {
        adjustedWacc,
        adjustedTerminalGrowth,
        adjustedPriceTarget,
        priceTargetDeltaPct,
        valuationMultiplier,
        classification: MacroClassification.MODEL_ESTIMATE
      },
      formula: 'AdjustedWACC = BaseWACC + DeltaRf + DeltaCredit; ImpliedPrice = BasePrice * ((BaseWACC - g) / (AdjWACC - Adj_g))',
      rule: 'BASELINE_VALUATION_FACTS_IMMUTABLE_PRESERVED',
      classification: MacroClassification.MODEL_ESTIMATE
    });
  }
}

export const defaultMacroValuationBridge = new MacroValuationBridge();

export function generateMacroValuationAdjustment(baselineValuation = {}, macroContext = {}) {
  const ticker = baselineValuation.ticker || 'UNKNOWN';
  const baselineWacc = typeof baselineValuation.wacc === 'number' ? baselineValuation.wacc : 0.085;
  const baselineEquityValuePerShare = typeof baselineValuation.equityValuePerShare === 'number' ? baselineValuation.equityValuePerShare : (baselineValuation.targetPrice || 100);
  const baselineTargetPrice = typeof baselineValuation.targetPrice === 'number' ? baselineValuation.targetPrice : baselineEquityValuePerShare;

  const rfDelta = typeof macroContext.riskFreeRate === 'number' ? (macroContext.riskFreeRate - 0.04) : 0;
  const spreadDelta = typeof macroContext.spreadShift === 'number' ? macroContext.spreadShift : 0;
  const adjustedWacc = Math.max(0.01, baselineWacc + rfDelta + spreadDelta);

  // Approximate price adjustment
  const ratio = baselineWacc / adjustedWacc;
  const adjustedEquityValuePerShare = baselineEquityValuePerShare * ratio;
  const adjustedTargetPrice = baselineTargetPrice * ratio;

  return deepFreeze({
    ticker,
    adjustedWacc,
    adjustedEquityValuePerShare,
    adjustedTargetPrice,
    baselineValuation,
    macroContext,
    classification: 'MODEL_ESTIMATE'
  });
}
