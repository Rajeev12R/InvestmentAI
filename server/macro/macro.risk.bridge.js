/**
 * server/macro/macro.risk.bridge.js
 * 
 * Phase 22: Macro-to-Risk Intelligence Bridge (Phase 3 Integration)
 * Deterministically routes macro shocks into Market, Valuation, Growth, Liquidity, and Event Risk dimensions.
 */

import { MacroClassification, deepFreeze } from './macro.types.js';

export class MacroRiskBridge {
  /**
   * Computes risk score contributions from macro shocks and regime states
   */
  evaluateMacroRiskDrift(baselineRiskScores = {}, macroSignals = {}) {
    const clamp = (val) => Math.max(0, Math.min(100, Number.isFinite(val) ? val : 50));

    const baseMarket = clamp(typeof baselineRiskScores.marketRisk === 'number' ? baselineRiskScores.marketRisk : 35);
    const baseValuation = clamp(typeof baselineRiskScores.valuationRisk === 'number' ? baselineRiskScores.valuationRisk : 40);
    const baseGrowth = clamp(typeof baselineRiskScores.growthRisk === 'number' ? baselineRiskScores.growthRisk : 30);
    const baseLiquidity = clamp(typeof baselineRiskScores.liquidityRisk === 'number' ? baselineRiskScores.liquidityRisk : 25);
    const baseEvent = clamp(typeof baselineRiskScores.eventRisk === 'number' ? baselineRiskScores.eventRisk : 20);

    let deltaMarket = 0;
    let deltaValuation = 0;
    let deltaGrowth = 0;
    let deltaLiquidity = 0;
    let deltaEvent = 0;

    const riskDrivers = [];

    // 1. Credit Spread Widening -> Market & Liquidity Risk
    if (macroSignals.creditSpreadWideningBps && macroSignals.creditSpreadWideningBps > 50) {
      const addPts = Math.min(25, Math.round(macroSignals.creditSpreadWideningBps / 10));
      deltaMarket += addPts;
      deltaLiquidity += Math.round(addPts * 0.8);
      riskDrivers.push({
        riskSourceId: 'MACRO-RISK-CREDIT-SPREAD',
        dimension: 'MARKET_RISK',
        contribution: addPts,
        formula: 'clamp(round(SpreadWideningBps / 10), 0, 25)',
        evidence: `High yield credit spreads widened by ${macroSignals.creditSpreadWideningBps} bps`
      });
    }

    // 2. Yield Curve Inversion -> Growth Risk
    if (macroSignals.yieldCurveInverted === true) {
      deltaGrowth += 15;
      deltaEvent += 10;
      riskDrivers.push({
        riskSourceId: 'MACRO-RISK-CURVE-INVERSION',
        dimension: 'GROWTH_RISK',
        contribution: 15,
        formula: 'previousGrowthRisk + 15 (Yield Curve Inversion Signal)',
        evidence: '10Y - 2Y yield curve is inverted'
      });
    }

    // 3. Rate Shock / Yield Spike -> Valuation Risk
    if (macroSignals.rateShockBps && Math.abs(macroSignals.rateShockBps) >= 50) {
      const addPts = Math.min(20, Math.round(Math.abs(macroSignals.rateShockBps) / 10));
      deltaValuation += addPts;
      riskDrivers.push({
        riskSourceId: 'MACRO-RISK-RATE-SHOCK',
        dimension: 'VALUATION_RISK',
        contribution: addPts,
        formula: 'clamp(round(abs(RateShockBps) / 10), 0, 20)',
        evidence: `10Y benchmark yield shifted by ${macroSignals.rateShockBps} bps`
      });
    }

    // 4. Macro Regime Shock (e.g. RISK_OFF or CREDIT_STRESS)
    if (macroSignals.macroRegime === 'CREDIT_STRESS' || macroSignals.macroRegime === 'RISK_OFF') {
      deltaMarket += 15;
      deltaEvent += 15;
      riskDrivers.push({
        riskSourceId: 'MACRO-RISK-REGIME-STRESS',
        dimension: 'EVENT_RISK',
        contribution: 15,
        formula: 'previousEventRisk + 15 (Macro Stress Regime Active)',
        evidence: `Macro regime is ${macroSignals.macroRegime}`
      });
    }

    const updatedScores = {
      marketRisk: clamp(baseMarket + deltaMarket),
      valuationRisk: clamp(baseValuation + deltaValuation),
      growthRisk: clamp(baseGrowth + deltaGrowth),
      liquidityRisk: clamp(baseLiquidity + deltaLiquidity),
      eventRisk: clamp(baseEvent + deltaEvent)
    };

    const compositeScore = (updatedScores.marketRisk + updatedScores.valuationRisk + updatedScores.growthRisk + updatedScores.liquidityRisk + updatedScores.eventRisk) / 5.0;

    return deepFreeze({
      baselineRiskScores: {
        marketRisk: baseMarket,
        valuationRisk: baseValuation,
        growthRisk: baseGrowth,
        liquidityRisk: baseLiquidity,
        eventRisk: baseEvent
      },
      updatedRiskScores: updatedScores,
      deltas: {
        marketRiskDelta: deltaMarket,
        valuationRiskDelta: deltaValuation,
        growthRiskDelta: deltaGrowth,
        liquidityRiskDelta: deltaLiquidity,
        eventRiskDelta: deltaEvent
      },
      compositeScore,
      riskDrivers: Object.freeze(riskDrivers),
      classification: MacroClassification.DERIVED
    });
  }
}

export const defaultMacroRiskBridge = new MacroRiskBridge();

export function generateMacroRiskSignals(regimeData = {}, portfolioData = {}) {
  const regime = regimeData.regime || 'UNKNOWN';
  const riskSignals = [];

  riskSignals.push(deepFreeze({
    riskSourceId: `MACRO-RISK-${regime}-${Date.now()}`,
    classification: 'MODEL_ESTIMATE',
    regime,
    portfolioId: portfolioData.portfolioId || 'DEFAULT_PORTFOLIO',
    severity: (regime === 'STAGFLATION' || regime === 'RECESSION' || regime === 'CREDIT_CONTRACTION' || regime === 'DEVALUATION_CRISIS') ? 'CRITICAL' : 'MODERATE',
    evidence: regimeData.supportingEvidence || [],
    timestamp: new Date().toISOString()
  }));

  return deepFreeze(riskSignals);
}
