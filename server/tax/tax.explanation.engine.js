/**
 * Phase 17 — Tax Explanation DAG & Copilot Read-Only Engine
 * Deterministic Lineage Graphs & AI Decision Support
 */

import { canonicalHash, deepFreeze, TaxStatus } from './tax.types.js';

export class TaxExplanationEngine {
  /**
   * Constructs the causal explanation DAG for a sealed tax intelligence outcome.
   */
  static generateExplanationDAG(taxContext) {
    const {
      portfolioId,
      workspaceId,
      asOf,
      jurisdiction,
      taxLots = [],
      realizedGains = [],
      harvestingCandidates = [],
      rebalanceProposal = null,
      policyVersion
    } = taxContext;

    const nodes = [];
    const edges = [];

    // Root Decision Node
    const rootId = `TAX_DECISION_${portfolioId}`;
    nodes.push({
      id: rootId,
      type: 'TAX_DECISION_ROOT',
      label: `Tax Intelligence & Optimization Plan for ${portfolioId}`,
      asOf,
      jurisdiction,
      policyVersion
    });

    // Policy Rule Node
    const policyNodeId = `TAX_POLICY_${policyVersion || 'V1'}`;
    nodes.push({
      id: policyNodeId,
      type: 'TAX_POLICY_RULE',
      label: `Configured Tax Policy ${policyVersion || 'V1'} (${jurisdiction})`,
      jurisdiction
    });
    edges.push({ from: rootId, to: policyNodeId, relation: 'GOVERNED_BY' });

    // Tax Lots Nodes
    for (const lot of taxLots.slice(0, 10)) { // Include sample / top lots
      const lotNodeId = `LOT_${lot.lotId}`;
      nodes.push({
        id: lotNodeId,
        type: 'TAX_LOT',
        label: `Lot ${lot.lotId} (${lot.securityId}: ${lot.quantity} shares @ $${lot.acquisitionPrice})`,
        costBasis: lot.costBasis,
        acquisitionDate: lot.acquisitionDate
      });
      edges.push({ from: rootId, to: lotNodeId, relation: 'HOLDING_TAX_LOT' });
    }

    // Harvesting Candidates Nodes
    for (const cand of harvestingCandidates) {
      const candNodeId = `HARVEST_${cand.lotId}`;
      nodes.push({
        id: candNodeId,
        type: 'HARVEST_CANDIDATE',
        label: `Tax-Loss Harvest: ${cand.securityId} (Unrealized Loss: $${cand.unrealizedLoss.toFixed(2)}, Est Benefit: $${cand.estimatedTaxBenefit.toFixed(2)})`,
        washSaleStatus: cand.washSaleStatus,
        status: cand.status
      });
      edges.push({ from: rootId, to: candNodeId, relation: 'PROPOSED_HARVEST' });
      edges.push({ from: candNodeId, to: `LOT_${cand.lotId}`, relation: 'HARVESTS_LOT' });
    }

    // Rebalance Proposal Node
    if (rebalanceProposal && rebalanceProposal.status === 'PASS') {
      const rebNodeId = `REBALANCE_${portfolioId}`;
      const realizedTax = rebalanceProposal.taxAwareRebalance?.realizedTax ?? 0;
      const taxSavings = rebalanceProposal.taxSavings ?? 0;
      nodes.push({
        id: rebNodeId,
        type: 'TAX_AWARE_REBALANCE',
        label: `Tax-Aware Rebalance Proposal (Realized Tax: $${Number(realizedTax).toFixed(2)}, Tax Savings: $${Number(taxSavings).toFixed(2)})`,
        decision: rebalanceProposal.decision || 'EVALUATED'
      });
      edges.push({ from: rootId, to: rebNodeId, relation: 'RECOMMENDS_REBALANCE' });
    }

    const dag = {
      nodes,
      edges,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      dagHash: canonicalHash({ nodes, edges })
    };

    return deepFreeze(dag);
  }

  /**
   * Generates a deterministic, factual Copilot explanation from a sealed package.
   */
  static generateCopilotExplanation(sealedPackage, query) {
    if (!sealedPackage || !sealedPackage.packageHash) {
      return deepFreeze({
        status: TaxStatus.INVALID_INPUT,
        explanation: 'Cannot explain: Sealed Tax Intelligence Package is missing or invalid'
      });
    }

    const { portfolioId, jurisdiction, taxDrag, harvesting, taxAwareRebalance, dataProvenance } = sealedPackage;

    const queryLower = (query || '').toLowerCase();
    let responseText = '';

    if (queryLower.includes('harvest') || queryLower.includes('loss')) {
      const count = harvesting?.candidateCount || 0;
      const benefit = harvesting?.totalEstimatedTaxBenefit || 0;
      responseText = `Found ${count} tax-loss harvesting candidate(s) under jurisdiction ${jurisdiction} with total estimated tax benefit of $${benefit.toFixed(2)}. Wash-sale rules and transaction cost hurdles have been deterministically applied.`;
    } else if (queryLower.includes('drag') || queryLower.includes('performance')) {
      const dragPct = taxDrag?.taxDragPercent ? (taxDrag.taxDragPercent * 100).toFixed(2) : '0.00';
      responseText = `Portfolio ${portfolioId} experienced an estimated tax drag of ${dragPct}% (${(taxDrag?.taxDrag * 100 || 0).toFixed(2)}% return deduction) based on realized gains and dividend tax liabilities.`;
    } else if (queryLower.includes('rebalance') || queryLower.includes('trade')) {
      const savings = taxAwareRebalance?.taxSavings || 0;
      responseText = `Tax-aware rebalance optimization is ${taxAwareRebalance?.decision === TaxStatus.TAX_AWARE_REBALANCE_PREFERRED ? 'PREFERRED' : 'EVALUATED'}. It reduces realized tax liability by $${savings.toFixed(2)} compared to a full nominal target rebalance while satisfying all Phase 14, 15, and 16 constraints.`;
    } else {
      responseText = `Sealed Tax Intelligence Package for portfolio ${portfolioId} (${jurisdiction}): Tax-aware rebalance decision is '${taxAwareRebalance?.decision || 'N/A'}', with ${harvesting?.candidateCount || 0} harvest candidate(s). Data provenance: ${dataProvenance}. Note: InvestmentAI is decision-support only and does not provide legal or tax advice.`;
    }

    return deepFreeze({
      status: TaxStatus.PASS,
      portfolioId,
      jurisdiction,
      query,
      explanation: responseText,
      disclaimer: 'InvestmentAI is a deterministic decision-support intelligence platform and does not provide tax or legal advice.',
      packageHash: sealedPackage.packageHash
    });
  }
}
