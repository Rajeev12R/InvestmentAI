/**
 * Phase 15 — Implementation, Monitoring & Rebalancing Express Routes
 */

import express from 'express';
import { ImplementationSnapshotEngine } from '../implementation/implementationSnapshot.engine.js';
import { ImplementationPlanEngine } from '../implementation/implementationPlan.engine.js';
import { HoldingsReconciliationEngine } from '../implementation/holdingsReconciliation.engine.js';
import { PortfolioDriftEngine } from '../implementation/portfolioDrift.engine.js';
import { ConstraintMonitoringEngine } from '../implementation/constraintMonitoring.engine.js';
import { RebalanceTriggerEngine } from '../implementation/rebalanceTrigger.engine.js';
import { RebalanceEngine } from '../implementation/rebalance.engine.js';
import { TransactionImpactEngine } from '../implementation/transactionImpact.engine.js';
import { ImplementationQualityEngine } from '../implementation/implementationQuality.engine.js';
import { ImplementationPackageBuilder } from '../implementation/implementationPackage.js';
import { implementationRepository } from '../implementation/implementation.repository.js';
import { ImplementationStatus, ApprovalStatus } from '../implementation/implementation.types.js';
import { IMPLEMENTATION_POLICY_V1 } from '../implementation/implementation.config.js';

const router = express.Router();

function checkWorkspaceAuth(req, res) {
  const workspaceId = req.headers['x-workspace-id'] || req.query.workspaceId || req.body?.workspaceId;
  if (!workspaceId) {
    res.status(401).json({ error: 'Unauthorized: Missing x-workspace-id header', code: 'AUTH_REQUIRED' });
    return null;
  }
  const role = req.user?.role || req.headers['x-user-role'] || 'ANALYST';
  const userId = req.user?.id || req.headers['x-user-id'] || 'USR-ANALYST-1';
  return { workspaceId, role, userId };
}

/**
 * POST /api/implementation/plan
 * Generates an implementation trade plan from approved target package and current holdings.
 */
router.post('/plan', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId, role } = auth;

    if (role === 'VIEWER') {
      return res.status(403).json({ error: 'VIEWER role is not authorized to create implementation plans' });
    }

    const { portfolioId, targetPackage, targetAllocation, currentHoldingsSnapshot, currentHoldings, marketPrices, totalCapital, totalPortfolioValue, asOf } = req.body || {};
    if (!portfolioId) {
      return res.status(400).json({ error: 'portfolioId is required', status: ImplementationStatus.INVALID_INPUT });
    }

    const effectiveTarget = targetPackage || targetAllocation;
    let effectiveHoldings = currentHoldingsSnapshot;
    if (!effectiveHoldings && Array.isArray(currentHoldings)) {
      effectiveHoldings = ImplementationSnapshotEngine.createHoldingsSnapshot({
        workspaceId,
        portfolioId,
        asOf: asOf || new Date().toISOString(),
        holdings: currentHoldings
      });
    }

    const result = ImplementationPlanEngine.generatePlan({
      workspaceId,
      portfolioId,
      targetPackage: effectiveTarget,
      currentHoldingsSnapshot: effectiveHoldings,
      marketPrices: marketPrices || {},
      totalCapital: totalCapital || totalPortfolioValue || null,
      asOf: asOf || new Date().toISOString()
    });

    if (result.status !== ImplementationStatus.PLAN_GENERATED) {
      return res.status(400).json(result);
    }

    implementationRepository.savePlan(result.plan);
    return res.status(200).json(result.plan);
  } catch (err) {
    return res.status(500).json({ error: err.message, status: ImplementationStatus.NUMERICAL_FAILURE });
  }
});

/**
 * POST /api/implementation/reconcile
 * Performs 3-way reconciliation between target, plan, and reported actual holdings.
 */
router.post('/reconcile', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId } = auth;

    const { portfolioId, targetPackage, targetAllocation, implementationPlan, actualHoldingsSnapshot, actualHoldings, actualTransactions, toleranceBps, asOf } = req.body || {};

    if (!portfolioId) {
      return res.status(400).json({ error: 'portfolioId is required', status: ImplementationStatus.INVALID_INPUT });
    }

    const effectiveTarget = targetPackage || targetAllocation;
    let effectiveHoldings = actualHoldingsSnapshot;
    if (!effectiveHoldings && Array.isArray(actualHoldings)) {
      effectiveHoldings = ImplementationSnapshotEngine.createHoldingsSnapshot({
        workspaceId,
        portfolioId,
        asOf: asOf || new Date().toISOString(),
        holdings: actualHoldings
      });
    }

    if (!effectiveHoldings) {
      return res.status(400).json({ error: 'actualHoldings or actualHoldingsSnapshot is required', status: ImplementationStatus.INVALID_INPUT });
    }

    const result = HoldingsReconciliationEngine.reconcile({
      workspaceId,
      portfolioId,
      asOf: asOf || new Date().toISOString(),
      targetPackage: effectiveTarget,
      implementationPlan,
      actualHoldingsSnapshot: effectiveHoldings,
      toleranceBps: toleranceBps || 50
    });

    if (!result.reconciliation) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result.reconciliation);
  } catch (err) {
    return res.status(500).json({ error: err.message, status: ImplementationStatus.NUMERICAL_FAILURE });
  }
});

