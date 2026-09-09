/**
 * server/macro/macro.regime.engine.js
 * 
 * Phase 22: Rules-Based Macro Regime Classification & Transition Engine
 * Classifies macroeconomic regimes deterministically and identifies transitions with supporting evidence lineage.
 */

import { MacroRegimeType, MacroClassification, deepFreeze } from './macro.types.js';

export class MacroRegimeEngine {
  /**
   * Evaluates macro snapshot data and returns primary and sub-regime classifications
   */
  classifyRegime(macroSnapshot = {}) {
    const seriesList = macroSnapshot.series || [];
    if (seriesList.length === 0) {
      return deepFreeze({
        primaryRegime: MacroRegimeType.INSUFFICIENT_DATA,
        confidence: 0.0,
        subRegimes: [],
        supportingFacts: [],
        contradictingFacts: [],
        rulesTriggered: ['NO_OBSERVATIONS_FOUND'],
        classification: MacroClassification.DERIVED
      });
    }

    const seriesMap = new Map();
    for (const s of seriesList) {
      seriesMap.set(s.seriesId, s);
    }

    const supportingFacts = [];
    const contradictingFacts = [];
    const rulesTriggered = [];
    const subRegimes = [];

    // 1. Inflation Dimension
    const cpiObs = seriesMap.get('US_CPI_YOY') || seriesMap.get('US_CORE_CPI_YOY');
    if (cpiObs) {
      if (cpiObs.value >= 0.035 || (cpiObs.priorValue !== undefined && cpiObs.value > cpiObs.priorValue)) {
        subRegimes.push(MacroRegimeType.INFLATION_RISING);
        supportingFacts.push(`CPI YoY is elevated/rising at ${(cpiObs.value * 100).toFixed(2)}%`);
        rulesTriggered.push('RULE_INFLATION_ELEVATED_OR_RISING');
      } else {
        subRegimes.push(MacroRegimeType.INFLATION_FALLING);
        supportingFacts.push(`CPI YoY is moderating at ${(cpiObs.value * 100).toFixed(2)}%`);
        rulesTriggered.push('RULE_INFLATION_MODERATING');
      }
    }

    // 2. Growth Dimension
    const gdpObs = seriesMap.get('US_GDP_REAL_QOQ');
    const pmiObs = seriesMap.get('US_ISM_MANUFACTURING_PMI');
    if (gdpObs || pmiObs) {
      const gdpVal = gdpObs ? gdpObs.value : null;
      const pmiVal = pmiObs ? pmiObs.value : null;

      if ((gdpVal !== null && gdpVal >= 2.5) || (pmiVal !== null && pmiVal >= 50.0)) {
        subRegimes.push(MacroRegimeType.GROWTH_ACCELERATING);
        supportingFacts.push(`Growth indicators strong (GDP: ${gdpVal ?? 'N/A'}%, PMI: ${pmiVal ?? 'N/A'})`);
        rulesTriggered.push('RULE_GROWTH_EXPANDING');
      } else {
        subRegimes.push(MacroRegimeType.GROWTH_DECELERATING);
        supportingFacts.push(`Growth indicators slowing (GDP: ${gdpVal ?? 'N/A'}%, PMI: ${pmiVal ?? 'N/A'})`);
        rulesTriggered.push('RULE_GROWTH_DECELERATING');
      }
    }

    // 3. Monetary Policy & Rates Dimension
    const fedFunds = seriesMap.get('US_FED_FUNDS_RATE');
    const treasury2Y = seriesMap.get('US_TREASURY_2Y_YIELD');
    const treasury10Y = seriesMap.get('US_TREASURY_10Y_YIELD');
    
    if (treasury10Y && treasury2Y) {
      const slopeBps = Math.round((treasury10Y.value - treasury2Y.value) * 100);
      if (slopeBps <= 0) {
        supportingFacts.push(`Yield curve is inverted (10Y-2Y: ${slopeBps} bps)`);
        rulesTriggered.push('RULE_YIELD_CURVE_INVERTED');
      }
    }

    if (fedFunds) {
      if (fedFunds.value >= 4.0) {
        subRegimes.push(MacroRegimeType.POLICY_TIGHTENING);
        supportingFacts.push(`Policy rates restrictive at ${fedFunds.value.toFixed(2)}%`);
        rulesTriggered.push('RULE_POLICY_RESTRICTIVE');
      } else {
        subRegimes.push(MacroRegimeType.POLICY_EASING);
        supportingFacts.push(`Policy rates accommodative at ${fedFunds.value.toFixed(2)}%`);
        rulesTriggered.push('RULE_POLICY_ACCOMMODATIVE');
      }
    }

    // 4. Credit Stress Dimension
    const hyOas = seriesMap.get('US_HY_OPTION_ADJUSTED_SPREAD');
    if (hyOas) {
      if (hyOas.value >= 500) {
        subRegimes.push(MacroRegimeType.CREDIT_STRESS);
        supportingFacts.push(`High yield credit spreads wide at ${hyOas.value} bps`);
        rulesTriggered.push('RULE_CREDIT_SPREAD_ACUTE_STRESS');
      }
    }

    // Determine Composite Primary Regime
    let primaryRegime = MacroRegimeType.MIXED;
    if (subRegimes.includes(MacroRegimeType.CREDIT_STRESS)) {
      primaryRegime = MacroRegimeType.CREDIT_STRESS;
    } else if (subRegimes.includes(MacroRegimeType.INFLATION_RISING) && subRegimes.includes(MacroRegimeType.GROWTH_DECELERATING)) {
      primaryRegime = MacroRegimeType.RISK_OFF;
    } else if (subRegimes.includes(MacroRegimeType.INFLATION_FALLING) && subRegimes.includes(MacroRegimeType.GROWTH_ACCELERATING)) {
      primaryRegime = MacroRegimeType.RISK_ON;
    } else if (subRegimes.includes(MacroRegimeType.INFLATION_RISING)) {
      primaryRegime = MacroRegimeType.INFLATION_RISING;
    } else if (subRegimes.includes(MacroRegimeType.GROWTH_ACCELERATING)) {
      primaryRegime = MacroRegimeType.GROWTH_ACCELERATING;
    } else if (subRegimes.includes(MacroRegimeType.POLICY_TIGHTENING)) {
      primaryRegime = MacroRegimeType.POLICY_TIGHTENING;
    }

    const confidence = Math.min(1.0, Math.max(0.4, 0.2 + (supportingFacts.length * 0.15)));

    return deepFreeze({
      primaryRegime,
      confidence,
      subRegimes,
      supportingFacts,
      contradictingFacts,
      rulesTriggered,
      seriesObservedCount: seriesList.length,
      asOfTimestamp: macroSnapshot.asOfTimestamp || new Date().toISOString(),
      classification: MacroClassification.DERIVED
    });
  }

