/**
 * Phase 18 — Institutional Liquidity Explanation Engine
 * Deterministic text generation for Investor Copilot and audit explainability.
 */

import { LiquidityStatus, deepFreeze } from './liquidity.types.js';

export class LiquidityExplanationEngine {
  /**
   * Explains single-security liquidity metrics.
   */
  static explainSecurityLiquidity(metrics) {
    if (!metrics || metrics.status !== LiquidityStatus.PASS) {
      return 'Liquidity data is currently UNAVAILABLE or insufficient for deterministic evaluation.';
    }

    const { ticker, adv, dollarAdv, spreadBps, tier, score, observationProvenance } = metrics;
    const formattedAdv = (adv || 0).toLocaleString();
    const formattedDollarAdv = dollarAdv ? `$${(dollarAdv / 1e6).toFixed(1)}M` : 'N/A';
    const formattedSpread = spreadBps ? `${spreadBps.toFixed(1)} bps` : 'N/A';

    let sourceStatusText = 'source not independently verified';
    if (observationProvenance) {
      if (observationProvenance.connectionClassification === 'VERIFIED_DIRECT_EXCHANGE') {
        sourceStatusText = 'independently verified direct exchange source';
      } else if (observationProvenance.connectionClassification === 'VERIFIED_INTERNAL_ADAPTER_TO_DIRECT_EXCHANGE') {
        sourceStatusText = 'internal adapter to independently verified direct exchange';
      } else if (observationProvenance.connectionClassification === 'VERIFIED_VENDOR_SOURCE') {
        sourceStatusText = 'verified vendor source';
      } else {
        sourceStatusText = 'source not independently verified';
      }
    }

    return `Security ${ticker} has an Average Daily Volume (ADV) of ${formattedAdv} shares (${formattedDollarAdv} Dollar ADV) with an average bid-ask spread of ${formattedSpread} (Real market observation — ${sourceStatusText}). It is classified as ${tier || 'UNKNOWN'} with a deterministic liquidity score of ${score || 'N/A'}/100.`;
  }

  /**
   * Explains trade feasibility result.
   */
  static explainFeasibility(feasibilityResult) {
    if (!feasibilityResult || feasibilityResult.status !== LiquidityStatus.PASS) {
      return `Feasibility analysis cannot proceed: ${feasibilityResult?.reason || 'Required inputs missing'}.`;
    }

    const { ticker, feasibility, orderQuantity, requiredTradingDays, participationRate, totalEstimatedCost } = feasibilityResult;
    const partPct = (participationRate * 100).toFixed(2);
    const costStr = totalEstimatedCost ? `$${totalEstimatedCost.toLocaleString()}` : 'N/A';

    let explanation = `The proposed order of ${orderQuantity.toLocaleString()} shares in ${ticker} is evaluated as ${feasibility}. `;
    explanation += `Execution requires an estimated ${requiredTradingDays} trading day(s) at ${partPct}% daily volume participation, with an estimated total implementation cost of ${costStr}.`;

    if (feasibilityResult.constraints && feasibilityResult.constraints.length > 0) {
      explanation += ` Constraints flagged: ${feasibilityResult.constraints.map(c => c.message).join(' ')}`;
    }

    return explanation;
  }

  /**
   * Explains stress test outcome.
   */
  static explainStressResult(stressResult) {
    if (!stressResult || stressResult.status !== LiquidityStatus.PASS) {
      return 'Stress testing data is UNAVAILABLE.';
    }

    const { scenarioType, base, stressed, delta } = stressResult;
    return `Under stress scenario ${scenarioType}, Dollar ADV contracts to $${(stressed.dollarAdv / 1e6).toFixed(1)}M (base: $${(base.dollarAdv / 1e6).toFixed(1)}M), increasing required liquidation horizon by +${delta.horizonIncreaseDays} days (to ${stressed.requiredTradingDays} days) and estimated implementation cost by +${delta.costIncreaseBps} bps (+${delta.costIncreaseRatio}x increase).`;
  }
}
