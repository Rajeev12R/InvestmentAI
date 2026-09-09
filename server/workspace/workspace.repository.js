import { workspaceStorage } from '../storage/workspace.storage.js';

export class WorkspaceRepository {
  createWorkspace({ workspaceId = null, name = 'Default Investment Workspace', description = 'Institutional research workspace' } = {}) {
    const wsId = workspaceId || `WS_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const workspace = {
      workspaceId: wsId,
      name,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      watchlist: [],
      holdings: [],
      thesisRecords: []
    };
    return workspaceStorage.saveWorkspace(workspace);
  }

  getWorkspace(workspaceId) {
    return workspaceStorage.getWorkspace(workspaceId);
  }

  getAllWorkspaces() {
    const list = workspaceStorage.getAllWorkspaces();
    if (list.length === 0) {
      // Auto-initialize default workspace if none exists
      return [this.createWorkspace({ name: 'Primary Portfolio & Research Workspace' })];
    }
    return list;
  }

  updateWorkspace(workspace) {
    return workspaceStorage.saveWorkspace(workspace);
  }

  // Snapshots
  saveSnapshot(snapshot) {
    return workspaceStorage.saveSnapshot(snapshot);
  }

  getSnapshot(workspaceId, ticker, snapshotId) {
    return workspaceStorage.getSnapshot(workspaceId, ticker, snapshotId);
  }

  getSnapshotHistory(workspaceId, ticker) {
    return workspaceStorage.getSnapshotHistory(workspaceId, ticker);
  }

  getLatestSnapshot(workspaceId, ticker) {
    const history = this.getSnapshotHistory(workspaceId, ticker);
    return history.length > 0 ? history[history.length - 1] : null;
  }

  getPreviousSnapshot(workspaceId, ticker) {
    const history = this.getSnapshotHistory(workspaceId, ticker);
    return history.length >= 2 ? history[history.length - 2] : null;
  }

  // Timeline
  saveTimelineEvent(event) {
    return workspaceStorage.saveTimelineEvent(event);
  }

  getTimeline(workspaceId, ticker) {
    return workspaceStorage.getTimeline(workspaceId, ticker);
  }

  // Alerts
  saveAlert(alert) {
    return workspaceStorage.saveAlert(alert);
  }

  getAlerts(workspaceId, filter = {}) {
    return workspaceStorage.getAlerts(workspaceId, filter);
  }

  acknowledgeAlert(workspaceId, alertId) {
    return workspaceStorage.acknowledgeAlert(workspaceId, alertId);
  }

  clearAll() {
    workspaceStorage.clearAll();
  }
}

export const workspaceRepository = new WorkspaceRepository();
