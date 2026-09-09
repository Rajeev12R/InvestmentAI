/**
 * server/scenario/scenario.engine.js
 * 
 * Phase 19: Scenario Analysis & Stress Intelligence Engine
 * Unified orchestrator for security-level and portfolio-level stress simulations,
 * reverse break-even solving, multi-scenario comparisons, and tax/liquidity integration.
 */

import { ValueStatus, ScenarioType } from './scenario.types.js';
import { validateScenarioDefinition, validateReverseScenarioRequest } from './scenario.schema.js';
import { evaluateSecurityScenario } from './scenario.sensitivity.js';
import { aggregatePortfolioScenario } from './scenario.aggregation.js';
import { solveReverseScenario } from './scenario.solver.js';
import { compareScenarios } from './scenario.comparison.js';
import { SCENARIO_CONFIG } from './scenario.config.js';

export class ScenarioEngine {
  constructor(config = {}) {
    this.config = { ...SCENARIO_CONFIG, ...config };
  }

  /**
   * Evaluates a scenario on a single security
   */
  evaluateSecurity(security, scenarioDef, options = {}) {
    validateScenarioDefinition(scenarioDef);
    return evaluateSecurityScenario(security, scenarioDef.shocks, options);
  }

  /**
   * Evaluates a scenario across a full portfolio, with optional tax & liquidity stress integration
   */
  evaluatePortfolio(portfolio, scenarioDef, options = {}) {
    validateScenarioDefinition(scenarioDef);
    
    // Core portfolio stress aggregation
    const aggResult = aggregatePortfolioScenario(portfolio, scenarioDef, options);

    // Optional Phase 17 Tax Stress Integration
    let taxAnalysis = null;
    if (options.includeTaxAnalysis) {
      taxAnalysis = this._evaluateScenarioTaxImpact(portfolio, aggResult, options.taxOptions || {});
    }

    // Optional Phase 18 Stressed Liquidity Integration
    let liquidityAnalysis = null;
    if (options.includeLiquidityAnalysis) {
      liquidityAnalysis = this._evaluateScenarioLiquidityImpact(portfolio, aggResult, options.liquidityOptions || {});
    }

    return {
      ...aggResult,
      taxAnalysis,
      liquidityAnalysis,
      timestamp: new Date().toISOString(),
      engineVersion: this.config.ENGINE_VERSION
    };
  }

  /**
   * Runs reverse / break-even scenario solver
   */
  solveReverse(portfolio, reverseRequest) {
    return solveReverseScenario(portfolio, reverseRequest);
  }

  /**
   * Compares multiple scenarios
   */
  compare(portfolio, scenarioDefs, options = {}) {
    scenarioDefs.forEach(def => validateScenarioDefinition(def));
    return compareScenarios(portfolio, scenarioDefs, options);
  }

  /**
   * Runs a canonical pre-configured macro scenario
   */
  runCanonicalScenario(portfolio, canonicalScenarioKey, options = {}) {
    const canonicalDef = this.config.CANONICAL_SCENARIOS[canonicalScenarioKey];
    if (!canonicalDef) {
      throw new Error(`Unknown canonical scenario: ${canonicalScenarioKey}. Available: ${Object.keys(this.config.CANONICAL_SCENARIOS).join(', ')}`);
    }
    return this.evaluatePortfolio(portfolio, canonicalDef, options);
  }

  /**
   * Evaluates stressed tax impact without double counting (Phase 17 integration)
   */
  _evaluateScenarioTaxImpact(portfolio, aggResult, taxOptions) {
    const taxRate = typeof taxOptions.effectiveTaxRate === 'number' ? taxOptions.effectiveTaxRate : 0.20; // 20% default LTCG rate
    let totalUnrealizedGainBaseline = 0.0;
    let totalUnrealizedGainStressed = 0.0;
    const positionTaxDetails = [];

    for (const posRes of aggResult.positions) {
      const origPos = portfolio.positions.find(p => p.ticker === posRes.ticker) || {};
      
      let costBasis = null;
      let posTaxStatus = ValueStatus.MODEL_ESTIMATE;

      if (typeof origPos.costBasis === 'number' && Number.isFinite(origPos.costBasis)) {
        costBasis = origPos.costBasis;
      } else if (typeof taxOptions.configuredCostBasisFraction === 'number') {
        costBasis = origPos.price * origPos.shares * taxOptions.configuredCostBasisFraction;
        posTaxStatus = ValueStatus.CONFIGURED;
      }

      if (costBasis === null) {
        positionTaxDetails.push({
          ticker: posRes.ticker,
          costBasis: null,
          baselineGain: null,
          stressedGain: null,
          baselineTaxLiability: null,
          stressedTaxLiability: null,
          taxDragDelta: null,
          status: ValueStatus.UNAVAILABLE
        });
        continue;
      }

      const baselineGain = posRes.baseline.marketValue - costBasis;
      const stressedGain = posRes.stressed.marketValue - costBasis;

      const baselineTaxLiability = baselineGain > 0 ? baselineGain * taxRate : 0.0;
      const stressedTaxLiability = stressedGain > 0 ? stressedGain * taxRate : 0.0;

      totalUnrealizedGainBaseline += baselineGain;
      totalUnrealizedGainStressed += stressedGain;

      positionTaxDetails.push({
        ticker: posRes.ticker,
        costBasis,
        baselineGain,
        stressedGain,
        baselineTaxLiability,
        stressedTaxLiability,
        taxDragDelta: stressedTaxLiability - baselineTaxLiability,
        status: posTaxStatus
      });
    }

    const validPositions = positionTaxDetails.filter(p => p.status !== ValueStatus.UNAVAILABLE);
    const totalBaselineTaxLiability = validPositions.reduce((sum, p) => sum + p.baselineTaxLiability, 0);
    const totalStressedTaxLiability = validPositions.reduce((sum, p) => sum + p.stressedTaxLiability, 0);

    return {
      taxRateUsed: taxRate,
      baselineTotalTaxLiability: totalBaselineTaxLiability,
      stressedTotalTaxLiability: totalStressedTaxLiability,
      taxShieldOrDragDelta: totalStressedTaxLiability - totalBaselineTaxLiability,
      afterTaxBaselineNav: aggResult.baseline.nav - totalBaselineTaxLiability,
      afterTaxStressedNav: aggResult.stressed.nav - totalStressedTaxLiability,
      afterTaxPnlDollar: (aggResult.stressed.nav - totalStressedTaxLiability) - (aggResult.baseline.nav - totalBaselineTaxLiability),
      positions: positionTaxDetails,
      status: positionTaxDetails.some(p => p.status === ValueStatus.UNAVAILABLE) ? ValueStatus.UNAVAILABLE : ValueStatus.MODEL_ESTIMATE
    };
  }

