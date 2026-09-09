/**
 * server/routes/earnings.routes.js
 * 
 * Phase 21: Institutional Corporate Event & Earnings Intelligence Routes
 */

import express from 'express';
import { defaultCorporateEventStore } from '../earnings/earnings.eventStore.js';
import { defaultEarningsFactExtractor } from '../earnings/earnings.extractor.js';
import { defaultEarningsTruthBridge } from '../earnings/earnings.truthBridge.js';
import { defaultGuidanceEngine } from '../earnings/earnings.guidance.engine.js';
import { computeEarningsSurprise, computeComprehensiveSurpriseReport } from '../earnings/earnings.surprise.engine.js';
import { evaluateEarningsQuality } from '../earnings/earnings.quality.engine.js';
import { defaultEventDrivenForecastRevisionEngine } from '../earnings/earnings.forecastRevision.engine.js';
import { evaluateEarningsValuationImpact } from '../earnings/earnings.valuation.bridge.js';
import { evaluateEventRiskDrift } from '../earnings/earnings.risk.engine.js';
import { evaluateEarningsAttentionImpact } from '../earnings/earnings.attention.engine.js';
import { evaluateEarningsThesisImpact } from '../earnings/earnings.thesis.engine.js';
import { aggregatePortfolioEvents } from '../earnings/earnings.portfolio.engine.js';
import { classifyEventImpact } from '../earnings/earnings.impact.engine.js';
import { sealEventIntelligencePackage, verifyEventIntelligencePackage } from '../earnings/earnings.package.js';
import { generateEarningsExplanation } from '../earnings/earnings.explanation.js';

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
 * POST /api/earnings/events/ingest
 * Ingests a new corporate event, extracts facts, and applies to Truth Layer
 */
/**
 * POST /api/earnings/events and /api/earnings/events/ingest
 * Ingests a new corporate event, extracts facts, and applies to Truth Layer
 */
router.post(['/events', '/events/ingest'], (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId, role } = auth;

    if (role === 'GUEST' || role === 'VIEWER' || role === 'AUDITOR') {
      return res.status(403).json({ error: `${role} role is not authorized to ingest events`, status: 'AUTHORIZATION_FAILURE' });
    }

    const eventData = req.body || {};
    const ingestResult = defaultCorporateEventStore.ingestEvent(workspaceId, eventData);

    let extractedFacts = [];
    let truthResults = [];

    if (!ingestResult.isDuplicate) {
      extractedFacts = defaultEarningsFactExtractor.extractFacts(ingestResult.event);
      truthResults = extractedFacts.map(factCandidate => 
        defaultEarningsTruthBridge.applyCandidateToTruth(workspaceId, factCandidate)
      );
    }

    return res.status(ingestResult.isDuplicate ? 200 : 201).json({
      status: 'PASS',
      success: true,
      isDuplicate: ingestResult.isDuplicate,
      event: ingestResult.event,
      extractedFactsCount: extractedFacts.length,
      truthResults
    });
  } catch (err) {
    return res.status(err.name === 'EarningsValidationError' ? 400 : 500).json({
      error: err.message,
      details: err.validationErrors || null
    });
  }
});

/**
 * GET /api/earnings/events/:eventId
 */
router.get('/events/:eventId', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId } = auth;

    const event = defaultCorporateEventStore.getEvent(workspaceId, req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: `Event not found: ${req.params.eventId}` });
    }

    return res.status(200).json({ status: 'PASS', event });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/earnings/timeline/:ticker
 */
router.get('/timeline/:ticker', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId } = auth;

    const timeline = defaultCorporateEventStore.getTimeline(workspaceId, req.params.ticker);
    return res.status(200).json({ status: 'PASS', ticker: req.params.ticker.toUpperCase(), count: timeline.length, timeline });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/earnings/surprise and /api/earnings/surprise/compute
 */
router.post(['/surprise', '/surprise/compute'], (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;

    const { actualFact, consensus } = req.body || {};
    const surprise = computeEarningsSurprise(actualFact, consensus);

    return res.status(200).json({ status: 'PASS', surprise });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/earnings/guidance and /api/earnings/guidance/record
 */
router.post(['/guidance', '/guidance/record'], (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { role } = auth;

    if (role === 'GUEST' || role === 'VIEWER' || role === 'AUDITOR') {
      return res.status(403).json({ error: `${role} role is not authorized to record guidance`, status: 'AUTHORIZATION_FAILURE' });
    }

    const { ticker, guidanceData, publicationTimestamp } = req.body || {};
    const record = defaultGuidanceEngine.recordGuidance(ticker, guidanceData, publicationTimestamp);

    return res.status(201).json({ status: 'PASS', guidanceRecord: record });
  } catch (err) {
    return res.status(err.name === 'EarningsValidationError' ? 400 : 500).json({ error: err.message });
  }
});

/**
 * POST /api/earnings/quality and /api/earnings/quality/analyze
 */
router.post(['/quality', '/quality/analyze', '/quality/evaluate'], (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;

    const financials = req.body?.financials || req.body || {};
    const quality = evaluateEarningsQuality(financials);

    return res.status(200).json({ status: 'PASS', quality });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/earnings/forecast/revise
 */
router.post(['/forecast/revise', '/forecast-revise'], (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { role } = auth;

    if (role === 'GUEST' || role === 'VIEWER' || role === 'AUDITOR') {
      return res.status(403).json({ error: `${role} role is not authorized to revise forecasts`, status: 'AUTHORIZATION_FAILURE' });
    }

    const { previousForecast, eventEvidence } = req.body || {};
    const revision = defaultEventDrivenForecastRevisionEngine.generateRevisionCandidate(previousForecast, eventEvidence);

    return res.status(200).json({ status: 'PASS', revisionCandidate: revision });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/earnings/package/seal
 */
router.post(['/package/seal', '/seal'], (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;
    const { workspaceId, role, userId } = auth;

    if (role === 'GUEST' || role === 'VIEWER' || role === 'AUDITOR') {
      return res.status(403).json({ error: `${role} role is not authorized to seal packages`, status: 'AUTHORIZATION_FAILURE' });
    }

    const sealedPkg = sealEventIntelligencePackage({
      ...req.body,
      tenantId: workspaceId,
      sealedBy: userId
    });

    return res.status(201).json({ status: 'PASS', sealedPackage: sealedPkg, package: sealedPkg });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/earnings/package/verify
 */
router.post(['/package/verify', '/verify'], (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;

    const verification = verifyEventIntelligencePackage(req.body?.package || req.body?.pkg);
    return res.status(200).json({ status: 'PASS', verification });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/earnings/portfolio/aggregate and /api/earnings/portfolio-impact
 */
router.post(['/portfolio/aggregate', '/portfolio-impact'], (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    if (!auth) return;

    const { portfolio, securityEventMap } = req.body || {};
    const agg = aggregatePortfolioEvents(portfolio, securityEventMap);

    return res.status(200).json({ status: 'PASS', portfolioEvents: agg });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

export default router;
