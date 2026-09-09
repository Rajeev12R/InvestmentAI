import express from 'express';
import { defaultAttributionStore } from '../alphaAttribution/attribution.store.js';
import { defaultDecompositionEngine } from '../alphaAttribution/attribution.decomposition.engine.js';
import { defaultBenchmarkEngine } from '../alphaAttribution/attribution.benchmark.engine.js';
import { defaultAlphaPackageEngine } from '../alphaAttribution/attribution.package.js';

const router = express.Router();

const getTenant = (req) => req.headers['x-tenant-id'] || req.query.tenantId || req.body?.tenantId || 'tenant_default';

/**
 * GET /api/alpha-attribution/performances
 */
router.get('/performances', (req, res) => {
  try {
    const tenant = getTenant(req);
    const { signalId, asOf } = req.query;
    const filter = signalId ? (p => p.signalId === signalId) : null;
    const list = defaultAttributionStore.listEntities(tenant, 'performances', filter, asOf);
    res.json({ success: true, count: list.length, performances: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/alpha-attribution/attributions
 */
router.get('/attributions', (req, res) => {
  try {
    const tenant = getTenant(req);
    const { entityId, asOf } = req.query;
    const filter = entityId ? (a => a.entityId === entityId) : null;
    const list = defaultAttributionStore.listEntities(tenant, 'attributions', filter, asOf);
    res.json({ success: true, count: list.length, attributions: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/alpha-attribution/attributions/:id
 */
router.get('/attributions/:id', (req, res) => {
  try {
    const tenant = getTenant(req);
    const { asOf } = req.query;
    const item = defaultAttributionStore.getEntityAsOf(tenant, 'attributions', req.params.id, asOf);
    if (!item) return res.status(404).json({ success: false, error: 'Attribution record not found' });
    res.json({ success: true, attribution: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/alpha-attribution/portfolio/decompose
 */
router.post('/portfolio/decompose', (req, res) => {
  try {
    const tenant = getTenant(req);
    const { portfolioId, portfolioReturn, benchmarkReturn, holdings, systematicEffects, informationCutoff } = req.body;
    const result = defaultDecompositionEngine.decomposePortfolioReturn(tenant, {
      portfolioId,
      portfolioReturn,
      benchmarkReturn,
      holdings,
      systematicEffects,
      informationCutoff
    });
    res.json({ success: true, decomposition: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/alpha-attribution/decisions/:id
 */
router.get('/decisions/:id', (req, res) => {
  try {
    const tenant = getTenant(req);
    const item = defaultAttributionStore.getEntityAsOf(tenant, 'decisionContributions', req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Decision contribution not found' });
    res.json({ success: true, decisionContribution: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/alpha-attribution/brinson
 */
router.post('/brinson', (req, res) => {
  try {
    const { sectors, methodology } = req.body;
    const result = defaultBenchmarkEngine.calculateBrinsonAttribution({ sectors, methodology });
    res.json({ success: true, brinson: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/alpha-attribution/packages
 */
router.get('/packages', (req, res) => {
  try {
    const tenant = getTenant(req);
    const list = defaultAttributionStore.listEntities(tenant, 'packages');
    res.json({ success: true, count: list.length, packages: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/alpha-attribution/packages/:id/verify
 */
router.get('/packages/:id/verify', (req, res) => {
  try {
    const tenant = getTenant(req);
    const pkg = defaultAttributionStore.getEntityAsOf(tenant, 'packages', req.params.id);
    if (!pkg) return res.status(404).json({ success: false, error: 'Package not found' });
    const verification = defaultAlphaPackageEngine.verifyAttributionSeal(pkg);
    res.json({ success: true, verification });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
