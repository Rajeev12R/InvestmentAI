/**
 * Phase 17 — Tax-Aware Scenario Engine
 * Evaluates Scenarios A–E across Return, Tax Drag, Turnover, and Friction
 */

import { deepFreeze, ScenarioType, TaxLabel, TaxStatus } from './tax.types.js';
import { TaxRebalanceEngine } from './tax.rebalance.engine.js';
import { TaxHarvestingEngine } from './tax.harvesting.engine.js';

export class TaxScenarioEngine {
  /**
   * Generates comparative deterministic evaluation across Scenarios A–E.
   */
  static evaluateScenarios(params) {
    const {
      portfolioId,
      workspaceId,
      currentWeights,
      targetWeights,
      currentPrices,
      portfolioValue,
      openLotsBySecurity = {},
      allOpenLots = [],
      expectedReturns = {},
      volatilities = {},
      constraints = {},
      policy,
      asOf,
      jurisdiction = 'US',
      accountType = 'TAXABLE'
    } = params;

    const rebalanceRes = TaxRebalanceEngine.generateTaxAwareRebalance({
      portfolioId,
      workspaceId,
      currentWeights,
      targetWeights,
      currentPrices,
      portfolioValue,
      openLotsBySecurity,
      expectedReturns,
      volatilities,
      constraints,
      policy,
      asOf,
      jurisdiction,
      accountType
    });

    if (rebalanceRes.status !== TaxStatus.PASS) {
      return deepFreeze({
        status: rebalanceRes.status,
        reason: rebalanceRes.reason
      });
    }

    const harvestRes = TaxHarvestingEngine.identifyHarvestCandidates({
      openLots: allOpenLots.length > 0 ? allOpenLots : Object.values(openLotsBySecurity).flat(),
      currentPrices,
      asOf,
      jurisdiction,
      accountType
    });

    // Base current expected return
    let curExpRet = 0;
    for (const [secId, w] of Object.entries(currentWeights)) {
      curExpRet += w * (expectedReturns[secId] || 0.08);
    }

    // Scenario A: No Rebalance
    const scenarioA = {
      scenario: ScenarioType.A_NO_REBALANCE,
      description: 'Do not trade; hold current portfolio allocation',
      turnover: 0.0,
      transactionCost: 0.0,
      estimatedTax: 0.0,
      taxDrag: 0.0,
      expectedReturn: curExpRet,
      afterTaxExpectedReturn: curExpRet,
      taxSavingsVsTarget: rebalanceRes.nominalRebalance.realizedTax,
      complianceStatus: 'PASS'
    };

    // Scenario B: Full Target Rebalance
    const scenarioB = {
      scenario: ScenarioType.B_FULL_TARGET,
      description: 'Rebalance fully to Phase 14 target allocation ignoring tax friction',
      turnover: rebalanceRes.nominalRebalance.turnover,
      transactionCost: rebalanceRes.nominalRebalance.transactionCost,
      estimatedTax: rebalanceRes.nominalRebalance.realizedTax,
      taxDrag: rebalanceRes.nominalRebalance.taxDrag,
      expectedReturn: rebalanceRes.nominalRebalance.expectedReturn,
      afterTaxExpectedReturn: rebalanceRes.nominalRebalance.afterTaxExpectedReturn,
      taxSavingsVsTarget: 0.0,
      complianceStatus: 'PASS'
    };

    // Scenario C: Tax-Aware Rebalance
    const scenarioC = {
      scenario: ScenarioType.C_TAX_AWARE,
      description: 'Tax-aware rebalance mitigating STCG realization and turnover',
      turnover: rebalanceRes.taxAwareRebalance.turnover,
      transactionCost: rebalanceRes.taxAwareRebalance.transactionCost,
      estimatedTax: rebalanceRes.taxAwareRebalance.realizedTax,
      taxDrag: rebalanceRes.taxAwareRebalance.taxDrag,
      expectedReturn: rebalanceRes.taxAwareRebalance.expectedReturn,
      afterTaxExpectedReturn: rebalanceRes.taxAwareRebalance.afterTaxExpectedReturn,
      taxSavingsVsTarget: rebalanceRes.taxSavings,
      complianceStatus: 'PASS'
    };

    // Scenario D: Harvesting Only
    const harvestTaxBenefit = harvestRes.status === TaxStatus.PASS ? harvestRes.totalEstimatedTaxBenefit : 0;
    const harvestTxCost = harvestRes.status === TaxStatus.PASS ? harvestRes.candidateCount * 5.0 : 0;
    const scenarioD = {
      scenario: ScenarioType.D_HARVEST_ONLY,
      description: 'Harvest eligible tax-loss lots only without portfolio rebalancing',
      turnover: harvestRes.candidateCount > 0 ? 0.05 : 0.0,
      transactionCost: harvestTxCost,
      estimatedTax: -harvestTaxBenefit, // Negative indicates tax benefit/credit
      taxDrag: -(harvestTaxBenefit - harvestTxCost) / portfolioValue,
      expectedReturn: curExpRet,
      afterTaxExpectedReturn: curExpRet + (harvestTaxBenefit - harvestTxCost) / portfolioValue,
      taxSavingsVsTarget: rebalanceRes.nominalRebalance.realizedTax + harvestTaxBenefit,
      complianceStatus: 'PASS'
    };

    // Scenario E: Partial Rebalance (50% Target Glidepath)
    const partialTurnover = rebalanceRes.nominalRebalance.turnover * 0.5;
    const partialTxCost = rebalanceRes.nominalRebalance.transactionCost * 0.5;
    const partialTax = rebalanceRes.nominalRebalance.realizedTax * 0.5;
    const partialExpRet = curExpRet + (rebalanceRes.nominalRebalance.expectedReturn - curExpRet) * 0.5;
    const partialDrag = (partialTax + partialTxCost) / portfolioValue;

    const scenarioE = {
      scenario: ScenarioType.E_PARTIAL_REBALANCE,
      description: '50% partial rebalance glidepath toward target',
      turnover: partialTurnover,
      transactionCost: partialTxCost,
      estimatedTax: partialTax,
      taxDrag: partialDrag,
      expectedReturn: partialExpRet,
      afterTaxExpectedReturn: partialExpRet - partialDrag,
      taxSavingsVsTarget: rebalanceRes.nominalRebalance.realizedTax - partialTax,
      complianceStatus: 'PASS'
    };

    const scenarios = [scenarioA, scenarioB, scenarioC, scenarioD, scenarioE];

    return deepFreeze({
      status: TaxStatus.PASS,
      portfolioId,
      workspaceId,
      asOf,
      scenarios,
      taxLabel: TaxLabel.ESTIMATED,
      preferredScenario: rebalanceRes.decision === TaxStatus.TAX_AWARE_REBALANCE_PREFERRED ? ScenarioType.C_TAX_AWARE : ScenarioType.B_FULL_TARGET
    });
  }
}
