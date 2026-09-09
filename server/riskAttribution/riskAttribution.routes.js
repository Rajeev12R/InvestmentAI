/**
 * server/riskAttribution/riskAttribution.routes.js
 * 
 * Phase 32: Institutional Risk Attribution REST API
 * Multi-tenant isolation, RBAC, audit logging, and read-only boundaries.
 */

import { Router } from 'express';
import { RiskAttributionEngine } from './riskAttribution.engine.js';
import { RiskAttributionExplanationDAG } from './riskAttribution.explanation.js';
import { RiskAttributionPackageBuilder } from './riskAttribution.package.js';
import { riskAttributionRepository } from './riskAttribution.repository.js';
import { riskAttributionTools } from './riskAttribution.tool.js';

const router = Router();

// Middleware: Tenant Extraction
const extractTenant = (req, res, next) => {
  req.tenantId = req.headers['x-tenant-id'] || req.user?.tenantId || 'tenant_default';
  req.userId = req.headers['x-user-id'] || req.user?.id || 'anonymous_auditor';
  req.userRole = req.headers['x-user-role'] || req.user?.role || 'PORTFOLIO_MANAGER';
  next();
};

// Middleware: RBAC Enforcement
const requireRole = (allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.userRole) && req.userRole !== 'ADMIN') {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: `Role ${req.userRole} is not authorized. Allowed: ${allowedRoles.join(', ')}`
    });
  }
  next();
};

router.use(extractTenant);

// 1. Comprehensive Risk Attribution
router.post('/decompose', requireRole(['PORTFOLIO_MANAGER', 'RISK_OFFICER', 'AUDITOR', 'VIEWER']), async (req, res) => {
  try {
    const { symbols, weights, covarianceMatrix, benchmarkWeights, sectors, geographies, sleeves, factorExposures, periodsPerYear, confidence } = req.body;
    const attribution = RiskAttributionEngine.runComprehensiveAttribution({
      symbols,
      weights,
      covarianceMatrix,
      benchmarkWeights,
      sectors,
      geographies,
      sleeves,
      factorExposures,
      periodsPerYear,
      confidence,
      asOf: new Date().toISOString()
    });
    return res.status(200).json(attribution);
  } catch (err) {
    return res.status(400).json({ error: 'ATTRIBUTION_ERROR', message: err.message });
  }
});

// 2. Build & Seal Attribution Package
router.post('/seal', requireRole(['PORTFOLIO_MANAGER', 'RISK_OFFICER']), async (req, res) => {
  try {
    const { symbols, weights, covarianceMatrix, sectors, geographies, sleeves, factorExposures, portfolioSnapshotId, modelProvenance } = req.body;
    const attribution = RiskAttributionEngine.runComprehensiveAttribution({
      symbols,
      weights,
      covarianceMatrix,
      sectors,
      geographies,
      sleeves,
      factorExposures
    });
    const explanationDAG = RiskAttributionExplanationDAG.buildExplanationDAG(attribution);
    const sealedPackage = RiskAttributionPackageBuilder.buildSealedPackage({
      attributionResult: attribution,
      explanationDAG,
      portfolioSnapshotId: portfolioSnapshotId || `SNAP-${Date.now()}`,
      tenantId: req.tenantId,
      modelProvenance
    });

    riskAttributionRepository.savePackage(req.tenantId, sealedPackage, req.userId);
    return res.status(201).json(sealedPackage);
  } catch (err) {
    return res.status(400).json({ error: 'SEAL_ERROR', message: err.message });
  }
});

// 3. Get Sealed Package by ID (Strict Tenant Isolation)
router.get('/packages/:packageId', requireRole(['PORTFOLIO_MANAGER', 'RISK_OFFICER', 'AUDITOR', 'VIEWER']), async (req, res) => {
  try {
    const { packageId } = req.params;
    const pkg = riskAttributionRepository.getPackage(req.tenantId, packageId);
    if (!pkg) {
      return res.status(404).json({ error: 'NOT_FOUND', message: `Package ${packageId} not found for tenant` });
    }
    return res.status(200).json(pkg);
  } catch (err) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// 4. Point-in-Time Attribution Snapshot @ T1
router.get('/snapshots/:snapshotId/temporal', requireRole(['PORTFOLIO_MANAGER', 'RISK_OFFICER', 'AUDITOR', 'VIEWER']), async (req, res) => {
  try {
    const { snapshotId } = req.params;
    const { asOfCutoff } = req.query;
    if (!asOfCutoff) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'asOfCutoff query parameter is required' });
    }
    const pkg = riskAttributionRepository.getAttributionAsOf(req.tenantId, snapshotId, asOfCutoff);
    if (!pkg) {
      return res.status(404).json({ error: 'NOT_FOUND', message: `No attribution snapshot found for ${snapshotId} as of ${asOfCutoff}` });
    }
    return res.status(200).json(pkg);
  } catch (err) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

// 5. Top Contributors Endpoint
router.post('/top-contributors', requireRole(['PORTFOLIO_MANAGER', 'RISK_OFFICER', 'AUDITOR', 'VIEWER']), async (req, res) => {
  try {
    const { symbols, weights, covarianceMatrix, sectors, topN } = req.body;
    const result = await riskAttributionTools.tool_get_top_risk_contributors({
      symbols,
      weights,
      covarianceMatrix,
      sectors,
      topN
    });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: err.message });
  }
});

// 6. Explanation DAG Endpoint
router.post('/dag', requireRole(['PORTFOLIO_MANAGER', 'RISK_OFFICER', 'AUDITOR', 'VIEWER']), async (req, res) => {
  try {
    const { symbols, weights, covarianceMatrix, sectors, factorExposures } = req.body;
    const dag = await riskAttributionTools.tool_get_attribution_dag({
      symbols,
      weights,
      covarianceMatrix,
      sectors,
      factorExposures
    });
    return res.status(200).json(dag);
  } catch (err) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: err.message });
  }
});

// 7. What-If Counterfactual Endpoint
router.post('/what-if', requireRole(['PORTFOLIO_MANAGER', 'RISK_OFFICER']), async (req, res) => {
  try {
    const { symbols, weights, covarianceMatrix, removeSymbol, sectors } = req.body;
    const result = await riskAttributionTools.tool_what_if_remove_position({
      symbols,
      weights,
      covarianceMatrix,
      removeSymbol,
      sectors
    });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ error: 'BAD_REQUEST', message: err.message });
  }
});

// 8. Audit Logs Endpoint
router.get('/audit-logs', requireRole(['AUDITOR', 'ADMIN', 'RISK_OFFICER']), async (req, res) => {
  try {
    const logs = riskAttributionRepository.getAuditLogs(req.tenantId);
    return res.status(200).json({ tenantId: req.tenantId, totalEntries: logs.length, logs });
  } catch (err) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: err.message });
  }
});

export default router;
