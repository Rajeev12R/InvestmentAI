/**
 * server/macro/macro.impact.engine.js
 * 
 * Phase 22: Deterministic Macro Shock Impact Propagation Engine
 * Computes estimated portfolio and security value changes under macro shocks.
 * Invariant: Classified strictly as MODEL_ESTIMATE and never mutates Truth Layer facts.
 */

import { MacroClassification, deepFreeze } from './macro.types.js';

export class MacroImpactEngine {
  /**
   * Computes deterministic impact on a single position
   */
  evaluateSecurityMacroImpact(position, shock = {}) {
    if (!position || typeof position !== 'object') {
      throw new Error('Valid position object required');
    }

    const ticker = (position.ticker || 'UNKNOWN').toUpperCase();
    const marketValue = typeof position.marketValue === 'number' ? position.marketValue : (position.sharesHeld || 0) * (position.currentPrice || 0);
    const { shockMetric, shockMagnitudePct, sensitivity } = shock;

    if (typeof shockMagnitudePct !== 'number' || typeof sensitivity !== 'number' || !Number.isFinite(shockMagnitudePct) || !Number.isFinite(sensitivity)) {
      return deepFreeze({
        ticker,
        shockMetric: shockMetric || 'UNKNOWN',
        estimatedImpactPct: 'UNAVAILABLE',
        estimatedDollarImpact: 'UNAVAILABLE',
        status: 'UNAVAILABLE_NON_NUMERIC_INPUTS',
        classification: MacroClassification.MODEL_ESTIMATE
      });
    }

    const estimatedImpactPct = shockMagnitudePct * sensitivity;
    const estimatedDollarImpact = marketValue * estimatedImpactPct;

    return deepFreeze({
      ticker,
      marketValue,
      shockMetric,
      shockMagnitudePct,
      sensitivity,
      estimatedImpactPct,
      estimatedDollarImpact,
      formula: 'EstimatedImpact = ShockMagnitude * Sensitivity * MarketValue',
      rule: 'MACRO_IMPACT_NEVER_BECOMES_TRUTH_FACT',
      classification: MacroClassification.MODEL_ESTIMATE
    });
  }

  /**
   * Computes deterministic macro shock impact across an entire portfolio
   */
  evaluatePortfolioMacroImpact(portfolioExposureResult, shock = {}) {
    if (!portfolioExposureResult || !portfolioExposureResult.positionExposures) {
      throw new Error('Valid portfolio exposure result required');
    }

    const { shockDimension, shockMagnitudePct } = shock;
    const positionExposures = portfolioExposureResult.positionExposures;
    const netNav = portfolioExposureResult.netNav;

    if (typeof shockMagnitudePct !== 'number' || !Number.isFinite(shockMagnitudePct)) {
      return deepFreeze({
        shockDimension,
        totalNetDollarImpact: 'UNAVAILABLE',
        totalNetPctImpact: 'UNAVAILABLE',
        status: 'UNAVAILABLE_INVALID_SHOCK_MAGNITUDE',
        classification: MacroClassification.MODEL_ESTIMATE
      });
    }

    let totalNetDollarImpact = 0;
    const positionImpacts = [];

    for (const pos of positionExposures) {
      const sens = pos.sensitivities?.[`${shockDimension}Sensitivity`] || pos.sensitivities?.sensitivity || 0;
      const dollarImpact = pos.marketValue * shockMagnitudePct * sens;
      totalNetDollarImpact += dollarImpact;

      positionImpacts.push({
        ticker: pos.ticker,
        marketValue: pos.marketValue,
        isShort: pos.isShort,
        sensitivity: sens,
        estimatedDollarImpact: dollarImpact,
        estimatedPctImpact: shockMagnitudePct * sens
      });
    }

    const totalNetPctImpact = (typeof netNav === 'number' && Number.isFinite(netNav) && netNav !== 0) ? (totalNetDollarImpact / netNav) : 'UNAVAILABLE';

    return deepFreeze({
      portfolioId: portfolioExposureResult.portfolioId,
      shockDimension,
      shockMagnitudePct,
      totalNetDollarImpact,
      totalNetPctImpact,
      positionImpacts: Object.freeze(positionImpacts),
      formula: 'TotalImpact = Sum(Position_i_MarketValue * Shock * Sensitivity_i)',
      classification: MacroClassification.MODEL_ESTIMATE
    });
  }
}

export const defaultMacroImpactEngine = new MacroImpactEngine();

export function calculateSecurityMacroImpact(position = {}, shock = {}) {
  const ticker = position.ticker || 'UNKNOWN';
  const marketValue = typeof position.marketValue === 'number' && Number.isFinite(position.marketValue) ? position.marketValue : 0;
  const factor = shock.factor || 'UNKNOWN';
  const shockMagnitude = typeof shock.shockMagnitude === 'number' && Number.isFinite(shock.shockMagnitude) ? shock.shockMagnitude : 0;
  const sensitivity = (position.sensitivities && typeof position.sensitivities[factor] === 'number') ? position.sensitivities[factor] : 0;

  const estimatedPriceImpactPct = shockMagnitude * sensitivity;
  const estimatedDollarImpact = marketValue * (estimatedPriceImpactPct / 100);

  return deepFreeze({
    ticker,
    factor,
    shockMagnitude,
    estimatedPriceImpactPct,
    estimatedDollarImpact,
    classification: 'MODEL_ESTIMATE'
  });
}

export function calculatePortfolioMacroImpact(portfolioInput = {}, shock = {}) {
  const positions = portfolioInput.positions || [];
  const factor = shock.factor || 'UNKNOWN';
  const shockMagnitude = typeof shock.shockMagnitude === 'number' && Number.isFinite(shock.shockMagnitude) ? shock.shockMagnitude : 0;

  let totalMarketValue = 0;
  let totalEstimatedDollarImpact = 0;
  const positionImpacts = [];

  for (const pos of positions) {
    const imp = calculateSecurityMacroImpact(pos, shock);
    const mv = typeof pos.marketValue === 'number' && Number.isFinite(pos.marketValue) ? pos.marketValue : 0;
    totalMarketValue += mv;
    totalEstimatedDollarImpact += imp.estimatedDollarImpact;
    positionImpacts.push(imp);
  }

  const portfolioPercentageImpact = totalMarketValue !== 0 ? (totalEstimatedDollarImpact / totalMarketValue) * 100 : 0;

  return deepFreeze({
    factor,
    shockMagnitude,
    totalEstimatedDollarImpact,
    portfolioPercentageImpact,
    positionImpacts,
    classification: 'MODEL_ESTIMATE'
  });
}
