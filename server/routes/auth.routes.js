/**
 * @file auth.routes.js
 * Express Routes for Multi-User Authentication & API Key Management in Phase 9.
 */

import { Router } from 'express';
import { authService } from '../auth/auth.service.js';
import { apiKeyService } from '../auth/apiKey.service.js';
import { authRepository } from '../auth/auth.repository.js';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { Permission } from '../auth/auth.types.js';
import { auditRepository } from '../governance/audit.repository.js';
import { rateLimiter } from '../infrastructure/rateLimiter.engine.js';

const router = Router();

// 1. POST /api/auth/register
router.post('/register', rateLimiter.middleware('AUTH'), (req, res) => {
  try {
    const { email, password, name } = req.body;
    const user = authService.register({ email, password, name });
    auditRepository.appendEvent({
      actorId: user.userId,
      actorType: 'USER',
      action: 'user.register',
      resourceType: 'USER',
      resourceId: user.userId,
      result: 'SUCCESS',
      metadata: { email: user.email }
    });
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 2. POST /api/auth/login
router.post('/login', rateLimiter.middleware('AUTH'), (req, res) => {
  try {
    const { email, password, workspaceId } = req.body;
    const result = authService.login({ email, password, workspaceId });
    auditRepository.appendEvent({
      workspaceId: result.session.workspaceId || 'default',
      actorId: result.user.userId,
      actorType: 'USER',
      action: 'user.login',
      resourceType: 'SESSION',
      resourceId: result.session.sessionId,
      result: 'SUCCESS'
    });
    res.json(result);
  } catch (err) {
    auditRepository.appendEvent({
      actorId: 'ANONYMOUS',
      actorType: 'USER',
      action: 'user.login',
      resourceType: 'AUTH',
      resourceId: 'FAILED',
      result: 'FAILURE',
      metadata: { error: err.message }
    });
    res.status(401).json({ error: err.message });
  }
});

// 3. POST /api/auth/logout
router.post('/logout', requireAuth, (req, res) => {
  const token = req.headers['authorization']?.substring(7).trim();
  const ok = authService.logout(token);
  res.json({ success: ok });
});

// 4. GET /api/auth/session
router.get('/session', requireAuth, (req, res) => {
  res.json({
    user: req.auth.user,
    session: req.auth.session,
    workspaceId: req.auth.workspaceId
  });
});

// 5. POST /api/auth/workspaces - Create new workspace
router.post('/workspaces', requireAuth, (req, res) => {
  try {
    const { name } = req.body;
    const ws = authRepository.createWorkspace({ name, ownerId: req.auth.user.userId });
    res.status(201).json(ws);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 6. GET /api/auth/workspaces - List user workspaces
router.get('/workspaces', requireAuth, (req, res) => {
  const list = authRepository.listUserWorkspaces(req.auth.user.userId);
  res.json({ workspaces: list });
});

// 7. POST /api/auth/keys - Create API Key
router.post('/keys', requireAuth, requirePermission(Permission.API_KEYS_CREATE), (req, res) => {
  try {
    const { name, scopes, expiresDays } = req.body;
    const workspaceId = req.auth.workspaceId || 'default';
    const key = apiKeyService.createApiKey({ workspaceId, name, scopes, expiresDays });
    auditRepository.appendEvent({
      workspaceId,
      actorId: req.auth.user?.userId || 'SYSTEM',
      actorType: 'USER',
      action: 'api_key.created',
      resourceType: 'API_KEY',
      resourceId: key.keyId,
      result: 'SUCCESS',
      metadata: { name: key.name, scopes: key.scopes }
    });
    res.status(201).json(key);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 8. GET /api/auth/keys - List API Keys
router.get('/keys', requireAuth, requirePermission(Permission.API_KEYS_READ), (req, res) => {
  const workspaceId = req.auth.workspaceId || 'default';
  const keys = apiKeyService.listApiKeys(workspaceId);
  res.json({ apiKeys: keys });
});

// 9. DELETE /api/auth/keys/:keyId - Revoke API Key
router.delete('/keys/:keyId', requireAuth, requirePermission(Permission.API_KEYS_REVOKE), (req, res) => {
  const workspaceId = req.auth.workspaceId || 'default';
  const { keyId } = req.params;
  const ok = apiKeyService.revokeApiKey(workspaceId, keyId);
  if (ok) {
    auditRepository.appendEvent({
      workspaceId,
      actorId: req.auth.user?.userId || 'SYSTEM',
      actorType: 'USER',
      action: 'api_key.revoked',
      resourceType: 'API_KEY',
      resourceId: keyId,
      result: 'SUCCESS'
    });
    res.json({ success: true, revokedKeyId: keyId });
  } else {
    res.status(404).json({ error: 'API key not found' });
  }
});

export default router;
