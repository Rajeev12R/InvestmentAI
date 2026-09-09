/**
 * @file change.tool.js
 * Deterministic tool adapter for retrieving Phase 5 Change Intelligence & metric drifts.
 */

import { executeChangeAnalysis } from '../../change/change.engine.js';
import { workspaceRepository } from '../../workspace/workspace.repository.js';

/**
 * Retrieves change package and drifts between two snapshots.
 * @param {string} workspaceId
 * @param {string} ticker
 * @returns {Object} Change intelligence context
 */
export async function getChangeContext(workspaceId = 'DEFAULT_WORKSPACE', ticker) {
  if (!ticker) return { status: 'UNAVAILABLE', changes: [] };
  const upperTicker = ticker.toUpperCase();
  const snapshots = workspaceRepository.getSnapshotHistory(workspaceId, upperTicker);

  if (!snapshots || snapshots.length < 2) {
    const latest = snapshots?.[0] || null;
    return {
      ticker: upperTicker,
      status: latest ? 'SINGLE_SNAPSHOT' : 'UNAVAILABLE',
      latestSnapshotId: latest?.snapshotId || null,
      changes: [],
      alerts: []
    };
  }

  // Sort descending by timestamp
  const sorted = [...snapshots].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const current = sorted[0];
  const previous = sorted[1];

  const changePackage = executeChangeAnalysis({ previousSnapshot: previous, currentSnapshot: current });

  return {
    ticker: upperTicker,
    status: 'AVAILABLE',
    changeId: changePackage.packageHash || `CHG-${upperTicker}`,
    previousSnapshotId: previous.snapshotId,
    currentSnapshotId: current.snapshotId,
    metricChanges: changePackage.materialChanges || [],
    valuationDrift: changePackage.valuationDrift || null,
    riskDrift: changePackage.riskDrift || null,
    decisionChange: changePackage.decisionDrift || null,
    alerts: changePackage.alerts || []
  };
}
