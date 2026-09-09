/**
 * server/knowledgeGraph/kg.quality.engine.js
 * 
 * Phase 23: Knowledge Graph Data Quality & Integrity Engine
 * Computes deterministic data quality metrics (provenance coverage, verification rate, orphan nodes, conflicted edges).
 */

import { defaultKnowledgeGraphStore } from './kg.store.js';
import { KGRelationshipStatus, deepFreeze } from './kg.types.js';

export class KnowledgeGraphQualityEngine {
  constructor(store = defaultKnowledgeGraphStore) {
    this.store = store;
  }

  /**
   * Evaluates comprehensive graph data quality and integrity scores
   */
  evaluateGraphQuality(tenantId, asOfTimestamp = new Date().toISOString()) {
    const snapshot = this.store.getSnapshotAsOf(tenantId, asOfTimestamp);
    const { nodes, relationships } = snapshot;

    const totalNodes = nodes.length;
    const totalRelationships = relationships.length;

    if (totalNodes === 0) {
      return deepFreeze({
        tenantId,
        asOfTimestamp,
        totalNodes: 0,
        totalRelationships: 0,
        provenanceCoveragePct: 100,
        verificationCoveragePct: 100,
        orphanNodeCount: 0,
        conflictedRelationshipCount: 0,
        graphHealthScore: 100
      });
    }

    // Node degree map for orphan detection
    const nodeDegree = new Map(nodes.map(n => [n.nodeId, 0]));
    let nodesWithTemporal = 0;

    for (const n of nodes) {
      if (n.effectiveFrom && new Date(n.effectiveFrom).toString() !== 'Invalid Date') {
        nodesWithTemporal++;
      }
    }

    let verifiedCount = 0;
    let provenanceCount = 0;
    let conflictedCount = 0;
    let staleCount = 0;

    for (const rel of relationships) {
      if (nodeDegree.has(rel.fromNodeId)) nodeDegree.set(rel.fromNodeId, nodeDegree.get(rel.fromNodeId) + 1);
      if (nodeDegree.has(rel.toNodeId)) nodeDegree.set(rel.toNodeId, nodeDegree.get(rel.toNodeId) + 1);

      if (rel.status === KGRelationshipStatus.VERIFIED || rel.status === KGRelationshipStatus.VALIDATED) {
        verifiedCount++;
      }
      if (rel.provenance && Array.isArray(rel.provenance.sourceEvidenceIds) && rel.provenance.sourceEvidenceIds.length > 0) {
        provenanceCount++;
      }
      if (rel.status === KGRelationshipStatus.CONFLICTED) {
        conflictedCount++;
      }
      if (rel.status === KGRelationshipStatus.EXPIRED) {
        staleCount++;
      }
    }

    let orphanCount = 0;
    for (const degree of nodeDegree.values()) {
      if (degree === 0) orphanCount++;
    }

    const provenanceCoveragePct = totalRelationships > 0 ? (provenanceCount / totalRelationships) * 100 : 100;
    const verificationCoveragePct = totalRelationships > 0 ? (verifiedCount / totalRelationships) * 100 : 100;
    const temporalCompletenessPct = (nodesWithTemporal / totalNodes) * 100;

    // Score calculation
    let healthScore = 100;
    if (provenanceCoveragePct < 80) healthScore -= 20;
    if (orphanCount > 0) healthScore -= Math.min(25, orphanCount * 2);
    if (conflictedCount > 0) healthScore -= Math.min(30, conflictedCount * 5);

    const graphHealthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

    return deepFreeze({
      tenantId,
      asOfTimestamp,
      totalNodes,
      totalRelationships,
      provenanceCoveragePct: Math.round(provenanceCoveragePct * 100) / 100,
      verificationCoveragePct: Math.round(verificationCoveragePct * 100) / 100,
      temporalCompletenessPct: Math.round(temporalCompletenessPct * 100) / 100,
      orphanNodeCount: orphanCount,
      conflictedRelationshipCount: conflictedCount,
      staleRelationshipCount: staleCount,
      graphHealthScore
    });
  }
}

export const defaultKnowledgeGraphQualityEngine = new KnowledgeGraphQualityEngine();
