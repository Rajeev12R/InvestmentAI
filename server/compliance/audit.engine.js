/**
 * Phase 16 — Institutional Compliance Audit Engine & Evidence Graph Builder
 * Creates verifiable, traceable causal evidence graphs connecting compliance evaluations
 * to specific policy versions, truth inputs, calculations, exceptions, and audit events.
 */

import { canonicalHash, deepFreeze } from './compliance.types.js';
import { auditRepository } from '../governance/audit.repository.js';

export class ComplianceAuditEngine {
  /**
   * Generates a fully traceable audit evidence graph for a compliance evaluation.
   */
  static buildEvidenceGraph({
    evaluation,
    policy,
    portfolioState = {},
    activeExceptions = []
  }) {
    if (!evaluation || !evaluation.complianceId) {
      throw new Error('Valid evaluation object is required to build evidence graph');
    }

    const nodes = [];
    const edges = [];

    // Root Evaluation Node
    const evalNodeId = `node:eval:${evaluation.complianceId}`;
    nodes.push({
      id: evalNodeId,
      type: 'COMPLIANCE_EVALUATION',
      label: `Compliance Evaluation (${evaluation.status})`,
      metadata: {
        status: evaluation.status,
        overallSeverity: evaluation.overallSeverity,
        asOf: evaluation.asOf,
        evaluationHash: evaluation.evaluationHash
      }
    });

    // Policy Node
    const policyNodeId = `node:policy:${policy?.policyId || evaluation.policyId}:${policy?.policyVersion || evaluation.policyVersion}`;
    nodes.push({
      id: policyNodeId,
      type: 'POLICY_VERSION',
      label: `Policy ${policy?.name || evaluation.policyId} (v${evaluation.policyVersion})`,
      metadata: {
        policyId: evaluation.policyId,
        policyVersion: evaluation.policyVersion,
        policyHash: evaluation.policyHash
      }
    });

    edges.push({
      source: evalNodeId,
      target: policyNodeId,
      relation: 'GOVERNED_BY'
    });

    // Rule Nodes
    for (const ruleRes of evaluation.ruleResults || []) {
      const ruleNodeId = `node:rule:${ruleRes.ruleId}`;
      nodes.push({
        id: ruleNodeId,
        type: 'POLICY_RULE',
        label: `Rule ${ruleRes.ruleId} (${ruleRes.ruleType}): ${ruleRes.status}`,
        metadata: {
          ruleType: ruleRes.ruleType,
          threshold: ruleRes.threshold,
          actualValue: ruleRes.actualValue,
          variance: ruleRes.variance,
          status: ruleRes.status,
          severity: ruleRes.severity
        }
      });

      edges.push({
        source: policyNodeId,
        target: ruleNodeId,
        relation: 'CONTAINS_RULE'
      });

      edges.push({
        source: evalNodeId,
        target: ruleNodeId,
        relation: 'EVALUATED_RULE',
        status: ruleRes.status
      });

      // If waived by an exception, add exception node
      const waiver = evaluation.waivedBreaches?.find(w => w.ruleId === ruleRes.ruleId);
      if (waiver) {
        const excNodeId = `node:exception:${waiver.exceptionId}`;
        nodes.push({
          id: excNodeId,
          type: 'COMPLIANCE_EXCEPTION',
          label: `Exception ${waiver.exceptionId} (Approved by ${waiver.approvedBy})`,
          metadata: {
            exceptionId: waiver.exceptionId,
            approvedBy: waiver.approvedBy,
            waivedUntil: waiver.waivedUntil
          }
        });

        edges.push({
          source: ruleNodeId,
          target: excNodeId,
          relation: 'WAIVED_BY'
        });
      }
    }

    // Input Snapshot Node
    const inputNodeId = `node:input:${evaluation.portfolioId}:${evaluation.asOf}`;
    nodes.push({
      id: inputNodeId,
      type: 'PORTFOLIO_INPUT_SNAPSHOT',
      label: `Portfolio Snapshot (${evaluation.portfolioId})`,
      metadata: {
        portfolioId: evaluation.portfolioId,
        holdingCount: portfolioState.holdings?.length || 0,
        asOf: evaluation.asOf
      }
    });

    edges.push({
      source: evalNodeId,
      target: inputNodeId,
      relation: 'CONSUMED_INPUT'
    });

    const graphPayload = {
      graphId: `EVD-GRAPH-${evaluation.complianceId}`,
      evaluationId: evaluation.complianceId,
      portfolioId: evaluation.portfolioId,
      workspaceId: evaluation.workspaceId,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      nodes,
      edges,
      generatedAt: new Date().toISOString()
    };

    const graphHash = canonicalHash({
      graphId: graphPayload.graphId,
      evaluationId: graphPayload.evaluationId,
      nodes: graphPayload.nodes,
      edges: graphPayload.edges
    });

    return deepFreeze({
      ...graphPayload,
      graphHash
    });
  }

  /**
   * Logs a compliance event to the persistent Phase 9 audit trail.
   */
  static logComplianceEvent({
    workspaceId,
    actorId = 'SYSTEM',
    action,
    portfolioId,
    evaluationId = null,
    metadata = {}
  }) {
    return auditRepository.appendEvent({
      workspaceId,
      actorId,
      actorType: 'SYSTEM',
      action: action || 'COMPLIANCE_EVALUATION',
      resourceType: 'PORTFOLIO_COMPLIANCE',
      resourceId: portfolioId,
      result: 'SUCCESS',
      metadata: {
        evaluationId,
        isTradeExecuted: false, // Invariant: no broker execution
        ...metadata
      }
    });
  }
}
