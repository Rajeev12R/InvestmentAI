/**
 * Phase 17 — Tax Rule & Pipeline Orchestration Engine
 * End-to-End Deterministic Tax Evaluation Pipeline
 */

import { deepFreeze, TaxStatus } from './tax.types.js';
import { TaxJurisdictionEngine } from './tax.jurisdiction.js';
import { TaxAccountEngine } from './tax.account.js';
import { TaxUnrealizedGainEngine } from './tax.unrealizedGain.engine.js';
import { TaxAfterTaxReturnEngine } from './tax.afterTaxReturn.engine.js';
import { TaxHarvestingEngine } from './tax.harvesting.engine.js';
import { TaxRebalanceEngine } from './tax.rebalance.engine.js';
import { TaxScenarioEngine } from './tax.scenario.engine.js';
import { TaxExplanationEngine } from './tax.explanation.engine.js';
import { TaxIntelligencePackageBuilder } from './tax.package.js';
import { TAX_POLICY_V1 } from './tax.config.js';
import { taxRepository } from './tax.repository.js';

export class TaxRuleEngine {
  /**
   * Executes the comprehensive deterministic tax intelligence pipeline.
   */
  static evaluatePortfolioTax(params) {
    const {
      workspaceId,
      portfolioId,
      asOf,
      jurisdiction = 'US',
      accountType = 'TAXABLE',
      openLots = [],
      currentPrices = {},
      portfolioValue = 1000000,
      preTaxTwr = 0.12,
      preTaxMwr = 0.11,
      targetWeights = {},
      currentWeights = {},
      expectedReturns = {},
      volatilities = {},
      constraints = {},
      policy = TAX_POLICY_V1,
      actor = 'SYSTEM'
    } = params;

    if (!workspaceId || !portfolioId || !asOf) {
      return deepFreeze({
        status: TaxStatus.INVALID_INPUT,
        reason: 'Missing workspaceId, portfolioId, or asOf date'
      });
    }

    // 1. Account Validation
    const acctRes = TaxAccountEngine.validateAccount({
      accountId: portfolioId,
      workspaceId,
      portfolioId,
      jurisdiction,
      accountType,
      baseCurrency: jurisdiction === 'IN' ? 'INR' : 'USD'
    });

    if (acctRes.status !== TaxStatus.PASS) {
      return deepFreeze({
        status: acctRes.status,
        reason: acctRes.reason
      });
    }

    // 2. Jurisdiction Rule Validation
    const jurRes = TaxJurisdictionEngine.getJurisdictionRule(jurisdiction, asOf);
    if (jurRes.status !== TaxStatus.PASS) {
      return deepFreeze({
        status: jurRes.status,
        reason: jurRes.reason
      });
    }

    // 3. Mark-to-Market Unrealized Gains
    let unrealizedRes = null;
    if (openLots.length > 0) {
      unrealizedRes = TaxUnrealizedGainEngine.calculateUnrealizedGains(
        openLots,
        currentPrices,
        asOf,
        jurisdiction,
        accountType
      );
      if (unrealizedRes.status !== TaxStatus.PASS) {
        return deepFreeze({
          status: unrealizedRes.status,
          reason: unrealizedRes.reason
        });
      }
    }

    // 4. After-Tax Return & Drag
    const afterTaxRes = TaxAfterTaxReturnEngine.calculateAfterTaxReturns({
      preTaxTwr,
      preTaxMwr,
      portfolioValue,
      realizedTax: 0,
      dividendTax: 0,
      transactionCosts: 0,
      unrealizedEmbeddedTax: unrealizedRes ? unrealizedRes.totalEmbeddedTaxLiability : 0
    });

    // 5. Tax-Loss Harvesting Candidates
    const harvestRes = TaxHarvestingEngine.identifyHarvestCandidates({
      openLots,
      currentPrices,
      asOf,
      jurisdiction,
      accountType
    });

    // 6. Tax-Aware Rebalancing Evaluation
    let rebalanceRes = null;
    if (Object.keys(targetWeights).length > 0 && Object.keys(currentWeights).length > 0) {
      const openLotsBySec = {};
      for (const lot of openLots) {
        if (!openLotsBySec[lot.securityId]) openLotsBySec[lot.securityId] = [];
        openLotsBySec[lot.securityId].push(lot);
      }

      rebalanceRes = TaxRebalanceEngine.generateTaxAwareRebalance({
        portfolioId,
        workspaceId,
        currentWeights,
        targetWeights,
        currentPrices,
        portfolioValue,
        openLotsBySecurity: openLotsBySec,
        expectedReturns,
        volatilities,
        constraints,
        policy,
        asOf,
        jurisdiction,
        accountType
      });
    }

    // 7. Scenarios A–E
    let scenarioRes = null;
    if (Object.keys(targetWeights).length > 0 && Object.keys(currentWeights).length > 0) {
      const openLotsBySec = {};
      for (const lot of openLots) {
        if (!openLotsBySec[lot.securityId]) openLotsBySec[lot.securityId] = [];
        openLotsBySec[lot.securityId].push(lot);
      }

      scenarioRes = TaxScenarioEngine.evaluateScenarios({
        portfolioId,
        workspaceId,
        currentWeights,
        targetWeights,
        currentPrices,
        portfolioValue,
        openLotsBySecurity: openLotsBySec,
        allOpenLots: openLots,
        expectedReturns,
        volatilities,
        constraints,
        policy,
        asOf,
        jurisdiction,
        accountType
      });
    }

    // 8. Explanation DAG
    const dag = TaxExplanationEngine.generateExplanationDAG({
      portfolioId,
      workspaceId,
      asOf,
      jurisdiction,
      taxLots: openLots,
      harvestingCandidates: harvestRes.candidates || [],
      rebalanceProposal: rebalanceRes,
      policyVersion: policy.policyId
    });

    // 9. Seal TaxIntelligencePackage
    const sealedPackage = TaxIntelligencePackageBuilder.sealPackage({
      packageVersion: '1.0.0',
      policyVersion: policy.policyId,
      workspaceId,
      portfolioId,
      asOf,
      jurisdiction,
      taxAccountContext: acctRes.account,
      taxLots: openLots,
      unrealizedGains: unrealizedRes,
      taxDrag: afterTaxRes.taxDrag,
      afterTaxReturns: afterTaxRes,
      harvestingCandidates: harvestRes.candidates || [],
      taxAwareRebalance: rebalanceRes,
      scenarios: scenarioRes ? scenarioRes.scenarios : [],
      evidenceGraph: dag
    });

    // 10. Persist Package & Record Audit Event
    taxRepository.savePackage(workspaceId, sealedPackage);
    taxRepository.recordAuditEvent(workspaceId, {
      portfolioId,
      action: 'TAX_INTELLIGENCE_EVALUATION',
      actor,
      packageId: sealedPackage.packageId,
      packageHash: sealedPackage.packageHash,
      asOf
    });

    return sealedPackage;
  }
}
