/**
 * @file copilot.sessionManager.js
 * Session and conversation lifecycle management for Investor Copilot.
 */

import { conversationRepository } from './copilot.conversationRepository.js';

export class SessionManager {
  /**
   * Initializes or loads a session conversation.
   * @param {string} workspaceId
   * @param {string} [conversationId]
   * @returns {Object} Active conversation session
   */
  getOrCreateSession(workspaceId = 'DEFAULT_WORKSPACE', conversationId = null) {
    if (conversationId) {
      const existing = conversationRepository.getConversationById(workspaceId, conversationId);
      if (existing) return existing;
    }

    const newId = conversationId || `CONV-${workspaceId}-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    const newConv = {
      conversationId: newId,
      workspaceId,
      title: 'New Investment Conversation',
      messages: [],
      createdAt: new Date().toISOString()
    };

    conversationRepository.saveConversation(workspaceId, newConv);
    return newConv;
  }
}

export const sessionManager = new SessionManager();
