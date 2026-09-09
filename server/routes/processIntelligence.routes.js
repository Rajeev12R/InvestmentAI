/**
 * Process Intelligence Routes — Phase 13
 * 
 * Endpoints for evaluating decisions, retrieving snapshots, forecast ledger,
 * thesis history, calibration, drift, learning insights, and package seals.
 */

import express from 'express';
import { processIntelligenceService } from '../processIntelligence/processIntelligencePackage.js';
import { decisionSnapshotEngine } from '../processIntelligence/decisionSnapshot.engine.js';
import { thesisVersioningEngine } from '../processIntelligence/thesisVersioning.engine.js';
import { forecastLedgerEngine } from '../processIntelligence/forecastLedger.engine.js';
import { calibrationEngine } from '../processIntelligence/calibration.engine.js';
import { processDriftEngine } from '../processIntelligence/processDrift.engine.js';
import { investorScorecardEngine } from '../processIntelligence/investorScorecard.engine.js';

const router = express.Router();

// Helper to extract workspaceId
function getWorkspaceId(req) {
  return req.headers['x-workspace-id'] || (req.user && req.user.workspaceId) || 'default-workspace';
}

/**
 * POST /api/process/decision/:decisionId/evaluate
 * Evaluates decision, forecasts, thesis, and returns sealed ProcessIntelligencePackage
 */
router.post('/decision/:decisionId/evaluate', (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const { decisionId } = req.params;
    const { observationData, portfolioAttribution } = req.body || {};

    const evaluationPackage = processIntelligenceService.evaluateDecision({
      decisionId,
      workspaceId,
      observationData: observationData || {},
      portfolioAttribution: portfolioAttribution || null
    });

    res.json({
      success: true,
      package: evaluationPackage
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/process/decision/:decisionId
 * Retrieves decision snapshot
 */
router.get('/decision/:decisionId', (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const { decisionId } = req.params;

    const snapshot = decisionSnapshotEngine.getSnapshot(decisionId, workspaceId);
    if (!snapshot) {
      return res.status(404).json({ success: false, error: `DecisionSnapshot not found for ${decisionId}` });
    }

    res.json({
      success: true,
      snapshot
    });
  } catch (error) {
    res.status(403).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/process/decision/:decisionId/forecast-ledger
 * Retrieves all forecasts recorded for the decision
 */
router.get('/decision/:decisionId/forecast-ledger', (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const { decisionId } = req.params;

    const forecasts = forecastLedgerEngine.getForecastsByDecision(decisionId, workspaceId);

    res.json({
      success: true,
      decisionId,
      forecastCount: forecasts.length,
      forecasts
    });
  } catch (error) {
    res.status(403).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/process/decision/:decisionId/thesis
 * Retrieves thesis version history for the decision
 */
router.get('/decision/:decisionId/thesis', (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const { decisionId } = req.params;

    const history = thesisVersioningEngine.getThesisHistory(decisionId, workspaceId);

    res.json({
      success: true,
      decisionId,
      versionCount: history.length,
      history
    });
  } catch (error) {
    res.status(403).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/process/decision/:decisionId/outcome
 * Retrieves outcome evaluation from sealed package
 */
router.get('/decision/:decisionId/outcome', (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const { decisionId } = req.params;

    const pkg = processIntelligenceService.getPackage(`pip-${decisionId}`, workspaceId);
    if (!pkg) {
      return res.status(404).json({ success: false, error: `Evaluation package not found for ${decisionId}` });
    }

    res.json({
      success: true,
      decisionId,
      thesisEvaluation: pkg.thesisEvaluation,
      decisionQuality: pkg.decisionQuality,
      decisionVsOutcome: pkg.decisionVsOutcome
    });
  } catch (error) {
    res.status(403).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/process/scorecard
 * Retrieves aggregate workspace scorecard
 */
router.get('/scorecard', (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const scorecard = processIntelligenceService.getWorkspaceScorecard(workspaceId);

    res.json({
      success: true,
      scorecard
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/process/calibration
 * Retrieves forecast calibration summary
 */
router.get('/calibration', (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const scorecard = processIntelligenceService.getWorkspaceScorecard(workspaceId);

    res.json({
      success: true,
      workspaceId,
      calibration: scorecard.dimensions.find(d => d.dimension === 'Forecast Calibration') || null,
      learningInsights: scorecard.learningInsights.filter(i => i.type === 'CALIBRATION')
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/process/drift
 * Retrieves process drift detection summary
 */
router.get('/drift', (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const snapshots = decisionSnapshotEngine.listSnapshots(workspaceId);
    const evaluatedList = snapshots.map(s => processIntelligenceService.getPackage(`pip-${s.decisionId}`, workspaceId)).filter(Boolean);
    const driftSummary = processDriftEngine.detectDrifts(evaluatedList);

    res.json({
      success: true,
      workspaceId,
      driftSummary
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/process/learning
 * Retrieves learning loop insights
 */
router.get('/learning', (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const scorecard = processIntelligenceService.getWorkspaceScorecard(workspaceId);

    res.json({
      success: true,
      workspaceId,
      learningInsights: scorecard.learningInsights
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/process/review
 * Records an auditable decision review action
 */
router.post('/review', (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const { reviewId, decisionId, reason, status, notes, reviewerId } = req.body;

    const review = processIntelligenceService.recordDecisionReview({
      reviewId: reviewId || `rev-${Date.now()}`,
      decisionId,
      workspaceId,
      reason,
      status: status || 'REVIEW',
      notes: notes || '',
      reviewerId: reviewerId || 'USER'
    });

    res.json({
      success: true,
      review
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/process/package/:packageId
 * Retrieves sealed ProcessIntelligencePackage by packageId
 */
router.get('/package/:packageId', (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const { packageId } = req.params;

    const pkg = processIntelligenceService.getPackage(packageId, workspaceId);
    if (!pkg) {
      return res.status(404).json({ success: false, error: `ProcessIntelligencePackage not found for ${packageId}` });
    }

    res.json({
      success: true,
      package: pkg
    });
  } catch (error) {
    res.status(403).json({ success: false, error: error.message });
  }
});

export default router;
