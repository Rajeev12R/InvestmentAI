/**
 * server/knowledgeGraph/kg.dependency.engine.js
 * 
 * Phase 23: Cross-Domain Dependency & Restatement Impact Propagation Engine
 * Connects Phase 11 facts, Phase 21 earnings events, and Phase 22 macro regimes to downstream decisions.
 * Enforces: Restatements flag downstream objects as potentially stale without altering historical records.
 */

import { defaultKnowledgeGraphStore } from './kg.store.js';
import { KGImpactCategory, deepFreeze } from './kg.types.js';

export class KnowledgeGraphDependencyEngine {
  constructor(store = defaultKnowledgeGraphStore) {
    this.store = store;
  }

  /**
   * Traverses fundamental dependency chain: Fact -> Forecast -> Valuation -> Decision -> Thesis
   */
  evaluateFactImpact(tenantId, factId, asOfTimestamp = new Date().toISOString()) {
    const snapshot = this.store.getSnapshotAsOf(tenantId, asOfTimestamp);
    const nodesMap = new Map(snapshot.nodes.map(n => [n.nodeId, n]));

    const factNode = nodesMap.get(factId);
    if (!factNode) {
      return deepFreeze({
        factId,
        isFound: false,
        affectedDownstreamCount: 0,
        affectedNodes: []
      });
    }

    const affected = [];
    const queue = [{ nodeId: factId, depth: 0, path: [factId] }];
    const visited = new Set([factId]);

    while (queue.length > 0) {
      const current = queue.shift();
      if (current.depth >= 6) continue;

      for (const rel of snapshot.relationships) {
        if (rel.fromNodeId === current.nodeId && nodesMap.has(rel.toNodeId)) {
          const targetNode = nodesMap.get(rel.toNodeId);
          if (!visited.has(rel.toNodeId)) {
            visited.add(rel.toNodeId);
            const path = [...current.path, rel.toNodeId];
            affected.push({
              nodeId: targetNode.nodeId,
              nodeType: targetNode.nodeType,
              label: targetNode.label,
              impactCategory: this._determineImpactCategory(targetNode.nodeType),
              traversalDepth: current.depth + 1,
              path,
              relationshipType: rel.relationshipType
            });
            queue.push({ nodeId: rel.toNodeId, depth: current.depth + 1, path });
          }
        }
      }
    }

    return deepFreeze({
      factId,
      isFound: true,
      affectedDownstreamCount: affected.length,
      affectedNodes: affected,
      asOfTimestamp
    });
  }

  /**
   * Propagates a financial fact restatement across all downstream models, theses, and decisions
   */
  propagateFactRestatement(tenantId, factId, restatementPayload = {}) {
    const impact = this.evaluateFactImpact(tenantId, factId);

    const staleItems = impact.affectedNodes.map(item => ({
      ...item,
      staleStatus: 'POTENTIAL_STALENESS',
      reason: `Upstream fact ${factId} restated with delta: ${restatementPayload.delta ?? 'REVISED'}`,
      requiresReview: item.nodeType === 'DECISION' || item.nodeType === 'THESIS' || item.nodeType === 'VALUATION',
      historicalDecisionContextPreserved: true
    }));

    return deepFreeze({
      tenantId,
      restatedFactId: factId,
      restatementTimestamp: new Date().toISOString(),
      affectedDownstreamCount: staleItems.length,
      staleItems,
      historicalAuditInvariant: 'HISTORICAL_DECISION_CONTEXT_PRESERVED'
    });
  }

  _determineImpactCategory(nodeType) {
    switch (nodeType) {
      case 'THESIS': return KGImpactCategory.THESIS_IMPACT;
      case 'DECISION': return KGImpactCategory.DECISION_IMPACT;
      case 'PORTFOLIO':
      case 'POSITION': return KGImpactCategory.PORTFOLIO_IMPACT;
      case 'COMPLIANCE_RULE': return KGImpactCategory.COMPLIANCE_IMPACT;
      case 'VALUATION':
      case 'FORECAST':
      case 'RISK': return KGImpactCategory.POTENTIAL_STALENESS;
      default: return KGImpactCategory.INFORMATIONAL;
    }
  }
}

export const defaultKnowledgeGraphDependencyEngine = new KnowledgeGraphDependencyEngine();
