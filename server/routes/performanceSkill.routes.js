import express from 'express';
import { performanceStore } from '../performanceSkill/performance.store.js';
import { PerformanceMeasurementEngine } from '../performanceSkill/performance.measurement.engine.js';
import { PerformanceFactorEngine } from '../performanceSkill/performance.factor.engine.js';
import { PerformanceSkillEngine } from '../performanceSkill/performance.skill.engine.js';
import { PerformancePersistenceEngine } from '../performanceSkill/performance.persistence.engine.js';
import { PerformanceLuckEngine } from '../performanceSkill/performance.luck.engine.js';
import { PerformanceScorecardEngine } from '../performanceSkill/performance.scorecard.engine.js';
import { PerformancePackageBuilder } from '../performanceSkill/performance.package.js';

const router = express.Router();

const getTenant = (req) => req.headers['x-tenant-id'] || req.query.tenantId || req.body?.tenantId || 'tenant_default';

/**
 * GET /api/performance-skill/evaluations
 */
router.get('/evaluations', (req, res) => {
  try {
    const tenant = getTenant(req);
    const { asOf } = req.query;
    const list = performanceStore.listEvaluations(tenant, asOf);
    res.json({ success: true, count: list.length, evaluations: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/performance-skill/evaluations
 */
router.post('/evaluations', (req, res) => {
  try {
    const tenant = getTenant(req);
    const saved = performanceStore.saveEvaluation(req.body, tenant);
    res.status(201).json({ success: true, evaluation: saved });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/performance-skill/benchmarks
 */
router.get('/benchmarks', (req, res) => {
  try {
    const tenant = getTenant(req);
    const { asOf } = req.query;
    const list = performanceStore.listBenchmarks(tenant, asOf);
    res.json({ success: true, count: list.length, benchmarks: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/performance-skill/measure
 */
router.post('/measure', (req, res) => {
  try {
    const metrics = PerformanceMeasurementEngine.measureRiskAdjustedMetrics(req.body);
    res.json({ success: true, metrics });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/performance-skill/factor-exposure
 */
router.post('/factor-exposure', (req, res) => {
  try {
    const factorExp = PerformanceFactorEngine.estimateFactorExposure(req.body);
    res.json({ success: true, factorExposure: factorExp });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/performance-skill/timing-skill
 */
router.post('/timing-skill', (req, res) => {
  try {
    const timing = PerformanceSkillEngine.evaluateTimingSkill(req.body);
    res.json({ success: true, timingSkill: timing });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/performance-skill/selection-skill
 */
router.post('/selection-skill', (req, res) => {
  try {
    const selection = PerformanceSkillEngine.evaluateSelectionSkill(req.body);
    res.json({ success: true, selectionSkill: selection });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/performance-skill/allocation-skill
 */
router.post('/allocation-skill', (req, res) => {
  try {
    const allocation = PerformanceSkillEngine.evaluateAllocationSkill(req.body);
    res.json({ success: true, allocationSkill: allocation });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/performance-skill/process-skill
 */
router.post('/process-skill', (req, res) => {
  try {
    const process = PerformanceSkillEngine.evaluateProcessSkill(req.body);
    res.json({ success: true, processSkill: process });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/performance-skill/persistence
 */
router.post('/persistence', (req, res) => {
  try {
    const persistence = PerformancePersistenceEngine.evaluateRollingPersistence(req.body);
    res.json({ success: true, persistence });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/performance-skill/luck-bootstrap
 */
router.post('/luck-bootstrap', (req, res) => {
  try {
    const luck = PerformanceLuckEngine.runBootstrapSignificance(req.body);
    res.json({ success: true, luck });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/performance-skill/manager-scorecard
 */
router.post('/manager-scorecard', (req, res) => {
  try {
    const scorecard = PerformanceScorecardEngine.evaluateManagerScorecard(req.body);
    res.json({ success: true, scorecard });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/performance-skill/seal-package
 */
router.post('/seal-package', (req, res) => {
  try {
    const tenant = getTenant(req);
    const pkg = PerformancePackageBuilder.sealPackage(req.body);
    performanceStore.savePackage(pkg, tenant);
    res.status(201).json({ success: true, package: pkg });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/performance-skill/packages
 */
router.get('/packages', (req, res) => {
  try {
    const tenant = getTenant(req);
    const list = performanceStore.listPackages(tenant);
    res.json({ success: true, count: list.length, packages: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/performance-skill/packages/:id/verify
 */
router.get('/packages/:id/verify', (req, res) => {
  try {
    const tenant = getTenant(req);
    const pkg = performanceStore.getPackage(req.params.id, tenant);
    if (!pkg) return res.status(404).json({ success: false, error: 'Package not found' });
    const verification = PerformancePackageBuilder.verifyPackage(pkg);
    res.json({ success: true, verification });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/performance-skill/stats
 */
router.get('/stats', (req, res) => {
  try {
    const tenant = getTenant(req);
    const stats = performanceStore.getStats(tenant);
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
