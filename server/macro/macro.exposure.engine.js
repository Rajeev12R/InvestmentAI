/**
 * server/macro/macro.exposure.engine.js
 * 
 * Phase 22: Security & Portfolio Macro Exposure Engine
 * Computes security-level sensitivities and portfolio gross vs net macro exposures.
 */

import { MacroClassification, SensitivityType, deepFreeze } from './macro.types.js';

export class MacroExposureEngine {
  /**
   * Evaluates security-level macro sensitivity vector
   */
  evaluateSecuritySensitivity(ticker, customSensitivities = {}) {
    const sym = (ticker || 'UNKNOWN').toUpperCase();
    
    // Default sector-aware or configured defaults if not supplied
    const rateSens = typeof customSensitivities.rateSensitivity === 'number' ? customSensitivities.rateSensitivity : 0.0;
    const durationSens = typeof customSensitivities.durationSensitivity === 'number' ? customSensitivities.durationSensitivity : 0.0;
    const usdSens = typeof customSensitivities.usdSensitivity === 'number' ? customSensitivities.usdSensitivity : 0.0;
    const oilSens = typeof customSensitivities.oilSensitivity === 'number' ? customSensitivities.oilSensitivity : 0.0;
    const inflationSens = typeof customSensitivities.inflationSensitivity === 'number' ? customSensitivities.inflationSensitivity : 0.0;
    const creditSens = typeof customSensitivities.creditSensitivity === 'number' ? customSensitivities.creditSensitivity : 0.0;
    const growthSens = typeof customSensitivities.growthSensitivity === 'number' ? customSensitivities.growthSensitivity : 1.0;

    return deepFreeze({
      ticker: sym,
      sensitivities: {
        rateSensitivity: rateSens,
        durationSensitivity: durationSens,
        usdSensitivity: usdSens,
        oilSensitivity: oilSens,
        inflationSensitivity: inflationSens,
        creditSensitivity: creditSens,
        growthSensitivity: growthSens
      },
      sensitivityType: customSensitivities.sensitivityType || SensitivityType.CONFIGURED,
      classification: MacroClassification.CONFIGURED
    });
  }

  /**
   * Aggregates portfolio positions into Net and Gross macro exposure vectors
   * 
   * Invariant:
   * NetExposure = Sum(Position_i_Weight * Sensitivity_i)
   * GrossExposure = Sum(|Position_i_Weight * Sensitivity_i|)
   * 
   * Handles long, short, leveraged, and cash positions without sign erasure.
   */
  aggregatePortfolioMacroExposure(portfolio, securitySensitivityMap = {}) {
    if (!portfolio || !Array.isArray(portfolio.positions)) {
      throw new Error('Valid portfolio with positions array required');
    }

    const cash = typeof portfolio.cash === 'number' ? portfolio.cash : 0;
    let netNav = cash;
    let totalGrossExposure = cash;

    for (const pos of portfolio.positions) {
      const mv = typeof pos.marketValue === 'number' ? pos.marketValue : (pos.sharesHeld || pos.quantity || 0) * (pos.currentPrice || 0);
      netNav += mv;
      totalGrossExposure += Math.abs(mv);
    }

    const exposureTotals = {
      rate: { netSum: 0, grossSum: 0 },
      duration: { netSum: 0, grossSum: 0 },
      usd: { netSum: 0, grossSum: 0 },
      oil: { netSum: 0, grossSum: 0 },
      inflation: { netSum: 0, grossSum: 0 },
      credit: { netSum: 0, grossSum: 0 },
      growth: { netSum: 0, grossSum: 0 }
    };

    const positionExposures = [];

    for (const pos of portfolio.positions) {
      const ticker = (pos.ticker || 'UNKNOWN').toUpperCase();
      const mv = typeof pos.marketValue === 'number' ? pos.marketValue : (pos.sharesHeld || pos.quantity || 0) * (pos.currentPrice || 0);
      const isShort = mv < 0;

      const sensRecord = securitySensitivityMap[ticker] || this.evaluateSecuritySensitivity(ticker, pos.sensitivities);
      const s = sensRecord.sensitivities || {};

      const netWeight = netNav !== 0 ? (mv / netNav) : 0;
      const grossWeight = totalGrossExposure > 0 ? (Math.abs(mv) / totalGrossExposure) : 0;

      // Rate
      exposureTotals.rate.netSum += (mv * (s.rateSensitivity || 0));
      exposureTotals.rate.grossSum += Math.abs(mv * (s.rateSensitivity || 0));

      // Duration
      exposureTotals.duration.netSum += (mv * (s.durationSensitivity || 0));
      exposureTotals.duration.grossSum += Math.abs(mv * (s.durationSensitivity || 0));

      // USD
      exposureTotals.usd.netSum += (mv * (s.usdSensitivity || 0));
      exposureTotals.usd.grossSum += Math.abs(mv * (s.usdSensitivity || 0));

      // Oil
      exposureTotals.oil.netSum += (mv * (s.oilSensitivity || 0));
      exposureTotals.oil.grossSum += Math.abs(mv * (s.oilSensitivity || 0));

      // Inflation
      exposureTotals.inflation.netSum += (mv * (s.inflationSensitivity || 0));
      exposureTotals.inflation.grossSum += Math.abs(mv * (s.inflationSensitivity || 0));

      // Credit
      exposureTotals.credit.netSum += (mv * (s.creditSensitivity || 0));
      exposureTotals.credit.grossSum += Math.abs(mv * (s.creditSensitivity || 0));

      // Growth
      exposureTotals.growth.netSum += (mv * (s.growthSensitivity || 0));
      exposureTotals.growth.grossSum += Math.abs(mv * (s.growthSensitivity || 0));

      positionExposures.push({
        ticker,
        marketValue: mv,
        isShort,
        netWeight,
        grossWeight,
        sensitivities: s
      });
    }

    const calcNetExp = (sum) => (typeof netNav === 'number' && Number.isFinite(netNav) && netNav !== 0) ? (sum / netNav) : 'UNAVAILABLE';
    const calcGrossExp = (sum) => (typeof totalGrossExposure === 'number' && Number.isFinite(totalGrossExposure) && totalGrossExposure > 0) ? (sum / totalGrossExposure) : (totalGrossExposure === 0 ? 0.0 : 'UNAVAILABLE');

    const aggregatedExposures = {
      rate: { netExposure: calcNetExp(exposureTotals.rate.netSum), grossExposure: calcGrossExp(exposureTotals.rate.grossSum) },
      duration: { netExposure: calcNetExp(exposureTotals.duration.netSum), grossExposure: calcGrossExp(exposureTotals.duration.grossSum) },
      usd: { netExposure: calcNetExp(exposureTotals.usd.netSum), grossExposure: calcGrossExp(exposureTotals.usd.grossSum) },
      oil: { netExposure: calcNetExp(exposureTotals.oil.netSum), grossExposure: calcGrossExp(exposureTotals.oil.grossSum) },
      inflation: { netExposure: calcNetExp(exposureTotals.inflation.netSum), grossExposure: calcGrossExp(exposureTotals.inflation.grossSum) },
      credit: { netExposure: calcNetExp(exposureTotals.credit.netSum), grossExposure: calcGrossExp(exposureTotals.credit.grossSum) },
      growth: { netExposure: calcNetExp(exposureTotals.growth.netSum), grossExposure: calcGrossExp(exposureTotals.growth.grossSum) }
    };

    return deepFreeze({
      portfolioId: portfolio.id || 'PORTFOLIO_MACRO_DEFAULT',
      netNav,
      grossExposure: totalGrossExposure,
      cash,
      positionsCount: portfolio.positions.length,
      aggregatedExposures,
      positionExposures,
      classification: MacroClassification.MODEL_ESTIMATE
    });
  }
}

