/**
 * server/knowledgeGraph/kg.traversal.engine.js
 * 
 * Phase 23: Deterministic Graph Traversal, Neighborhood, & Bounded Path Engine
 * Prevents graph explosions, handles cycles gracefully, and respects point-in-time constraints.
 */

import { defaultKnowledgeGraphStore } from './kg.store.js';
import { deepFreeze } from './kg.types.js';

export class KnowledgeGraphTraversalEngine {
  constructor(store = defaultKnowledgeGraphStore) {
    this.store = store;
  }

  /**
   * Retrieves k-hop entity neighborhood with cycle protection and bounded depth
   */
  getNodeNeighborhood(tenantId, nodeId, maxDepth = 2, asOfTimestamp = new Date().toISOString()) {
    const depthLimit = Math.max(1, Math.min(6, maxDepth));
    const snapshot = this.store.getSnapshotAsOf(tenantId, asOfTimestamp);

    const nodesMap = new Map(snapshot.nodes.map(n => [n.nodeId, n]));
    const targetNode = nodesMap.get(nodeId);

    if (!targetNode) {
      return deepFreeze({
        rootNodeId: nodeId,
        asOfTimestamp,
        isFound: false,
        nodes: [],
        relationships: [],
        depthTraversed: 0
      });
    }

    const visitedNodes = new Set([nodeId]);
    const collectedRels = new Map();
    let currentFrontier = new Set([nodeId]);
    let depthTraversed = 0;

    for (let d = 1; d <= depthLimit; d++) {
      if (currentFrontier.size === 0) break;
      const nextFrontier = new Set();
      depthTraversed = d;

      for (const currentId of currentFrontier) {
        for (const rel of snapshot.relationships) {
          let neighborId = null;
          if (rel.fromNodeId === currentId) {
            neighborId = rel.toNodeId;
          } else if (rel.toNodeId === currentId) {
            neighborId = rel.fromNodeId;
          }

          if (neighborId && nodesMap.has(neighborId)) {
            collectedRels.set(rel.relationshipId, rel);
            if (!visitedNodes.has(neighborId)) {
              visitedNodes.add(neighborId);
              nextFrontier.add(neighborId);
            }
          }
        }
      }
      currentFrontier = nextFrontier;
      if (visitedNodes.size >= 100) break; // Maximum nodes safety limit
    }

    const resultNodes = Array.from(visitedNodes).map(id => nodesMap.get(id)).filter(Boolean);
    const resultRels = Array.from(collectedRels.values());

    return deepFreeze({
      rootNodeId: nodeId,
      asOfTimestamp,
      isFound: true,
      depthTraversed,
      nodeCount: resultNodes.length,
      relationshipCount: resultRels.length,
      nodes: resultNodes,
      relationships: resultRels
    });
  }

  /**
   * Traverses upstream incoming dependencies
   */
  getUpstreamDependencies(tenantId, nodeId, maxDepth = 3, asOfTimestamp = new Date().toISOString()) {
    const depthLimit = Math.max(1, Math.min(6, maxDepth));
    const snapshot = this.store.getSnapshotAsOf(tenantId, asOfTimestamp);
    const nodesMap = new Map(snapshot.nodes.map(n => [n.nodeId, n]));

    const visitedNodes = new Set([nodeId]);
    const collectedRels = new Map();
    let currentFrontier = new Set([nodeId]);

    for (let d = 1; d <= depthLimit; d++) {
      if (currentFrontier.size === 0) break;
      const nextFrontier = new Set();

      for (const curr of currentFrontier) {
        for (const rel of snapshot.relationships) {
          if (rel.toNodeId === curr && nodesMap.has(rel.fromNodeId)) {
            collectedRels.set(rel.relationshipId, rel);
            if (!visitedNodes.has(rel.fromNodeId)) {
              visitedNodes.add(rel.fromNodeId);
              nextFrontier.add(rel.fromNodeId);
            }
          }
        }
      }
      currentFrontier = nextFrontier;
    }

    return deepFreeze({
      targetNodeId: nodeId,
      direction: 'UPSTREAM',
      asOfTimestamp,
      dependencies: Array.from(visitedNodes).map(id => nodesMap.get(id)).filter(Boolean),
      relationships: Array.from(collectedRels.values())
    });
  }

  /**
   * Traverses downstream outgoing dependencies
   */
  getDownstreamDependencies(tenantId, nodeId, maxDepth = 3, asOfTimestamp = new Date().toISOString()) {
    const depthLimit = Math.max(1, Math.min(6, maxDepth));
    const snapshot = this.store.getSnapshotAsOf(tenantId, asOfTimestamp);
    const nodesMap = new Map(snapshot.nodes.map(n => [n.nodeId, n]));

    const visitedNodes = new Set([nodeId]);
    const collectedRels = new Map();
    let currentFrontier = new Set([nodeId]);

    for (let d = 1; d <= depthLimit; d++) {
      if (currentFrontier.size === 0) break;
      const nextFrontier = new Set();

      for (const curr of currentFrontier) {
        for (const rel of snapshot.relationships) {
          if (rel.fromNodeId === curr && nodesMap.has(rel.toNodeId)) {
            collectedRels.set(rel.relationshipId, rel);
            if (!visitedNodes.has(rel.toNodeId)) {
              visitedNodes.add(rel.toNodeId);
              nextFrontier.add(rel.toNodeId);
            }
          }
        }
      }
      currentFrontier = nextFrontier;
    }

    return deepFreeze({
      targetNodeId: nodeId,
      direction: 'DOWNSTREAM',
      asOfTimestamp,
      impactedNodes: Array.from(visitedNodes).map(id => nodesMap.get(id)).filter(Boolean),
      relationships: Array.from(collectedRels.values())
    });
  }
}

export const defaultKnowledgeGraphTraversalEngine = new KnowledgeGraphTraversalEngine();