  /**
   * Detects deterministic regime transitions between prior and current state
   */
  detectTransition(previousRegimeResult, currentRegimeResult) {
    if (!previousRegimeResult || !currentRegimeResult) {
      return null;
    }

    const prev = previousRegimeResult.primaryRegime;
    const curr = currentRegimeResult.primaryRegime;
    const hasChanged = prev !== curr;

    if (!hasChanged) {
      return {
        hasTransitioned: false,
        previousRegime: prev,
        currentRegime: curr,
        materiality: 'NONE',
        message: `Regime remains unchanged at ${curr}`
      };
    }

    return deepFreeze({
      hasTransitioned: true,
      previousRegime: prev,
      currentRegime: curr,
      transitionType: `${prev}_TO_${curr}`,
      effectiveTimestamp: currentRegimeResult.asOfTimestamp || new Date().toISOString(),
      triggeringFacts: currentRegimeResult.supportingFacts || [],
      triggeringRules: currentRegimeResult.rulesTriggered || [],
      materiality: (curr === MacroRegimeType.CREDIT_STRESS || curr === MacroRegimeType.RISK_OFF) ? 'CRITICAL' : 'MATERIAL',
      classification: MacroClassification.DERIVED
    });
  }
}

export const defaultMacroRegimeEngine = new MacroRegimeEngine();

