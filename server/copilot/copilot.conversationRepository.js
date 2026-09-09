/**
 * @file copilot.conversationRepository.js
 * Atomic file-backed repository for Copilot conversations and messages.
 * Enforces strict workspace isolation.
 */

import fs from 'fs';
import path from 'path';

const STORAGE_DIR = path.resolve(process.cwd(), 'server', 'data', 'copilot');

if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

export class ConversationRepository {
  constructor(storageDir = STORAGE_DIR) {
    this.storageDir = storageDir;
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  _getWorkspacePath(workspaceId) {
    const safeId = String(workspaceId || 'DEFAULT_WORKSPACE').replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.storageDir, `conversations_${safeId}.json`);
  }

  /**
   * Retrieves all conversations for a workspace.
   * @param {string} workspaceId
   * @returns {Array<Object>} List of conversation records
   */
  getConversations(workspaceId = 'DEFAULT_WORKSPACE') {
    const filePath = this._getWorkspacePath(workspaceId);
    if (!fs.existsSync(filePath)) return [];
    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      console.error('[ConversationRepository] Read error:', e.message);
      return [];
    }
  }

  listConversations(workspaceId = 'DEFAULT_WORKSPACE') {
    return this.getConversations(workspaceId);
  }

  /**
   * Creates a new conversation.
   * @param {string} workspaceId
   * @param {string} [ticker]
   * @returns {Object} New conversation
   */
  createConversation(workspaceId = 'DEFAULT_WORKSPACE', ticker = null) {
    const conversationId = `CONV-${ticker || 'GENERAL'}-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    const newConv = {
      id: conversationId,
      conversationId,
      workspaceId,
      ticker,
      title: ticker ? `${ticker} Analysis` : 'New Conversation',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.saveConversation(workspaceId, newConv);
    return newConv;
  }

  /**
   * Retrieves a single conversation by ID with workspace isolation.
   * @param {string} workspaceId
   * @param {string} conversationId
   * @returns {Object|null}
   */
  getConversationById(workspaceId = 'DEFAULT_WORKSPACE', conversationId) {
    const list = this.getConversations(workspaceId);
    return list.find(c => c.conversationId === conversationId || c.id === conversationId) || null;
  }

  /**
   * Saves or updates a conversation record atomically.
   * @param {string} workspaceId
   * @param {Object} conversation
   * @returns {Object} Saved conversation
   */
  saveConversation(workspaceId = 'DEFAULT_WORKSPACE', conversation) {
    const list = this.getConversations(workspaceId);
    const convId = conversation.conversationId || conversation.id;
    const idx = list.findIndex(c => (c.conversationId === convId || c.id === convId));

    const normalized = {
      id: convId,
      conversationId: convId,
      ...conversation,
      updatedAt: new Date().toISOString()
    };

    if (idx >= 0) {
      list[idx] = { ...list[idx], ...normalized };
    } else {
      list.push({
        ...normalized,
        createdAt: normalized.createdAt || new Date().toISOString()
      });
    }

    const filePath = this._getWorkspacePath(workspaceId);
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(list, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);

    return normalized;
  }

  /**
   * Appends a message to a conversation.
   * @param {string} workspaceId
   * @param {string} conversationId
   * @param {Object} message
   */
  appendMessage(workspaceId = 'DEFAULT_WORKSPACE', conversationId, message) {
    let conv = this.getConversationById(workspaceId, conversationId);
    if (!conv) {
      conv = {
        id: conversationId,
        conversationId,
        workspaceId,
        title: message.content?.slice(0, 40) || 'New Conversation',
        messages: [],
        createdAt: new Date().toISOString()
      };
    }

    conv.messages = conv.messages || [];
    const normalizedMsg = {
      id: message.messageId || message.id || `MSG-${Date.now()}`,
      messageId: message.messageId || message.id || `MSG-${Date.now()}`,
      ...message,
      timestamp: message.timestamp || new Date().toISOString()
    };
    conv.messages.push(normalizedMsg);
    this.saveConversation(workspaceId, conv);
    return normalizedMsg;
  }

  addMessage(workspaceId = 'DEFAULT_WORKSPACE', conversationId, message) {
    return this.appendMessage(workspaceId, conversationId, message);
  }

  getMessages(workspaceId = 'DEFAULT_WORKSPACE', conversationId) {
    const conv = this.getConversationById(workspaceId, conversationId);
    return conv ? (conv.messages || []) : [];
  }

  /**
   * Deletes a conversation by ID.
   * @param {string} workspaceId
   * @param {string} conversationId
   * @returns {boolean} True if deleted
   */
  deleteConversation(workspaceId = 'DEFAULT_WORKSPACE', conversationId) {
    const list = this.getConversations(workspaceId);
    const filtered = list.filter(c => c.conversationId !== conversationId && c.id !== conversationId);
    if (filtered.length === list.length) return false;

    const filePath = this._getWorkspacePath(workspaceId);
    fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), 'utf-8');
    return true;
  }
}

export const conversationRepository = new ConversationRepository();
