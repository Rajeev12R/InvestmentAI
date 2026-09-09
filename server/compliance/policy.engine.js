/**
 * Phase 16 — Institutional Policy Engine
 * Manages immutable, versioned investment policy statements (IPS),
 * cryptographic sealing, effective-date range resolution, and multi-policy precedence.
 */

import { deepFreeze, canonicalHash, PolicyStatus, PolicyPrecedence, ComplianceStatus } from './compliance.types.js';
import { validateRuleSchema } from './policy.types.js';

export class PolicyEngine {
  /**
   * Creates a brand new Policy V1.
   */
  static createPolicy({
    policyId,
    workspaceId,
    name,
    description = '',
    precedence = PolicyPrecedence.PORTFOLIO_MANDATE,
    effectiveFrom,
    effectiveTo = null,
    rules = [],
    createdBy = 'SYSTEM',
    metadata = {}
  }) {
    if (!policyId || !workspaceId || !effectiveFrom) {
      throw new Error('policyId, workspaceId, and effectiveFrom are required to create a policy');
    }

    if (effectiveTo && new Date(effectiveFrom) > new Date(effectiveTo)) {
      throw new Error('effectiveFrom cannot be after effectiveTo');
    }

    // Validate all rules
    const validatedRules = rules.map((r, idx) => {
      const ruleObj = {
        ruleId: r.ruleId || `RULE-${idx + 1}`,
        ruleVersion: '1.0.0',
        policyId,
        policyVersion: '1.0.0',
        ruleType: r.ruleType,
        description: r.description || `${r.ruleType || 'POLICY'} rule`,
        scope: r.scope || 'PORTFOLIO',
        targetKey: r.targetKey || null, // e.g., 'AAPL', 'Technology', 'US'
        threshold: r.threshold !== undefined ? r.threshold : null,
        operator: r.operator,
        severity: r.severity || 'HIGH',
        allowedValues: r.allowedValues || null,
        prohibitedValues: r.prohibitedValues || null,
        effectiveFrom: r.effectiveFrom || effectiveFrom,
        effectiveTo: r.effectiveTo || effectiveTo,
        source: r.source || 'IPS',
        createdBy
      };

      const validation = validateRuleSchema(ruleObj);
      if (!validation.valid) {
        throw new Error(`Rule validation failed for ${ruleObj.ruleId}: ${validation.error}`);
      }

      ruleObj.ruleHash = canonicalHash({
        ruleId: ruleObj.ruleId,
        ruleType: ruleObj.ruleType,
        targetKey: ruleObj.targetKey,
        threshold: ruleObj.threshold,
        operator: ruleObj.operator,
        severity: ruleObj.severity,
        allowedValues: ruleObj.allowedValues,
        prohibitedValues: ruleObj.prohibitedValues
      });

      return ruleObj;
    });

    const policyPayload = {
      policyId,
      policyVersion: '1.0.0',
      workspaceId,
      name,
      description,
      precedence: precedence || PolicyPrecedence.PORTFOLIO_MANDATE,
      effectiveFrom: new Date(effectiveFrom).toISOString(),
      effectiveTo: effectiveTo ? new Date(effectiveTo).toISOString() : null,
      status: PolicyStatus.ACTIVE,
      rules: validatedRules,
      createdBy,
      createdAt: new Date().toISOString(),
      metadata
    };

    const policyHash = canonicalHash({
      policyId: policyPayload.policyId,
      policyVersion: policyPayload.policyVersion,
      workspaceId: policyPayload.workspaceId,
      precedence: policyPayload.precedence,
      effectiveFrom: policyPayload.effectiveFrom,
      effectiveTo: policyPayload.effectiveTo,
      rules: policyPayload.rules
    });

    return deepFreeze({
      ...policyPayload,
      policyHash
    });
  }

