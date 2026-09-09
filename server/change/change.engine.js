import crypto from 'crypto';
import { canonicalStringify } from '../utils/canonicalJson.js';
import { detectSnapshotChanges } from './change.detector.js';
import { analyzeValuationDrift } from './valuationDrift.engine.js';
import { analyzeRiskDrift } from './riskDrift.engine.js';
import { monitorThesisBreakers } from './thesisBreakerMonitor.engine.js';
import { analyzeThesisDrift } from './thesisDrift.engine.js';
import { analyzeDecisionDrift } from './decisionDrift.engine.js';

/**
 * Computes canonical SHA-256 seal for Change Intelligence Package.
 */
export function sealChangePackage(payload) {
  const contentToHash = {
    ticker: payload.ticker,
    previousSnapshotId: payload.previousSnapshotId,
    currentSnapshotId: payload.currentSnapshotId,
    previousHash: payload.previousHash,
    currentHash: payload.currentHash,
    materialChanges: payload.materialChanges,
    valuationDrift: payload.valuationDrift,
    riskDrift: payload.riskDrift,
    thesisDrift: payload.thesisDrift,
    decisionDrift: payload.decisionDrift
  };
  const canonicalString = canonicalStringify(contentToHash);
  const packageHash = crypto.createHash('sha256').update(canonicalString).digest('hex');
  return {
    packageHash,
    sealedAt: new Date().toISOString(),
    version: '1.0.0'
  };
}

/**
 * Comprehensive Deterministic Change Analysis Engine.
 *
 * @param {Object} params
 * @param {Object} params.previousSnapshot - T0 Snapshot
 * @param {Object} params.currentSnapshot - T1 Snapshot
 * @returns {Object} Sealed Change Intelligence Package
 */
export function executeChangeAnalysis({ previousSnapshot, currentSnapshot }) {
  if (!currentSnapshot) {
    throw new Error('Current snapshot is required to run change analysis.');
  }

  const ticker = (currentSnapshot.ticker || previousSnapshot?.ticker || 'UNKNOWN').toUpperCase();

  // 1. Snapshot Identity and Tamper Pre-check
  if (previousSnapshot && previousSnapshot.ticker && previousSnapshot.ticker.toUpperCase() !== ticker) {
    throw new Error(`Cross-company snapshot comparison rejected: ${previousSnapshot.ticker} vs ${ticker}`);
  }

  // If no previous snapshot, return baseline structure
  if (!previousSnapshot) {
    const emptyPackage = {
      ticker,
      isBaseline: true,
      previousSnapshotId: null,
      currentSnapshotId: currentSnapshot.snapshotId,
      previousHash: null,
      currentHash: currentSnapshot.snapshotHash || currentSnapshot.truthPackageHash,
      asOfPrevious: null,
      asOfCurrent: currentSnapshot.asOf,
      rawChanges: [],
      materialChanges: [],
      valuationDrift: analyzeValuationDrift(null, currentSnapshot),
      riskDrift: analyzeRiskDrift(null, currentSnapshot),
      thesisBreakers: monitorThesisBreakers(null, currentSnapshot),
      thesisDrift: analyzeThesisDrift({ previousSnapshot: null, currentSnapshot }),
      decisionDrift: analyzeDecisionDrift(null, currentSnapshot),
      deterministicSummary: 'Initial investment snapshot established. Tracking enabled.'
    };
    const seal = sealChangePackage(emptyPackage);
    return {
      ...emptyPackage,
      integrity: seal
    };
  }

  // 2. Compute Raw Changes & Filter Material Changes
  const rawChanges = detectSnapshotChanges(previousSnapshot, currentSnapshot);
  const materialChanges = rawChanges.filter(c => c.isMaterial);

  // 3. Multi-Dimensional Drift Analysis
  const valuationDrift = analyzeValuationDrift(previousSnapshot, currentSnapshot);
  const riskDrift = analyzeRiskDrift(previousSnapshot, currentSnapshot);
  const thesisBreakers = monitorThesisBreakers(previousSnapshot, currentSnapshot);
  const thesisDrift = analyzeThesisDrift({
    previousSnapshot,
    currentSnapshot,
    changes: rawChanges,
    monitoredBreakers: thesisBreakers,
    valuationDrift,
    riskDrift
  });
  const decisionDrift = analyzeDecisionDrift(previousSnapshot, currentSnapshot);

  // 4. Formulate Deterministic Summary
  const summaryParts = [];
  if (decisionDrift.hasChanged) {
    summaryParts.push(decisionDrift.reason);
  }
  if (thesisDrift.status !== 'THESIS_UNCHANGED') {
    summaryParts.push(thesisDrift.summary);
  }
  if (materialChanges.length > 0) {
    summaryParts.push(`${materialChanges.length} material metric variance(s) detected.`);
  } else {
    summaryParts.push('No material metric deviations detected.');
  }

  const changePackage = {
    ticker,
    isBaseline: false,
    previousSnapshotId: previousSnapshot.snapshotId,
    currentSnapshotId: currentSnapshot.snapshotId,
    previousHash: previousSnapshot.snapshotHash || previousSnapshot.truthPackageHash,
    currentHash: currentSnapshot.snapshotHash || currentSnapshot.truthPackageHash,
    asOfPrevious: previousSnapshot.asOf,
    asOfCurrent: currentSnapshot.asOf,
    rawChanges,
    materialChanges,
    valuationDrift,
    riskDrift,
    thesisBreakers,
    thesisDrift,
    decisionDrift,
    deterministicSummary: summaryParts.join(' ')
  };

  const seal = sealChangePackage(changePackage);

  return {
    ...changePackage,
    integrity: seal
  };
}
