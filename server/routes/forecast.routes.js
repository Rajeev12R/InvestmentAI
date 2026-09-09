/**
 * server/routes/forecast.routes.js
 * 
 * Phase 20: Institutional Forecasting Express Routes
 */

import express from 'express';
import { defaultForecastEngine } from '../forecasting/forecast.engine.js';
import { defaultAssumptionRegistry } from '../forecasting/forecast.assumptions.js';
import { defaultForecastRepository } from '../forecasting/forecast.repository.js';
import { defaultRevisionEngine } from '../forecasting/forecast.revisions.engine.js';
import { evaluateForecastAccuracy, computeAggregateModelAccuracy } from '../forecasting/forecast.accuracy.engine.js';
import { generateForecastExplanation } from '../forecasting/forecast.explanation.js';
import { sealForecastPackage, verifyForecastPackage } from '../forecasting/forecast.package.js';
import { ForecastStatus, ForecastClassification } from '../forecasting/forecast.types.js';

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
 * POST /api/forecast/generate
 * Generates a forward forecast for a security
 */
router.post('/generate', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId, role, userId } = auth;

    if (role === 'VIEWER' || role === 'AUDITOR') {
      return res.status(403).json({ error: `${role} role is not authorized to generate forecasts`, status: 'AUTHORIZATION_FAILURE' });
    }

    const request = req.body || {};
    const forecastRecord = defaultForecastEngine.generateForecast(request);
    const explanation = generateForecastExplanation(forecastRecord);

    defaultForecastRepository.saveForecast(workspaceId, forecastRecord);
    defaultRevisionEngine.recordForecastVersion(workspaceId, forecastRecord);

    return res.status(201).json({ status: 'PASS', forecast: forecastRecord, explanation });
  } catch (err) {
    return res.status(err.name === 'ForecastValidationError' ? 400 : 500).json({
      error: err.message,
      details: err.details || null
    });
  }
});

/**
 * POST /api/forecast/multi-case
 * Generates multi-case (Base/Bull/Bear) forecasts
 */
router.post('/multi-case', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { role } = auth;

    if (role === 'VIEWER' || role === 'AUDITOR') {
      return res.status(403).json({ error: `${role} role is not authorized to generate forecasts` });
    }

    const { baseFinancials, caseDrivers, horizonYears } = req.body || {};
    if (!baseFinancials || !caseDrivers) {
      return res.status(400).json({ error: 'baseFinancials and caseDrivers are required' });
    }

    const result = defaultForecastEngine.generateMultiCaseForecast(baseFinancials, caseDrivers, horizonYears || 3);
    return res.status(200).json({ status: 'PASS', multiCaseForecast: result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/forecast/valuation-link
 * Links forecast to DCF and multiple models
 */
router.post('/valuation-link', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;

    const { fundamentalForecastResult, valuationParams } = req.body || {};
    if (!fundamentalForecastResult || !valuationParams) {
      return res.status(400).json({ error: 'fundamentalForecastResult and valuationParams are required' });
    }

    const valResult = defaultForecastEngine.evaluateForecastValuation(fundamentalForecastResult, valuationParams);
    return res.status(200).json({ status: 'PASS', valuation: valResult });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/forecast/portfolio
 * Aggregates portfolio forward expectations
 */
router.post('/portfolio', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;

    const { portfolio } = req.body || {};
    if (!portfolio) {
      return res.status(400).json({ error: 'portfolio is required' });
    }

    const portForecast = defaultForecastEngine.evaluatePortfolioForecast(portfolio);
    return res.status(200).json({ status: 'PASS', portfolioForecast: portForecast });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/forecast/assumptions
 * Registers explicit assumption
 */
router.post('/assumptions', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId, role, userId } = auth;

    if (role === 'VIEWER' || role === 'AUDITOR') {
      return res.status(403).json({ error: `${role} cannot register assumptions` });
    }

    const assumptionData = req.body || {};
    const registered = defaultAssumptionRegistry.registerAssumption(workspaceId, assumptionData, userId);
    return res.status(201).json({ status: 'PASS', assumption: registered });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/forecast/assumptions
 * Lists registered assumptions
 */
router.get('/assumptions', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId } = auth;

    const list = defaultAssumptionRegistry.listAssumptions(workspaceId);
    return res.status(200).json({ status: 'PASS', assumptions: list });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/forecast/consensus
 * Records external consensus estimate
 */
router.post('/consensus', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;

    const consensusData = req.body || {};
    const record = defaultForecastEngine.consensusEngine.recordConsensus(consensusData);
    return res.status(201).json({ status: 'PASS', consensus: record });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/forecast/consensus/:ticker/:metric
 * Retrieves consensus estimate
 */
router.get('/consensus/:ticker/:metric', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;

    const { ticker, metric } = req.params;
    const period = req.query.period || 'FY+1';
    const record = defaultForecastEngine.consensusEngine.getConsensus(ticker, metric, period);

    if (!record) {
      return res.status(404).json({ error: 'Consensus record not found' });
    }
    return res.status(200).json({ status: 'PASS', consensus: record });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/forecast/evaluate-accuracy
 * Evaluates forecast error against realized Truth facts
 */
router.post('/evaluate-accuracy', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;

    const { forecast, realizedFact, pairs } = req.body || {};
    if (Array.isArray(pairs)) {
      const aggAccuracy = computeAggregateModelAccuracy(pairs);
      return res.status(200).json({ status: 'PASS', aggregateAccuracy: aggAccuracy });
    }

    if (!forecast || !realizedFact) {
      return res.status(400).json({ error: 'forecast and realizedFact are required' });
    }

    const accuracy = evaluateForecastAccuracy(forecast, realizedFact);
    return res.status(200).json({ status: 'PASS', accuracy });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/forecast/seal-package
 * Seals forecast package cryptographically
 */
router.post('/seal-package', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId, role, userId } = auth;

    if (role === 'VIEWER') {
      return res.status(403).json({ error: 'VIEWER role cannot seal forecast packages' });
    }

    const { forecastRecord, assumptions } = req.body || {};
    const sealedPkg = sealForecastPackage({
      tenantId: workspaceId,
      forecastRecord,
      assumptions,
      sealedBy: userId
    });

    defaultForecastRepository.saveSealedPackage(workspaceId, sealedPkg);
    return res.status(201).json({ status: 'PASS', sealedPackage: sealedPkg });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/forecast/verify-package
 * Verifies integrity of a sealed forecast package
 */
router.post('/verify-package', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;

    const { sealedPackage } = req.body || {};
    if (!sealedPackage) {
      return res.status(400).json({ error: 'sealedPackage is required' });
    }

    const verification = verifyForecastPackage(sealedPackage);
    return res.status(200).json({ status: 'PASS', verification });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

export default router;
