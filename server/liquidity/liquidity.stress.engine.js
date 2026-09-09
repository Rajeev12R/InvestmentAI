/**
 * Phase 18 — Institutional Liquidity Stress Engine
 * Simulates ADV contractions, spread expansions, impact multiplier shifts, and joint stress scenarios.
 */

import { LiquidityStatus, StressScenarioType, LiquidityDataStatus, ValueStatus, deepFreeze } from './liquidity.types.js';
import { LIQUIDITY_POLICY_V1 } from './liquidity.config.js';
import { LiquidityValidationEngine } from './liquidity.validation.engine.js';
import { LiquidityCostEngine } from './liquidity.cost.engine.js';
import { LiquidityHorizonEngine } from './liquidity.horizon.engine.js';

export class LiquidityStressEngine {
  /**
   * Evaluates base vs stressed liquidity outcomes for a single order or portfolio position.
   */
  static evaluateStressScenario(params) {
    const {
      orderNotional,
      orderQuantity,
      adv,
      dollarAdv,
      spreadBps = 10.0,
      referencePrice = 100.0,
      scenarioType = StressScenarioType.JOINT_STRESS_SEVERE,
      customMultipliers = null,
      policy = LIQUIDITY_POLICY_V1
    } = params;

    const notionalVal = LiquidityValidationEngine.validateOrder(orderQuantity, orderNotional, referencePrice);
    if (!notionalVal.isValid) return notionalVal;

    const advVal = LiquidityValidationEngine.validateAdv(dollarAdv || (adv ? adv * referencePrice : null));
    if (!advVal.isValid) return advVal;

    const baseDollarAdv = advVal.adv;
    const baseSpreadBps = Number(spreadBps) || 10.0;
    const baseQty = notionalVal.quantity;
    const baseNotional = notionalVal.notional;

    // Determine multipliers
    let multipliers = policy.stressMultipliers[scenarioType] || { advMultiplier: 0.50, spreadMultiplier: 2.0, impactMultiplier: 2.0 };
    if (customMultipliers) {
      multipliers = {
        advMultiplier: customMultipliers.advMultiplier !== undefined ? Number(customMultipliers.advMultiplier) : 1.0,
        spreadMultiplier: customMultipliers.spreadMultiplier !== undefined ? Number(customMultipliers.spreadMultiplier) : 1.0,
        impactMultiplier: customMultipliers.impactMultiplier !== undefined ? Number(customMultipliers.impactMultiplier) : 1.0
      };
    }

    // Validate multipliers
    if (multipliers.advMultiplier <= 0 || multipliers.spreadMultiplier <= 0 || multipliers.impactMultiplier <= 0) {
      return deepFreeze({
        status: LiquidityStatus.INVALID_INPUT,
        reason: 'Stress multipliers must be strictly positive numbers'
      });
    }

    // 1. Base Calculations
    const baseCost = LiquidityCostEngine.calculateTradingCost({
      orderNotional: baseNotional,
      dollarAdv: baseDollarAdv,
      spreadBps: baseSpreadBps,
      policy
    });

    const baseHorizon = LiquidityHorizonEngine.calculateLiquidationHorizon({
      orderQuantity: baseQty,
      orderNotional: baseNotional,
      adv: adv || (baseDollarAdv / referencePrice),
      dollarAdv: baseDollarAdv,
      referencePrice,
      policy
    });

    // 2. Stressed Parameters
    const stressedDollarAdv = baseDollarAdv * multipliers.advMultiplier;
    const stressedSpreadBps = baseSpreadBps * multipliers.spreadMultiplier;
    const stressedImpactConfig = {
      ...policy.impactModel,
      defaultCoefficient: policy.impactModel.defaultCoefficient * multipliers.impactMultiplier
    };
    const stressedPolicy = {
      ...policy,
      impactModel: stressedImpactConfig
    };

    // 3. Stressed Calculations
    const stressedCost = LiquidityCostEngine.calculateTradingCost({
      orderNotional: baseNotional,
      dollarAdv: stressedDollarAdv,
      spreadBps: stressedSpreadBps,
      policy: stressedPolicy
    });

    const stressedAdvUnits = (adv ? adv : (baseDollarAdv / referencePrice)) * multipliers.advMultiplier;
    const stressedHorizon = LiquidityHorizonEngine.calculateLiquidationHorizon({
      orderQuantity: baseQty,
      orderNotional: baseNotional,
      adv: stressedAdvUnits,
      dollarAdv: stressedDollarAdv,
      referencePrice,
      policy: stressedPolicy
    });

    // 4. Comparison Deltas
    const costIncreaseBps = stressedCost.totalCostBps - baseCost.totalCostBps;
    const costIncreaseCost = stressedCost.totalEstimatedCost - baseCost.totalEstimatedCost;
    const costIncreaseRatio = baseCost.totalEstimatedCost > 0 ? (stressedCost.totalEstimatedCost / baseCost.totalEstimatedCost) : 1.0;
    const horizonIncreaseDays = stressedHorizon.requiredTradingDays - baseHorizon.requiredTradingDays;

    return deepFreeze({
      status: LiquidityStatus.PASS,
      scenarioType,
      multipliers,
      base: {
        dollarAdv: baseDollarAdv,
        spreadBps: baseSpreadBps,
        totalCostBps: baseCost.totalCostBps,
        totalEstimatedCost: baseCost.totalEstimatedCost,
        requiredTradingDays: baseHorizon.requiredTradingDays,
        isFeasibleWithinLimit: baseHorizon.isFeasibleWithinLimit
      },
      stressed: {
        dollarAdv: stressedDollarAdv,
        spreadBps: stressedSpreadBps,
        totalCostBps: stressedCost.totalCostBps,
        totalEstimatedCost: stressedCost.totalEstimatedCost,
        requiredTradingDays: stressedHorizon.requiredTradingDays,
        isFeasibleWithinLimit: stressedHorizon.isFeasibleWithinLimit
      },
      delta: {
        costIncreaseBps: Math.round(costIncreaseBps * 100) / 100,
        costIncreaseCost: Math.round(costIncreaseCost * 100) / 100,
        costIncreaseRatio: Math.round(costIncreaseRatio * 100) / 100,
        horizonIncreaseDays
      },
      methodologyVersion: 'LIQ_STRESS_V1',
      valueStatus: ValueStatus.MODEL_ESTIMATE,
      inputStatuses: [ValueStatus.CONFIGURED, ValueStatus.DERIVED, ValueStatus.MODEL_ESTIMATE],
      dataStatus: LiquidityDataStatus.ESTIMATED
    });
  }

  /**
   * Runs the full battery of standard stress scenarios.
   */
  static runAllStandardScenarios(params) {
    const scenarios = [
      StressScenarioType.ADV_CONTRACTION_25,
      StressScenarioType.ADV_CONTRACTION_50,
      StressScenarioType.ADV_CONTRACTION_75,
      StressScenarioType.SPREAD_EXPANSION_1_5X,
      StressScenarioType.SPREAD_EXPANSION_2X,
      StressScenarioType.SPREAD_EXPANSION_3X,
      StressScenarioType.IMPACT_COEFFICIENT_1_5X,
      StressScenarioType.IMPACT_COEFFICIENT_2X,
      StressScenarioType.JOINT_STRESS_SEVERE
    ];

    const results = {};
    for (const sc of scenarios) {
      results[sc] = this.evaluateStressScenario({ ...params, scenarioType: sc });
    }

    return deepFreeze({
      status: LiquidityStatus.PASS,
      scenarios: results,
      valueStatus: ValueStatus.MODEL_ESTIMATE,
      inputStatuses: [ValueStatus.CONFIGURED, ValueStatus.DERIVED, ValueStatus.MODEL_ESTIMATE],
      dataStatus: LiquidityDataStatus.ESTIMATED
    });
  }
}
