import { deepFreeze, computeExposureHash, SensitivityTier } from './exposure.types.js';

/**
 * Phase 30 — Deterministic Macro & Phase 19 Scenario Sensitivity Engine
 */
export class ExposureMacroScenarioEngine {
  /**
   * Evaluate Macro Factor Sensitivities
   * @param {Object} params
   * @param {Record<string, number>} params.macroBetaSensitivities Map of macro factor (e.g. RATES, INFLATION, OIL, FX_USD) to sensitivity
   * @param {SensitivityTier} params.tier
   */
  static evaluateMacroSensitivities({
    macroBetaSensitivities = {},
    tier = SensitivityTier.DERIVED
  } = {}) {
    const sensitivities = {};
    for (const [key, val] of Object.entries(macroBetaSensitivities)) {
      sensitivities[key] = {
        sensitivity: Number(val.toFixed(4)),
        tier,
        evaluatedAt: new Date().toISOString()
      };
    }
    return deepFreeze({
      sensitivities,
      count: Object.keys(sensitivities).length
    });
  }

  /**
   * Run Scenario Sensitivity Analysis (Reusing Phase 19 Scenarios)
   * @param {Object} params
   * @param {string} params.scenarioName e.g. 'RATE_SHOCK_200BPS', 'TECH_CRASH', 'COVID_SHOCK', 'GFC_2008'
   * @param {Record<string, number>} params.factorShocks Map of factor name to shock percentage
   * @param {Record<string, number>} params.portfolioFactorBetas Map of portfolio factor beta
   * @param {number} params.liquidityStressDragBps
   */
  static evaluateScenarioSensitivity({
    scenarioName = 'RATE_SHOCK_200BPS',
    factorShocks = {},
    portfolioFactorBetas = {},
    liquidityStressDragBps = 25
  } = {}) {
    let totalFactorImpact = 0;
    const factorImpactBreakdown = {};

    for (const [fName, beta] of Object.entries(portfolioFactorBetas)) {
      const shock = factorShocks[fName] || 0;
      const impact = beta * shock;
      factorImpactBreakdown[fName] = Number(impact.toFixed(6));
      totalFactorImpact += impact;
    }

    const liquidityDrag = (liquidityStressDragBps / 10000);
    const expectedPortfolioImpact = totalFactorImpact - liquidityDrag;

    const result = {
      scenarioName,
      expectedPortfolioImpact: Number(expectedPortfolioImpact.toFixed(6)),
      totalFactorImpact: Number(totalFactorImpact.toFixed(6)),
      factorImpactBreakdown,
      liquidityDrag: Number(liquidityDrag.toFixed(6)),
      tier: SensitivityTier.SCENARIO_INPUT,
      simulatedAt: new Date().toISOString()
    };

    result.hash = computeExposureHash(result);
    return deepFreeze(result);
  }
}
