/**
 * Phase 15 — Implementation Plan Engine
 * 
 * Generates deterministic trade implementation plans translating approved target weights
 * into actionable share and value orders given current holdings and market prices.
 */

import { ImplementationStatus, ImplementationAction, ApprovalStatus, canonicalHash, deepFreeze } from './implementation.types.js';

export class ImplementationPlanEngine {
  /**
   * Generate implementation plan from target portfolio and current holdings.
   */
  static generatePlan(params) {
    const {
      workspaceId,
      portfolioId,
      targetPackage,
      currentHoldingsSnapshot,
      marketPrices = {},
      totalCapital = null,
      asOf = new Date().toISOString()
    } = params;

    if (!workspaceId || !portfolioId) {
      return { status: ImplementationStatus.INVALID_INPUT, reasonCode: 'MISSING_WORKSPACE_OR_PORTFOLIO_ID', plan: null };
    }
    if (!targetPackage || !targetPackage.targetWeights) {
      return { status: ImplementationStatus.INVALID_INPUT, reasonCode: 'MISSING_TARGET_PACKAGE', plan: null };
    }
    if (!currentHoldingsSnapshot || !Array.isArray(currentHoldingsSnapshot.holdings)) {
      return { status: ImplementationStatus.INSUFFICIENT_DATA, reasonCode: 'MISSING_CURRENT_HOLDINGS', plan: null };
    }

    if (totalCapital !== null && totalCapital !== undefined) {
      if (typeof totalCapital !== 'number' || isNaN(totalCapital) || !isFinite(totalCapital) || totalCapital <= 0) {
        return { status: ImplementationStatus.INVALID_INPUT, reasonCode: 'INVALID_PORTFOLIO_CAPITAL', plan: null };
      }
    }

    const portfolioValue = totalCapital !== null && totalCapital !== undefined
      ? totalCapital
      : currentHoldingsSnapshot.totalValue;

    if (!portfolioValue || portfolioValue <= 0) {
      return { status: ImplementationStatus.INVALID_INPUT, reasonCode: 'INVALID_PORTFOLIO_CAPITAL', plan: null };
    }

    const targetWeights = targetPackage.targetWeights;
    const currentHoldingsMap = {};
    for (const h of currentHoldingsSnapshot.holdings) {
      currentHoldingsMap[h.ticker] = h;
    }

    const allTickers = Array.from(new Set([
      ...Object.keys(targetWeights),
      ...Object.keys(currentHoldingsMap)
    ])).sort();

    const orders = [];
    let grossTradeValue = 0;
    let totalAbsoluteWeightDelta = 0;
    let buyValue = 0;
    let sellValue = 0;

    for (const ticker of allTickers) {
      const currentH = currentHoldingsMap[ticker];
      const currentShares = currentH ? currentH.shares : 0;
      const currentPrice = marketPrices[ticker] || (currentH ? currentH.price : null);

      if (!currentPrice || currentPrice <= 0) {
        return {
          status: ImplementationStatus.INSUFFICIENT_DATA,
          reasonCode: `MISSING_MARKET_PRICE_FOR_${ticker}`,
          plan: null
        };
      }

      const currentValue = currentShares * currentPrice;
      const currentWeight = currentValue / portfolioValue;

      const targetWeight = targetWeights[ticker] !== undefined ? targetWeights[ticker] : 0.0;
      const targetValue = targetWeight * portfolioValue;
      const targetShares = Math.floor(targetValue / currentPrice);

      const shareDelta = targetShares - currentShares;
      const valueDelta = targetValue - currentValue;
      const weightDelta = targetWeight - currentWeight;
      const absValDelta = Math.abs(valueDelta);

      let action = ImplementationAction.HOLD;
      if (shareDelta > 0 && Math.abs(weightDelta) > 0.0001) {
        action = ImplementationAction.BUY;
        buyValue += absValDelta;
      } else if (shareDelta < 0 && Math.abs(weightDelta) > 0.0001) {
        action = ImplementationAction.SELL;
        sellValue += absValDelta;
      }

      grossTradeValue += absValDelta;
      totalAbsoluteWeightDelta += Math.abs(weightDelta);

      orders.push({
        ticker,
        currentShares,
        targetShares,
        shareDelta,
        currentPrice: Number(currentPrice.toFixed(4)),
        currentValue: Number(currentValue.toFixed(4)),
        targetValue: Number(targetValue.toFixed(4)),
        valueDelta: Number(valueDelta.toFixed(4)),
        currentWeight: Number(currentWeight.toFixed(6)),
        targetWeight: Number(targetWeight.toFixed(6)),
        weightDelta: Number(weightDelta.toFixed(6)),
        action,
        estimatedTradeValue: Number(absValDelta.toFixed(4))
      });
    }

    const oneWayTurnover = Number((totalAbsoluteWeightDelta / 2.0).toFixed(6));
    const twoWayTurnover = Number(totalAbsoluteWeightDelta.toFixed(6));

    const planPayload = {
      planId: `PLAN-${portfolioId}-${asOf.replace(/[:.]/g, '-')}`,
      workspaceId,
      portfolioId,
      asOf,
      targetPackageHash: targetPackage.packageHash || targetPackage.canonicalHash || null,
      currentHoldingsSnapshotHash: currentHoldingsSnapshot.snapshotHash || null,
      portfolioValue: Number(portfolioValue.toFixed(4)),
      grossTradeValue: Number(grossTradeValue.toFixed(4)),
      buyTradeValue: Number(buyValue.toFixed(4)),
      sellTradeValue: Number(sellValue.toFixed(4)),
      oneWayTurnover,
      twoWayTurnover,
      orders,
      orderCount: orders.filter(o => o.action !== ImplementationAction.HOLD).length,
      approvalStatus: ApprovalStatus.PROPOSED,
      approverId: null,
      approvalTimestamp: null,
      createdAt: asOf
    };

    const hash = canonicalHash(planPayload);
    const sealedPlan = deepFreeze({
      ...planPayload,
      planHash: hash
    });

    return {
      status: ImplementationStatus.PLAN_GENERATED,
      plan: sealedPlan
    };
  }

