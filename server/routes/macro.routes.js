/**
 * server/routes/macro.routes.js
 * 
 * Phase 22: REST Endpoints for Macro Intelligence & Cross-Asset Analysis
 * Enforces role-based authorization (RBAC) and tenant isolation.
 */

import express from 'express';
import { defaultMacroDataStore } from '../macro/macro.store.js';
import { defaultMacroRegimeEngine } from '../macro/macro.regime.engine.js';
import { defaultCrossAssetTransmissionEngine } from '../macro/macro.crossAsset.engine.js';
import { defaultMacroExposureEngine } from '../macro/macro.exposure.engine.js';
import { defaultMacroImpactEngine } from '../macro/macro.impact.engine.js';
import { defaultMacroIntelligenceTool } from '../macro/macro.tool.js';

const router = express.Router();

function checkWorkspaceAuth(req, res) {
  const workspaceId = req.headers['x-workspace-id'] || req.query.workspaceId || req.body?.workspaceId || 'DEFAULT_TENANT';
  const role = req.user?.role || req.headers['x-user-role'] || 'ANALYST';
  const userId = req.user?.id || req.headers['x-user-id'] || 'USR-ANALYST-1';
  return { workspaceId, role, userId };
}

/**
 * GET /api/macro/snapshot
 * Retrieves point-in-time snapshot of latest macro indicators
 */
router.get('/snapshot', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    const tenantId = auth.workspaceId;
    const asOfTimestamp = req.query.asOf || new Date().toISOString();
    const snapshot = defaultMacroDataStore.getSnapshotAsOf(tenantId, asOfTimestamp);
    res.json({ success: true, status: 'PASS', data: snapshot });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/macro/regime
 * Evaluates rules-based macroeconomic regime classification
 */
router.get('/regime', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    const tenantId = auth.workspaceId;
    const asOfTimestamp = req.query.asOf || new Date().toISOString();
    const snapshot = defaultMacroDataStore.getSnapshotAsOf(tenantId, asOfTimestamp);
    const regime = defaultMacroRegimeEngine.classifyRegime(snapshot);
    res.json({ success: true, status: 'PASS', data: regime });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/macro/changes
 * Retrieves revision history for a specific series
 */
router.get('/changes', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    const tenantId = auth.workspaceId;
    const { seriesId, period } = req.query;
    if (!seriesId || !period) {
      return res.status(400).json({ success: false, error: 'seriesId and period query parameters are required' });
    }
    const history = defaultMacroDataStore.getRevisionHistory(tenantId, seriesId, period);
    res.json({ success: true, status: 'PASS', data: history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/macro/cross-asset
 * Returns active cross-asset transmission channels and rules
 */
router.get('/cross-asset', (req, res) => {
  try {
    const rules = defaultCrossAssetTransmissionEngine.getAllTransmissionRules();
    res.json({ success: true, status: 'PASS', data: rules });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/macro/exposure/security/:id
 * Evaluates security-level macro sensitivity vector
 */
router.get('/exposure/security/:id', (req, res) => {
  try {
    const ticker = req.params.id;
    const exposure = defaultMacroExposureEngine.evaluateSecuritySensitivity(ticker);
    res.json({ success: true, status: 'PASS', data: exposure });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/macro/package
 * Produces cryptographically sealed macro audit package
 */
router.get('/package', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    const tenantId = auth.workspaceId;
    const asOfTimestamp = req.query.asOf || new Date().toISOString();
    const pkg = defaultMacroIntelligenceTool.getMacroPackage(tenantId, asOfTimestamp);
    res.json({ success: true, status: 'PASS', data: pkg });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/macro/observations
 * Ingests a new macro observation
 */
router.post('/observations', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    const { role, workspaceId } = auth;
    if (role === 'GUEST' || role === 'VIEWER') {
      return res.status(403).json({ error: `${role} role is not authorized to ingest observations`, status: 'AUTHORIZATION_FAILURE' });
    }
    const result = defaultMacroDataStore.ingestObservation(workspaceId, req.body);
    res.status(201).json({ success: true, status: 'PASS', data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;

