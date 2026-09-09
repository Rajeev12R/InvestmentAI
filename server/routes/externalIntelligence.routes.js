import express from 'express';
import { defaultExternalStore } from '../externalIntelligence/external.store.js';
import { defaultSourceEngine } from '../externalIntelligence/external.source.engine.js';
import { defaultExtractionEngine } from '../externalIntelligence/external.extraction.engine.js';
import { defaultCorroborationEngine } from '../externalIntelligence/external.corroboration.engine.js';
import { defaultSignalEngine } from '../externalIntelligence/external.signal.engine.js';
import { defaultTruthBoundary } from '../externalIntelligence/external.truth.boundary.js';
import { externalIntelligenceCopilotTools } from '../externalIntelligence/external.tool.js';

const router = express.Router();

// Middleware: Extract tenant and user info
const extractContext = (req, res, next) => {
  req.tenantId = req.headers['x-tenant-id'] || req.query.tenantId || req.body.tenantId || 'tenant_default';
  req.userId = req.headers['x-user-id'] || req.query.userId || req.body.userId || 'usr_default';
  req.userRole = req.headers['x-user-role'] || req.query.userRole || req.body.userRole || 'ANALYST';
  req.isAi = req.headers['x-is-ai'] === 'true' || req.body.isAi === true;
  next();
};

router.use(extractContext);

