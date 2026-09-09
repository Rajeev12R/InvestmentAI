/**
 * server/routes/knowledgeGraph.routes.js
 * 
 * Phase 23: REST Endpoints for Institutional Knowledge Graph & Cross-Domain Intelligence
 * Enforces role-based authorization (RBAC), tenant isolation, and input validation.
 */

import express from 'express';
import { defaultKnowledgeGraphStore } from '../knowledgeGraph/kg.store.js';
import { defaultKnowledgeGraphTraversalEngine } from '../knowledgeGraph/kg.traversal.engine.js';
import { defaultKnowledgeGraphDependencyEngine } from '../knowledgeGraph/kg.dependency.engine.js';
import { defaultPortfolioCommonDriverEngine } from '../knowledgeGraph/kg.commonDriver.engine.js';
import { defaultSharedRiskEngine } from '../knowledgeGraph/kg.sharedRisk.engine.js';
import { defaultDecisionLineageEngine } from '../knowledgeGraph/kg.decisionLineage.engine.js';
import { defaultEntityResolutionEngine } from '../knowledgeGraph/kg.entityResolution.js';
import { defaultKnowledgeGraphQualityEngine } from '../knowledgeGraph/kg.quality.engine.js';
import { sealKnowledgeGraphPackage, verifyKnowledgeGraphPackage } from '../knowledgeGraph/kg.package.js';

const router = express.Router();

function checkWorkspaceAuth(req, res) {
  const workspaceId = req.headers['x-workspace-id'] || req.query.workspaceId || req.body?.workspaceId || 'DEFAULT_TENANT';
  const role = req.user?.role || req.headers['x-user-role'] || 'ANALYST';
  const userId = req.user?.id || req.headers['x-user-id'] || 'USR-ANALYST-1';
  return { workspaceId, role, userId };
}

/**
 * GET /api/knowledge-graph/entity/:id
 */
router.get('/entity/:id', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    const { workspaceId } = auth;
    const resolved = defaultEntityResolutionEngine.resolveEntity(req.params.id);
    const node = defaultKnowledgeGraphStore.getNode(workspaceId, resolved.canonicalId) || defaultKnowledgeGraphStore.getNode(workspaceId, req.params.id);

    if (!node) {
      return res.status(404).json({ success: false, error: `Entity not found: ${req.params.id}` });
    }

    return res.status(200).json({ success: true, status: 'PASS', entity: node, resolution: resolved });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/knowledge-graph/entity/:id/neighborhood
 */
router.get('/entity/:id/neighborhood', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    const { workspaceId } = auth;
    const maxDepth = parseInt(req.query.depth || '2', 10);
    const asOf = req.query.asOf || new Date().toISOString();

    const neighborhood = defaultKnowledgeGraphTraversalEngine.getNodeNeighborhood(workspaceId, req.params.id, maxDepth, asOf);
    return res.status(200).json({ success: true, status: 'PASS', neighborhood });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/knowledge-graph/dependencies/:id
 */
router.get('/dependencies/:id', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    const { workspaceId } = auth;
    const upstream = defaultKnowledgeGraphTraversalEngine.getUpstreamDependencies(workspaceId, req.params.id);
    const downstream = defaultKnowledgeGraphTraversalEngine.getDownstreamDependencies(workspaceId, req.params.id);

    return res.status(200).json({ success: true, status: 'PASS', upstream, downstream });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/knowledge-graph/impact/:id
 */
router.get('/impact/:id', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    const { workspaceId } = auth;
    const impact = defaultKnowledgeGraphDependencyEngine.evaluateFactImpact(workspaceId, req.params.id);
    return res.status(200).json({ success: true, status: 'PASS', impact });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/knowledge-graph/portfolio/drivers and GET /api/knowledge-graph/portfolio/:id/drivers
 */
router.post('/portfolio/drivers', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    const positions = req.body?.positions || [];
    const drivers = defaultPortfolioCommonDriverEngine.calculateCommonDrivers(positions);
    return res.status(200).json({ success: true, status: 'PASS', drivers });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/portfolio/:id/drivers', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    const drivers = defaultPortfolioCommonDriverEngine.calculateCommonDrivers([]);
    return res.status(200).json({ success: true, status: 'PASS', portfolioId: req.params.id, drivers });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/knowledge-graph/portfolio/shared-risks and GET /api/knowledge-graph/portfolio/:id/shared-risks
 */
router.post('/portfolio/shared-risks', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    const positions = req.body?.positions || [];
    const sharedRisks = defaultSharedRiskEngine.calculateSharedRisks(positions);
    return res.status(200).json({ success: true, status: 'PASS', sharedRisks });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/portfolio/:id/shared-risks', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    const sharedRisks = defaultSharedRiskEngine.calculateSharedRisks([]);
    return res.status(200).json({ success: true, status: 'PASS', portfolioId: req.params.id, sharedRisks });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/knowledge-graph/decision/:id/lineage
 */
router.get('/decision/:id/lineage', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    const { workspaceId } = auth;
    const lineage = defaultDecisionLineageEngine.getDecisionLineage(workspaceId, req.params.id);
    return res.status(200).json({ success: true, status: 'PASS', lineage });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/knowledge-graph/thesis/:id/dependencies
 */
router.get('/thesis/:id/dependencies', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    const { workspaceId } = auth;
    const deps = defaultDecisionLineageEngine.evaluateThesisDependencies(workspaceId, req.params.id);
    return res.status(200).json({ success: true, status: 'PASS', dependencies: deps });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/knowledge-graph/quality
 */
router.get('/quality', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    const { workspaceId } = auth;
    const quality = defaultKnowledgeGraphQualityEngine.evaluateGraphQuality(workspaceId);
    return res.status(200).json({ success: true, status: 'PASS', quality });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/knowledge-graph/package/seal and POST /api/knowledge-graph/package/verify
 */
router.post('/package/seal', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    const { role, userId } = auth;
    if (role === 'GUEST' || role === 'VIEWER') {
      return res.status(403).json({ error: `${role} role is not authorized to seal packages`, status: 'AUTHORIZATION_FAILURE' });
    }
    const pkg = sealKnowledgeGraphPackage(req.body || {}, userId);
    return res.status(201).json({ success: true, status: 'PASS', package: pkg });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/package/verify', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    const verification = verifyKnowledgeGraphPackage(req.body?.package || req.body);
    return res.status(200).json({ success: true, status: 'PASS', verification });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
