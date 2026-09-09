/**
 * server/routes/scenario.routes.js
 * 
 * Phase 19: Institutional Scenario Analysis & Stress Intelligence Express Routes
 */

import express from 'express';
import { ScenarioStatus, ValueStatus, deepFreeze } from '../scenario/scenario.types.js';
import { ScenarioEngine } from '../scenario/scenario.engine.js';
import { generateScenarioExplanation } from '../scenario/scenario.explanation.js';
import { sealScenarioPackage, verifyScenarioPackage } from '../scenario/scenario.package.js';
import { defaultScenarioRepository } from '../scenario/scenario.repository.js';
import { SCENARIO_CONFIG } from '../scenario/scenario.config.js';

const router = express.Router();
const engine = new ScenarioEngine();

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
 * GET /api/scenario/canonical-list
 * Lists available canonical institutional scenarios
 */
router.get('/canonical-list', (req, res) => {
  try {
    const list = Object.values(SCENARIO_CONFIG.CANONICAL_SCENARIOS).map(scen => ({
      id: scen.id,
      name: scen.name,
      description: scen.description,
      scenarioType: scen.scenarioType,
      horizon: scen.horizon,
      shockCount: scen.shocks.length
    }));
    return res.status(200).json({ status: ScenarioStatus.PASS, scenarios: list });
  } catch (err) {
    return res.status(500).json({ error: err.message, status: ScenarioStatus.UNAVAILABLE });
  }
});

/**
 * POST /api/scenario/evaluate-security
 * Evaluates stress on a single security
 */
router.post('/evaluate-security', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;

    const { security, scenarioDefinition, options } = req.body || {};
    if (!security || !scenarioDefinition) {
      return res.status(400).json({ error: 'security and scenarioDefinition are required', status: ScenarioStatus.INVALID_INPUT });
    }

    const result = engine.evaluateSecurity(security, scenarioDefinition, options);
    return res.status(200).json({ status: ScenarioStatus.PASS, result });
  } catch (err) {
    return res.status(err.name === 'ScenarioValidationError' ? 400 : 500).json({
      error: err.message,
      details: err.details || null,
      status: ScenarioStatus.COMPUTATION_ERROR
    });
  }
});

/**
 * POST /api/scenario/evaluate-portfolio
 * Evaluates stress on a full portfolio
 */
router.post('/evaluate-portfolio', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;

    const { portfolio, scenarioDefinition, options } = req.body || {};
    if (!portfolio || !scenarioDefinition) {
      return res.status(400).json({ error: 'portfolio and scenarioDefinition are required', status: ScenarioStatus.INVALID_INPUT });
    }

    const result = engine.evaluatePortfolio(portfolio, scenarioDefinition, options);
    const explanation = generateScenarioExplanation(result);

    return res.status(200).json({ status: ScenarioStatus.PASS, result, explanation });
  } catch (err) {
    return res.status(err.name === 'ScenarioValidationError' ? 400 : 500).json({
      error: err.message,
      details: err.details || null,
      status: ScenarioStatus.COMPUTATION_ERROR
    });
  }
});

/**
 * POST /api/scenario/canonical/:scenarioKey
 * Runs a canonical pre-configured macro scenario
 */
router.post('/canonical/:scenarioKey', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;

    const { scenarioKey } = req.params;
    const { portfolio, options } = req.body || {};

    if (!portfolio) {
      return res.status(400).json({ error: 'portfolio is required', status: ScenarioStatus.INVALID_INPUT });
    }

    const result = engine.runCanonicalScenario(portfolio, scenarioKey, options);
    const explanation = generateScenarioExplanation(result);

    return res.status(200).json({ status: ScenarioStatus.PASS, result, explanation });
  } catch (err) {
    return res.status(500).json({ error: err.message, status: ScenarioStatus.COMPUTATION_ERROR });
  }
});

/**
 * POST /api/scenario/reverse-solver
 * Solves reverse break-even threshold
 */
