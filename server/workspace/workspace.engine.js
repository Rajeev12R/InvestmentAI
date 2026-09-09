import { workspaceRepository } from './workspace.repository.js';
import { createSnapshotFromTruthPackage } from './workspaceSnapshot.engine.js';
import { createTimelineEvent } from './workspaceTimeline.engine.js';
import { executeChangeAnalysis } from '../change/change.engine.js';
import { evaluateAlertRules } from '../alerts/alert.engine.js';
import { TIMELINE_EVENT_TYPES, EVENT_SEVERITY, WATCHLIST_STATUS } from './workspace.types.js';

export class WorkspaceEngine {
  /**
   * Initializes or fetches default workspace.
   */
  getOrCreateWorkspace(workspaceId = null) {
    if (workspaceId) {
      const existing = workspaceRepository.getWorkspace(workspaceId);
      if (existing) return existing;
      return workspaceRepository.createWorkspace({
        workspaceId,
        name: `Workspace ${workspaceId}`,
        description: 'Persistent workspace for equity research, thesis tracking, and change intelligence.'
      });
    }
    const all = workspaceRepository.getAllWorkspaces();
    if (all.length > 0) return all[0];
    return workspaceRepository.createWorkspace({
      name: 'Primary Institutional Investment Workspace',
      description: 'Persistent workspace for equity research, thesis tracking, and change intelligence.'
    });
  }

  /**
   * Adds a ticker to the workspace watchlist.
   */
  addWatchlistTicker(workspaceId, ticker, tags = []) {
    const ws = this.getOrCreateWorkspace(workspaceId);
    const upperTicker = ticker.toUpperCase();
    const existing = ws.watchlist.find(w => w.ticker === upperTicker);

    if (!existing) {
      ws.watchlist.push({
        ticker: upperTicker,
        addedAt: new Date().toISOString(),
        status: WATCHLIST_STATUS.ACTIVE,
        tags: Array.isArray(tags) ? tags : []
      });
      workspaceRepository.updateWorkspace(ws);

      // Create timeline event
      workspaceRepository.saveTimelineEvent(createTimelineEvent({
        workspaceId: ws.workspaceId,
        ticker: upperTicker,
        type: TIMELINE_EVENT_TYPES.TICKER_ADDED,
        severity: EVENT_SEVERITY.INFO,
        title: `Added ${upperTicker} to Watchlist`,
        summary: `Started tracking ${upperTicker} for continuous change intelligence.`
      }));
    }

    return ws;
  }

  /**
   * Removes a ticker from the workspace watchlist.
   */
  removeWatchlistTicker(workspaceId, ticker) {
    const ws = this.getOrCreateWorkspace(workspaceId);
    const upperTicker = ticker.toUpperCase();
    ws.watchlist = ws.watchlist.filter(w => w.ticker !== upperTicker);
    return workspaceRepository.updateWorkspace(ws);
  }

  /**
   * Ingests a sealed Truth Package into the workspace as a new versioned snapshot.
   * Runs Change Engine, checks alerts, and updates timeline.
   */
  ingestTruthPackage(workspaceId, truthPackage) {
    const ws = this.getOrCreateWorkspace(workspaceId);
    const ticker = (truthPackage.company?.ticker || truthPackage.company?.name || 'UNKNOWN').toUpperCase();

    // Auto-add to watchlist if not present
    this.addWatchlistTicker(ws.workspaceId, ticker);

    // 1. Create immutable snapshot
    const currentSnapshot = createSnapshotFromTruthPackage({
      workspaceId: ws.workspaceId,
      truthPackage
    });

    // 2. Fetch previous snapshot for differential change analysis
    const previousSnapshot = workspaceRepository.getLatestSnapshot(ws.workspaceId, ticker);

    // 3. Save current snapshot to immutable history
    const savedSnapshot = workspaceRepository.saveSnapshot(currentSnapshot);

    // 4. Run Deterministic Change Engine
    const changeReport = executeChangeAnalysis({
      previousSnapshot,
      currentSnapshot: savedSnapshot
    });

    // 5. Evaluate and generate Alerts
    const alerts = evaluateAlertRules({
      workspaceId: ws.workspaceId,
      changeReport,
      previousSnapshot,
      currentSnapshot: savedSnapshot
    });

    alerts.forEach(alert => {
      workspaceRepository.saveAlert(alert);
    });

    // 6. Generate Timeline Event
    let eventSeverity = EVENT_SEVERITY.INFO;
    let eventTitle = `Snapshot Created for ${ticker}`;
    let eventType = TIMELINE_EVENT_TYPES.SNAPSHOT_CREATED;

    if (changeReport.decisionDrift?.hasChanged) {
      eventSeverity = EVENT_SEVERITY.HIGH;
      eventTitle = `Decision Changed: ${changeReport.decisionDrift.previousDecision} → ${changeReport.decisionDrift.currentDecision}`;
      eventType = TIMELINE_EVENT_TYPES.DECISION_TRANSITION;
    } else if (changeReport.thesisDrift?.status === 'THESIS_INVALIDATED') {
      eventSeverity = EVENT_SEVERITY.CRITICAL;
      eventTitle = `Thesis Compromised: ${ticker}`;
      eventType = TIMELINE_EVENT_TYPES.THESIS_BREAKER_TRIGGERED;
    } else if (changeReport.materialChanges.length > 0) {
      eventSeverity = EVENT_SEVERITY.MEDIUM;
      eventTitle = `${changeReport.materialChanges.length} Material Change(s) Detected`;
      eventType = TIMELINE_EVENT_TYPES.MATERIAL_CHANGE;
    }

    workspaceRepository.saveTimelineEvent(createTimelineEvent({
      workspaceId: ws.workspaceId,
      ticker,
      type: eventType,
      severity: eventSeverity,
      title: eventTitle,
      summary: changeReport.deterministicSummary,
      changes: changeReport.materialChanges,
      impact: changeReport.thesisDrift?.summary || '',
      evidenceIds: changeReport.materialChanges.flatMap(c => c.evidenceIds),
      previousSnapshotId: previousSnapshot?.snapshotId || null,
      currentSnapshotId: savedSnapshot.snapshotId
    }));

    return {
      snapshot: savedSnapshot,
      changeReport,
      alerts
    };
  }
}

export const workspaceEngine = new WorkspaceEngine();
