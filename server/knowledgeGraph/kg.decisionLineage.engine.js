/**
 * server/knowledgeGraph/kg.decisionLineage.engine.js
 * 
 * Phase 23: Decision Lineage & Thesis Dependency Engine
 * Provides bidirectional audit tracing: Decision -> Thesis -> Driver -> Fact -> Source and reverse.
 */

import { defaultKnowledgeGraphStore } from './kg.store.js';
import { deepFreeze } from './kg.types.js';

export class DecisionLineageEngine {
  constructor(store = defaultKnowledgeGraphStore) {
    this.store = store;
  }

  /**
   * Traces complete forward audit lineage for an institutional investment decision
   */
  getDecisionLineage(tenantId, decisionId, asOfTimestamp = new Date().toISOString()) {
    const snapshot = this.store.getSnapshotAsOf(tenantId, asOfTimestamp);
    const nodesMap = new Map(snapshot.nodes.map(n => [n.nodeId, n]));

    const decisionNode = nodesMap.get(decisionId);
    if (!decisionNode) {
      return deepFreeze({
        decisionId,
        isFound: false,
        lineagePath: []
      });
    }

    const lineageNodes = [decisionNode];
    const evidenceChain = [];

    // Find all outgoing/incoming connected thesis, facts, sources, drivers
    for (const rel of snapshot.relationships) {
      if (rel.fromNodeId === decisionId || rel.toNodeId === decisionId) {
        const otherId = rel.fromNodeId === decisionId ? rel.toNodeId : rel.fromNodeId;
        const otherNode = nodesMap.get(otherId);
        if (otherNode) {
          lineageNodes.push(otherNode);
          evidenceChain.push({
            relationshipType: rel.relationshipType,
            status: rel.status,
            connectedNode: otherNode,
            provenance: rel.provenance
          });
        }
      }
    }

    return deepFreeze({
      decisionId,
      isFound: true,
      decisionType: decisionNode.properties?.decisionType || 'ALLOCATION',
      effectiveTimestamp: decisionNode.effectiveFrom,
      lineageNodes,
      evidenceChain,
      asOfTimestamp
    });
  }

  /**
   * Evaluates investment thesis dependency status against latest observations
   */
  evaluateThesisDependencies(tenantId, thesisId, asOfTimestamp = new Date().toISOString()) {
    const snapshot = this.store.getSnapshotAsOf(tenantId, asOfTimestamp);
    const nodesMap = new Map(snapshot.nodes.map(n => [n.nodeId, n]));

    const thesisNode = nodesMap.get(thesisId);
    if (!thesisNode) {
      return deepFreeze({
        thesisId,
        isFound: false,
        status: 'UNAVAILABLE'
      });
    }

    const supportingFacts = [];
    const contradictoryFacts = [];
    const activeDrivers = [];

    for (const rel of snapshot.relationships) {
      if (rel.toNodeId === thesisId || rel.fromNodeId === thesisId) {
        const otherId = rel.toNodeId === thesisId ? rel.fromNodeId : rel.toNodeId;
        const node = nodesMap.get(otherId);
        if (node) {
          if (rel.relationshipType === 'FACT_SUPPORTS_THESIS') {
            supportingFacts.push(node);
          } else if (rel.relationshipType === 'EXPECTED_DRIVER_SUPPORTS_THESIS') {
            activeDrivers.push(node);
          } else if (rel.relationshipType === 'EVENT_CHANGED_THESIS') {
            contradictoryFacts.push(node);
          }
        }
      }
    }

    let thesisHealth = 'HEALTHY';
    if (contradictoryFacts.length > 0) {
      thesisHealth = 'POTENTIALLY_INVALIDATED';
    } else if (supportingFacts.length === 0 && activeDrivers.length === 0) {
      thesisHealth = 'POTENTIAL_STALENESS';
    }

    return deepFreeze({
      thesisId,
      isFound: true,
      thesisHealth,
      supportingFactsCount: supportingFacts.length,
      contradictoryFactsCount: contradictoryFacts.length,
      activeDriversCount: activeDrivers.length,
      supportingFacts,
      contradictoryFacts,
      activeDrivers,
      asOfTimestamp
    });
  }
}

export const defaultDecisionLineageEngine = new DecisionLineageEngine();
