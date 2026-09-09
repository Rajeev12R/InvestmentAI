/**
 * Phase 13 - Decision Snapshot Engine
 * 
 * Immutable record of what the investor/system knew and believed at decision time T0.
 * Never reconstruct historical decision state from today's Truth Package.
 */

import { deepFreeze, computeDeterministicHash } from './process.types.js';

export class DecisionSnapshotEngine {
  constructor() {
    this.snapshots = new Map(); // decisionId -> DecisionSnapshot
  }

  /**
   * Create an immutable DecisionSnapshot at decision timestamp T0
   */
  createSnapshot(params) {
    const {
      decisionId,
      workspaceId,
      ticker,
      decision,
      decisionTimestamp,
      decisionPrice,
      decisionStatus = 'ACTIVE',
      valuationState,
      riskState,
      conviction,
      positionSize,
      investorFit,
      thesis,
      thesisVersionId,
      evidenceIds = [],
      evidencePackageHash,
      expectedDrivers = [],
      falsificationTriggers = [],
      catalystExpectations = [],
      forecastIds = [],
      portfolioContext = {},
      createdAt = decisionTimestamp
    } = params;

    if (!decisionId || !workspaceId || !ticker || !decision || !decisionTimestamp) {
      throw new Error('Missing required fields for DecisionSnapshot: decisionId, workspaceId, ticker, decision, decisionTimestamp');
    }

    if (this.snapshots.has(decisionId)) {
      throw new Error(`DecisionSnapshot already exists for decisionId: ${decisionId}. Snapshots are strictly immutable.`);
    }

    // Verify evidence availability at T0
    if (valuationState && valuationState.timestamp && new Date(valuationState.timestamp).getTime() > new Date(decisionTimestamp).getTime()) {
      throw new Error(`Temporal violation: Valuation state timestamp (${valuationState.timestamp}) is after decisionTimestamp (${decisionTimestamp})`);
    }

    if (riskState && riskState.timestamp && new Date(riskState.timestamp).getTime() > new Date(decisionTimestamp).getTime()) {
      throw new Error(`Temporal violation: Risk state timestamp (${riskState.timestamp}) is after decisionTimestamp (${decisionTimestamp})`);
    }

    const payloadToHash = {
      decisionId,
      workspaceId,
      ticker,
      decision,
      decisionTimestamp: new Date(decisionTimestamp).toISOString(),
      decisionPrice: typeof decisionPrice === 'number' ? decisionPrice : null,
      decisionStatus,
      valuationState: valuationState || null,
      riskState: riskState || null,
      conviction: typeof conviction === 'number' ? conviction : null,
      positionSize: typeof positionSize === 'number' ? positionSize : null,
      investorFit: investorFit || null,
      thesis: thesis || null,
      thesisVersionId: thesisVersionId || null,
      evidenceIds: [...evidenceIds].sort(),
      evidencePackageHash: evidencePackageHash || null,
      expectedDrivers: [...expectedDrivers].sort((a, b) => (a.driverId || '').localeCompare(b.driverId || '')),
      falsificationTriggers: [...falsificationTriggers].sort((a, b) => (a.triggerId || '').localeCompare(b.triggerId || '')),
      catalystExpectations: [...catalystExpectations].sort((a, b) => (a.catalystId || '').localeCompare(b.catalystId || '')),
      forecastIds: [...forecastIds].sort(),
      portfolioContext: portfolioContext || {},
      createdAt: new Date(createdAt).toISOString()
    };

    const packageHash = computeDeterministicHash(payloadToHash);

    const snapshot = {
      ...payloadToHash,
      packageHash
    };

    const frozenSnapshot = deepFreeze(snapshot);
    this.snapshots.set(decisionId, frozenSnapshot);
    return frozenSnapshot;
  }

  /**
   * Get immutable snapshot by decisionId
   */
  getSnapshot(decisionId, workspaceId) {
    const snapshot = this.snapshots.get(decisionId);
    if (!snapshot) {
      return null;
    }
    if (workspaceId && snapshot.workspaceId !== workspaceId) {
      throw new Error(`Unauthorized workspace access for decisionId ${decisionId}`);
    }
    return snapshot;
  }

  /**
   * List all snapshots for a workspace
   */
  listSnapshots(workspaceId, ticker = null) {
    const results = [];
    for (const snapshot of this.snapshots.values()) {
      if (snapshot.workspaceId === workspaceId) {
        if (!ticker || snapshot.ticker === ticker) {
          results.push(snapshot);
        }
      }
    }
    return results.sort((a, b) => a.decisionTimestamp.localeCompare(b.decisionTimestamp));
  }

  /**
   * Reset store (for testing/isolation)
   */
  clear() {
    this.snapshots.clear();
  }
}

export const decisionSnapshotEngine = new DecisionSnapshotEngine();
