/**
 * @file auth.repository.js
 * Multi-Tenant Organization & Workspace Storage Repository for Phase 35.
 */

import crypto from 'crypto';
import { Role, OrganizationRole, OrganizationStatus, WorkspaceStatus, MembershipStatus, ApiKeyStatus, SessionStatus } from './auth.types.js';

class AuthRepository {
  constructor() {
    this.users = new Map(); // userId -> User
    this.usersByEmail = new Map(); // email.toLowerCase() -> userId
    this.organizations = new Map(); // orgId -> Organization
    this.orgMemberships = new Map(); // `${orgId}:${userId}` -> OrgMembership
    this.workspaces = new Map(); // workspaceId -> Workspace
    this.memberships = new Map(); // `${workspaceId}:${userId}` -> WorkspaceMembership
    this.sessions = new Map(); // sessionId -> Session
    this.sessionsByToken = new Map(); // tokenHash -> sessionId
    this.apiKeys = new Map(); // keyId -> APIKey
    this.apiKeysByFingerprint = new Map(); // fingerprint -> keyId
    this._initDefaultAdmin();
  }

  _initDefaultAdmin() {
    // 1. Seed default institutional administrator
    const defaultUser = {
      userId: 'USR-ROOT-001',
      email: 'admin@investmentai.local',
      name: 'Institutional Administrator',
      passwordHash: this._hashPassword('Admin123!Secure', 'SALT-ROOT-001'),
      salt: 'SALT-ROOT-001',
      createdAt: '2026-09-06T00:00:00.000Z',
      isActive: true
    };
    this.users.set(defaultUser.userId, defaultUser);
    this.usersByEmail.set(defaultUser.email.toLowerCase(), defaultUser.userId);

    // 2. Seed default institutional organization
    const defaultOrg = {
      orgId: 'ORG-ROOT-001',
      name: 'Primary Institutional Capital',
      slug: 'primary-institutional-capital',
      ownerId: defaultUser.userId,
      status: OrganizationStatus.ACTIVE,
      settings: {
        defaultCurrency: 'USD',
        timezone: 'UTC',
        enforceMfa: false,
        auditRetentionDays: 365
      },
      createdAt: '2026-09-06T00:00:00.000Z',
      updatedAt: '2026-09-06T00:00:00.000Z'
    };
    this.organizations.set(defaultOrg.orgId, defaultOrg);

    // 3. Seed default organization membership
    const defaultOrgMembership = {
      membershipId: `MBR-${defaultOrg.orgId}-${defaultUser.userId}`,
      orgId: defaultOrg.orgId,
      userId: defaultUser.userId,
      role: OrganizationRole.OWNER,
      status: MembershipStatus.ACTIVE,
      joinedAt: '2026-09-06T00:00:00.000Z',
      updatedAt: '2026-09-06T00:00:00.000Z'
    };
    this.orgMemberships.set(`${defaultOrg.orgId}:${defaultUser.userId}`, defaultOrgMembership);

    // 4. Seed default workspace
    const defaultWorkspace = {
      workspaceId: 'default',
      orgId: defaultOrg.orgId,
      name: 'Primary Institutional Portfolio',
      slug: 'primary-portfolio',
      description: 'Production institutional strategy and live valuation workspace',
      ownerId: defaultUser.userId,
      status: WorkspaceStatus.ACTIVE,
      settings: {
        baseCurrency: 'USD',
        riskModel: 'INSTITUTIONAL_PARAMETRIC'
      },
      createdAt: '2026-09-06T00:00:00.000Z',
      updatedAt: '2026-09-06T00:00:00.000Z'
    };
    this.workspaces.set(defaultWorkspace.workspaceId, defaultWorkspace);

    // Also alias WS-DEFAULT-001 for Phase 36 compatibility
    const wsDefault001 = {
      ...defaultWorkspace,
      workspaceId: 'WS-DEFAULT-001',
      name: 'Global Multi-Asset Workspace'
    };
    this.workspaces.set(wsDefault001.workspaceId, wsDefault001);

    // 5. Seed default workspace membership
    const defaultMembership = {
      membershipId: `MBR-${defaultWorkspace.workspaceId}-${defaultUser.userId}`,
      workspaceId: defaultWorkspace.workspaceId,
      orgId: defaultOrg.orgId,
      userId: defaultUser.userId,
      role: Role.OWNER,
      status: MembershipStatus.ACTIVE,
      joinedAt: '2026-09-06T00:00:00.000Z',
      updatedAt: '2026-09-06T00:00:00.000Z'
    };
    this.memberships.set(`${defaultWorkspace.workspaceId}:${defaultUser.userId}`, defaultMembership);

    const wsDefault001Membership = {
      membershipId: `MBR-${wsDefault001.workspaceId}-${defaultUser.userId}`,
      workspaceId: wsDefault001.workspaceId,
      orgId: defaultOrg.orgId,
      userId: defaultUser.userId,
      role: Role.OWNER,
      status: MembershipStatus.ACTIVE,
      joinedAt: '2026-09-06T00:00:00.000Z',
      updatedAt: '2026-09-06T00:00:00.000Z'
    };
    this.memberships.set(`${wsDefault001.workspaceId}:${defaultUser.userId}`, wsDefault001Membership);
  }