/**
 * POST or GET /api/implementation/:portfolioId/drift
 * Computes real-time allocation, sector, cash, and risk drift.
 */
router.all('/:portfolioId/drift', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId } = auth;
    const { portfolioId } = req.params;

    if (req.method === 'POST') {
      const { targetPackage, targetWeights, actualHoldings, currentHoldingsSnapshot, actualHoldingsSnapshot, asOf, policy } = req.body || {};
      
      const effectiveTarget = targetPackage || {
        packageId: 'PKG-TGT-DYNAMIC',
        portfolioId,
        targetWeights: targetWeights || {}
      };

      let holdingsSnap = actualHoldingsSnapshot || currentHoldingsSnapshot;
      if (!holdingsSnap && Array.isArray(actualHoldings)) {
        holdingsSnap = ImplementationSnapshotEngine.createHoldingsSnapshot({
          workspaceId,
          portfolioId,
          asOf: asOf || new Date().toISOString(),
          holdings: actualHoldings
        });
      }

      if (!holdingsSnap) {
        return res.status(400).json({ error: 'actualHoldings or currentHoldingsSnapshot is required', status: ImplementationStatus.INVALID_INPUT });
      }

      const result = PortfolioDriftEngine.evaluateDrift({
        workspaceId,
        portfolioId,
        asOf: asOf || new Date().toISOString(),
        targetPackage: effectiveTarget,
        actualHoldingsSnapshot: holdingsSnap,
        policy: policy || IMPLEMENTATION_POLICY_V1
      });

      if (!result.drift) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result.drift);
    }

    // GET handler
    const latestPkg = implementationRepository.listPackagesByPortfolio(portfolioId, workspaceId)[0];
    if (!latestPkg || !latestPkg.driftReport) {
      return res.status(404).json({ error: 'No drift audit found for portfolio', status: ImplementationStatus.UNAVAILABLE });
    }

    return res.status(200).json({ drift: latestPkg.driftReport });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST or GET /api/implementation/:portfolioId/constraints
 * Continuously monitors active mandate boundaries and constraint violations.
 */
router.all('/:portfolioId/constraints', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId } = auth;
    const { portfolioId } = req.params;

    if (req.method === 'POST') {
      const { actualHoldings, currentHoldingsSnapshot, actualHoldingsSnapshot, constraints, mandateConstraints, policy, asOf } = req.body || {};
      let holdingsSnap = actualHoldingsSnapshot || currentHoldingsSnapshot;
      if (!holdingsSnap && Array.isArray(actualHoldings)) {
        holdingsSnap = ImplementationSnapshotEngine.createHoldingsSnapshot({
          workspaceId,
          portfolioId,
          asOf: asOf || new Date().toISOString(),
          holdings: actualHoldings
        });
      }

      if (!holdingsSnap) {
        return res.status(400).json({ error: 'actualHoldings or actualHoldingsSnapshot is required', status: ImplementationStatus.INVALID_INPUT });
      }

      const result = ConstraintMonitoringEngine.monitorConstraints({
        workspaceId,
        portfolioId,
        asOf: asOf || new Date().toISOString(),
        actualHoldingsSnapshot: holdingsSnap,
        constraints: constraints || mandateConstraints || {},
        policy: policy || IMPLEMENTATION_POLICY_V1
      });

      if (!result.constraintReport) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result.constraintReport);
    }

    // GET handler
    const latestPkg = implementationRepository.listPackagesByPortfolio(portfolioId, workspaceId)[0];
    if (!latestPkg || !latestPkg.constraintReport) {
      return res.status(404).json({ error: 'No constraint monitoring report found for portfolio', status: ImplementationStatus.UNAVAILABLE });
    }

    return res.status(200).json({ constraintReport: latestPkg.constraintReport });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/implementation/:portfolioId/rebalance
 * Generates cost-aware candidate rebalance and trade orders when triggers fire.
 */
