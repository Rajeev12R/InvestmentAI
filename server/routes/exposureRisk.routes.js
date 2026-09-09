import express from 'express';
import { exposureStore } from '../exposureRisk/exposure.store.js';
import { ExposureAggregationEngine } from '../exposureRisk/exposure.aggregation.engine.js';
import { ExposureFactorEngine } from '../exposureRisk/exposure.factor.engine.js';
import { ExposureRiskDecompositionEngine } from '../exposureRisk/exposure.risk.decomposition.engine.js';
import { ExposureCommonDriverEngine } from '../exposureRisk/exposure.common.driver.engine.js';
import { ExposureMacroScenarioEngine } from '../exposureRisk/exposure.macro.scenario.engine.js';
import { ExposureComplianceLimitsEngine } from '../exposureRisk/exposure.compliance.limits.engine.js';
import { ExposureChangeEngine } from '../exposureRisk/exposure.change.engine.js';
import { ExposurePackageBuilder } from '../exposureRisk/exposure.package.js';

const router = express.Router();

const getTenant = (req) => req.headers['x-tenant-id'] || req.query.tenantId || req.body?.tenantId || 'tenant_default';

/**
 * POST /api/exposure-risk/aggregate
 */
router.post('/aggregate', (req, res) => {
  try {
    const tenant = getTenant(req);
    const result = ExposureAggregationEngine.aggregatePortfolioExposure(req.body);
    exposureStore.savePortfolioExposure(result, tenant);
    res.json({ success: true, exposure: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/exposure-risk/factor-exposure
 */
router.post('/factor-exposure', (req, res) => {
  try {
    const result = ExposureFactorEngine.calculatePortfolioFactorExposures(req.body);
    res.json({ success: true, factorExposures: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/exposure-risk/factor-return-decomposition
 */
router.post('/factor-return-decomposition', (req, res) => {
  try {
    const result = ExposureFactorEngine.decomposeFactorReturns(req.body);
    res.json({ success: true, factorDecomposition: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/exposure-risk/risk-decomposition
 */
router.post('/risk-decomposition', (req, res) => {
  try {
    const tenant = getTenant(req);
    const result = ExposureRiskDecompositionEngine.decomposeCovarianceRisk(req.body);
    exposureStore.saveRiskDecomposition(result, tenant);
    res.json({ success: true, riskDecomposition: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/exposure-risk/common-drivers
 */
router.post('/common-drivers', (req, res) => {
  try {
    const result = ExposureCommonDriverEngine.identifyCommonDrivers(req.body);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/exposure-risk/hidden-concentration
 */
router.post('/hidden-concentration', (req, res) => {
  try {
    const tenant = getTenant(req);
    const result = ExposureCommonDriverEngine.evaluateHiddenConcentration(req.body);
    exposureStore.saveHiddenConcentration(result, tenant);
    res.json({ success: true, concentration: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/exposure-risk/macro-sensitivities
 */
router.post('/macro-sensitivities', (req, res) => {
  try {
    const result = ExposureMacroScenarioEngine.evaluateMacroSensitivities(req.body);
    res.json({ success: true, macroSensitivities: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/exposure-risk/scenario-sensitivity
 */
router.post('/scenario-sensitivity', (req, res) => {
  try {
    const result = ExposureMacroScenarioEngine.evaluateScenarioSensitivity(req.body);
    res.json({ success: true, scenarioSensitivity: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/exposure-risk/check-limits
 */
router.post('/check-limits', (req, res) => {
  try {
    const result = ExposureComplianceLimitsEngine.checkExposureLimits(req.body);
    res.json({ success: true, complianceStatus: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/exposure-risk/compare-snapshots
 */
router.post('/compare-snapshots', (req, res) => {
  try {
    const result = ExposureChangeEngine.compareSnapshots(req.body);
    res.json({ success: true, changeReport: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/exposure-risk/seal-package
 */
router.post('/seal-package', (req, res) => {
  try {
    const tenant = getTenant(req);
    const pkg = ExposurePackageBuilder.sealPackage(req.body);
    exposureStore.savePackage(pkg, tenant);
    res.status(201).json({ success: true, package: pkg });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/exposure-risk/packages
 */
router.get('/packages', (req, res) => {
  try {
    const tenant = getTenant(req);
    const list = exposureStore.listPackages(tenant);
    res.json({ success: true, count: list.length, packages: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/exposure-risk/packages/:id/verify
 */
router.get('/packages/:id/verify', (req, res) => {
  try {
    const tenant = getTenant(req);
    const pkg = exposureStore.getPackage(req.params.id, tenant);
    if (!pkg) return res.status(404).json({ success: false, error: 'Package not found' });
    const verification = ExposurePackageBuilder.verifyPackage(pkg);
    res.json({ success: true, verification });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/exposure-risk/stats
 */
router.get('/stats', (req, res) => {
  try {
    const tenant = getTenant(req);
    const stats = exposureStore.getStats(tenant);
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
