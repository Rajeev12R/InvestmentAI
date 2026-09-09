/**
 * Phase 17 — Institutional Tax Intelligence Express Routes
 */

import express from 'express';
import { TaxStatus, CostBasisMethod } from '../tax/tax.types.js';
import { TaxLotEngine } from '../tax/tax.lot.engine.js';
import { TaxRuleEngine } from '../tax/tax.rule.engine.js';
import { TaxScenarioEngine } from '../tax/tax.scenario.engine.js';
import { TaxHarvestingEngine } from '../tax/tax.harvesting.engine.js';
import { TaxRebalanceEngine } from '../tax/tax.rebalance.engine.js';
import { TaxAfterTaxReturnEngine } from '../tax/tax.afterTaxReturn.engine.js';
import { TaxDragEngine } from '../tax/tax.taxDrag.engine.js';
import { TaxExplanationEngine } from '../tax/tax.explanation.engine.js';
import { taxRepository } from '../tax/tax.repository.js';
import { TAX_POLICY_V1, TAX_POLICY_V2 } from '../tax/tax.config.js';

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
 * POST /api/tax/lots
 * Creates or updates an immutable tax lot.
 */
router.post('/lots', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId, role, userId } = auth;

    if (role === 'VIEWER' || role === 'AUDITOR') {
      return res.status(403).json({ error: `${role} role is not authorized to create tax lots`, status: TaxStatus.AUTHORIZATION_FAILURE });
    }

    const lotData = req.body || {};
    const asOf = req.body.asOf || new Date().toISOString();

    const result = TaxLotEngine.createTaxLot(lotData, asOf);
    if (result.status !== TaxStatus.PASS) {
      return res.status(400).json(result);
    }

    taxRepository.saveLot(workspaceId, result.lot);
    taxRepository.recordAuditEvent(workspaceId, {
      portfolioId: lotData.accountId || lotData.portfolioId,
      action: 'TAX_LOT_CREATED',
      actor: userId,
      lotId: result.lot.lotId,
      lotHash: result.lot.lotHash
    });

    return res.status(201).json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message, status: TaxStatus.INVALID_INPUT });
  }
});

/**
 * GET /api/tax/lots/:portfolioId
 * Retrieves active tax lots for a portfolio.
 */
router.get('/lots/:portfolioId', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId } = auth;
    const { portfolioId } = req.params;

    const lots = taxRepository.getLotsByPortfolio(workspaceId, portfolioId);
    return res.status(200).json({
      portfolioId,
      workspaceId,
      count: lots.length,
      lots
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/tax/calculate
 * Runs comprehensive deterministic tax pipeline and seals a package.
 */
router.post('/calculate', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId, userId } = auth;

    const {
      portfolioId,
      asOf,
      jurisdiction,
      accountType,
      openLots,
      currentPrices,
      portfolioValue,
      preTaxTwr,
      preTaxMwr,
      targetWeights,
      currentWeights,
      expectedReturns,
      volatilities,
      constraints,
      policyId
    } = req.body || {};

    if (!portfolioId) {
      return res.status(400).json({ error: 'portfolioId is required', status: TaxStatus.INVALID_INPUT });
    }

    let policy = taxRepository.getPolicy(workspaceId, policyId) || TAX_POLICY_V1;

    // Use open lots from body or repository
    let lotsToUse = openLots;
    if (!lotsToUse || lotsToUse.length === 0) {
      lotsToUse = taxRepository.getLotsByPortfolio(workspaceId, portfolioId);
    }

    const sealedPackage = TaxRuleEngine.evaluatePortfolioTax({
      workspaceId,
      portfolioId,
      asOf: asOf || new Date().toISOString(),
      jurisdiction: jurisdiction || 'US',
      accountType: accountType || 'TAXABLE',
      openLots: lotsToUse,
      currentPrices: currentPrices || {},
      portfolioValue: portfolioValue || 1000000,
      preTaxTwr: preTaxTwr ?? 0.10,
      preTaxMwr: preTaxMwr ?? 0.09,
      targetWeights: targetWeights || {},
      currentWeights: currentWeights || {},
      expectedReturns: expectedReturns || {},
      volatilities: volatilities || {},
      constraints: constraints || {},
      policy,
      actor: userId
    });

    if (sealedPackage.status && sealedPackage.status !== TaxStatus.PASS) {
      return res.status(400).json(sealedPackage);
    }

    return res.status(200).json(sealedPackage);
  } catch (err) {
    return res.status(500).json({ error: err.message, status: TaxStatus.NUMERICAL_FAILURE });
  }
});

