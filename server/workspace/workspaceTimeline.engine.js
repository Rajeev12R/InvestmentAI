import { TIMELINE_EVENT_TYPES, EVENT_SEVERITY } from './workspace.types.js';

/**
 * Builds structured timeline events from detected changes, drift states, or user actions.
 */
export function createTimelineEvent({
  workspaceId,
  ticker,
  type = TIMELINE_EVENT_TYPES.SNAPSHOT_CREATED,
  severity = EVENT_SEVERITY.INFO,
  title,
  summary,
  changes = [],
  impact = '',
  evidenceIds = [],
  previousSnapshotId = null,
  currentSnapshotId = null
}) {
  if (!workspaceId || !ticker || !title) {
    throw new Error('workspaceId, ticker, and title are required for a timeline event.');
  }

  return {
    eventId: `EVT_${ticker.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    workspaceId,
    ticker: ticker.toUpperCase(),
    timestamp: new Date().toISOString(),
    type,
    severity,
    title,
    summary: summary || title,
    changes,
    impact,
    evidenceIds,
    previousSnapshotId,
    currentSnapshotId
  };
}
