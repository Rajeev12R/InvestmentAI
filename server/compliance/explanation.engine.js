/**
 * Phase 16 — Institutional Compliance Explanation Engine
 * Generates structured causal DAG explanations for compliance outcomes,
 * and powers read-only Copilot natural-language insights with strict evidence grounding.
 */

import { ComplianceStatus, canonicalHash, deepFreeze } from './compliance.types.js';

export class ComplianceExplanationEngine {
  /**
   * Generates a DAG explanation for a compliance evaluation.
   */
  static generateExplanationDAG(evaluation) {
    if (!evaluation || !evaluation.complianceId) {
      throw new Error('Valid evaluation is required to generate explanation DAG');
    }

    const items = (evaluation.ruleResults || []).map(r => {
      const isBreach = r.status === ComplianceStatus.BREACH;
      const isWarning = r.status === ComplianceStatus.WARNING;
      const isPass = r.status === ComplianceStatus.PASS;

      return {
        ruleId: r.ruleId,
        ruleType: r.ruleType,
        target: r.targetKey || 'PORTFOLIO',
        status: r.status,
        severity: r.severity,
        actualValue: r.actualValue,
        threshold: r.threshold,
        variance: r.variance,
        cause: isBreach
          ? `Breach caused by actual value (${r.actualValue}) violating ${r.operator} ${r.threshold} limit.`
          : isWarning
          ? `Warning triggered: approaching limit boundary.`
          : isPass
          ? 'Rule satisfied within mandated policy threshold.'
          : 'Evaluation incomplete due to missing data or conflict.',
        evidenceReference: {
          ruleHash: r.calculation?.ruleHash || null,
          evaluatedAt: r.calculation?.evaluatedAt || evaluation.asOf
        }
      };
    });

    const summaryText = evaluation.status === ComplianceStatus.PASS
      ? `Portfolio is fully COMPLIANT with ${evaluation.passCount} of ${evaluation.ruleCount} rules passed.`
      : evaluation.status === ComplianceStatus.WARNING
      ? `Portfolio is COMPLIANT WITH WARNINGS (${evaluation.warningCount} warning(s)).`
      : evaluation.status === ComplianceStatus.BREACH
      ? `Portfolio is NON-COMPLIANT due to ${evaluation.breachCount} active breach(es) in policy ${evaluation.policyId} (v${evaluation.policyVersion}).`
      : `Portfolio compliance is ${evaluation.status} (${evaluation.insufficientDataCount} rule(s) have insufficient data).`;

    const dag = {
      dagId: `DAG-EXP-${evaluation.complianceId}`,
      evaluationId: evaluation.complianceId,
      overallStatus: evaluation.status,
      summaryText,
      explanations: items,
      generatedAt: new Date().toISOString()
    };

    return deepFreeze({
      ...dag,
      dagHash: canonicalHash(dag)
    });
  }

  /**
   * Generates read-only Copilot answers grounded strictly in evaluation facts.
   */
  static answerComplianceQuery(evaluation, queryType, params = {}) {
    if (!evaluation) {
      return { answer: 'No compliance evaluation data available.', evidenceIds: [] };
    }

    switch (queryType) {
      case 'WHY_NON_COMPLIANT': {
        if (evaluation.status === ComplianceStatus.PASS) {
          return {
            answer: `Portfolio ${evaluation.portfolioId} is fully compliant under Policy ${evaluation.policyId} (v${evaluation.policyVersion}).`,
            evidenceIds: [evaluation.evaluationHash]
          };
        }
        const breaches = evaluation.breaches || [];
        const breachDescriptions = breaches.map(b => 
          `- ${b.ruleType} (${b.ruleId}): Actual ${b.actualValue} vs Limit ${b.threshold} (${b.explanation})`
        ).join('\n');
        return {
          answer: `Portfolio ${evaluation.portfolioId} is in ${evaluation.status} status with ${breaches.length} active breach(es):\n${breachDescriptions}`,
          evidenceIds: breaches.map(b => b.ruleId)
        };
      }

      case 'ACTIVE_EXCEPTIONS': {
        const waivers = evaluation.waivedBreaches || [];
        if (waivers.length === 0) {
          return { answer: 'There are no active exceptions or waivers applied to this evaluation.', evidenceIds: [] };
        }
        const waiverDetails = waivers.map(w => 
          `- Exception ${w.exceptionId} for ${w.ruleType} (${w.ruleId}): Approved by ${w.approvedBy} until ${w.waivedUntil}`
        ).join('\n');
        return {
          answer: `Active waivers (${waivers.length}):\n${waiverDetails}`,
          evidenceIds: waivers.map(w => w.exceptionId)
        };
      }

      case 'REMEDIATION_REQUIRED': {
        const remediation = evaluation.remediation;
        if (!remediation || !remediation.remedialActions || remediation.remedialActions.length === 0) {
          return { answer: 'No remedial actions required. Portfolio is within acceptable parameters.', evidenceIds: [] };
        }
        const actions = remediation.remedialActions.map(a => 
          `- [${a.severity}] ${a.action}: ${a.rationale}`
        ).join('\n');
        return {
          answer: `Deterministic remediation proposal (${remediation.actionCount} action(s)):\n${actions}\n\nNote: These proposals require human approval and do not execute automatically.`,
          evidenceIds: [remediation.planHash]
        };
      }

      default:
        return {
          answer: `Compliance evaluation for ${evaluation.portfolioId}: Status = ${evaluation.status}, Policy = ${evaluation.policyId} (v${evaluation.policyVersion}).`,
          evidenceIds: [evaluation.evaluationHash]
        };
    }
  }
}