/**
 * POST /api/tax/scenario
 * Generates Scenario A–E comparison.
 */
router.post('/scenario', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId } = auth;

    const {
      portfolioId,
      currentWeights,
      targetWeights,
      currentPrices,
      portfolioValue,
      openLots,
      expectedReturns,
      volatilities,
      constraints,
      asOf,
      jurisdiction,
      accountType
    } = req.body || {};

    if (!portfolioId) {
      return res.status(400).json({ error: 'portfolioId is required', status: TaxStatus.INVALID_INPUT });
    }

    let lotsToUse = openLots;
    if (!lotsToUse || lotsToUse.length === 0) {
      lotsToUse = taxRepository.getLotsByPortfolio(workspaceId, portfolioId);
    }

    const openLotsBySec = {};
    for (const lot of (lotsToUse || [])) {
      if (!openLotsBySec[lot.securityId]) openLotsBySec[lot.securityId] = [];
      openLotsBySec[lot.securityId].push(lot);
    }

    const result = TaxScenarioEngine.evaluateScenarios({
      portfolioId,
      workspaceId,
      currentWeights: currentWeights || {},
      targetWeights: targetWeights || {},
      currentPrices: currentPrices || {},
      portfolioValue: portfolioValue || 1000000,
      openLotsBySecurity: openLotsBySec,
      allOpenLots: lotsToUse || [],
      expectedReturns: expectedReturns || {},
      volatilities: volatilities || {},
      constraints: constraints || {},
      policy: TAX_POLICY_V1,
      asOf: asOf || new Date().toISOString(),
      jurisdiction: jurisdiction || 'US',
      accountType: accountType || 'TAXABLE'
    });

    if (result.status !== TaxStatus.PASS) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/tax/harvesting
 * Evaluates tax-loss harvesting candidates.
 */
router.post('/harvesting', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId } = auth;

    const { openLots, currentPrices, transactionHistory, replacementMap, asOf, jurisdiction, accountType } = req.body || {};

    const result = TaxHarvestingEngine.identifyHarvestCandidates({
      openLots: openLots || [],
      currentPrices,
      transactionHistory: transactionHistory || [],
      replacementMap: replacementMap || {},
      asOf: asOf || new Date().toISOString(),
      jurisdiction: jurisdiction || 'US',
      accountType: accountType || 'TAXABLE'
    });

    if (result.status !== TaxStatus.PASS) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/tax/rebalance
 * Evaluates tax-aware rebalancing.
 */
router.post('/rebalance', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId } = auth;

    const {
      portfolioId,
      currentWeights,
      targetWeights,
      currentPrices,
      portfolioValue,
      openLotsBySecurity,
      expectedReturns,
      volatilities,
      constraints,
      asOf,
      jurisdiction,
      accountType,
      basisMethod
    } = req.body || {};

    let openLotsBySec = openLotsBySecurity;
    if (!openLotsBySec || Object.keys(openLotsBySec).length === 0) {
      const repoLots = taxRepository.getLotsByPortfolio(workspaceId, portfolioId);
      openLotsBySec = {};
      for (const lot of repoLots) {
        if (!openLotsBySec[lot.securityId]) openLotsBySec[lot.securityId] = [];
        openLotsBySec[lot.securityId].push(lot);
      }
    }

    const result = TaxRebalanceEngine.generateTaxAwareRebalance({
      portfolioId: portfolioId || 'DEFAULT',
      workspaceId,
      currentWeights: currentWeights || {},
      targetWeights: targetWeights || {},
      currentPrices: currentPrices || {},
      portfolioValue: portfolioValue || 1000000,
      openLotsBySecurity: openLotsBySec,
      expectedReturns: expectedReturns || {},
      volatilities: volatilities || {},
      constraints: constraints || {},
      policy: TAX_POLICY_V1,
      asOf: asOf || new Date().toISOString(),
      jurisdiction: jurisdiction || 'US',
      accountType: accountType || 'TAXABLE',
      basisMethod: basisMethod || CostBasisMethod.FIFO
    });

    if (result.status !== TaxStatus.PASS) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/tax/:portfolioId
 * Retrieves latest sealed tax package.
 */
router.get('/:portfolioId', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId } = auth;
    const { portfolioId } = req.params;

    const pkg = taxRepository.getLatestPackageByPortfolio(workspaceId, portfolioId);
    if (!pkg) {
      return res.status(404).json({ error: 'No tax intelligence package found for portfolio', status: TaxStatus.UNAVAILABLE });
    }

    return res.status(200).json(pkg);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/tax/:portfolioId/after-tax
 * Retrieves after-tax return breakdown.
 */
