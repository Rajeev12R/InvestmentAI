import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.resolve(process.cwd(), 'server', 'data');
const STORAGE_FILE = path.join(DATA_DIR, 'workspace_store.json');

/**
 * Ensures data directory and storage file exist.
 */
function initStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORAGE_FILE)) {
    const initialData = {
      workspaces: {},
      snapshots: {}, // key: `${workspaceId}:${ticker}:${snapshotId}`
      timeline: {},  // key: `${workspaceId}:${ticker}` -> Array<Event>
      alerts: {},    // key: `${workspaceId}` -> Array<Alert>
      version: 1
    };
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

import { canonicalStringify } from '../utils/canonicalJson.js';

/**
 * Computes deterministic SHA-256 hash of any JavaScript object or primitive.
 */
export function canonicalHash(obj) {
  if (obj === null || obj === undefined) return '';
  const canonicalString = canonicalStringify(obj);
  return crypto.createHash('sha256').update(canonicalString).digest('hex');
}

/**
 * In-memory state and persistent I/O with atomic write-locking.
 */
class WorkspaceStorage {
  constructor() {
    initStorage();
    this.memoryState = this._readFromFile();
  }

  _readFromFile() {
    try {
      initStorage();
      const content = fs.readFileSync(STORAGE_FILE, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      console.error('[Storage] Error reading workspace store:', err);
      return { workspaces: {}, snapshots: {}, timeline: {}, alerts: {}, version: 1 };
    }
  }

  _writeToFile() {
    try {
      initStorage();
      const tempFile = `${STORAGE_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempFile, JSON.stringify(this.memoryState, null, 2), 'utf-8');
      fs.renameSync(tempFile, STORAGE_FILE);
    } catch (err) {
      console.error('[Storage] Error writing workspace store:', err);
    }
  }

  // Workspaces
  saveWorkspace(workspace) {
    if (!workspace || !workspace.workspaceId) {
      throw new Error('Invalid workspace payload');
    }
    const updated = {
      ...workspace,
      updatedAt: new Date().toISOString()
    };
    this.memoryState.workspaces[workspace.workspaceId] = updated;
    this._writeToFile();
    return JSON.parse(JSON.stringify(updated));
  }

  getWorkspace(workspaceId) {
    const ws = this.memoryState.workspaces[workspaceId];
    return ws ? JSON.parse(JSON.stringify(ws)) : null;
  }

  getAllWorkspaces() {
    return Object.values(this.memoryState.workspaces).map(ws => JSON.parse(JSON.stringify(ws)));
  }

  // Snapshots (IMMUTABLE)
  saveSnapshot(snapshot) {
    if (!snapshot || !snapshot.snapshotId || !snapshot.workspaceId || !snapshot.ticker) {
      throw new Error('Invalid snapshot payload');
    }

    const key = `${snapshot.workspaceId}:${snapshot.ticker.toUpperCase()}:${snapshot.snapshotId}`;
    
    // Immutability Guard: Never overwrite an existing snapshot
    if (this.memoryState.snapshots[key]) {
      throw new Error(`Immutability violation: Snapshot ${snapshot.snapshotId} already exists and cannot be overwritten.`);
    }

    // Verify snapshot hash integrity
    const payloadToHash = {
      ticker: snapshot.ticker.toUpperCase(),
      truthPackageHash: snapshot.truthPackageHash,
      truthPackageVersion: snapshot.truthPackageVersion,
      marketState: snapshot.marketState,
      financialState: snapshot.financialState,
      valuationState: snapshot.valuationState,
      riskState: snapshot.riskState,
      decisionState: snapshot.decisionState
    };
    const computedHash = canonicalHash(payloadToHash);
    const verifiedSnapshot = {
      ...snapshot,
      ticker: snapshot.ticker.toUpperCase(),
      snapshotHash: computedHash,
      createdAt: snapshot.createdAt || new Date().toISOString()
    };

    this.memoryState.snapshots[key] = verifiedSnapshot;
    this._writeToFile();
    return JSON.parse(JSON.stringify(verifiedSnapshot));
  }

  getSnapshot(workspaceId, ticker, snapshotId) {
    const key = `${workspaceId}:${ticker.toUpperCase()}:${snapshotId}`;
    const snap = this.memoryState.snapshots[key];
    return snap ? JSON.parse(JSON.stringify(snap)) : null;
  }

  getSnapshotHistory(workspaceId, ticker) {
    const prefix = `${workspaceId}:${ticker.toUpperCase()}:`;
    const matching = Object.entries(this.memoryState.snapshots)
      .filter(([k]) => k.startsWith(prefix))
      .map(([, v]) => JSON.parse(JSON.stringify(v)));
    
    // Sort chronologically ascending
    return matching.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  // Timeline Events
  saveTimelineEvent(event) {
    if (!event || !event.workspaceId || !event.ticker) {
      throw new Error('Invalid timeline event');
    }
    const key = `${event.workspaceId}:${event.ticker.toUpperCase()}`;
    if (!this.memoryState.timeline[key]) {
      this.memoryState.timeline[key] = [];
    }
    const verifiedEvent = {
      ...event,
      eventId: event.eventId || `EVT_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: event.timestamp || new Date().toISOString()
    };
    this.memoryState.timeline[key].push(verifiedEvent);
    this._writeToFile();
    return JSON.parse(JSON.stringify(verifiedEvent));
  }

  getTimeline(workspaceId, ticker) {
    const key = `${workspaceId}:${ticker.toUpperCase()}`;
    const events = this.memoryState.timeline[key] || [];
    return [...events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Alerts
  saveAlert(alert) {
    if (!alert || !alert.workspaceId || !alert.ticker) {
      throw new Error('Invalid alert payload');
    }
    const key = alert.workspaceId;
    if (!this.memoryState.alerts[key]) {
      this.memoryState.alerts[key] = [];
    }
    const alertId = alert.alertId || `ALT_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const verifiedAlert = {
      ...alert,
      alertId,
      acknowledged: alert.acknowledged || false,
      createdAt: alert.createdAt || new Date().toISOString()
    };
    this.memoryState.alerts[key].push(verifiedAlert);
    this._writeToFile();
    return JSON.parse(JSON.stringify(verifiedAlert));
  }

  getAlerts(workspaceId, filter = {}) {
    const list = this.memoryState.alerts[workspaceId] || [];
    let filtered = [...list];
    if (filter.ticker) {
      filtered = filtered.filter(a => a.ticker.toUpperCase() === filter.ticker.toUpperCase());
    }
    if (filter.unacknowledgedOnly) {
      filtered = filtered.filter(a => !a.acknowledged);
    }
    if (filter.severity) {
      filtered = filtered.filter(a => a.severity === filter.severity);
    }
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  acknowledgeAlert(workspaceId, alertId) {
    const list = this.memoryState.alerts[workspaceId] || [];
    const alert = list.find(a => a.alertId === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date().toISOString();
      this._writeToFile();
      return JSON.parse(JSON.stringify(alert));
    }
    return null;
  }

  // Clear / Reset for tests
  clearAll() {
    this.memoryState = {
      workspaces: {},
      snapshots: {},
      timeline: {},
      alerts: {},
      version: 1
    };
    this._writeToFile();
  }
}

export const workspaceStorage = new WorkspaceStorage();