  /**
   * Evaluates stressed liquidity impact (Phase 18 integration)
   */
  _evaluateScenarioLiquidityImpact(portfolio, aggResult, liquidityOptions) {
    const povLimit = typeof liquidityOptions.povLimit === 'number' ? liquidityOptions.povLimit : 0.10; // 10% Participation rate
    const liquidationHorizonDays = typeof liquidityOptions.horizonDays === 'number' ? liquidityOptions.horizonDays : 1;
    let totalBaselineLiquidationCost = 0.0;
    let totalStressedLiquidationCost = 0.0;
    const positionLiquidityDetails = [];

    for (const posRes of aggResult.positions) {
      const origPos = portfolio.positions.find(p => p.ticker === posRes.ticker) || {};
      const shares = posRes.shares;
      
      const bAdv = posRes.baseline.adv !== null ? posRes.baseline.adv : (origPos.adv !== undefined ? origPos.adv : null);
      const sAdv = posRes.stressed.adv !== null ? posRes.stressed.adv : (bAdv !== null ? bAdv : null);
      
      const bSpreadBps = posRes.baseline.spreadBps !== null ? posRes.baseline.spreadBps : (origPos.spreadBps !== undefined ? origPos.spreadBps : null);
      const sSpreadBps = posRes.stressed.spreadBps !== null ? posRes.stressed.spreadBps : (bSpreadBps !== null ? bSpreadBps : null);

      if (bAdv === null || sAdv === null || bSpreadBps === null || sSpreadBps === null) {
        positionLiquidityDetails.push({
          ticker: posRes.ticker,
          baselineAdv: bAdv,
          stressedAdv: sAdv,
          baselineDaysToLiquidate: null,
          stressedDaysToLiquidate: null,
          baselineSpreadCost: null,
          stressedSpreadCost: null,
          feasibilityUnderStress: 'UNAVAILABLE',
          status: ValueStatus.UNAVAILABLE
        });
        continue;
      }

      const bSpread = bSpreadBps / 10000;
      const sSpread = sSpreadBps / 10000;

      // Half-spread cost
      const bSpreadCost = posRes.baseline.marketValue * (bSpread / 2);
      const sSpreadCost = posRes.stressed.marketValue * (sSpread / 2);

      // Days to liquidate at POV limit
      const bDaysToLiquidate = shares / (bAdv * povLimit);
      const sDaysToLiquidate = shares / (sAdv * povLimit);

      totalBaselineLiquidationCost += bSpreadCost;
      totalStressedLiquidationCost += sSpreadCost;

      positionLiquidityDetails.push({
        ticker: posRes.ticker,
        baselineAdv: bAdv,
        stressedAdv: sAdv,
        baselineDaysToLiquidate: bDaysToLiquidate,
        stressedDaysToLiquidate: sDaysToLiquidate,
        baselineSpreadCost: bSpreadCost,
        stressedSpreadCost: sSpreadCost,
        feasibilityUnderStress: sDaysToLiquidate <= liquidationHorizonDays ? 'FEASIBLE' : 'CONSTRAINED',
        status: ValueStatus.MODEL_ESTIMATE
      });
    }

    return {
      povLimit,
      liquidationHorizonDays,
      totalBaselineLiquidationCost,
      totalStressedLiquidationCost,
      stressedLiquidityCostIncreaseDollar: totalStressedLiquidationCost - totalBaselineLiquidationCost,
      positions: positionLiquidityDetails,
      status: positionLiquidityDetails.some(p => p.status === ValueStatus.UNAVAILABLE) ? ValueStatus.UNAVAILABLE : ValueStatus.MODEL_ESTIMATE
    };
  }
}