export function detectMacroRegime(inputs = {}) {
  const supportingEvidence = [];
  const contradictingEvidence = [];
  let regime = 'UNKNOWN';
  let confidence = 0.50;

  const {
    gdpGrowthYoY,
    cpiYoY,
    unemploymentRate,
    ratesTrend,
    fxDepreciationYoY,
    sovereignSpreadBps,
    highYieldSpreadBps,
    repoStressIndicator,
    creditGrowthYoY,
    manufacturingPmi
  } = inputs;

  // Crisis checks
  if (fxDepreciationYoY >= 20 || sovereignSpreadBps >= 500) {
    regime = 'DEVALUATION_CRISIS';
    confidence = 0.90;
    supportingEvidence.push(`Currency depreciating at ${fxDepreciationYoY}% YoY`, `Sovereign spread at ${sovereignSpreadBps} bps`);
  } else if (highYieldSpreadBps >= 700 || repoStressIndicator === 'HIGH' || (typeof creditGrowthYoY === 'number' && creditGrowthYoY < -2.0)) {
    regime = 'CREDIT_CONTRACTION';
    confidence = 0.88;
    supportingEvidence.push(`High yield spread blowout at ${highYieldSpreadBps} bps`, `Repo stress: ${repoStressIndicator}`);
  } else if (typeof gdpGrowthYoY === 'number' && typeof cpiYoY === 'number') {
    if (gdpGrowthYoY <= 0.5 && cpiYoY >= 4.0) {
      regime = 'STAGFLATION';
      confidence = 0.85;
      supportingEvidence.push(`Stagnant GDP growth at ${gdpGrowthYoY}%`, `High CPI inflation at ${cpiYoY}%`);
    } else if (gdpGrowthYoY < 0 && cpiYoY < 3.0) {
      regime = 'RECESSION';
      confidence = 0.82;
      supportingEvidence.push(`Negative GDP growth at ${gdpGrowthYoY}%`, `Depressed CPI inflation at ${cpiYoY}%`);
    } else if (gdpGrowthYoY >= 3.5 && cpiYoY >= 4.0) {
      regime = 'OVERHEATING';
      confidence = 0.80;
      supportingEvidence.push(`Rapid GDP growth at ${gdpGrowthYoY}%`, `Elevated inflation at ${cpiYoY}%`);
    } else if (gdpGrowthYoY >= 2.0 && cpiYoY <= 2.8) {
      regime = 'GOLDILOCKS';
      confidence = 0.85;
      supportingEvidence.push(`Solid GDP growth at ${gdpGrowthYoY}%`, `Tame CPI inflation at ${cpiYoY}%`);
    } else if (gdpGrowthYoY <= 1.0 && cpiYoY >= 3.0) {
      regime = 'LATE_CYCLE_SLOWDOWN';
      confidence = 0.75;
      supportingEvidence.push(`Slowing GDP at ${gdpGrowthYoY}%`, `Sticky CPI at ${cpiYoY}%`);
    } else {
      regime = 'MIXED';
      confidence = 0.60;
    }
  } else if (typeof cpiYoY === 'number' && cpiYoY >= 4.0) {
    regime = 'INFLATION_RISING';
    confidence = 0.70;
    supportingEvidence.push(`CPI inflation elevated at ${cpiYoY}%`);
  } else if (typeof gdpGrowthYoY === 'number' && gdpGrowthYoY >= 2.5) {
    regime = 'GROWTH_ACCELERATING';
    confidence = 0.70;
    supportingEvidence.push(`GDP growth accelerating at ${gdpGrowthYoY}%`);
  } else {
    regime = 'MIXED';
    confidence = 0.50;
  }

  // Mixed signals detection
  if (typeof cpiYoY === 'number' && cpiYoY > 4.0 && typeof unemploymentRate === 'number' && unemploymentRate < 4.0 && typeof manufacturingPmi === 'number' && manufacturingPmi < 50) {
    contradictingEvidence.push('Contracting manufacturing PMI contrasts with strong labor and sticky inflation');
    confidence = Math.min(confidence, 0.65);
  }

  return deepFreeze({
    regime,
    primaryRegime: regime,
    confidence,
    supportingEvidence,
    contradictingEvidence,
    supportingFacts: supportingEvidence,
    contradictingFacts: contradictingEvidence,
    classification: 'MODEL_ESTIMATE'
  });
}
