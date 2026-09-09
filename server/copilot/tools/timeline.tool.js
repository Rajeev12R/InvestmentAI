/**
 * @file timeline.tool.js
 * Deterministic tool adapter for retrieving historical snapshot timelines and events.
 */

import { workspaceRepository } from '../../workspace/workspace.repository.js';

/**
 * Retrieves chronological timeline of snapshots and events for a ticker.
 * @param {string} workspaceId
 * @param {string} ticker
 * @returns {Object} Timeline context
 */
export async function getTimelineContext(workspaceId = 'DEFAULT_WORKSPACE', ticker) {
  if (!ticker) return { status: 'UNAVAILABLE', events: [] };
  const upperTicker = ticker.toUpperCase();
  const snapshots = workspaceRepository.getSnapshotHistory(workspaceId, upperTicker);

  if (!snapshots || snapshots.length === 0) {
    return { ticker: upperTicker, status: 'NO_TIMELINE', events: [] };
  }

  const timelineEvents = snapshots.map(s => ({
    snapshotId: s.snapshotId,
    timestamp: s.createdAt || s.timestamp,
    decision: s.decision?.decision || 'UNKNOWN',
    dcfValue: s.valuation?.dcfValue || null,
    overallRisk: s.risk?.overallRisk || 'UNKNOWN',
    thesisStatus: s.thesis?.status || 'ACTIVE'
  })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return {
    ticker: upperTicker,
    status: 'AVAILABLE',
    totalSnapshots: timelineEvents.length,
    timeline: timelineEvents
  };
}
