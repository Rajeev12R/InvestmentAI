/**
 * Phase 18 — Institutional Liquidity Express Routes
 */

import express from 'express';
import { LiquidityStatus, LiquidityTier, deepFreeze } from '../liquidity/liquidity.types.js';
import { LiquidityEngine } from '../liquidity/liquidity.engine.js';
import { LiquidityMetricsEngine } from '../liquidity/liquidity.metrics.engine.js';
import { LiquidityCostEngine } from '../liquidity/liquidity.cost.engine.js';
import { LiquidityCapacityEngine } from '../liquidity/liquidity.capacity.engine.js';
import { LiquidityStressEngine } from '../liquidity/liquidity.stress.engine.js';
import { LiquidityFeasibilityEngine } from '../liquidity/liquidity.feasibility.engine.js';
import { LiquidityRebalanceEngine } from '../liquidity/liquidity.rebalance.engine.js';
import { SealedLiquidityIntelligencePackage } from '../liquidity/liquidity.package.js';
import { liquidityRepository } from '../liquidity/liquidity.repository.js';
import { LIQUIDITY_POLICY_V1 } from '../liquidity/liquidity.config.js';

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
 * POST /api/liquidity/observations
 * Saves a liquidity observation for a security in the current workspace.
 */
router.post('/observations', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId, role, userId } = auth;

    if (role === 'VIEWER' || role === 'AUDITOR') {
      return res.status(403).json({ error: `${role} role is not authorized to record observations`, status: LiquidityStatus.AUTHORIZATION_FAILURE });
    }

    const obs = req.body || {};
    if (!obs.ticker) {
      return res.status(400).json({ error: 'Ticker is required', status: LiquidityStatus.INVALID_INPUT });
    }

    const saved = liquidityRepository.saveObservation(workspaceId, obs);
    liquidityRepository.recordAuditEvent(workspaceId, {
      action: 'OBSERVATION_RECORDED',
      ticker: obs.ticker,
      actor: userId
    });

    return res.status(201).json({ status: LiquidityStatus.PASS, observation: saved });
  } catch (err) {
    return res.status(500).json({ error: err.message, status: LiquidityStatus.UNAVAILABLE });
  }
});

/**
 * GET /api/liquidity/:ticker
 * Retrieves complete liquidity evaluation for a security.
 */
router.get('/:ticker', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId } = auth;
    const ticker = req.params.ticker.toUpperCase();

    const obs = liquidityRepository.getObservation(workspaceId, ticker);
    if (!obs) {
      return res.status(404).json({ error: `No observation found for ${ticker}`, status: LiquidityStatus.UNAVAILABLE });
    }

    const result = LiquidityEngine.evaluateSecurityLiquidity(obs);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message, status: LiquidityStatus.UNAVAILABLE });
  }
});

/**
 * GET /api/liquidity/:ticker/metrics
 * Retrieves ADV, Dollar ADV, spread, tier, and score for a security.
 */
router.get('/:ticker/metrics', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId } = auth;
    const ticker = req.params.ticker.toUpperCase();

    const obs = liquidityRepository.getObservation(workspaceId, ticker);
    if (!obs) {
      return res.status(404).json({ error: `No observation found for ${ticker}`, status: LiquidityStatus.UNAVAILABLE });
    }

    const evalResult = LiquidityEngine.evaluateSecurityLiquidity(obs);
    return res.json({
      status: evalResult.status,
      ticker: evalResult.ticker,
      adv: evalResult.adv,
      dollarAdv: evalResult.dollarAdv,
      bid: evalResult.bid,
      ask: evalResult.ask,
      spreadBps: evalResult.spreadBps,
      tier: evalResult.tier,
      liquidityScore: evalResult.liquidityScore
    });
  } catch (err) {
    return res.status(500).json({ error: err.message, status: LiquidityStatus.UNAVAILABLE });
  }
});

/**
 * GET /api/liquidity/:ticker/cost
 * Calculates componentized trading costs for a requested notional.
 */
router.get('/:ticker/cost', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId } = auth;
    const ticker = req.params.ticker.toUpperCase();
    const notional = Number(req.query.notional || 100000);
    const side = req.query.side || 'BUY';
    const direction = req.query.direction || 'ONE_WAY';

    const obs = liquidityRepository.getObservation(workspaceId, ticker);
    if (!obs) {
      return res.status(404).json({ error: `No observation found for ${ticker}`, status: LiquidityStatus.UNAVAILABLE });
    }

    const dollarAdv = obs.dollarAdv || (obs.adv * obs.price);
    const result = LiquidityCostEngine.calculateTradingCost({
      orderNotional: notional,
      dollarAdv,
      spreadBps: obs.spreadBps || 10.0,
      side,
      direction,
      jurisdiction: obs.jurisdiction || 'US'
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message, status: LiquidityStatus.UNAVAILABLE });
  }
});

