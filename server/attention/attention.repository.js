/**
 * @file attention.repository.js
 * Atomic file-backed repository for AttentionIntelligencePackages and items.
 * Survives process restart and supports atomic cache invalidation.
 */

import fs from 'fs';
import path from 'path';

const STORAGE_DIR = path.resolve(process.cwd(), 'server', 'data', 'attention');

// Ensure directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

export class AttentionRepository {
  constructor(storageDir = STORAGE_DIR) {
    this.storageDir = storageDir;
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  _getWorkspacePath(workspaceId) {
    const safeId = String(workspaceId).replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.storageDir, `attention_${safeId}.json`);
  }

  /**
   * Saves an AttentionIntelligencePackage atomically.
   * @param {Object} pkg
   */
  savePackage(pkg) {
    if (!pkg || !pkg.workspaceId) throw new Error('Package must have a workspaceId');
    const filePath = this._getWorkspacePath(pkg.workspaceId);
    const tempPath = `${filePath}.tmp.${Date.now()}`;

    fs.writeFileSync(tempPath, JSON.stringify(pkg, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  }

  /**
   * Retrieves the latest AttentionIntelligencePackage for a workspace.
   * @param {string} workspaceId
   * @returns {Object|null}
   */
  getLatestPackage(workspaceId = 'DEFAULT_WORKSPACE') {
    const filePath = this._getWorkspacePath(workspaceId);
    if (!fs.existsSync(filePath)) return null;

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      console.error(`[AttentionRepository] Read error for ${workspaceId}:`, e.message);
      return null;
    }
  }

  /**
   * Retrieves attention items filtered by ticker.
   * @param {string} workspaceId
   * @param {string} ticker
   * @returns {Array<Object>}
   */
  getItemsByTicker(workspaceId = 'DEFAULT_WORKSPACE', ticker) {
    const pkg = this.getLatestPackage(workspaceId);
    if (!pkg || !Array.isArray(pkg.attentionItems)) return [];
    return pkg.attentionItems.filter(item => String(item.ticker).toUpperCase() === String(ticker).toUpperCase());
  }

  /**
   * Retrieves a single attention item by ID.
   * @param {string} workspaceId
   * @param {string} attentionId
   * @returns {Object|null}
   */
  getItemById(workspaceId = 'DEFAULT_WORKSPACE', attentionId) {
    const pkg = this.getLatestPackage(workspaceId);
    if (!pkg || !Array.isArray(pkg.attentionItems)) return null;
    return pkg.attentionItems.find(item => item.attentionId === attentionId) || null;
  }

  /**
   * Invalidates and clears attention cache for a workspace.
   * @param {string} workspaceId
   */
  invalidateWorkspace(workspaceId = 'DEFAULT_WORKSPACE') {
    const filePath = this._getWorkspacePath(workspaceId);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error(`[AttentionRepository] Invalidate error:`, e.message);
      }
    }
  }
}

export const attentionRepository = new AttentionRepository();
