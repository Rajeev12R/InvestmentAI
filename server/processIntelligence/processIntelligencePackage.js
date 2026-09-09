/**
 * Phase 13 - Process Intelligence Package Builder & Coordinator
 * 
 * Canonical, deeply frozen, SHA-256 sealed package combining decision snapshot,
 * thesis evaluation, forecast ledger, calibration, process quality, and learning insights.
 */

import { deepFreeze, computeDeterministicHash } from './process.types.js';
import { decisionSnapshotEngine } from './decisionSnapshot.engine.js';
import { thesisVersioningEngine } from './thesisVersioning.engine.js';
import { forecastLedgerEngine } from './forecastLedger.engine.js';
import { calibrationEngine } from './calibration.engine.js';
import { thesisEvaluationEngine } from './thesisEvaluation.engine.js';
import { decisionQualityEngine } from './decisionQuality.engine.js';
import { processDriftEngine } from './processDrift.engine.js';
import { investorScorecardEngine } from './investorScorecard.engine.js';
import { temporalIntegrityEngine } from './temporalIntegrity.engine.js';

export class ProcessIntelligenceService {
  constructor() {
    this.packages = new Map(); // packageId -> ProcessIntelligencePackage
    this.decisionReviews = new Map(); // reviewId -> ReviewRecord
  }

  /**
   * Evaluate a decision and create a sealed ProcessIntelligencePackage
   */
  evaluateDecision(params) {
    const {
      decisionId,
      workspaceId,
      observationData = {},
      portfolioAttribution = null
    } = params;

    const snapshot = decisionSnapshotEngine.getSnapshot(decisionId, workspaceId);
    if (!snapshot) {
      throw new Error(`DecisionSnapshot not found for decisionId: ${decisionId}`);
    }

    // Retrieve thesis history and active thesis version
    const thesisHistory = thesisVersioningEngine.getThesisHistory(decisionId, workspaceId);
    const activeThesis = thesisHistory.length > 0 ? thesisHistory[thesisHistory.length - 1] : null;

    // Retrieve and score forecasts
    const forecasts = forecastLedgerEngine.getForecastsByDecision(decisionId, workspaceId);
    const scoredForecasts = forecasts.map(f => {
      const obs = observationData[f.metric] || observationData.defaultObservation || null;
      return forecastLedgerEngine.scoreForecast(f.forecastId, obs, workspaceId);
    });

    // Evaluate Thesis
    let thesisEval = null;
    if (activeThesis) {
      thesisEval = thesisEvaluationEngine.evaluateThesis({
        thesisVersion: activeThesis,
        scoredForecasts,
        observedBreakers: observationData.breakers || [],
        catalystObservations: observationData.catalysts || [],
        stockReturn: observationData.stockReturn !== undefined ? observationData.stockReturn : (portfolioAttribution ? portfolioAttribution.totalReturn : null),
        marketReturn: observationData.marketReturn !== undefined ? observationData.marketReturn : (portfolioAttribution ? portfolioAttribution.benchmarkReturn : null)
      });
    }

    // Evaluate Decision Quality
    const decisionQuality = decisionQualityEngine.evaluateDecisionQuality({
      decisionSnapshot: snapshot,
      thesisVersion: activeThesis
    });

    // Evaluate 2x2 Matrix
    const stockRet = observationData.stockReturn !== undefined ? observationData.stockReturn : (portfolioAttribution ? portfolioAttribution.totalReturn : null);
    const benchRet = observationData.marketReturn !== undefined ? observationData.marketReturn : (portfolioAttribution ? portfolioAttribution.benchmarkReturn : null);
    
    const decisionVsOutcome = decisionQualityEngine.classifyDecisionVsOutcome({
      decisionQualityScore: decisionQuality,
      stockReturn: stockRet,
      benchmarkReturn: benchRet
    });

    // Build package payload
    const packageId = `pip-${decisionId}`;
    const payloadToHash = {
      packageId,
      decisionId,
      workspaceId,
      ticker: snapshot.ticker,
      decisionSnapshot: snapshot,
      thesisVersion: activeThesis,
      thesisHistory,
      forecasts: scoredForecasts,
      thesisEvaluation: thesisEval,
      decisionQuality,
      decisionVsOutcome,
      portfolioAttribution: portfolioAttribution || null,
      generatedAt: new Date().toISOString()
    };

    const packageHash = computeDeterministicHash(payloadToHash);

    const fullPackage = {
      ...payloadToHash,
      packageHash
    };

    const frozenPackage = deepFreeze(fullPackage);
    this.packages.set(packageId, frozenPackage);

    return frozenPackage;
  }

  /**
   * Get sealed package by ID
   */
  getPackage(packageId, workspaceId) {
    const pkg = this.packages.get(packageId);
    if (!pkg) return null;
    if (workspaceId && pkg.workspaceId !== workspaceId) {
      throw new Error(`Unauthorized workspace access for package ${packageId}`);
    }
    return pkg;
  }

  /**
   * Get aggregate workspace scorecard
   */
  getWorkspaceScorecard(workspaceId) {
    const snapshots = decisionSnapshotEngine.listSnapshots(workspaceId);
    const evaluatedList = [];
    const allScoredForecasts = [];

    for (const snap of snapshots) {
      const pkg = this.packages.get(`pip-${snap.decisionId}`);
      if (pkg) {
        evaluatedList.push(pkg);
        if (pkg.forecasts) {
          allScoredForecasts.push(...pkg.forecasts);
        }
      } else {
        // Evaluate on the fly if snapshot exists
        try {
          const newPkg = this.evaluateDecision({ decisionId: snap.decisionId, workspaceId });
          evaluatedList.push(newPkg);
          if (newPkg.forecasts) {
            allScoredForecasts.push(...newPkg.forecasts);
          }
        } catch (e) {
          // Record incomplete
        }
      }
    }

    const calibrationSummary = calibrationEngine.computeCalibration(allScoredForecasts);
    const driftSummary = processDriftEngine.detectDrifts(evaluatedList);

    return investorScorecardEngine.computeScorecard({
      workspaceId,
      evaluatedDecisions: evaluatedList,
      allDecisions: snapshots,
      scoredForecasts: allScoredForecasts,
      calibrationSummary,
      driftSummary
    });
  }

  /**
   * Record decision review workflow
   */
  recordDecisionReview(params) {
    const {
      reviewId,
      decisionId,
      workspaceId,
      reason,
      status = 'REVIEW',
      notes = '',
      reviewerId,
      timestamp = new Date().toISOString()
    } = params;

    if (!reviewId || !decisionId || !workspaceId || !reason) {
      throw new Error('Missing required fields for DecisionReview');
    }

    const review = deepFreeze({
      reviewId,
      decisionId,
      workspaceId,
      reason,
      status,
      notes,
      reviewerId,
      timestamp: new Date(timestamp).toISOString()
    });

    this.decisionReviews.set(reviewId, review);
    return review;
  }

  /**
   * Clear store for testing
   */
  clear() {
    this.packages.clear();
    this.decisionReviews.clear();
    decisionSnapshotEngine.clear();
    thesisVersioningEngine.clear();
    forecastLedgerEngine.clear();
  }
}

export const processIntelligenceService = new ProcessIntelligenceService();
