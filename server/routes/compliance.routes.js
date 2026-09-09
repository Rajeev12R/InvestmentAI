/**
 * Phase 16 — Institutional Compliance & Governance Express Routes
 */

import express from 'express';
import { ComplianceEngine } from '../compliance/compliance.engine.js';
import { PolicyEngine } from '../compliance/policy.engine.js';
import { policyRepository } from '../compliance/policy.repository.js';
import { complianceRepository } from '../compliance/compliance.repository.js';
import { CompliancePackageBuilder } from '../compliance/compliancePackage.js';
import { ComplianceAuditEngine } from '../compliance/audit.engine.js';
import { ComplianceReportEngine } from '../compliance/report.engine.js';
import { ExceptionEngine } from '../compliance/exception.engine.js';
import { RemediationEngine } from '../compliance/remediation.engine.js';
import { ComplianceStatus, EvaluationPhase } from '../compliance/compliance.types.js';

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
 * POST /api/compliance/policy
 * Creates a new policy V1 in the workspace.
 */
router.post('/policy', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId, role, userId } = auth;

    if (role === 'VIEWER' || role === 'AUDITOR') {
      return res.status(403).json({ error: `${role} role is not authorized to create policies`, status: ComplianceStatus.AUTHORIZATION_FAILURE });
    }

    const { policyId, name, description, precedence, effectiveFrom, effectiveTo, rules, metadata } = req.body || {};
    if (!policyId || !name || !effectiveFrom) {
      return res.status(400).json({ error: 'policyId, name, and effectiveFrom are required', status: ComplianceStatus.INVALID_INPUT });
    }

    const policy = PolicyEngine.createPolicy({
      policyId,
      workspaceId,
      name,
      description,
      precedence,
      effectiveFrom,
      effectiveTo,
      rules: rules || [],
      createdBy: userId,
      metadata
    });

    policyRepository.savePolicy(policy);
    return res.status(201).json(policy);
  } catch (err) {
    return res.status(400).json({ error: err.message, status: ComplianceStatus.INVALID_INPUT });
  }
});

/**
 * POST /api/compliance/policy/:id/version
 * Creates a new immutable version of an existing policy.
 */
router.post('/policy/:id/version', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId, role, userId } = auth;
    const { id: policyId } = req.params;

    if (role === 'VIEWER' || role === 'AUDITOR') {
      return res.status(403).json({ error: `${role} role is not authorized to create policy versions`, status: ComplianceStatus.AUTHORIZATION_FAILURE });
    }

    const latest = policyRepository.getLatestPolicy(policyId, workspaceId);
    if (!latest) {
      return res.status(404).json({ error: `Policy ${policyId} not found in workspace`, status: ComplianceStatus.POLICY_NOT_FOUND });
    }

    const { newVersion, effectiveFrom, effectiveTo, rules, description, precedence, metadata } = req.body || {};
    if (!newVersion || !effectiveFrom) {
      return res.status(400).json({ error: 'newVersion and effectiveFrom are required', status: ComplianceStatus.INVALID_INPUT });
    }

    const newPolicyVersion = PolicyEngine.createNewVersion(latest, {
      newVersion,
      effectiveFrom,
      effectiveTo,
      rules,
      description,
      precedence,
      updatedBy: userId,
      metadata
    });

    policyRepository.savePolicy(newPolicyVersion);
    return res.status(201).json(newPolicyVersion);
  } catch (err) {
    return res.status(400).json({ error: err.message, status: ComplianceStatus.INVALID_INPUT });
  }
});

/**
 * GET /api/compliance/policy/:policyId/history
 * Lists all historical versions of a policy.
 */
router.get('/policy/:policyId/history', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId } = auth;
    const { policyId } = req.params;

    const versions = policyRepository.listPolicyVersions(policyId, workspaceId);
    if (versions.length === 0) {
      return res.status(404).json({ error: `Policy ${policyId} not found`, status: ComplianceStatus.POLICY_NOT_FOUND });
    }

    return res.status(200).json({ policyId, workspaceId, count: versions.length, versions });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/compliance/evaluate
 * Evaluates compliance of a portfolio state, proposal, or decision against applicable policy.
 */
