/**
 * Phase 16 — Institutional Compliance Intelligence Engine
 * Orchestrates pre-action & post-action deterministic compliance evaluations,
 * validates against active policy versions, reconciles active exceptions,
 * and derives definitive compliance statuses.
 */

import { ComplianceStatus, SeverityLevel, EvaluationPhase, canonicalHash, deepFreeze } from './compliance.types.js';
import { ComplianceInputValidator } from './inputValidator.js';
import { RuleEngine } from './rule.engine.js';
import { PolicyEngine } from './policy.engine.js';
import { ExceptionEngine } from './exception.engine.js';
import { RemediationEngine } from './remediation.engine.js';
import { COMPLIANCE_POLICY_CONFIG_V1 } from './compliance.config.js';

export class ComplianceEngine {
  /**
   * Evaluates compliance of a portfolio or proposed action.
   */
  static evaluateCompliance({
    workspaceId,
    portfolioId,
    asOf = new Date().toISOString(),
    phase = EvaluationPhase.POST_ACTION,
    policy = null,
    policyVersions = [],
    activeExceptions = [],
    portfolioState = {},
    config = COMPLIANCE_POLICY_CONFIG_V1
  }) {
    // 1. Boundary Input Validation
    const validation = ComplianceInputValidator.validateEvaluationInput({
      workspaceId,
      portfolioId,
      asOf,
      policy: policy || (policyVersions.length > 0 ? policyVersions[0] : null),
      ...portfolioState
    });

    if (!validation.valid) {
      return deepFreeze({
        complianceId: `CMP-${Date.now()}`,
        workspaceId,
        portfolioId,
        asOf,
        phase,
        status: validation.status || ComplianceStatus.INVALID_INPUT,
        overallSeverity: SeverityLevel.CRITICAL,
        error: validation.error,
        ruleResults: [],
        breaches: [],
        waivedBreaches: [],
        remediation: null,
        evaluatedAt: new Date().toISOString(),
        isCompliant: false
      });
    }

    // 2. Resolve Effective Policy Version at timestamp T0
    let effectivePolicy = policy;
    if (!effectivePolicy && policyVersions.length > 0) {
      effectivePolicy = PolicyEngine.resolvePolicyAtTimestamp(policyVersions, asOf);
    }

    if (!effectivePolicy) {
      return deepFreeze({
        complianceId: `CMP-${Date.now()}`,
        workspaceId,
        portfolioId,
        asOf,
        phase,
        status: ComplianceStatus.POLICY_NOT_FOUND,
        overallSeverity: SeverityLevel.CRITICAL,
        error: 'No active policy found effective for the evaluation timestamp',
        ruleResults: [],
        breaches: [],
        waivedBreaches: [],
        remediation: null,
        evaluatedAt: new Date().toISOString(),
        isCompliant: false
      });
    }

    // 3. Evaluate each rule in policy
    const rules = effectivePolicy.rules || [];
    const ruleResults = [];
    const activeBreaches = [];
    const waivedBreaches = [];
    let hasInsufficientData = false;
    let hasConflict = false;
    let hasWarning = false;
    let maxSeverity = SeverityLevel.INFO;

    const severityRanks = {
      [SeverityLevel.INFO]: 1,
      [SeverityLevel.LOW]: 2,
      [SeverityLevel.MEDIUM]: 3,
      [SeverityLevel.HIGH]: 4,
      [SeverityLevel.CRITICAL]: 5
    };

    const updateMaxSeverity = (sev) => {
      if ((severityRanks[sev] || 0) > (severityRanks[maxSeverity] || 0)) {
        maxSeverity = sev;
      }
    };

    for (const rule of rules) {
      const result = RuleEngine.evaluateRule(rule, { ...portfolioState, asOf }, config);
      ruleResults.push(result);

      if (result.status === ComplianceStatus.INSUFFICIENT_DATA || result.status === ComplianceStatus.UNAVAILABLE) {
        hasInsufficientData = true;
        updateMaxSeverity(result.severity);
      } else if (result.status === ComplianceStatus.CONFLICT) {
        hasConflict = true;
        updateMaxSeverity(result.severity);
      } else if (result.status === ComplianceStatus.WARNING) {
        hasWarning = true;
        updateMaxSeverity(result.severity);
      } else if (result.status === ComplianceStatus.BREACH) {
        // Check if there is an active valid exception for this rule at asOf
        const matchingException = activeExceptions.find(e => 
          ExceptionEngine.isExceptionValidAtTimestamp(e, rule.ruleId, asOf)
        );

        if (matchingException) {
          waivedBreaches.push({
            ruleId: rule.ruleId,
            ruleType: rule.ruleType,
            severity: rule.severity,
            variance: result.variance,
            actualValue: result.actualValue,
            threshold: result.threshold,
            exceptionId: matchingException.exceptionId,
            approvedBy: matchingException.approvedBy,
            waivedUntil: matchingException.expiresAt
          });
        } else {
          activeBreaches.push(result);
          updateMaxSeverity(result.severity);
        }
      }
    }

    // 4. Derive overall compliance status
    let overallStatus = ComplianceStatus.PASS;
    if (activeBreaches.length > 0) {
      overallStatus = ComplianceStatus.BREACH;
    } else if (hasConflict) {
      overallStatus = ComplianceStatus.CONFLICT;
    } else if (hasInsufficientData) {
      overallStatus = ComplianceStatus.INSUFFICIENT_DATA;
    } else if (hasWarning) {
      overallStatus = ComplianceStatus.WARNING;
    }

    const isCompliant = overallStatus === ComplianceStatus.PASS || overallStatus === ComplianceStatus.WARNING;

    // 5. Generate Remediation Plan if there are active breaches or warnings
    let remediation = null;
    if (activeBreaches.length > 0 || hasWarning) {
      remediation = RemediationEngine.generateRemediationPlan({
        workspaceId,
        portfolioId,
        ruleResults,
        asOf
      });
    }

    const rawHashInput = {
      workspaceId,
      portfolioId,
      asOf,
      phase,
      policyHash: effectivePolicy.policyHash,
      status: overallStatus,
      isCompliant,
      overallSeverity: maxSeverity,
      ruleResults: ruleResults.map(r => ({
        ruleId: r.ruleId,
        ruleType: r.ruleType,
        actualValue: r.actualValue,
        status: r.status,
        evaluationHash: r.evaluationHash
      })),
      breachCount: activeBreaches.length,
      passCount: ruleResults.filter(r => r.status === ComplianceStatus.PASS).length,
      waivedCount: waivedBreaches.length
    };

    const evaluationHash = canonicalHash(rawHashInput);
    const complianceId = `CMP-${portfolioId}-${evaluationHash.substring(0, 16)}`;

    const compliancePayload = {
      complianceId,
      workspaceId,
      portfolioId,
      asOf,
      phase,
      status: overallStatus,
      isCompliant,
      overallSeverity: maxSeverity,
      policyId: effectivePolicy.policyId,
      policyVersion: effectivePolicy.policyVersion,
      policyHash: effectivePolicy.policyHash,
      ruleCount: rules.length,
      passCount: ruleResults.filter(r => r.status === ComplianceStatus.PASS).length,
      warningCount: ruleResults.filter(r => r.status === ComplianceStatus.WARNING).length,
      breachCount: activeBreaches.length,
      waivedCount: waivedBreaches.length,
      insufficientDataCount: ruleResults.filter(r => r.status === ComplianceStatus.INSUFFICIENT_DATA || r.status === ComplianceStatus.UNAVAILABLE).length,
      ruleResults,
      breaches: activeBreaches,
      waivedBreaches,
      remediation,
      evaluatedAt: asOf,
      evaluationHash
    };

    return deepFreeze(compliancePayload);
  }
}