router.post('/reverse-solver', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;

    const { portfolio, reverseRequest } = req.body || {};
    if (!portfolio || !reverseRequest) {
      return res.status(400).json({ error: 'portfolio and reverseRequest are required', status: ScenarioStatus.INVALID_INPUT });
    }

    const result = engine.solveReverse(portfolio, reverseRequest);
    return res.status(200).json({ status: ScenarioStatus.SOLVER_CONVERGED, result });
  } catch (err) {
    return res.status(err.name === 'SolverConvergenceError' ? 422 : 400).json({
      error: err.message,
      diagnostics: err.diagnostics || null,
      status: ScenarioStatus.SOLVER_FAILED
    });
  }
});

/**
 * POST /api/scenario/compare
 * Compares 2 or more scenarios side by side
 */
router.post('/compare', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;

    const { portfolio, scenarioDefinitions, options } = req.body || {};
    if (!portfolio || !Array.isArray(scenarioDefinitions) || scenarioDefinitions.length < 2) {
      return res.status(400).json({ error: 'portfolio and at least 2 scenarioDefinitions are required', status: ScenarioStatus.INVALID_INPUT });
    }

    const result = engine.compare(portfolio, scenarioDefinitions, options);
    return res.status(200).json({ status: ScenarioStatus.PASS, result });
  } catch (err) {
    return res.status(400).json({ error: err.message, status: ScenarioStatus.COMPUTATION_ERROR });
  }
});

/**
 * POST /api/scenario/seal-package
 * Cryptographically seals a scenario execution package
 */
router.post('/seal-package', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId, role, userId } = auth;

    if (role === 'VIEWER') {
      return res.status(403).json({ error: 'VIEWER role cannot seal scenario packages', status: ScenarioStatus.AUTHORIZATION_FAILURE });
    }

    const { scenarioResult, portfolioSnapshot, scenarioDefinition } = req.body || {};
    const sealedPackage = sealScenarioPackage({
      tenantId: workspaceId,
      scenarioResult,
      portfolioSnapshot,
      scenarioDefinition,
      sealedBy: userId
    });

    defaultScenarioRepository.saveSealedPackage(workspaceId, sealedPackage);

    return res.status(201).json({ status: ScenarioStatus.PASS, sealedPackage });
  } catch (err) {
    return res.status(400).json({ error: err.message, status: ScenarioStatus.INVALID_INPUT });
  }
});

/**
 * POST /api/scenario/verify-package
 * Verifies integrity of a sealed package
 */
router.post('/verify-package', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;

    const { sealedPackage } = req.body || {};
    if (!sealedPackage) {
      return res.status(400).json({ error: 'sealedPackage is required', status: ScenarioStatus.INVALID_INPUT });
    }

    const verification = verifyScenarioPackage(sealedPackage);
    return res.status(200).json({ status: ScenarioStatus.PASS, verification });
  } catch (err) {
    return res.status(400).json({ error: err.message, status: ScenarioStatus.INVALID_INPUT });
  }
});

/**
 * GET /api/scenario/templates
 * Lists saved templates for the current workspace
 */
router.get('/templates', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId } = auth;

    const templates = defaultScenarioRepository.listScenarioTemplates(workspaceId);
    return res.status(200).json({ status: ScenarioStatus.PASS, templates });
  } catch (err) {
    return res.status(500).json({ error: err.message, status: ScenarioStatus.UNAVAILABLE });
  }
});

/**
 * POST /api/scenario/templates
 * Saves a scenario template for the current workspace
 */
router.post('/templates', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId, role } = auth;

    if (role === 'VIEWER' || role === 'AUDITOR') {
      return res.status(403).json({ error: `${role} role cannot create scenario templates`, status: ScenarioStatus.AUTHORIZATION_FAILURE });
    }

    const scenarioDef = req.body || {};
    const saved = defaultScenarioRepository.saveScenarioTemplate(workspaceId, scenarioDef);
    return res.status(201).json({ status: ScenarioStatus.PASS, template: saved });
  } catch (err) {
    return res.status(400).json({ error: err.message, status: ScenarioStatus.INVALID_INPUT });
  }
});

export default router;
