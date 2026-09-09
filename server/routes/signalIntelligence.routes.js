import express from 'express';
import { defaultSignalStore } from '../signalIntelligence/signal.store.js';
import { defaultFusionEngine } from '../signalIntelligence/signal.fusion.engine.js';
import { defaultPortfolioSignalEngine } from '../signalIntelligence/signal.portfolio.engine.js';
import { defaultIndependenceEngine } from '../signalIntelligence/signal.independence.engine.js';
import { defaultValidationEngine } from '../signalIntelligence/signal.validation.engine.js';
import { defaultPackageEngine } from '../signalIntelligence/signal.package.js';

const router = express.Router();

const getTenant = (req) => req.headers['x-tenant-id'] || req.user?.tenantId || 'tenant_default';

/**
 * GET /api/signal-intelligence/signals
 */
router.get('/signals', (req, res) => {
  try {
    const tenant = getTenant(req);
    const { asOf, entityId } = req.query;
    const filter = entityId ? (s => s.entityId === entityId) : null;
    const list = defaultSignalStore.listEntities(tenant, 'compositeSignals', filter, asOf);
    res.json({ success: true, count: list.length, signals: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/signal-intelligence/signals/:id
 */
router.get('/signals/:id', (req, res) => {
  try {
    const tenant = getTenant(req);
    const { asOf } = req.query;
    const signal = defaultSignalStore.getEntityAsOf(tenant, 'compositeSignals', req.params.id, asOf);
    if (!signal) return res.status(404).json({ success: false, error: 'Signal not found' });
    res.json({ success: true, signal });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/signal-intelligence/signals/:id/history
 */
router.get('/signals/:id/history', (req, res) => {
  try {
    const tenant = getTenant(req);
    const history = defaultSignalStore.getEntityHistory(tenant, 'compositeSignals', req.params.id);
    res.json({ success: true, count: history.length, history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/signal-intelligence/signals/:id/explanation
 */
router.get('/signals/:id/explanation', (req, res) => {
  try {
    const tenant = getTenant(req);
    const signal = defaultSignalStore.getEntityAsOf(tenant, 'compositeSignals', req.params.id);
    if (!signal) return res.status(404).json({ success: false, error: 'Signal not found' });
    res.json({
      success: true,
      explanation: {
        entityId: signal.entityId,
        score: signal.score,
        regime: signal.regime,
        direction: signal.direction,
        confidence: signal.confidence,
        contributors: signal.contributors,
        evidenceDiversityScore: signal.evidenceDiversityScore,
        independentEffectiveCount: signal.independentEffectiveCount,
        hasConflict: signal.hasConflict
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/signal-intelligence/companies/:id/signals
 */
router.get('/companies/:id/signals', (req, res) => {
  try {
    const tenant = getTenant(req);
    const { asOf } = req.query;
    const list = defaultSignalStore.listEntities(tenant, 'compositeSignals', s => s.entityId === req.params.id, asOf);
    res.json({ success: true, entityId: req.params.id, count: list.length, signals: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/signal-intelligence/companies/:id/divergences
 */
router.get('/companies/:id/divergences', (req, res) => {
  try {
    const tenant = getTenant(req);
    const list = defaultSignalStore.listEntities(tenant, 'compositeSignals', s => s.entityId === req.params.id);
    const divergences = list.flatMap(s => s.divergences || []);
    res.json({ success: true, entityId: req.params.id, count: divergences.length, divergences });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/signal-intelligence/portfolio/signals
 */
router.post('/portfolio/signals', (req, res) => {
  try {
    const tenant = getTenant(req);
    const { portfolioId, holdings, knowledgeCutoff } = req.body;
    const portfolioSignals = defaultPortfolioSignalEngine.aggregatePortfolioSignals(tenant, {
      portfolioId,
      holdings,
      knowledgeCutoff
    });
    res.json({ success: true, portfolioSignals });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/signal-intelligence/signal-methodologies
 */
router.get('/signal-methodologies', (req, res) => {
  res.json({
    success: true,
    methodology: {
      version: '2026.1',
      description: 'Deterministic Signal Fusion & Independence Engine with Out-of-Sample Calibration',
      supportedTypesCount: 20,
      decayModel: 'EXPONENTIAL_HALF_LIFE',
      divergenceRules: ['VALUATION_VS_FUNDAMENTALS', 'EARNINGS_VS_ALTERNATIVE_DATA', 'MACRO_VS_COMPANY']
    }
  });
});

/**
 * GET /api/signal-intelligence/signal-packages
 */
router.get('/signal-packages', (req, res) => {
  try {
    const tenant = getTenant(req);
    const packages = defaultSignalStore.listEntities(tenant, 'packages');
    res.json({ success: true, count: packages.length, packages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