  /**
   * Creates a new immutable Policy Version from an existing active policy.
   */
  static createNewVersion(existingPolicy, {
    newVersion,
    effectiveFrom,
    effectiveTo = null,
    rules = null,
    description = null,
    precedence = null,
    updatedBy = 'SYSTEM',
    metadata = {}
  }) {
    if (!existingPolicy || !existingPolicy.policyId) {
      throw new Error('Valid existingPolicy is required to create a new version');
    }

    if (!newVersion || !effectiveFrom) {
      throw new Error('newVersion and effectiveFrom are required');
    }

    if (existingPolicy.policyVersion === newVersion) {
      throw new Error(`New version ${newVersion} cannot match existing version`);
    }

    if (effectiveTo && new Date(effectiveFrom) > new Date(effectiveTo)) {
      throw new Error('effectiveFrom cannot be after effectiveTo');
    }

    const rulesToUse = rules || existingPolicy.rules;
    const validatedRules = rulesToUse.map((r, idx) => {
      const ruleObj = {
        ruleId: r.ruleId || `RULE-${idx + 1}`,
        ruleVersion: newVersion,
        policyId: existingPolicy.policyId,
        policyVersion: newVersion,
        ruleType: r.ruleType,
        description: r.description || `${r.ruleType || 'POLICY'} rule`,
        scope: r.scope || 'PORTFOLIO',
        targetKey: r.targetKey || null,
        threshold: r.threshold !== undefined ? r.threshold : null,
        operator: r.operator,
        severity: r.severity || 'HIGH',
        allowedValues: r.allowedValues || null,
        prohibitedValues: r.prohibitedValues || null,
        effectiveFrom: r.effectiveFrom || effectiveFrom,
        effectiveTo: r.effectiveTo || effectiveTo,
        source: r.source || 'IPS',
        createdBy: updatedBy
      };

      const validation = validateRuleSchema(ruleObj);
      if (!validation.valid) {
        throw new Error(`Rule validation failed for ${ruleObj.ruleId}: ${validation.error}`);
      }

      ruleObj.ruleHash = canonicalHash({
        ruleId: ruleObj.ruleId,
        ruleType: ruleObj.ruleType,
        targetKey: ruleObj.targetKey,
        threshold: ruleObj.threshold,
        operator: ruleObj.operator,
        severity: ruleObj.severity,
        allowedValues: ruleObj.allowedValues,
        prohibitedValues: ruleObj.prohibitedValues
      });

      return ruleObj;
    });

    const updatedPolicyPayload = {
      policyId: existingPolicy.policyId,
      policyVersion: newVersion,
      previousVersion: existingPolicy.policyVersion,
      previousPolicyHash: existingPolicy.policyHash,
      workspaceId: existingPolicy.workspaceId,
      name: existingPolicy.name,
      description: description || existingPolicy.description,
      precedence: precedence !== null ? precedence : existingPolicy.precedence,
      effectiveFrom: new Date(effectiveFrom).toISOString(),
      effectiveTo: effectiveTo ? new Date(effectiveTo).toISOString() : null,
      status: PolicyStatus.ACTIVE,
      rules: validatedRules,
      createdBy: updatedBy,
      createdAt: new Date().toISOString(),
      metadata: { ...existingPolicy.metadata, ...metadata }
    };

    const policyHash = canonicalHash({
      policyId: updatedPolicyPayload.policyId,
      policyVersion: updatedPolicyPayload.policyVersion,
      workspaceId: updatedPolicyPayload.workspaceId,
      precedence: updatedPolicyPayload.precedence,
      effectiveFrom: updatedPolicyPayload.effectiveFrom,
      effectiveTo: updatedPolicyPayload.effectiveTo,
      rules: updatedPolicyPayload.rules
    });

    return deepFreeze({
      ...updatedPolicyPayload,
      policyHash
    });
  }

  /**
   * Resolves the applicable policy version at a specific historical timestamp T0.
   */
  static resolvePolicyAtTimestamp(policyVersions = [], asOf) {
    if (!Array.isArray(policyVersions) || policyVersions.length === 0) {
      return null;
    }
    const targetDate = new Date(asOf || new Date());
    if (isNaN(targetDate.getTime())) {
      return null;
    }

    // Filter policies effective at asOf
    const effective = policyVersions.filter(p => {
      const from = new Date(p.effectiveFrom);
      const to = p.effectiveTo ? new Date(p.effectiveTo) : null;
      if (isNaN(from.getTime())) return false;
      if (targetDate < from) return false;
      if (to && targetDate > to) return false;
      return true;
    });

    if (effective.length === 0) return null;

    // Return the latest effective version
    return effective.sort((a, b) => new Date(b.effectiveFrom) - new Date(a.effectiveFrom))[0];
  }

  /**
   * Reconciles multiple applicable policies by hierarchical precedence.
   * Hard regulatory constraints always trump firm / portfolio mandates.
   */
  static reconcilePolicies(policies = []) {
    if (!Array.isArray(policies) || policies.length === 0) {
      return [];
    }

    // Sort by numerical precedence (lower number = higher priority)
    const sorted = [...policies].sort((a, b) => (a.precedence || 99) - (b.precedence || 99));

    // Consolidate rules, where higher precedence rules override or take priority
    const consolidatedRules = [];
    const seenRuleSignatures = new Set();

    for (const policy of sorted) {
      for (const rule of policy.rules || []) {
        const sig = `${rule.ruleType}::${rule.targetKey || '*'}`;
        if (!seenRuleSignatures.has(sig)) {
          seenRuleSignatures.add(sig);
          consolidatedRules.push({
            ...rule,
            originPolicyId: policy.policyId,
            originPolicyVersion: policy.policyVersion,
            precedence: policy.precedence
          });
        }
      }
    }

    return deepFreeze(consolidatedRules);
  }
}
