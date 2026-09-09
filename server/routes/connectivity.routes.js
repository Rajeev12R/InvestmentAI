/**
 * @file connectivity.routes.js
 * Express Routes for Institutional Connectivity, Market Data & Production Ingestion in Phase 10.
 */

import { Router } from 'express';
import { sourceRegistry } from '../connectivity/sourceRegistry.js';
import { marketDataAdapter } from '../connectivity/adapters/marketData.adapter.js';
import { fundamentalDataAdapter } from '../connectivity/adapters/fundamentalData.adapter.js';
import { filingAdapter } from '../connectivity/adapters/filing.adapter.js';
import { corporateActionAdapter } from '../connectivity/adapters/corporateAction.adapter.js';
import { newsAdapter } from '../connectivity/adapters/news.adapter.js';
import { fxAdapter } from '../connectivity/adapters/fx.adapter.js';
import { macroDataAdapter } from '../connectivity/adapters/macroData.adapter.js';
import { marketStreamAdapter } from '../connectivity/adapters/marketStream.adapter.js';
import { dataLineageEngine } from '../connectivity/dataLineage.engine.js';
import { productionIngestionOrchestrator } from '../connectivity/productionIngestion.orchestrator.js';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { Permission } from '../auth/auth.types.js';

const router = Router();

// 1. GET /api/connectivity/sources - List Registered Sources
router.get('/sources', requireAuth, requirePermission(Permission.TRUTH_READ), (req, res) => {
  const category = req.query.category || null;
  const sources = sourceRegistry.listSources(category);
  res.json({ sources, count: sources.length });
});

// 1b. GET /api/connectivity/sources/:id - Get Single Source
router.get('/sources/:id', requireAuth, requirePermission(Permission.TRUTH_READ), (req, res) => {
  const source = sourceRegistry.getSource(req.params.id);
  if (!source) return res.status(404).json({ error: 'Source not found' });
  res.json({ source });
});

// 1c. GET /api/connectivity/sources/:id/circuit - Get Circuit Breaker Status
router.get('/sources/:id/circuit', requireAuth, requirePermission(Permission.SECURITY_READ), (req, res) => {
  const source = sourceRegistry.getSource(req.params.id);
  if (!source) return res.status(404).json({ error: 'Source not found' });
  const cb = sourceRegistry.getCircuitBreaker(req.params.id);
  res.json({ sourceId: req.params.id, circuitBreaker: cb?.getMetrics() || { state: 'UNKNOWN' } });
});

// 2. GET /api/connectivity/health - Source Health & Circuit Breakers
router.get('/health', requireAuth, requirePermission(Permission.SECURITY_READ), (req, res) => {
  const health = sourceRegistry.getSystemHealth();
  res.json(health);
});

// 3. GET /api/connectivity/matrix & /capabilities - Capability Matrix
router.get(['/matrix', '/capabilities'], requireAuth, requirePermission(Permission.TRUTH_READ), (req, res) => {
  const matrix = sourceRegistry.getCapabilityMatrix();
  res.json({ capabilityMatrix: matrix, capabilities: matrix });
});