router.post('/evaluate', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId } = auth;

    const {
      portfolioId,
      asOf,
      phase,
      policyId,
      policy,
      targetWeights,
      holdings,
      holdingsSnapshot,
      transactions,
      prices,
      sectors,
      geographies,
      marketCaps,
      liquidityADV,
      ratings,
      cashWeight,
      grossLeverage,
      netLeverage,
      turnover,
      decision,
      proposedOrders
    } = req.body || {};

    if (!portfolioId) {
      return res.status(400).json({ error: 'portfolioId is required', status: ComplianceStatus.INVALID_INPUT });
    }

    // Resolve policy versions
    let effectivePolicy = policy;
    let policyVersions = [];
    if (!effectivePolicy) {
      if (policyId) {
        policyVersions = policyRepository.listPolicyVersions(policyId, workspaceId);
      } else {
        policyVersions = policyRepository.listAllPolicies(workspaceId);
      }
    }

    // Get active exceptions
    const activeExceptions = complianceRepository.listExceptionsByPortfolio(portfolioId, workspaceId);

    const evaluation = ComplianceEngine.evaluateCompliance({
      workspaceId,
      portfolioId,
      asOf: asOf || new Date().toISOString(),
      phase: phase || EvaluationPhase.POST_ACTION,
      policy: effectivePolicy,
      policyVersions,
      activeExceptions,
      portfolioState: {
        holdings: holdingsSnapshot?.holdings || holdings || [],
        targetWeights: targetWeights || {},
        transactions: transactions || [],
        prices: prices || {},
        sectors: sectors || {},
        geographies: geographies || {},
        marketCaps: marketCaps || {},
        liquidityADV: liquidityADV || {},
        ratings: ratings || {},
        cashWeight,
        grossLeverage,
        netLeverage,
        turnover,
        decision,
        proposedOrders
      }
    });

    complianceRepository.saveEvaluation(evaluation);

    // Build evidence graph & sealed package
    const evidenceGraph = ComplianceAuditEngine.buildEvidenceGraph({
      evaluation,
      policy: effectivePolicy || policyVersions[0],
      portfolioState: req.body
    });

    const packageResult = CompliancePackageBuilder.buildPackage({
      workspaceId,
      portfolioId,
      asOf: evaluation.asOf,
      evaluation,
      policy: effectivePolicy || policyVersions[0],
      evidenceGraph,
      inputSnapshot: req.body
    });

    complianceRepository.savePackage(packageResult.package);

    return res.status(200).json({
      evaluation,
      packageId: packageResult.packageId,
      packageHash: packageResult.packageHash,
      isCompliant: evaluation.isCompliant
    });
  } catch (err) {
    return res.status(500).json({ error: err.message, status: ComplianceStatus.NUMERICAL_FAILURE });
  }
});

/**
 * GET /api/compliance/package/:packageId
 * Retrieves sealed ComplianceIntelligencePackage by ID.
 */
router.get('/package/:packageId', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId } = auth;
    const { packageId } = req.params;

    const pkg = complianceRepository.getPackageById(packageId, workspaceId);
    if (!pkg) {
      return res.status(404).json({ error: 'Compliance package not found or access denied', status: ComplianceStatus.UNAVAILABLE });
    }

    return res.status(200).json(pkg);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/compliance/:portfolioId
 * Returns the latest compliance evaluation summary for a portfolio.
 */
router.get('/:portfolioId', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId } = auth;
    const { portfolioId } = req.params;

    const packages = complianceRepository.listPackagesByPortfolio(portfolioId, workspaceId);
    if (packages.length === 0) {
      return res.status(404).json({ error: 'No compliance records found for portfolio', status: ComplianceStatus.UNAVAILABLE });
    }

    const latest = packages[0];
    return res.status(200).json(latest);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/compliance/:portfolioId/history
 * Returns historical compliance packages for a portfolio.
 */
router.get('/:portfolioId/history', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId } = auth;
    const { portfolioId } = req.params;

    const packages = complianceRepository.listPackagesByPortfolio(portfolioId, workspaceId);
    return res.status(200).json({ portfolioId, workspaceId, count: packages.length, packages });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/compliance/:portfolioId/breaches
 * Lists active and historical breaches for a portfolio.
 */