// 1. Sources
router.get('/sources', (req, res) => {
  try {
    const list = defaultExternalStore.listEntities(req.tenantId, 'sources');
    res.json({ success: true, total: list.length, sources: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/sources', (req, res) => {
  try {
    const created = defaultSourceEngine.registerSource(req.tenantId, req.body);
    res.status(201).json({ success: true, source: created });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/sources/:id', (req, res) => {
  try {
    const src = defaultExternalStore.getEntityAsOf(req.tenantId, 'sources', req.params.id);
    if (!src) return res.status(404).json({ success: false, error: 'Source not found' });
    res.json({ success: true, source: src });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/sources/:id/verify', (req, res) => {
  try {
    const verified = defaultSourceEngine.verifySource(req.tenantId, req.params.id, {
      ...req.body,
      verifierId: req.userId
    });
    res.json({ success: true, source: verified });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/sources/:id/revoke', (req, res) => {
  try {
    const result = defaultSourceEngine.revokeSource(req.tenantId, req.params.id, {
      ...req.body,
      revokedBy: req.userId
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 2. Raw Artifacts
router.get('/artifacts', (req, res) => {
  try {
    const list = defaultExternalStore.listEntities(req.tenantId, 'rawArtifacts');
    res.json({ success: true, total: list.length, artifacts: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/artifacts', (req, res) => {
  try {
    const art = defaultExtractionEngine.ingestRawArtifact(req.tenantId, req.body);
    res.status(201).json({ success: true, artifact: art });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/artifacts/:id', (req, res) => {
  try {
    const art = defaultExternalStore.getEntityAsOf(req.tenantId, 'rawArtifacts', req.params.id);
    if (!art) return res.status(404).json({ success: false, error: 'Artifact not found' });
    res.json({ success: true, artifact: art });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Observations
router.get('/observations', (req, res) => {
  try {
    const { subjectId, type } = req.query;
    const list = defaultExternalStore.listEntities(req.tenantId, 'observations', obs => {
      if (subjectId && obs.subjectId !== subjectId) return false;
      if (type && obs.observationType !== type) return false;
      return true;
    });
    res.json({ success: true, total: list.length, observations: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/observations', (req, res) => {
  try {
    const obs = defaultExternalStore.saveObservation(req.tenantId, req.body);
    res.status(201).json({ success: true, observation: obs });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/observations/:id', (req, res) => {
  try {
    const obs = defaultExternalStore.getEntityAsOf(req.tenantId, 'observations', req.params.id);
    if (!obs) return res.status(404).json({ success: false, error: 'Observation not found' });
    res.json({ success: true, observation: obs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Signals
router.get('/signals', (req, res) => {
  try {
    const list = defaultExternalStore.listEntities(req.tenantId, 'signals');
    res.json({ success: true, total: list.length, signals: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/signals/:id', (req, res) => {
  try {
    const sig = defaultExternalStore.getEntityAsOf(req.tenantId, 'signals', req.params.id);
    if (!sig) return res.status(404).json({ success: false, error: 'Signal not found' });
    res.json({ success: true, signal: sig });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Conflicts
router.get('/conflicts', (req, res) => {
  try {
    const conflicts = defaultExternalStore.listEntities(req.tenantId, 'observations', obs => obs.observationClass === 'CONFLICTED');
    res.json({ success: true, total: conflicts.length, conflicts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Corroboration
router.get('/corroboration/:id', (req, res) => {
  try {
    const corr = defaultExternalStore.getEntityAsOf(req.tenantId, 'corroborations', req.params.id);
    if (!corr) return res.status(404).json({ success: false, error: 'Corroboration record not found' });
    res.json({ success: true, corroboration: corr });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Datasets
router.get('/datasets', (req, res) => {
  try {
    const list = defaultExternalStore.listEntities(req.tenantId, 'datasets');
    res.json({ success: true, total: list.length, datasets: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/datasets/:id', (req, res) => {
  try {
    const ds = defaultExternalStore.getEntityAsOf(req.tenantId, 'datasets', req.params.id);
    if (!ds) return res.status(404).json({ success: false, error: 'Dataset not found' });
    res.json({ success: true, dataset: ds });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Company Specialized Endpoints
router.get('/company/:id', (req, res) => {
  try {
    const subjectId = req.params.id;
    const observations = defaultExternalStore.listEntities(req.tenantId, 'observations', o => o.subjectId === subjectId);
    res.json({ success: true, subjectId, totalObservations: observations.length, observations });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/company/:id/competitive', (req, res) => {
  try {
    const subjectId = req.params.id;
    const list = defaultExternalStore.listEntities(req.tenantId, 'observations', o => o.subjectId === subjectId && o.observationType === 'COMPETITIVE_SIGNAL');
    res.json({ success: true, subjectId, competitiveSignals: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/company/:id/supply-chain', (req, res) => {
  try {
    const subjectId = req.params.id;
    const list = defaultExternalStore.listEntities(req.tenantId, 'observations', o => o.subjectId === subjectId && o.observationType === 'SUPPLY_CHAIN_SIGNAL');
    res.json({ success: true, subjectId, supplyChainSignals: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/company/:id/management', (req, res) => {
  try {
    const subjectId = req.params.id;
    const list = defaultExternalStore.listEntities(req.tenantId, 'observations', o => o.subjectId === subjectId && o.observationType === 'MANAGEMENT_COMMENTARY');
    res.json({ success: true, subjectId, managementCommentary: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/company/:id/regulatory', (req, res) => {
  try {
    const subjectId = req.params.id;
    const list = defaultExternalStore.listEntities(req.tenantId, 'observations', o => o.subjectId === subjectId && o.observationType === 'REGULATORY_SIGNAL');
    res.json({ success: true, subjectId, regulatorySignals: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/company/:id/signals', (req, res) => {
  try {
    const subjectId = req.params.id;
    const list = defaultExternalStore.listEntities(req.tenantId, 'observations', o => o.subjectId === subjectId && o.observationType.endsWith('_SIGNAL'));
    res.json({ success: true, subjectId, alternativeSignals: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Signal Performance
router.get('/signal-performance/:id', (req, res) => {
  try {
    const signalType = req.params.id;
    const performance = defaultSignalEngine.evaluateSignalPerformance({ signalType, predictions: [] });
    res.json({ success: true, signalType, performance });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Truth Promotion Candidates
router.get('/promotion-candidates', (req, res) => {
  try {
    const list = defaultExternalStore.listEntities(req.tenantId, 'candidates');
    res.json({ success: true, total: list.length, candidates: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/promotion-candidates', (req, res) => {
  try {
    const candidate = defaultTruthBoundary.createPromotionCandidate(req.tenantId, {
      ...req.body,
      createdBy: req.userId
    });
    res.status(201).json({ success: true, candidate });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/promotion-candidates/:id/promote', (req, res) => {
  try {
    if (req.isAi) {
      return res.status(403).json({ success: false, error: 'AI cannot promote external candidates to Truth' });
    }
    const promoted = defaultTruthBoundary.promoteCandidateToTruth(req.tenantId, req.params.id, {
      reviewerId: req.userId,
      reviewerRole: req.userRole,
      isAi: false,
      decision: req.body.decision || 'PROMOTED',
      rationale: req.body.rationale
    });
    res.json({ success: true, candidate: promoted });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