  /**
   * Apply human approval to an implementation plan.
   * Cryptographically links approver and locks approved package hash.
   */
  static approvePlan(plan, approverInfo = {}) {
    if (!plan || !plan.planHash) {
      return { status: ImplementationStatus.INVALID_INPUT, reasonCode: 'INVALID_PLAN_OBJECT', approvedPlan: null };
    }
    const { approverId, workspaceId, role, timestamp = new Date().toISOString() } = approverInfo;

    if (!approverId || !workspaceId) {
      return { status: ImplementationStatus.AUTHORIZATION_FAILURE, reasonCode: 'MISSING_APPROVER_CREDENTIALS', approvedPlan: null };
    }
    if (plan.workspaceId !== workspaceId) {
      return { status: ImplementationStatus.AUTHORIZATION_FAILURE, reasonCode: 'CROSS_WORKSPACE_APPROVAL_DENIED', approvedPlan: null };
    }
    if (role !== 'PORTFOLIO_MANAGER' && role !== 'PM' && role !== 'ADMIN' && role !== 'OWNER') {
      return { status: ImplementationStatus.AUTHORIZATION_FAILURE, reasonCode: `INSUFFICIENT_ROLE_${role}_REQUIRES_PORTFOLIO_MANAGER`, approvedPlan: null };
    }

    const approvedPayload = {
      ...plan,
      approvalStatus: ApprovalStatus.APPROVED,
      approverId,
      approverRole: role,
      approvalTimestamp: timestamp,
      approvedPackageHash: plan.planHash
    };

    const newHash = canonicalHash(approvedPayload);
    const sealedApprovedPlan = deepFreeze({
      ...approvedPayload,
      approvalHash: newHash
    });

    return {
      status: ImplementationStatus.HUMAN_APPROVED,
      approvedPlan: sealedApprovedPlan
    };
  }