/**
 * GET /api/liquidity/:ticker/capacity
 * Calculates position and daily trading capacity limits for a security.
 */
router.get('/:ticker/capacity', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId } = auth;
    const ticker = req.params.ticker.toUpperCase();

    const obs = liquidityRepository.getObservation(workspaceId, ticker);
    if (!obs) {
      return res.status(404).json({ error: `No observation found for ${ticker}`, status: LiquidityStatus.UNAVAILABLE });
    }

    const dollarAdv = obs.dollarAdv || (obs.adv * obs.price);
    const result = LiquidityCapacityEngine.calculatePositionCapacity(dollarAdv);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message, status: LiquidityStatus.UNAVAILABLE });
  }
});

/**
 * GET /api/liquidity/:ticker/stress
 * Calculates base vs stressed outcomes across standard scenarios.
 */
router.get('/:ticker/stress', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId } = auth;
    const ticker = req.params.ticker.toUpperCase();
    const notional = Number(req.query.notional || 100000);

    const obs = liquidityRepository.getObservation(workspaceId, ticker);
    if (!obs) {
      return res.status(404).json({ error: `No observation found for ${ticker}`, status: LiquidityStatus.UNAVAILABLE });
    }

    const result = LiquidityStressEngine.runAllStandardScenarios({
      orderNotional: notional,
      adv: obs.adv,
      dollarAdv: obs.dollarAdv || (obs.adv * obs.price),
      spreadBps: obs.spreadBps || 10.0,
      referencePrice: obs.price
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message, status: LiquidityStatus.UNAVAILABLE });
  }
});

/**
 * POST /api/liquidity/portfolio
 * Evaluates comprehensive multi-asset portfolio liquidity profile.
 */
router.post('/portfolio', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const portfolioData = req.body || {};
    const fxRates = req.body.fxRates || {};

    const result = LiquidityEngine.evaluatePortfolioLiquidity(portfolioData, fxRates);
    if (result.status !== LiquidityStatus.PASS) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message, status: LiquidityStatus.UNAVAILABLE });
  }
});

/**
 * POST /api/liquidity/rebalance
 * Evaluates liquidity impact of portfolio rebalancing trades.
 */
router.post('/rebalance', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const rebalanceData = req.body || {};

    const result = LiquidityRebalanceEngine.evaluateRebalanceTrades(rebalanceData);
    if (result.status === LiquidityStatus.INVALID_INPUT) {
      return res.status(400).json(result);
    }
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message, status: LiquidityStatus.UNAVAILABLE });
  }
});

/**
 * POST /api/liquidity/feasibility
 * Evaluates standalone order execution feasibility.
 */
router.post('/feasibility', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const orderParams = req.body || {};

    const result = LiquidityFeasibilityEngine.evaluateFeasibility(orderParams);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message, status: LiquidityStatus.UNAVAILABLE });
  }
});

/**
 * POST /api/liquidity/package/seal
 * Constructs and cryptographically seals a liquidity intelligence package.
 */
router.post('/package/seal', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId, role, userId } = auth;

    if (role === 'VIEWER' || role === 'AUDITOR') {
      return res.status(403).json({ error: `${role} role is not authorized to seal packages`, status: LiquidityStatus.AUTHORIZATION_FAILURE });
    }

    const payload = {
      ...req.body,
      workspaceId
    };

    const sealed = SealedLiquidityIntelligencePackage.sealPackage(payload);
    liquidityRepository.savePackage(workspaceId, sealed);
    liquidityRepository.recordAuditEvent(workspaceId, {
      action: 'PACKAGE_SEALED',
      packageId: sealed.packageId,
      packageHash: sealed.packageHash,
      actor: userId
    });

    return res.status(201).json(sealed);
  } catch (err) {
    return res.status(500).json({ error: err.message, status: LiquidityStatus.UNAVAILABLE });
  }
});

/**
 * GET /api/liquidity/package/:packageId
 * Retrieves and verifies a sealed package.
 */
router.get('/package/:packageId', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId } = auth;
    const packageId = req.params.packageId;

    const sealed = liquidityRepository.getPackage(workspaceId, packageId);
    if (!sealed) {
      return res.status(404).json({ error: `Package ${packageId} not found in workspace`, status: LiquidityStatus.UNAVAILABLE });
    }

    const isValid = SealedLiquidityIntelligencePackage.verifyPackage(sealed);
    return res.json({
      status: LiquidityStatus.PASS,
      verified: isValid,
      package: sealed
    });
  } catch (err) {
    return res.status(500).json({ error: err.message, status: LiquidityStatus.UNAVAILABLE });
  }
});

export default router;