export const defaultMacroExposureEngine = new MacroExposureEngine();

export function calculateSecurityExposure(ticker, sensitivities = {}) {
  const sens = {
    RATES: typeof sensitivities.ratesSensitivity === 'number' ? sensitivities.ratesSensitivity : (typeof sensitivities.RATES === 'number' ? sensitivities.RATES : 0),
    INFLATION: typeof sensitivities.inflationSensitivity === 'number' ? sensitivities.inflationSensitivity : (typeof sensitivities.INFLATION === 'number' ? sensitivities.INFLATION : 0),
    USD: typeof sensitivities.usdSensitivity === 'number' ? sensitivities.usdSensitivity : (typeof sensitivities.USD === 'number' ? sensitivities.USD : 0),
    COMMODITIES: typeof sensitivities.commoditySensitivity === 'number' ? sensitivities.commoditySensitivity : (typeof sensitivities.COMMODITIES === 'number' ? sensitivities.COMMODITIES : 0),
    CREDIT: typeof sensitivities.creditSpreadSensitivity === 'number' ? sensitivities.creditSpreadSensitivity : (typeof sensitivities.CREDIT === 'number' ? sensitivities.CREDIT : 0)
  };

  return deepFreeze({
    ticker,
    sensitivities: sens,
    classification: 'CONFIGURED'
  });
}

export function calculatePortfolioMacroExposure(positionsInput) {
  const positions = Array.isArray(positionsInput) ? positionsInput : (positionsInput && Array.isArray(positionsInput.positions) ? positionsInput.positions : []);

  let totalLongValue = 0;
  let totalShortValue = 0;

  for (const p of positions) {
    const val = typeof p.marketValue === 'number' && Number.isFinite(p.marketValue) ? p.marketValue : 0;
    if (val >= 0) totalLongValue += val;
    else totalShortValue += Math.abs(val);
  }

  const netPortfolioValue = totalLongValue - totalShortValue;
  const grossPortfolioValue = totalLongValue + totalShortValue;

  const positionExposures = positions.map(p => {
    const val = typeof p.marketValue === 'number' && Number.isFinite(p.marketValue) ? p.marketValue : 0;
    const grossWeight = grossPortfolioValue > 0 ? Math.abs(val) / grossPortfolioValue : 0;
    const netWeight = netPortfolioValue !== 0 ? val / netPortfolioValue : 0;
    return {
      ticker: p.ticker || 'UNKNOWN',
      marketValue: val,
      grossWeight,
      netWeight,
      sensitivities: p.sensitivities || {}
    };
  });

  const portfolioSensitivities = {
    RATES: 0,
    INFLATION: 0,
    USD: 0,
    COMMODITIES: 0,
    CREDIT: 0
  };

  if (netPortfolioValue !== 0) {
    for (const pos of positionExposures) {
      for (const [k, v] of Object.entries(pos.sensitivities)) {
        if (typeof v === 'number' && portfolioSensitivities[k] !== undefined) {
          portfolioSensitivities[k] += pos.netWeight * v;
        }
      }
    }
  }

  return deepFreeze({
    totalLongValue,
    totalShortValue,
    netPortfolioValue,
    grossPortfolioValue,
    positionExposures,
    portfolioSensitivities,
    classification: 'MODEL_ESTIMATE'
  });
}