  /**
   * Validates human approval state machine transitions.
   * Lifecycle: PROPOSED -> REVIEW_REQUIRED -> HUMAN_APPROVED -> IMPLEMENTATION_REPORTED -> RECONCILED.
   */
  static validateTransition(currentStatus, targetStatus) {
    const validTransitions = {
      [ImplementationStatus.PROPOSED]: [ImplementationStatus.REVIEW_REQUIRED, ImplementationStatus.INVALIDATED],
      [ImplementationStatus.REVIEW_REQUIRED]: [ImplementationStatus.HUMAN_APPROVED, ApprovalStatus.APPROVED, ApprovalStatus.REJECTED, ImplementationStatus.INVALIDATED],
      [ImplementationStatus.HUMAN_APPROVED]: [ImplementationStatus.IMPLEMENTATION_REPORTED, ImplementationStatus.INVALIDATED],
      [ImplementationStatus.IMPLEMENTATION_REPORTED]: [ImplementationStatus.RECONCILED, ImplementationStatus.INCOMPLETE_RECONCILIATION, ImplementationStatus.CONFLICT],
      [ImplementationStatus.RECONCILED]: [ImplementationStatus.DRIFTED, ImplementationStatus.REBALANCE_RECOMMENDED]
    };

    const allowed = validTransitions[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      return {
        isValid: false,
        status: ImplementationStatus.INVALID_INPUT,
        reasonCode: `ILLEGAL_STATE_TRANSITION_FROM_${currentStatus}_TO_${targetStatus}`,
        message: `Transition from ${currentStatus} to ${targetStatus} is rejected by institutional governance policy.`
      };
    }

    return {
      isValid: true,
      status: targetStatus,
      reasonCode: 'VALID_TRANSITION'
    };
  }

  /**
   * Cryptographically verifies that an approved plan has not undergone post-approval tampering.
   */
  static verifyApproval(approvedPlan) {
    if (!approvedPlan || typeof approvedPlan !== 'object') {
      return { isValid: false, status: ImplementationStatus.INVALID_INPUT, reasonCode: 'MISSING_PLAN' };
    }
    if (approvedPlan.approvalStatus !== ApprovalStatus.APPROVED && approvedPlan.status !== ImplementationStatus.HUMAN_APPROVED) {
      return { isValid: false, status: ImplementationStatus.INVALID_INPUT, reasonCode: 'PLAN_NOT_HUMAN_APPROVED' };
    }
    if (!approvedPlan.approvalHash || !approvedPlan.approvedPackageHash) {
      return { isValid: false, status: ImplementationStatus.INVALID_INPUT, reasonCode: 'MISSING_APPROVAL_HASH' };
    }

    // Reconstruct base plan object
    const basePlan = { ...approvedPlan };
    delete basePlan.approvalHash;
    const computedApprovalHash = canonicalHash(basePlan);

    if (computedApprovalHash !== approvedPlan.approvalHash) {
      return {
        isValid: false,
        status: ImplementationStatus.INVALIDATED,
        reasonCode: 'APPROVAL_MUTATION_DETECTED',
        message: 'Plan has been mutated post-approval. Stored approval is invalidated; re-approval required.'
      };
    }

    return {
      isValid: true,
      status: ImplementationStatus.HUMAN_APPROVED,
      reasonCode: 'APPROVAL_INTEGRITY_VERIFIED'
    };
  }

  /**
   * Institutional boundary: InvestmentAI never connects to broker execution endpoints.
   */
  static executePlan() {
    return {
      status: ImplementationStatus.UNAVAILABLE,
      reasonCode: 'BROKER_EXECUTION_UNAVAILABLE_ADVISORY_ONLY',
      isExecuted: false,
      brokerExecution: 'UNAVAILABLE',
      message: 'InvestmentAI is strictly a decision-support advisory system. Broker execution is not available.'
    };
  }
}
