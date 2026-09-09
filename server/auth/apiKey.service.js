/**
 * @file apiKey.service.js
 * Scoped API Key Management Service for Phase 9 Institutional Security.
 */

import { authRepository } from './auth.repository.js';
import { ApiKeyStatus } from './auth.types.js';

export class ApiKeyService {
  constructor(repo = authRepository) {
    this.repo = repo;
  }

  createApiKey({ workspaceId, name, scopes = [], expiresDays = 90 }) {
    if (!workspaceId) throw new Error('workspaceId is required for API key creation');
    if (!Array.isArray(scopes) || scopes.length === 0) {
      throw new Error('API key must specify at least one valid permission scope');
    }
    return this.repo.createApiKey({ workspaceId, name, scopes, expiresDays });
  }

  authenticateApiKey(rawSecret) {
    if (!rawSecret) return null;
    const apiKey = this.repo.getApiKeyBySecret(rawSecret);
    if (!apiKey) return null;
    return {
      keyId: apiKey.keyId,
      workspaceId: apiKey.workspaceId,
      name: apiKey.name,
      scopes: apiKey.scopes,
      status: apiKey.status
    };
  }

  listApiKeys(workspaceId) {
    if (!workspaceId) return [];
    return this.repo.listApiKeys(workspaceId);
  }

  revokeApiKey(workspaceId, keyId) {
    if (!workspaceId || !keyId) return false;
    return this.repo.revokeApiKey(workspaceId, keyId);
  }

  hasApiKeyScope(apiKey, requiredScope) {
    if (!apiKey || !apiKey.scopes) return false;
    return apiKey.scopes.includes(requiredScope) || apiKey.scopes.includes('*');
  }
}

export const apiKeyService = new ApiKeyService();
