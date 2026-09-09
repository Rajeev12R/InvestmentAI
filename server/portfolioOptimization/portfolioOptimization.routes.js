/**
 * server/portfolioOptimization/portfolioOptimization.routes.js
 * 
 * Phase 33: Express Router for Institutional Portfolio Optimization API
 */

import express from 'express';
import { PortfolioOptimizationEngine } from './portfolioOptimization.engine.js';
import { PortfolioOptimizationExplanationDAG } from './portfolioOptimization.explanation.js';
import { PortfolioOptimizationConstraints } from './portfolioOptimization.constraints.js';
import { PortfolioOptimizationScenarios } from './portfolioOptimization.scenarios.js';
import { PortfolioOptimizationPackageBuilder } from './portfolioOptimization.package.js';
import { portfolioOptimizationRepository } from './portfolioOptimization.repository.js';

export const portfolioOptimizationRouter = express.Router();

/**
 * POST /api/portfolio-optimization/optimize
 */
portfolioOptimizationRouter.post('/optimize', (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || req.body.tenantId || 'default_tenant';
    const optResult = PortfolioOptimizationEngine.runOptimization(req.body);
    const explanation = PortfolioOptimizationExplanationDAG.buildExplanationDAG(optResult);

    const sealedPackage = PortfolioOptimizationPackageBuilder.buildSealedPackage({
      optimizationResult: optResult,
      explanationDAG: explanation,
      portfolioSnapshotId: req.body.portfolioSnapshotId,
      tenantId
    });

    portfolioOptimizationRepository.savePackage(tenantId, sealedPackage);

    return res.status(200).json({
      success: true,
      optimizationResult: optResult,
      explanationDAG: explanation,
      packageId: sealedPackage.packageId,
      integrityHash: sealedPackage.integrityHash
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/portfolio-optimization/feasibility
 */
portfolioOptimizationRouter.post('/feasibility', (req, res) => {
  try {
    const feas = PortfolioOptimizationConstraints.checkFeasibility(req.body);
    return res.status(200).json({ success: true, feasibility: feas });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/portfolio-optimization/scenarios
 */
portfolioOptimizationRouter.post('/scenarios', (req, res) => {
  try {
    const scRes = PortfolioOptimizationScenarios.runMultiScenarioOptimization(req.body);
    return res.status(200).json({ success: true, scenarioAnalysis: scRes });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/portfolio-optimization/package/:packageId
 */
portfolioOptimizationRouter.get('/package/:packageId', (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || 'default_tenant';
    const pkg = portfolioOptimizationRepository.getPackage(tenantId, req.params.packageId);
    if (!pkg) {
      return res.status(404).json({ success: false, error: 'Package not found or tenant access denied' });
    }
    return res.status(200).json({ success: true, package: pkg });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/portfolio-optimization/as-of
 */
portfolioOptimizationRouter.get('/as-of', (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || 'default_tenant';
    const { snapshotId, asOf } = req.query;
    if (!snapshotId || !asOf) {
      return res.status(400).json({ success: false, error: 'snapshotId and asOf query params required' });
    }
    const pkg = portfolioOptimizationRepository.getOptimizationAsOf(tenantId, snapshotId, asOf);
    if (!pkg) {
      return res.status(404).json({ success: false, error: 'No historical package found for given PIT timestamp' });
    }
    return res.status(200).json({ success: true, package: pkg });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