// 4. GET /api/connectivity/quotes/history & /prices/:ticker - Historical Price Series
router.get(['/quotes/history', '/prices/:ticker'], requireAuth, requirePermission(Permission.TRUTH_READ), async (req, res) => {
  try {
    const ticker = req.params.ticker || req.query.ticker;
    if (!ticker) return res.status(400).json({ error: 'ticker is required' });
    const limit = parseInt(req.query.limit, 10) || 30;
    const prices = await marketDataAdapter.getHistoricalPrices(ticker, { limit });
    res.json({ history: prices, ...prices });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. GET /api/connectivity/quotes & /quotes/:ticker - Get Quote
router.get(['/quotes', '/quotes/:ticker'], requireAuth, requirePermission(Permission.TRUTH_READ), async (req, res) => {
  try {
    const ticker = req.params.ticker || req.query.ticker;
    if (!ticker) return res.status(400).json({ error: 'ticker is required' });
    const quote = await marketDataAdapter.getQuote(ticker);
    res.json({ quote, ticker: quote.ticker, price: quote.price });
  } catch (err) {
    res.status(500).json({ error: err.message, status: 'UNAVAILABLE' });
  }
});

// 6. GET /api/connectivity/fundamentals & /fundamentals/:ticker - Get Fundamentals
router.get(['/fundamentals', '/fundamentals/:ticker'], requireAuth, requirePermission(Permission.TRUTH_READ), async (req, res) => {
  try {
    const ticker = req.params.ticker || req.query.ticker;
    if (!ticker) return res.status(400).json({ error: 'ticker is required' });
    const period = req.query.period || 'FY2025';
    const data = await fundamentalDataAdapter.getFundamentals(ticker, { period });
    res.json({ fundamentals: data, ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. GET /api/connectivity/filings & /filings/:ticker - Get Filings
router.get(['/filings', '/filings/:ticker'], requireAuth, requirePermission(Permission.TRUTH_READ), async (req, res) => {
  try {
    const ticker = req.params.ticker || req.query.ticker;
    if (!ticker) return res.status(400).json({ error: 'ticker is required' });
    const documentType = req.query.type;
    const filings = await filingAdapter.getFilings(ticker, { documentType });
    res.json({ filings, ...filings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. GET /api/connectivity/corporate-actions & /corporate-actions/:ticker - Get Corporate Actions
router.get(['/corporate-actions', '/corporate-actions/:ticker'], requireAuth, requirePermission(Permission.TRUTH_READ), async (req, res) => {
  try {
    const ticker = req.params.ticker || req.query.ticker;
    if (!ticker) return res.status(400).json({ error: 'ticker is required' });
    const actions = await corporateActionAdapter.getCorporateActions(ticker);
    res.json({ corporateActions: actions, ...actions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. GET /api/connectivity/news & /news/:ticker - Get News
router.get(['/news', '/news/:ticker'], requireAuth, requirePermission(Permission.TRUTH_READ), async (req, res) => {
  try {
    const ticker = req.params.ticker || req.query.ticker;
    if (!ticker) return res.status(400).json({ error: 'ticker is required' });
    const news = await newsAdapter.getNews(ticker);
    res.json({ news, ...news });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. GET /api/connectivity/fx, /fx/rate & /fx/convert - Get FX Rates
router.get(['/fx', '/fx/rate', '/fx/convert'], requireAuth, requirePermission(Permission.TRUTH_READ), async (req, res) => {
  try {
    const base = req.query.base || 'USD';
    const quote = req.query.quote || 'INR';
    const amount = req.query.amount ? parseFloat(req.query.amount) : null;
    
    if (amount !== null && !isNaN(amount)) {
      const converted = fxAdapter.convert(base, quote, amount);
      return res.json({ conversion: converted, ...converted });
    }

    const rateInfo = await fxAdapter.getFXRate(base, quote);
    res.json(rateInfo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11. GET /api/connectivity/macro & /macro/:seriesId - Get Macro Series
router.get(['/macro', '/macro/:seriesId'], requireAuth, requirePermission(Permission.TRUTH_READ), async (req, res) => {
  try {
    const seriesId = req.params.seriesId || req.query.seriesId || 'US_10Y_TREASURY';
    const macro = await macroDataAdapter.getMacroSeries(seriesId);
    res.json({ macro, ...macro });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 12. GET & POST /api/connectivity/stream/* - Streaming Status & Subscription
router.get('/stream/status', requireAuth, (req, res) => {
  res.json({ status: marketStreamAdapter.getStreamStatus() });
});

router.post('/stream/subscribe', requireAuth, (req, res) => {
  const ticker = req.body?.ticker || 'AAPL';
  res.json(marketStreamAdapter.subscribe(ticker));
});

// 13. GET /api/connectivity/lineage & /lineage/:ticker - Get Lineage
router.get(['/lineage', '/lineage/:ticker'], requireAuth, requirePermission(Permission.TRUTH_READ), (req, res) => {
  const ticker = req.params.ticker || req.query.ticker || 'AAPL';
  const metric = req.query.metric || 'REVENUE';
  const period = req.query.period || 'FY2025';
  const lineage = dataLineageEngine.getLineage(ticker, metric, period);
  res.json(lineage);
});

// 14. POST /api/connectivity/ingest & /jobs/schedule - Schedule Ingestion Job
router.post(['/ingest', '/jobs/schedule'], requireAuth, requirePermission(Permission.INGESTION_TRIGGER), async (req, res) => {
  try {
    const workspaceId = req.headers['x-workspace-id'] || req.auth.workspaceId || 'default';
    const { jobType, ticker, payload = {}, priority = 'NORMAL' } = req.body || {};
    const job = await productionIngestionOrchestrator.scheduleIngestionJob({
      jobType: jobType || 'MARKET_REFRESH',
      workspaceId,
      payload: { ticker, ...payload },
      priority,
      actorId: req.auth.user?.userId || 'SYSTEM'
    });
    res.status(202).json({ job, ...job });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
