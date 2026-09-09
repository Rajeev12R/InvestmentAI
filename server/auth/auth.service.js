/**
 * @file auth.service.js
 * Multi-User Authentication Service for Phase 9.
 */

import crypto from 'crypto';
import { authRepository } from './auth.repository.js';
import { MembershipStatus } from './auth.types.js';

export class AuthService {
  constructor(repo = authRepository) {
    this.repo = repo;
  }

  register({ email, password, name }) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    return this.repo.createUser({ email, password, name });
  }

  login({ email, password, workspaceId = null }) {
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    const user = this.repo.getUserWithCredentialsByEmail(email);
    if (!user || !user.isActive) {
      throw new Error('Invalid email or password');
    }

    const calculatedHash = crypto.pbkdf2Sync(password, user.salt, 10000, 64, 'sha512');
    const storedHash = Buffer.from(user.passwordHash, 'hex');
    if (calculatedHash.length !== storedHash.length || !crypto.timingSafeEqual(calculatedHash, storedHash)) {
      throw new Error('Invalid email or password');
    }

    // Find active organization and workspace
    const userOrgs = this.repo.listUserOrganizations(user.userId);
    const effectiveOrgId = userOrgs.length > 0 ? userOrgs[0].orgId : 'ORG-ROOT-001';

    // If workspace requested, verify membership
    let effectiveWorkspaceId = workspaceId;
    if (workspaceId) {
      const mem = this.repo.getMembership(workspaceId, user.userId);
      if (!mem || mem.status !== MembershipStatus.ACTIVE) {
        throw new Error(`User does not have active access to workspace ${workspaceId}`);
      }
    } else {
      // Find first active workspace
      const userWorkspaces = this.repo.listUserWorkspaces(user.userId, effectiveOrgId);
      if (userWorkspaces.length > 0) {
        effectiveWorkspaceId = userWorkspaces[0].workspaceId;
      } else {
        effectiveWorkspaceId = 'default';
      }
    }

    const session = this.repo.createSession({
      userId: user.userId,
      orgId: effectiveOrgId,
      workspaceId: effectiveWorkspaceId,
      ttlMinutes: 240
    });

    return {
      user: { userId: user.userId, email: user.email, name: user.name },
      session: {
        sessionId: session.sessionId,
        token: session.rawToken,
        expiresAt: session.expiresAt,
        orgId: effectiveOrgId,
        workspaceId: effectiveWorkspaceId
      },
      organizations: userOrgs,
      workspaces: this.repo.listUserWorkspaces(user.userId)
    };
  }

  validateSessionToken(token) {
    if (!token) return null;
    const session = this.repo.getSessionByToken(token);
    if (!session) return null;
    const user = this.repo.getUserById(session.userId);
    if (!user || !user.isActive) return null;
    return { session, user };
  }

  logout(token) {
    if (!token) return false;
    const session = this.repo.getSessionByToken(token);
    if (!session) return false;
    return this.repo.revokeSession(session.sessionId);
  }

  createWorkspaceForUser(userId, { name }) {
    return this.repo.createWorkspace({ name, ownerId: userId });
  }
}

export const authService = new AuthService();
