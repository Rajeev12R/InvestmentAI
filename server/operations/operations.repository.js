/**
 * @file operations.repository.js
 * Atomic file-backed repository for Decision Review Queue and Follow-up items.
 * Enforces strict separation: workflow transitions update operational state ONLY
 * and cannot mutate Truth Packages, financial facts, or snapshots.
 */

import fs from 'fs';
import path from 'path';
import { WorkflowStatus } from './operations.types.js';

const STORAGE_DIR = path.resolve(process.cwd(), 'server', 'data', 'operations');

if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

export class OperationsRepository {
  constructor(storageDir = STORAGE_DIR) {
    this.storageDir = storageDir;
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  _getWorkspacePath(workspaceId) {
    const safeId = String(workspaceId).replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.storageDir, `operations_${safeId}.json`);
  }

  /**
   * Loads operations state for a workspace.
   * @param {string} workspaceId
   * @returns {{ reviews: Array<Object>, followUps: Array<Object> }}
   */
  getState(workspaceId = 'DEFAULT_WORKSPACE') {
    const filePath = this._getWorkspacePath(workspaceId);
    if (!fs.existsSync(filePath)) {
      return { reviews: [], followUps: [] };
    }
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      console.error(`[OperationsRepository] Read error:`, e.message);
      return { reviews: [], followUps: [] };
    }
  }

  /**
   * Saves operations state atomically.
   * @param {string} workspaceId
   * @param {Object} state
   */
  saveState(workspaceId = 'DEFAULT_WORKSPACE', state) {
    const filePath = this._getWorkspacePath(workspaceId);
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  }

  /**
   * Syncs new reviews into repository, preserving existing workflow statuses.
   * @param {string} workspaceId
   * @param {Array<Object>} newReviews
   */
  syncReviews(workspaceId = 'DEFAULT_WORKSPACE', newReviews = []) {
    const state = this.getState(workspaceId);
    const existingMap = new Map(state.reviews.map(r => [r.attentionId || r.reviewId, r]));

    const merged = [];
    for (const rev of newReviews) {
      const key = rev.attentionId || rev.reviewId;
      if (existingMap.has(key)) {
        // Retain existing workflow status and notes
        const existing = existingMap.get(key);
        merged.push({
          ...rev,
          reviewId: existing.reviewId,
          status: existing.status,
          notes: existing.notes || [],
          updatedAt: new Date().toISOString()
        });
        existingMap.delete(key);
      } else {
        merged.push(rev);
      }
    }

    // Keep remaining existing reviews
    for (const remaining of existingMap.values()) {
      merged.push(remaining);
    }

    state.reviews = merged;
    this.saveState(workspaceId, state);
    return state.reviews;
  }

  /**
   * Updates review status (REVIEW | INVESTIGATING | DISMISSED | RESOLVED).
   * @param {string} workspaceId
   * @param {string} reviewId
   * @param {string} status
   * @param {string} [note]
   */
  updateReviewStatus(workspaceId = 'DEFAULT_WORKSPACE', reviewId, status, note = null) {
    if (!Object.values(WorkflowStatus).includes(status)) {
      throw new Error(`Invalid workflow status: ${status}`);
    }
    const state = this.getState(workspaceId);
    const review = state.reviews.find(r => r.reviewId === reviewId);
    if (!review) {
      throw new Error(`Review item not found: ${reviewId}`);
    }

    review.status = status;
    review.updatedAt = new Date().toISOString();
    if (note) {
      if (!review.notes) review.notes = [];
      review.notes.push({ text: note, addedAt: review.updatedAt });
    }

    this.saveState(workspaceId, state);
    return review;
  }

  /**
   * Adds or updates a follow-up item.
   * @param {string} workspaceId
   * @param {Object} followUpItem
   */
  saveFollowUp(workspaceId = 'DEFAULT_WORKSPACE', followUpItem) {
    const state = this.getState(workspaceId);
    const idx = state.followUps.findIndex(f => f.followUpId === followUpItem.followUpId);
    if (idx >= 0) {
      state.followUps[idx] = followUpItem;
    } else {
      state.followUps.push(followUpItem);
    }
    this.saveState(workspaceId, state);
    return followUpItem;
  }

  /**
   * Updates follow-up status.
   * @param {string} workspaceId
   * @param {string} followUpId
   * @param {string} status
   * @param {string} [findings]
   */
  updateFollowUpStatus(workspaceId = 'DEFAULT_WORKSPACE', followUpId, status, findings = null) {
    if (!Object.values(WorkflowStatus).includes(status)) {
      throw new Error(`Invalid workflow status: ${status}`);
    }
    const state = this.getState(workspaceId);
    const item = state.followUps.find(f => f.followUpId === followUpId);
    if (!item) {
      throw new Error(`Follow-up item not found: ${followUpId}`);
    }

    item.status = status;
    item.updatedAt = new Date().toISOString();
    if (findings) {
      item.findings = findings;
    }

    this.saveState(workspaceId, state);
    return item;
  }
}

export const operationsRepository = new OperationsRepository();
