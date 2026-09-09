/**
 * Phase 16 — Institutional Policy Repository
 * Multi-tenant workspace-isolated storage for versioned policies.
 */

import { deepFreeze } from './compliance.types.js';

export class PolicyRepository {
  constructor() {
    // Map: workspaceId -> Map: policyId -> Array of versioned policy objects
    this.policies = new Map();
  }

  savePolicy(policy) {
    if (!policy || !policy.workspaceId || !policy.policyId) {
      throw new Error('Invalid policy object for storage');
    }
    const ws = policy.workspaceId;
    if (!this.policies.has(ws)) {
      this.policies.set(ws, new Map());
    }
    const wsPolicies = this.policies.get(ws);
    if (!wsPolicies.has(policy.policyId)) {
      wsPolicies.set(policy.policyId, []);
    }

    const versions = wsPolicies.get(policy.policyId);
    // Check if exact version exists
    const existingIdx = versions.findIndex(p => p.policyVersion === policy.policyVersion);
    if (existingIdx >= 0) {
      // Immutable check: cannot overwrite existing policy version
      throw new Error(`Policy ${policy.policyId} version ${policy.policyVersion} is sealed and immutable`);
    }

    versions.push(deepFreeze(policy));
    return policy;
  }

  getPolicyVersion(policyId, version, workspaceId) {
    if (!this.policies.has(workspaceId)) return null;
    const wsPolicies = this.policies.get(workspaceId);
    if (!wsPolicies.has(policyId)) return null;
    const versions = wsPolicies.get(policyId);
    return versions.find(v => v.policyVersion === version) || null;
  }

  getLatestPolicy(policyId, workspaceId) {
    if (!this.policies.has(workspaceId)) return null;
    const wsPolicies = this.policies.get(workspaceId);
    if (!wsPolicies.has(policyId)) return null;
    const versions = wsPolicies.get(policyId);
    if (versions.length === 0) return null;
    // Return newest by effectiveFrom
    return [...versions].sort((a, b) => new Date(b.effectiveFrom) - new Date(a.effectiveFrom))[0];
  }

  listPolicyVersions(policyId, workspaceId) {
    if (!this.policies.has(workspaceId)) return [];
    const wsPolicies = this.policies.get(workspaceId);
    if (!wsPolicies.has(policyId)) return [];
    return [...wsPolicies.get(policyId)];
  }

  listAllPolicies(workspaceId) {
    if (!this.policies.has(workspaceId)) return [];
    const wsPolicies = this.policies.get(workspaceId);
    const result = [];
    for (const [_, versions] of wsPolicies.entries()) {
      if (versions.length > 0) {
        // push latest version
        const latest = [...versions].sort((a, b) => new Date(b.effectiveFrom) - new Date(a.effectiveFrom))[0];
        result.push(latest);
      }
    }
    return result;
  }

  clear() {
    this.policies.clear();
  }
}

export const policyRepository = new PolicyRepository();