router.get('/:portfolioId/after-tax', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId } = auth;
    const { portfolioId } = req.params;

    const pkg = taxRepository.getLatestPackageByPortfolio(workspaceId, portfolioId);
    if (!pkg || !pkg.afterTaxReturns) {
      return res.status(404).json({ error: 'After-tax return data unavailable for portfolio', status: TaxStatus.AFTER_TAX_RESULT_UNAVAILABLE });
    }

    return res.status(200).json(pkg.afterTaxReturns);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/tax/:portfolioId/tax-drag
 * Retrieves tax drag metrics.
 */
router.get('/:portfolioId/tax-drag', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId } = auth;
    const { portfolioId } = req.params;

    const pkg = taxRepository.getLatestPackageByPortfolio(workspaceId, portfolioId);
    if (!pkg || !pkg.taxDrag) {
      return res.status(404).json({ error: 'Tax drag data unavailable for portfolio', status: TaxStatus.UNAVAILABLE });
    }

    return res.status(200).json(pkg.taxDrag);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/tax/policy
 * Creates a tax policy.
 */
router.post('/policy', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId, role } = auth;

    if (role === 'VIEWER' || role === 'AUDITOR' || role === 'ANALYST') {
      return res.status(403).json({ error: `${role} role is not authorized to create tax policies`, status: TaxStatus.AUTHORIZATION_FAILURE });
    }

    const { policyId, name, effectiveFrom, objectiveWeights, supportedJurisdictions } = req.body || {};
    if (!policyId || !name || !effectiveFrom) {
      return res.status(400).json({ error: 'policyId, name, and effectiveFrom are required', status: TaxStatus.INVALID_INPUT });
    }

    const policy = {
      policyId,
      version: '1.0.0',
      name,
      effectiveFrom,
      objectiveWeights: objectiveWeights || { lambda1Risk: 1.0, lambda2TransactionCost: 1.0, lambda3TaxCost: 1.5, lambda4TurnoverPenalty: 0.5 },
      supportedJurisdictions: supportedJurisdictions || ['US', 'IN']
    };

    taxRepository.savePolicy(workspaceId, policy);
    return res.status(201).json(policy);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/tax/policy/:policyId
 * Retrieves a tax policy.
 */
router.get('/policy/:policyId', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId } = auth;
    const { policyId } = req.params;

    const policy = taxRepository.getPolicy(workspaceId, policyId);
    if (!policy) {
      return res.status(404).json({ error: `Policy ${policyId} not found`, status: TaxStatus.POLICY_NOT_FOUND });
    }

    return res.status(200).json(policy);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/tax/policy/:policyId/history
 * Retrieves policy history.
 */
router.get('/policy/:policyId/history', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { policyId } = req.params;

    return res.status(200).json({
      policyId,
      versions: [TAX_POLICY_V1, TAX_POLICY_V2]
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/tax/:portfolioId/audit
 * Retrieves audit trail for a portfolio.
 */
router.get('/:portfolioId/audit', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId } = auth;
    const { portfolioId } = req.params;

    const logs = taxRepository.getAuditLogs(workspaceId, portfolioId);
    return res.status(200).json({
      portfolioId,
      workspaceId,
      count: logs.length,
      auditLogs: logs
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/tax/package/:packageId
 * Retrieves sealed package by packageId.
 */
router.get('/package/:packageId', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId } = auth;
    const { packageId } = req.params;

    const pkg = taxRepository.getPackage(workspaceId, packageId);
    if (!pkg) {
      return res.status(404).json({ error: 'Package not found or access denied', status: TaxStatus.UNAVAILABLE });
    }

    return res.status(200).json(pkg);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/tax/explain
 * Copilot read-only explanation tool.
 */
router.post('/explain', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId } = auth;
    const { packageId, portfolioId, query } = req.body || {};

    let pkg = null;
    if (packageId) {
      pkg = taxRepository.getPackage(workspaceId, packageId);
    } else if (portfolioId) {
      pkg = taxRepository.getLatestPackageByPortfolio(workspaceId, portfolioId);
    }

    if (!pkg) {
      return res.status(404).json({ error: 'Package not found for explanation', status: TaxStatus.UNAVAILABLE });
    }

    const explanation = TaxExplanationEngine.generateCopilotExplanation(pkg, query);
    return res.status(200).json(explanation);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
