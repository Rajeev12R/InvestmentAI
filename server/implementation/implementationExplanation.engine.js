/**
 * Phase 15 — Implementation Explanation DAG Engine
 * 
 * Constructs deterministic audit and explanation graphs linking Phase 14 targets, approvals,
 * implementation plans, actual holdings, reconciliations, drift, constraint states, triggers, and costs.
 */

import { ImplementationStatus, canonicalHash, deepFreeze } from './implementation.types.js';

export class ImplementationExplanationEngine {
  /**
   * Build complete DAG explanation graph for an implementation intelligence package.
   */
  static buildExplanationGraph(params) {
    const {
      workspaceId,
      portfolioId,
      asOf = new Date().toISOString(),
      targetPackage,
      plan,
      holdingsSnapshot,
      reconciliation,
      driftReport,
      constraintReport,
      triggerReport,
      impactReport,
      qualityReport
    } = params;

    const nodes = [];
    const edges = [];

    // Root: Target Allocation
    nodes.push({
      id: 'NODE_TARGET_PORTFOLIO',
      type: 'TARGET_ALLOCATION',
      label: 'Phase 14 Target Allocation',
      packageHash: targetPackage?.packageHash || 'N/A',
      data: { positionCount: Object.keys(targetPackage?.targetWeights || {}).length }
    });

    // Node 1: Plan Generation
    nodes.push({
      id: 'NODE_IMPLEMENTATION_PLAN',
      type: 'TRADE_PLAN',
      label: 'Implementation Plan & Trade Orders',
      planHash: plan?.planHash || 'N/A',
      data: {
        orderCount: plan?.orderCount || 0,
        turnover: plan?.oneWayTurnover || 0,
        approvalStatus: plan?.approvalStatus || 'PENDING'
      }
    });
    edges.push({ from: 'NODE_TARGET_PORTFOLIO', to: 'NODE_IMPLEMENTATION_PLAN', relation: 'DERIVES_TRADE_ORDERS' });

    // Node 2: Actual Holdings Snapshot
    nodes.push({
      id: 'NODE_ACTUAL_HOLDINGS',
      type: 'HOLDINGS_SNAPSHOT',
      label: 'Reported Actual Holdings',
      snapshotHash: holdingsSnapshot?.snapshotHash || 'N/A',
      data: {
        totalValue: holdingsSnapshot?.totalValue || 0,
        positionCount: holdingsSnapshot?.positionCount || 0
      }
    });

    // Node 3: Holdings Reconciliation
    nodes.push({
      id: 'NODE_RECONCILIATION',
      type: 'RECONCILIATION',
      label: '3-Way Holdings Reconciliation',
      reconciliationHash: reconciliation?.reconciliationHash || 'N/A',
      data: {
        completenessRatio: reconciliation?.completenessRatio || 0,
        matched: reconciliation?.matchedCount || 0,
        drifted: reconciliation?.driftedCount || 0,
        missing: reconciliation?.missingCount || 0
      }
    });
    edges.push({ from: 'NODE_IMPLEMENTATION_PLAN', to: 'NODE_RECONCILIATION', relation: 'RECONCILED_AGAINST_PLAN' });
    edges.push({ from: 'NODE_ACTUAL_HOLDINGS', to: 'NODE_RECONCILIATION', relation: 'AUDITS_REPORTED_HOLDINGS' });

    // Node 4: Portfolio Drift
    nodes.push({
      id: 'NODE_DRIFT',
      type: 'PORTFOLIO_DRIFT',
      label: 'Portfolio & Sector Drift Audit',
      driftHash: driftReport?.driftHash || 'N/A',
      data: {
        status: driftReport?.overallStatus || 'IN_TOLERANCE',
        maxDrift: driftReport?.maxAbsolutePositionDrift || 0
      }
    });
    edges.push({ from: 'NODE_RECONCILIATION', to: 'NODE_DRIFT', relation: 'MEASURES_ALLOCATION_DRIFT' });

    // Node 5: Constraint Monitoring
    nodes.push({
      id: 'NODE_CONSTRAINTS',
      type: 'CONSTRAINT_MONITORING',
      label: 'Institutional Mandate Constraints',
      reportHash: constraintReport?.reportHash || 'N/A',
      data: {
        status: constraintReport?.overallStatus || 'PASS',
        breachCount: constraintReport?.breachCount || 0
      }
    });
    edges.push({ from: 'NODE_ACTUAL_HOLDINGS', to: 'NODE_CONSTRAINTS', relation: 'EVALUATES_ACTIVE_HOLDINGS' });

    // Node 6: Rebalance Triggers
    nodes.push({
      id: 'NODE_TRIGGERS',
      type: 'REBALANCE_TRIGGER',
      label: 'Multi-Factor Rebalance Triggers',
      triggerHash: triggerReport?.triggerHash || 'N/A',
      data: {
        status: triggerReport?.rebalanceStatus || 'NO_REBALANCE',
        activeTriggers: triggerReport?.activeTriggerCount || 0
      }
    });
    edges.push({ from: 'NODE_DRIFT', to: 'NODE_TRIGGERS', relation: 'EVALUATES_DRIFT_TRIGGERS' });
    edges.push({ from: 'NODE_CONSTRAINTS', to: 'NODE_TRIGGERS', relation: 'EVALUATES_MANDATE_BREACHES' });

    // Node 7: Transaction Cost & Impact
    nodes.push({
      id: 'NODE_IMPACT',
      type: 'TRANSACTION_IMPACT',
      label: 'Cost, Liquidity & Tax Impact',
      impactHash: impactReport?.impactHash || 'N/A',
      data: {
        costBps: impactReport?.totalCostBps || 0,
        netBenefitBps: impactReport?.netExpectedBenefitBps || 'UNAVAILABLE'
      }
    });
    edges.push({ from: 'NODE_IMPLEMENTATION_PLAN', to: 'NODE_IMPACT', relation: 'ESTIMATES_EXECUTION_COST' });

    // Node 8: Implementation Quality Score
    nodes.push({
      id: 'NODE_QUALITY',
      type: 'QUALITY_SCORE',
      label: 'Execution Fidelity & Quality Score',
      qualityHash: qualityReport?.qualityHash || 'N/A',
      data: {
        qualityScore: qualityReport?.qualityScore || 'ACCEPTABLE',
        trackingError: qualityReport?.rmsWeightTrackingError || 0
      }
    });
    edges.push({ from: 'NODE_RECONCILIATION', to: 'NODE_QUALITY', relation: 'SCORES_FIDELITY' });
    edges.push({ from: 'NODE_CONSTRAINTS', to: 'NODE_QUALITY', relation: 'INCORPORATES_MANDATE_COMPLIANCE' });

    const payload = {
      graphId: `DAG-IMPL-${portfolioId}-${asOf.replace(/[:.]/g, '-')}`,
      workspaceId,
      portfolioId,
      asOf,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      nodes,
      edges,
      createdAt: asOf
    };

    const hash = canonicalHash(payload);
    const sealedGraph = deepFreeze({
      ...payload,
      graphHash: hash
    });

    return {
      status: ImplementationStatus.RECONCILED,
      explanationGraph: sealedGraph
    };
  }
}
