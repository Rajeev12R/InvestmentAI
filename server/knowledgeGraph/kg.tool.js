/**
 * server/knowledgeGraph/kg.tool.js
 * 
 * Phase 23: Read-Only Copilot Knowledge Graph Intelligence Tools
 * Enforces strict read-only execution without mutating graph facts, decisions, or theses.
 */

import { defaultKnowledgeGraphStore } from './kg.store.js';
import { defaultKnowledgeGraphTraversalEngine } from './kg.traversal.engine.js';
import { defaultKnowledgeGraphDependencyEngine } from './kg.dependency.engine.js';
import { defaultPortfolioCommonDriverEngine } from './kg.commonDriver.engine.js';
import { defaultSharedRiskEngine } from './kg.sharedRisk.engine.js';
import { defaultDecisionLineageEngine } from './kg.decisionLineage.engine.js';
import { defaultEntityResolutionEngine } from './kg.entityResolution.js';

export async function searchKnowledgeGraph(params = {}, context = {}) {
  const { tenantId = 'DEFAULT_TENANT', query } = params;
  const store = context.store || defaultKnowledgeGraphStore;
  const snap = store.getSnapshotAsOf(tenantId);
  const q = (query || '').toLowerCase();

  const matchingNodes = snap.nodes.filter(n => 
    n.nodeId.toLowerCase().includes(q) || (n.label && n.label.toLowerCase().includes(q))
  );

  return {
    tenantId,
    query,
    count: matchingNodes.length,
    results: matchingNodes.slice(0, 20)
  };
}

export async function explainRelationship(params = {}, context = {}) {
  const { tenantId = 'DEFAULT_TENANT', relationshipId } = params;
  const store = context.store || defaultKnowledgeGraphStore;
  const rel = store.getRelationship(tenantId, relationshipId);

  if (!rel) {
    return {
      relationshipId,
      isFound: false,
      explanation: 'Relationship not found in graph'
    };
  }

  return {
    relationshipId,
    isFound: true,
    relationship: rel,
    evidenceStatus: rel.status,
    provenance: rel.provenance,
    explanation: `Relationship ${rel.relationshipType} from ${rel.fromNodeId} to ${rel.toNodeId} is ${rel.status}`
  };
}

export async function traceDecision(params = {}, context = {}) {
  const { tenantId = 'DEFAULT_TENANT', decisionId } = params;
  const engine = context.engine || defaultDecisionLineageEngine;
  return engine.getDecisionLineage(tenantId, decisionId);
}

export async function traceFactImpact(params = {}, context = {}) {
  const { tenantId = 'DEFAULT_TENANT', factId } = params;
  const engine = context.engine || defaultKnowledgeGraphDependencyEngine;
  return engine.evaluateFactImpact(tenantId, factId);
}

export async function findCommonDrivers(params = {}, context = {}) {
  const { positions } = params;
  const engine = context.engine || defaultPortfolioCommonDriverEngine;
  return engine.calculateCommonDrivers(positions);
}

export async function findSharedRisks(params = {}, context = {}) {
  const { positions } = params;
  const engine = context.engine || defaultSharedRiskEngine;
  return engine.calculateSharedRisks(positions);
}

export async function explainThesisDependencies(params = {}, context = {}) {
  const { tenantId = 'DEFAULT_TENANT', thesisId } = params;
  const engine = context.engine || defaultDecisionLineageEngine;
  return engine.evaluateThesisDependencies(tenantId, thesisId);
}

export async function explainPortfolioConcentration(params = {}, context = {}) {
  const { positions } = params;
  const commonDrivers = defaultPortfolioCommonDriverEngine.calculateCommonDrivers(positions);
  const sharedRisks = defaultSharedRiskEngine.calculateSharedRisks(positions);

  return {
    commonDrivers,
    sharedRisks,
    summary: `Portfolio has ${commonDrivers.totalDriversCount} common drivers with HHI ${commonDrivers.driverHHI} and ${sharedRisks.totalSharedRisksCount} shared risk categories.`
  };
}