  _hashPassword(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  }

  // =========================================================================
  // User Management
  // =========================================================================
  createUser({ email, password, name }) {
    const normalizedEmail = email.toLowerCase().trim();
    if (this.usersByEmail.has(normalizedEmail)) {
      throw new Error(`User with email ${normalizedEmail} already exists`);
    }
    const userId = `USR-${crypto.randomUUID()}`;
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = this._hashPassword(password, salt);
    const user = {
      userId,
      email: normalizedEmail,
      name: name || normalizedEmail.split('@')[0],
      passwordHash,
      salt,
      createdAt: new Date().toISOString(),
      isActive: true
    };
    this.users.set(userId, user);
    this.usersByEmail.set(normalizedEmail, userId);
    return { userId: user.userId, email: user.email, name: user.name, createdAt: user.createdAt };
  }

  getUserById(userId) {
    const u = this.users.get(userId);
    if (!u) return null;
    const { passwordHash, salt, ...safeUser } = u;
    return safeUser;
  }

  getUserWithCredentialsByEmail(email) {
    const normalizedEmail = email.toLowerCase().trim();
    const userId = this.usersByEmail.get(normalizedEmail);
    if (!userId) return null;
    return this.users.get(userId);
  }

  // =========================================================================
  // Organization Management (Phase 35)
  // =========================================================================
  createOrganization({ name, slug, ownerId = 'USR-ROOT-001', settings = {} }) {
    const effectiveOwnerId = ownerId || 'USR-ROOT-001';
    const user = this.users.get(effectiveOwnerId);
    if (!user) throw new Error(`Owner user ${effectiveOwnerId} does not exist`);

    const orgId = `ORG-${crypto.randomUUID()}`;
    const autoSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const organization = {
      orgId,
      name,
      slug: autoSlug,
      ownerId: effectiveOwnerId,
      status: OrganizationStatus.ACTIVE,
      settings: {
        defaultCurrency: 'USD',
        timezone: 'UTC',
        ...settings
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.organizations.set(orgId, organization);

    // Auto-create OWNER membership in the organization
    const orgMembership = {
      membershipId: `MBR-${orgId}-${effectiveOwnerId}`,
      orgId,
      userId: effectiveOwnerId,
      role: OrganizationRole.OWNER,
      status: MembershipStatus.ACTIVE,
      joinedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.orgMemberships.set(`${orgId}:${effectiveOwnerId}`, orgMembership);

    return organization;
  }

  getOrganizationById(orgId) {
    return this.organizations.get(orgId) || null;
  }

  updateOrganization(orgId, updates = {}) {
    const org = this.organizations.get(orgId);
    if (!org) throw new Error(`Organization ${orgId} not found`);

    if (updates.name) org.name = updates.name;
    if (updates.slug) org.slug = updates.slug;
    if (updates.status && Object.values(OrganizationStatus).includes(updates.status)) {
      org.status = updates.status;
    }
    if (updates.settings) {
      org.settings = { ...org.settings, ...updates.settings };
    }
    org.updatedAt = new Date().toISOString();
    this.organizations.set(orgId, org);
    return org;
  }

  listUserOrganizations(userId) {
    const orgs = [];
    for (const mem of this.orgMemberships.values()) {
      if (mem.userId === userId && mem.status === MembershipStatus.ACTIVE) {
        const org = this.organizations.get(mem.orgId);
        if (org && org.status === OrganizationStatus.ACTIVE) {
          orgs.push({
            ...org,
            role: mem.role,
            membershipStatus: mem.status
          });
        }
      }
    }
    return orgs;
  }

  addOrganizationMember(param1, param2, param3, param4) {
    let orgId, userId, role, inviterId;
    if (typeof param1 === 'object' && param1 !== null) {
      orgId = param1.orgId;
      userId = param1.userId;
      role = param1.role || OrganizationRole.MEMBER;
      inviterId = param1.inviterId || null;
    } else {
      orgId = param1;
      userId = param2;
      role = param3 || OrganizationRole.MEMBER;
      inviterId = param4 || null;
    }

    if (!this.organizations.has(orgId)) throw new Error(`Organization ${orgId} not found`);
    if (!this.users.has(userId)) throw new Error(`User ${userId} not found`);

    const key = `${orgId}:${userId}`;
    const existing = this.orgMemberships.get(key);
    if (existing && existing.status === MembershipStatus.ACTIVE) {
      throw new Error(`User ${userId} is already an active member of organization ${orgId}`);
    }

    const membership = {
      membershipId: `MBR-${orgId}-${userId}`,
      orgId,
      userId,
      role,
      status: MembershipStatus.ACTIVE,
      inviterId,
      joinedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.orgMemberships.set(key, membership);
    return membership;
  }

  updateOrganizationMemberRole({ orgId, userId, role }) {
    const key = `${orgId}:${userId}`;
    const membership = this.orgMemberships.get(key);
    if (!membership || membership.status !== MembershipStatus.ACTIVE) {
      throw new Error(`Active membership not found for user ${userId} in organization ${orgId}`);
    }
    membership.role = role;
    membership.updatedAt = new Date().toISOString();
    this.orgMemberships.set(key, membership);
    return membership;
  }

  removeOrganizationMember({ orgId, userId }) {
    const key = `${orgId}:${userId}`;
    const membership = this.orgMemberships.get(key);
    if (!membership) return false;
    membership.status = MembershipStatus.REVOKED;
    membership.revokedAt = new Date().toISOString();
    membership.updatedAt = new Date().toISOString();
    this.orgMemberships.set(key, membership);
    return true;
  }

  getOrganizationMembership(orgId, userId) {
    if (!orgId || !userId) return null;
    return this.orgMemberships.get(`${orgId}:${userId}`) || null;
  }

  listOrganizationMembers(orgId) {
    const members = [];
    for (const mem of this.orgMemberships.values()) {
      if (mem.orgId === orgId && mem.status === MembershipStatus.ACTIVE) {
        const u = this.getUserById(mem.userId);
        members.push({
          membershipId: mem.membershipId,
          orgId: mem.orgId,
          userId: mem.userId,
          email: u?.email || 'unknown',
          name: u?.name || 'unknown',
          role: mem.role,
          status: mem.status,
          joinedAt: mem.joinedAt
        });
      }
    }
    return members;
  }

  // =========================================================================
  // Workspace Management (Phase 35 Multi-Tenant Scoping)
  // =========================================================================
  createWorkspace({ orgId = 'ORG-ROOT-001', name, description = '', ownerId = 'USR-ROOT-001', settings = {} }) {
    const effectiveOwnerId = ownerId || 'USR-ROOT-001';
    const user = this.users.get(effectiveOwnerId);
    if (!user) throw new Error(`Owner user ${effectiveOwnerId} does not exist`);

    const targetOrgId = orgId || 'ORG-ROOT-001';
    const org = this.organizations.get(targetOrgId);
    if (!org) throw new Error(`Target organization ${targetOrgId} not found`);
    if (org.status !== OrganizationStatus.ACTIVE) {
      throw new Error(`Cannot create workspace in inactive organization ${targetOrgId}`);
    }

    const workspaceId = `WS-${crypto.randomUUID()}`;
    const autoSlug = (name || workspaceId).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const workspace = {
      workspaceId,
      orgId: targetOrgId,
      name: name || `Workspace ${workspaceId.slice(3, 11)}`,
      slug: autoSlug,
      description,
      ownerId,
      status: WorkspaceStatus.ACTIVE,
      settings: {
        baseCurrency: org.settings?.defaultCurrency || 'USD',
        ...settings
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.workspaces.set(workspaceId, workspace);

    // Automatically create OWNER membership in the workspace
    const membership = {
      membershipId: `MBR-${workspaceId}-${ownerId}`,
      workspaceId,
      orgId: targetOrgId,
      userId: ownerId,
      role: Role.OWNER,
      status: MembershipStatus.ACTIVE,
      joinedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.memberships.set(`${workspaceId}:${ownerId}`, membership);

    return workspace;
  }

  getWorkspaceById(workspaceId) {
    return this.workspaces.get(workspaceId) || null;
  }

  updateWorkspace(workspaceId, updates = {}) {
    const ws = this.workspaces.get(workspaceId);
    if (!ws) throw new Error(`Workspace ${workspaceId} not found`);

    if (updates.name) ws.name = updates.name;
    if (updates.description !== undefined) ws.description = updates.description;
    if (updates.status && Object.values(WorkspaceStatus).includes(updates.status)) {
      ws.status = updates.status;
    }
    if (updates.settings) {
      ws.settings = { ...ws.settings, ...updates.settings };
    }
    ws.updatedAt = new Date().toISOString();
    this.workspaces.set(workspaceId, ws);
    return ws;
  }

  archiveWorkspace(workspaceId) {
    const ws = this.workspaces.get(workspaceId);
    if (!ws) throw new Error(`Workspace ${workspaceId} not found`);
    ws.status = WorkspaceStatus.ARCHIVED;
    ws.archivedAt = new Date().toISOString();
    ws.updatedAt = new Date().toISOString();
    this.workspaces.set(workspaceId, ws);
    return ws;
  }

  listOrganizationWorkspaces(orgId) {
    const list = [];
    for (const ws of this.workspaces.values()) {
      if (ws.orgId === orgId && ws.status !== WorkspaceStatus.ARCHIVED) {
        list.push(ws);
      }
    }
    return list;
  }

  listUserWorkspaces(userId, orgId = null) {
    const list = [];
    for (const mem of this.memberships.values()) {
      if (mem.userId === userId && mem.status === MembershipStatus.ACTIVE) {
        const ws = this.workspaces.get(mem.workspaceId);
        if (ws && ws.status === WorkspaceStatus.ACTIVE) {
          if (!orgId || ws.orgId === orgId) {
            list.push({ ...ws, role: mem.role, membershipStatus: mem.status });
          }
        }
      }
    }
    return list;
  }

  // =========================================================================
  // Workspace Membership Management
  addWorkspaceMember(param1, param2, param3, param4) {
    let workspaceId, userId, role, inviterId;
    if (typeof param1 === 'object' && param1 !== null) {
      workspaceId = param1.workspaceId;
      userId = param1.userId;
      role = param1.role || Role.ANALYST;
      inviterId = param1.inviterId || null;
    } else {
      workspaceId = param1;
      userId = param2;
      role = param3 || Role.ANALYST;
      inviterId = param4 || null;
    }

    const ws = this.workspaces.get(workspaceId);
    if (!ws) throw new Error(`Workspace ${workspaceId} not found`);
    if (ws.status !== WorkspaceStatus.ACTIVE) throw new Error(`Cannot add member to inactive workspace ${workspaceId}`);
    if (!this.users.has(userId)) throw new Error(`User ${userId} not found`);
    
    const key = `${workspaceId}:${userId}`;
    const existing = this.memberships.get(key);
    if (existing && existing.status === MembershipStatus.ACTIVE) {
      throw new Error(`User ${userId} is already a member of workspace ${workspaceId}`);
    }

    const membership = {
      membershipId: `MBR-${workspaceId}-${userId}`,
      workspaceId,
      orgId: ws.orgId,
      userId,
      role,
      status: MembershipStatus.ACTIVE,
      inviterId: inviterId || null,
      joinedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.memberships.set(key, membership);
    return membership;
  }

  addMembership(...args) {
    return this.addWorkspaceMember(...args);
  }

  updateMemberRole({ workspaceId, userId, role }) {
    const key = `${workspaceId}:${userId}`;
    const membership = this.memberships.get(key);
    if (!membership || membership.status !== MembershipStatus.ACTIVE) {
      throw new Error(`Active membership not found for user ${userId} in workspace ${workspaceId}`);
    }
    membership.role = role;
    membership.updatedAt = new Date().toISOString();
    this.memberships.set(key, membership);
    return membership;
  }

  removeWorkspaceMember({ workspaceId, userId }) {
    const key = `${workspaceId}:${userId}`;
    const membership = this.memberships.get(key);
    if (!membership) return false;
    membership.status = MembershipStatus.REVOKED;
    membership.revokedAt = new Date().toISOString();
    membership.updatedAt = new Date().toISOString();
    this.memberships.set(key, membership);
    return true;
  }

  getMembership(workspaceId, userId) {
    if (!workspaceId || !userId) return null;
    return this.memberships.get(`${workspaceId}:${userId}`) || null;
  }

  listWorkspaceMembers(workspaceId) {
    const members = [];
    for (const mem of this.memberships.values()) {
      if (mem.workspaceId === workspaceId && mem.status === MembershipStatus.ACTIVE) {
        const u = this.getUserById(mem.userId);
        members.push({
          membershipId: mem.membershipId,
          workspaceId: mem.workspaceId,
          orgId: mem.orgId,
          userId: mem.userId,
          email: u?.email || 'unknown',
          name: u?.name || 'unknown',
          role: mem.role,
          status: mem.status,
          joinedAt: mem.joinedAt
        });
      }
    }
    return members;
  }

  // =========================================================================
  // Session Management
  // =========================================================================
  createSession({ userId, orgId = null, workspaceId = null, ttlMinutes = 120 }) {
    const sessionId = `SES-${crypto.randomUUID()}`;
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + ttlMinutes * 60 * 1000);

    const session = {
      sessionId,
      userId,
      orgId: orgId || 'ORG-ROOT-001',
      workspaceId: workspaceId || 'default',
      tokenHash,
      status: SessionStatus.ACTIVE,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      lastAccessedAt: createdAt.toISOString()
    };

    this.sessions.set(sessionId, session);
    this.sessionsByToken.set(tokenHash, sessionId);

    return { sessionId, rawToken, expiresAt: session.expiresAt };
  }

  getSessionByToken(rawToken) {
    if (!rawToken) return null;
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const sessionId = this.sessionsByToken.get(tokenHash);
    if (!sessionId) return null;
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    if (new Date() > new Date(session.expiresAt)) {
      session.status = SessionStatus.EXPIRED;
      return null;
    }
    if (session.status !== SessionStatus.ACTIVE) {
      return null;
    }

    session.lastAccessedAt = new Date().toISOString();
    return session;
  }

  revokeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    session.status = SessionStatus.REVOKED;
    session.revokedAt = new Date().toISOString();
    return true;
  }

  revokeAllUserSessions(userId) {
    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        session.status = SessionStatus.REVOKED;
        session.revokedAt = new Date().toISOString();
      }
    }
  }

  // =========================================================================
  // API Key Management
  // =========================================================================
  createApiKey({ workspaceId, name, scopes = [], expiresDays = 90 }) {
    const keyId = `KEY-${crypto.randomUUID()}`;
    const rawSecret = `inv_live_${crypto.randomBytes(24).toString('hex')}`;
    const keyFingerprint = crypto.createHash('sha256').update(rawSecret).digest('hex');
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + expiresDays * 24 * 60 * 60 * 1000);

    const apiKey = {
      keyId,
      workspaceId,
      name: name || 'Default API Key',
      keyFingerprint,
      maskedKey: `${rawSecret.slice(0, 12)}...${rawSecret.slice(-4)}`,
      scopes,
      status: ApiKeyStatus.ACTIVE,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      lastUsedAt: null
    };

    this.apiKeys.set(keyId, apiKey);
    this.apiKeysByFingerprint.set(keyFingerprint, keyId);

    return {
      keyId,
      name: apiKey.name,
      workspaceId,
      rawSecret, // Only returned on creation
      maskedKey: apiKey.maskedKey,
      scopes,
      expiresAt: apiKey.expiresAt
    };
  }

  getApiKeyBySecret(rawSecret) {
    if (!rawSecret) return null;
    const fingerprint = crypto.createHash('sha256').update(rawSecret).digest('hex');
    const keyId = this.apiKeysByFingerprint.get(fingerprint);
    if (!keyId) return null;
    const key = this.apiKeys.get(keyId);
    if (!key) return null;

    if (new Date() > new Date(key.expiresAt)) {
      key.status = ApiKeyStatus.EXPIRED;
      return null;
    }
    if (key.status !== ApiKeyStatus.ACTIVE) {
      return null;
    }

    key.lastUsedAt = new Date().toISOString();
    return key;
  }

  listApiKeys(workspaceId) {
    const keys = [];
    for (const key of this.apiKeys.values()) {
      if (key.workspaceId === workspaceId && key.status === ApiKeyStatus.ACTIVE) {
        keys.push({
          keyId: key.keyId,
          name: key.name,
          maskedKey: key.maskedKey,
          scopes: key.scopes,
          status: key.status,
          createdAt: key.createdAt,
          expiresAt: key.expiresAt,
          lastUsedAt: key.lastUsedAt
        });
      }
    }
    return keys;
  }

  revokeApiKey(workspaceId, keyId) {
    const key = this.apiKeys.get(keyId);
    if (!key || key.workspaceId !== workspaceId) return false;
    key.status = ApiKeyStatus.REVOKED;
    key.revokedAt = new Date().toISOString();
    return true;
  }
}

export const authRepository = new AuthRepository();