router.post('/:portfolioId/rebalance', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId, role } = auth;

    if (role === 'VIEWER') {
      return res.status(403).json({ error: 'VIEWER role cannot generate rebalance candidates' });
    }

    const { portfolioId } = req.params;
    const { currentHoldingsSnapshot, actualHoldingsSnapshot, actualHoldings, targetPackage, targetWeights, securities, covarianceMatrix, expectedReturns, constraints, marketPrices, asOf } = req.body || {};

    let holdingsSnap = actualHoldingsSnapshot || currentHoldingsSnapshot;
    if (!holdingsSnap && Array.isArray(actualHoldings)) {
      holdingsSnap = ImplementationSnapshotEngine.createHoldingsSnapshot({
        workspaceId,
        portfolioId,
        asOf: asOf || new Date().toISOString(),
        holdings: actualHoldings
      });
    }

    const effectiveTarget = targetPackage || {
      packageId: 'PKG-TGT-AUTO',
      portfolioId,
      targetWeights: targetWeights || {},
      securities: securities || []
    };

    const result = RebalanceEngine.generateRebalanceCandidate({
      workspaceId,
      portfolioId,
      asOf: asOf || new Date().toISOString(),
      currentHoldingsSnapshot: holdingsSnap,
      targetPackage: effectiveTarget,
      securities: securities || null,
      expectedReturns: expectedReturns || {},
      covarianceMatrix: covarianceMatrix || [],
      constraints: constraints || {},
      marketPrices: marketPrices || {}
    });

    if (result.status !== ImplementationStatus.REBALANCE_RECOMMENDED && result.status !== ImplementationStatus.IMPLEMENTED) {
      return res.status(400).json(result);
    }

    // Build sealed package and save
    const sealedPackageResult = ImplementationPackageBuilder.buildPackage({
      workspaceId,
      portfolioId,
      targetPackage: effectiveTarget,
      holdingsSnapshot: holdingsSnap,
      plan: result.candidatePlan,
      triggerReport: result.triggeredReasons || []
    });

    const sealedPkg = sealedPackageResult.package;
    if (sealedPkg) {
      implementationRepository.savePackage(sealedPkg);
    }

    return res.status(200).json({
      rebalanceRecommended: true,
      candidatePlan: result.candidatePlan,
      packageId: sealedPkg?.packageId,
      packageHash: sealedPkg?.packageHash,
      triggers: result.triggeredReasons
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/implementation/:portfolioId/approve
 * Human signoff gate for an implementation trade plan.
 */
router.post('/:portfolioId/approve', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId, role, userId } = auth;
    const { portfolioId } = req.params;
    const { planId, decision, rationale } = req.body || {};

    if (!planId) {
      return res.status(400).json({ error: 'planId is required', status: ImplementationStatus.INVALID_INPUT });
    }

    const storedPlan = implementationRepository.getPlanById(planId, workspaceId);
    if (!storedPlan) {
      return res.status(404).json({ error: 'Plan not found or access denied', status: ImplementationStatus.UNAVAILABLE });
    }

    const approvalResult = ImplementationPlanEngine.approvePlan(storedPlan, {
      approverId: userId,
      workspaceId,
      role
    });

    if (approvalResult.status !== ImplementationStatus.HUMAN_APPROVED) {
      return res.status(403).json(approvalResult);
    }

    implementationRepository.savePlan(approvalResult.approvedPlan);
    implementationRepository.saveApproval({
      planId,
      workspaceId,
      portfolioId,
      approverId: userId,
      approverRole: role,
      approvalTimestamp: approvalResult.approvedPlan.approvalTimestamp,
      rationale: rationale || 'Approved'
    });

    return res.status(200).json(approvalResult.approvedPlan);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/implementation/:portfolioId/history
 * Returns historical implementation snapshots and audit packages.
 */
router.get('/:portfolioId/history', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId } = auth;
    const { portfolioId } = req.params;

    const packages = implementationRepository.listPackagesByPortfolio(portfolioId, workspaceId);
    return res.status(200).json({ portfolioId, workspaceId, count: packages.length, packages });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/implementation/:portfolioId
 * Returns latest sealed implementation intelligence package.
 */
router.get('/:portfolioId', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId } = auth;
    const { portfolioId } = req.params;

    const latest = implementationRepository.listPackagesByPortfolio(portfolioId, workspaceId)[0];
    if (!latest) {
      return res.status(404).json({ error: 'No implementation package found for portfolio', status: ImplementationStatus.UNAVAILABLE });
    }

    return res.status(200).json(latest);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