router.get('/:portfolioId/breaches', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId } = auth;
    const { portfolioId } = req.params;

    const breaches = complianceRepository.listBreachesByPortfolio(portfolioId, workspaceId);
    const report = ComplianceReportEngine.generateHistoricalBreachReport(portfolioId, workspaceId, breaches);
    return res.status(200).json(report);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/compliance/:portfolioId/exception
 * Requests a new compliance waiver/exception.
 */
router.post('/:portfolioId/exception', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId, role, userId } = auth;
    const { portfolioId } = req.params;

    if (role === 'VIEWER' || role === 'AUDITOR') {
      return res.status(403).json({ error: `${role} role cannot request compliance exceptions`, status: ComplianceStatus.AUTHORIZATION_FAILURE });
    }

    const { policyId, policyVersion, ruleId, reason, scope, effectiveFrom, expiresAt } = req.body || {};
    if (!ruleId || !reason || !expiresAt) {
      return res.status(400).json({ error: 'ruleId, reason, and expiresAt are required', status: ComplianceStatus.INVALID_INPUT });
    }

    const exception = ExceptionEngine.requestException({
      workspaceId,
      portfolioId,
      policyId: policyId || 'PORTFOLIO_POLICY',
      policyVersion: policyVersion || '1.0.0',
      ruleId,
      reason,
      scope: scope || 'PORTFOLIO',
      requestedBy: userId,
      effectiveFrom: effectiveFrom || new Date().toISOString(),
      expiresAt
    });

    complianceRepository.saveException(exception);
    return res.status(201).json(exception);
  } catch (err) {
    return res.status(400).json({ error: err.message, status: ComplianceStatus.INVALID_INPUT });
  }
});

/**
 * POST /api/compliance/exception/:id/approve
 * Human sign-off on a compliance waiver/exception.
 */
router.post('/exception/:id/approve', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId, role, userId } = auth;
    const { id: exceptionId } = req.params;

    const exception = complianceRepository.getExceptionById(exceptionId, workspaceId);
    if (!exception) {
      return res.status(404).json({ error: 'Exception request not found', status: ComplianceStatus.UNAVAILABLE });
    }

    const approved = ExceptionEngine.approveException(exception, {
      approvedBy: userId,
      role,
      notes: req.body?.notes || 'Approved'
    });

    complianceRepository.saveException(approved);
    return res.status(200).json(approved);
  } catch (err) {
    return res.status(403).json({ error: err.message, status: ComplianceStatus.AUTHORIZATION_FAILURE });
  }
});

/**
 * POST /api/compliance/:portfolioId/remediation
 * Deterministically generates remedial action proposals for portfolio breaches.
 */
router.post('/:portfolioId/remediation', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId, role } = auth;
    const { portfolioId } = req.params;

    if (role === 'VIEWER' || role === 'AUDITOR') {
      return res.status(403).json({ error: `${role} role cannot generate remediation proposals`, status: ComplianceStatus.AUTHORIZATION_FAILURE });
    }

    const { ruleResults, asOf } = req.body || {};
    if (!Array.isArray(ruleResults)) {
      return res.status(400).json({ error: 'ruleResults array is required', status: ComplianceStatus.INVALID_INPUT });
    }

    const plan = RemediationEngine.generateRemediationPlan({
      workspaceId,
      portfolioId,
      ruleResults,
      asOf: asOf || new Date().toISOString()
    });

    return res.status(200).json(plan);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/compliance/:portfolioId/audit
 * Returns compliance audit evidence trail and graph.
 */
router.get('/:portfolioId/audit', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId } = auth;
    const { portfolioId } = req.params;

    const packages = complianceRepository.listPackagesByPortfolio(portfolioId, workspaceId);
    if (packages.length === 0) {
      return res.status(404).json({ error: 'No audit records found for portfolio', status: ComplianceStatus.UNAVAILABLE });
    }

    const latest = packages[0];
    return res.status(200).json({
      portfolioId,
      workspaceId,
      latestPackageId: latest.packageId,
      packageHash: latest.packageHash,
      evidenceGraph: latest.evidenceGraph,
      evaluationSummary: latest.evaluationSummary
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
