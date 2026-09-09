/**
 * @file copilot.routes.js
 * Express routes for Phase 8 Investor Copilot & Decision Workflows.
 */

import express from 'express';
import { processCopilotMessage } from '../copilot/copilot.engine.js';
import { conversationRepository } from '../copilot/copilot.conversationRepository.js';
import { routeAndSealContext } from '../copilot/copilot.contextRouter.js';
import { initiateResearchWorkflow } from '../workflow/researchWorkflow.engine.js';
import { handleDecisionReviewWorkflow } from '../workflow/decisionWorkflow.engine.js';
import { createFollowUpWorkflow } from '../workflow/followupWorkflow.engine.js';
import { validateCopilotRequest } from '../copilot/copilot.types.js';

const router = express.Router();

/**
 * POST /api/copilot/chat
 * Primary chat endpoint for the Investor Copilot.
 */
router.post('/chat', async (req, res) => {
  try {
    const val = validateCopilotRequest(req.body);
    if (!val.valid) {
      return res.status(400).json({ error: val.errors.join(', ') });
    }

    const { message, conversationId, ticker, depth } = req.body;
    const workspaceId = req.headers['x-workspace-id'] || req.query.workspace || 'DEFAULT_WORKSPACE';

    const response = await processCopilotMessage({
      workspaceId,
      message,
      conversationId,
      ticker,
      depth
    });

    return res.json(response);
  } catch (error) {
    console.error('[CopilotRoute] Error in /chat:', error);
    return res.status(500).json({ error: error.message || 'Internal copilot processing error' });
  }
});

/**
 * POST /api/copilot/question
 * Direct grounded Q&A endpoint.
 */
router.post('/question', async (req, res) => {
  try {
    const { question, ticker } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question cannot be empty' });
    }
    const workspaceId = req.headers['x-workspace-id'] || req.query.workspace || 'DEFAULT_WORKSPACE';

    const response = await processCopilotMessage({
      workspaceId,
      message: question,
      ticker,
      depth: 'QUICK'
    });

    return res.json(response);
  } catch (error) {
    console.error('[CopilotRoute] Error in /question:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/copilot/conversations
 * Lists conversations for the workspace.
 */
router.get('/conversations', (req, res) => {
  try {
    const workspaceId = req.headers['x-workspace-id'] || req.query.workspace || 'DEFAULT_WORKSPACE';
    const conversations = conversationRepository.getConversations(workspaceId);
    return res.json({ workspaceId, conversations });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/copilot/conversations/:id
 * Retrieves a single conversation by ID.
 */
router.get('/conversations/:id', (req, res) => {
  try {
    const workspaceId = req.headers['x-workspace-id'] || req.query.workspace || 'DEFAULT_WORKSPACE';
    const conv = conversationRepository.getConversationById(workspaceId, req.params.id);
    if (!conv) {
      return res.status(404).json({ error: `Conversation not found: ${req.params.id}` });
    }
    return res.json(conv);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/copilot/conversations/:id
 * Deletes a conversation session.
 */
router.delete('/conversations/:id', (req, res) => {
  try {
    const workspaceId = req.headers['x-workspace-id'] || req.query.workspace || 'DEFAULT_WORKSPACE';
    const deleted = conversationRepository.deleteConversation(workspaceId, req.params.id);
    return res.json({ deleted });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/copilot/research
 * Initiates grounded research workflow.
 */
router.post('/research', async (req, res) => {
  try {
    const { ticker, question } = req.body;
    const workspaceId = req.headers['x-workspace-id'] || req.query.workspace || 'DEFAULT_WORKSPACE';
    const result = await initiateResearchWorkflow({ workspaceId, ticker, question });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/copilot/review
 * Initiates decision review workflow.
 */
router.post('/review', (req, res) => {
  try {
    const { ticker, attentionId, note } = req.body;
    const workspaceId = req.headers['x-workspace-id'] || req.query.workspace || 'DEFAULT_WORKSPACE';
    const result = handleDecisionReviewWorkflow({ workspaceId, ticker, attentionId, note });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/copilot/followup
 * Creates an investigation follow-up task.
 */
router.post('/followup', (req, res) => {
  try {
    const { ticker, question, attentionId } = req.body;
    const workspaceId = req.headers['x-workspace-id'] || req.query.workspace || 'DEFAULT_WORKSPACE';
    const result = createFollowUpWorkflow({ workspaceId, ticker, question, attentionId });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/copilot/context/:ticker
 * Retrieves sealed context for verification.
 */
router.get('/context/:ticker', async (req, res) => {
  try {
    const workspaceId = req.headers['x-workspace-id'] || req.query.workspace || 'DEFAULT_WORKSPACE';
    const context = await routeAndSealContext({
      workspaceId,
      primaryTicker: req.params.ticker
    });
    return res.json(context);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
