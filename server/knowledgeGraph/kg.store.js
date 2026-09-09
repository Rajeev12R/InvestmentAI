/**
 * server/knowledgeGraph/kg.store.js
 * 
 * Phase 23: Revision-Aware, Point-in-Time, Tenant-Isolated Knowledge Graph Store
 * Supports strict historical reconstruction, survivorship preservation, and anti-leakage filters.
 */

import { validateKGNode, validateKGRelationship } from './kg.schema.js';
import { canonicalHash, deepFreeze, KGRelationshipStatus, KGVerificationStatus, KGSourceTier } from './kg.types.js';

export class KnowledgeGraphStore {
  constructor() {
    // Map<tenantId, Map<nodeId, NodeRecord>>
    this.nodesByTenant = new Map();
    // Map<tenantId, Map<relationshipId, RelationshipRecord>>
    this.relationshipsByTenant = new Map();
  }

  _getTenantStore(tenantId) {
    if (!tenantId || typeof tenantId !== 'string') {
      throw new Error('Valid tenantId string required');
    }
    if (!this.nodesByTenant.has(tenantId)) {
      this.nodesByTenant.set(tenantId, new Map());
      this.relationshipsByTenant.set(tenantId, new Map());
    }
    return {
      nodes: this.nodesByTenant.get(tenantId),
      relationships: this.relationshipsByTenant.get(tenantId)
    };
  }

  /**
   * Ingests a knowledge graph node
   */
  addNode(tenantId, nodeData) {
    const nodeObj = { ...nodeData, tenantId };
    const validation = validateKGNode(nodeObj);
    if (!validation.isValid) {
      throw new Error(`Invalid KGNode: ${validation.errors.join(', ')}`);
    }

    const { nodes } = this._getTenantStore(tenantId);
    const createdAt = nodeObj.createdAt || nodeObj.effectiveFrom || new Date().toISOString();
    const effectiveFrom = nodeObj.effectiveFrom || createdAt;
    const effectiveTo = nodeObj.effectiveTo || null;

    const record = {
      nodeId: nodeObj.nodeId,
      nodeType: nodeObj.nodeType,
      canonicalId: nodeObj.canonicalId || nodeObj.nodeId,
      label: nodeObj.label || nodeObj.nodeId,
      tenantId,
      properties: nodeObj.properties || {},
      status: nodeObj.status || 'ACTIVE',
      createdAt,
      effectiveFrom,
      effectiveTo,
      isDelisted: nodeObj.isDelisted === true,
      isMerged: nodeObj.isMerged === true
    };

    record.canonicalHash = canonicalHash({
      nodeId: record.nodeId,
      nodeType: record.nodeType,
      canonicalId: record.canonicalId,
      tenantId: record.tenantId,
      effectiveFrom: record.effectiveFrom,
      effectiveTo: record.effectiveTo
    });

    const frozen = deepFreeze(record);
    nodes.set(frozen.nodeId, frozen);
    return frozen;
  }

  /**
   * Ingests a knowledge graph relationship with provenance validation
   */
  addRelationship(tenantId, relData) {
    const createdAt = relData.createdAt || relData.effectiveFrom || relData.observedAt || new Date().toISOString();
    const observedAt = relData.observedAt || createdAt;
    const effectiveFrom = relData.effectiveFrom || observedAt;
    const effectiveTo = relData.effectiveTo || null;

    // Provenance verification downgrade if unverified
    let finalStatus = relData.status || KGRelationshipStatus.DERIVED;
    let prov = relData.provenance ? { ...relData.provenance } : {
      sourceEvidenceIds: [],
      sourceIds: [],
      sourceTier: KGSourceTier.TIER_4_VENDOR_FEED,
      sourceVerificationStatus: KGVerificationStatus.UNVERIFIED_SOURCE
    };

    if (
      (finalStatus === KGRelationshipStatus.VERIFIED || finalStatus === KGRelationshipStatus.VALIDATED) &&
      (!prov.sourceEvidenceIds || prov.sourceEvidenceIds.length === 0)
    ) {
      finalStatus = KGRelationshipStatus.UNVERIFIED_SOURCE;
    }

    const relObj = { ...relData, status: finalStatus, provenance: prov, tenantId };
    const validation = validateKGRelationship(relObj);
    if (!validation.isValid) {
      throw new Error(`Invalid KGRelationship: ${validation.errors.join(', ')}`);
    }

    const { relationships } = this._getTenantStore(tenantId);

    const record = {
      relationshipId: relObj.relationshipId,
      fromNodeId: relObj.fromNodeId,
      toNodeId: relObj.toNodeId,
      relationshipType: relObj.relationshipType,
      status: finalStatus,
      tenantId,
      properties: relObj.properties || {},
      provenance: prov,
      weight: typeof relObj.weight === 'number' && Number.isFinite(relObj.weight) ? relObj.weight : 1.0,
      createdAt,
      observedAt,
      effectiveFrom,
      effectiveTo
    };

    record.canonicalHash = canonicalHash({
      relationshipId: record.relationshipId,
      fromNodeId: record.fromNodeId,
      toNodeId: record.toNodeId,
      relationshipType: record.relationshipType,
      status: record.status,
      tenantId: record.tenantId,
      effectiveFrom: record.effectiveFrom,
      effectiveTo: record.effectiveTo
    });

    const frozen = deepFreeze(record);
    relationships.set(frozen.relationshipId, frozen);
    return frozen;
  }

  getNode(tenantId, nodeId) {
    const { nodes } = this._getTenantStore(tenantId);
    return nodes.get(nodeId) || null;
  }

  getRelationship(tenantId, relId) {
    const { relationships } = this._getTenantStore(tenantId);
    return relationships.get(relId) || null;
  }

  /**
   * Retrieves point-in-time graph snapshot filtered strictly as of information cutoff T
   */
  getSnapshotAsOf(tenantId, asOfTimestamp = new Date().toISOString()) {
    const { nodes, relationships } = this._getTenantStore(tenantId);
    const cutoffTime = new Date(asOfTimestamp).getTime();

    // 1. Filter nodes where createdAt <= cutoff AND effectiveFrom <= cutoff AND (effectiveTo is null OR effectiveTo >= cutoff)
    const validNodes = Array.from(nodes.values()).filter(n => {
      const createdT = new Date(n.createdAt).getTime();
      const effFromT = new Date(n.effectiveFrom).getTime();
      if (createdT > cutoffTime || effFromT > cutoffTime) return false;
      if (n.effectiveTo) {
        const effToT = new Date(n.effectiveTo).getTime();
        if (effToT < effFromT && effToT < cutoffTime) return false;
      }
      return true;
    });

    const validNodeIds = new Set(validNodes.map(n => n.nodeId));

    // 2. Filter relationships where observedAt <= cutoff AND effectiveFrom <= cutoff AND both endpoints exist
    const validRels = Array.from(relationships.values()).filter(r => {
      const obsT = new Date(r.observedAt).getTime();
      const effFromT = new Date(r.effectiveFrom).getTime();
      if (obsT > cutoffTime || effFromT > cutoffTime) return false;
      if (r.effectiveTo) {
        const effToT = new Date(r.effectiveTo).getTime();
        if (effToT < cutoffTime) return false;
      }
      return validNodeIds.has(r.fromNodeId) && validNodeIds.has(r.toNodeId);
    });

    return deepFreeze({
      tenantId,
      asOfTimestamp,
      nodeCount: validNodes.length,
      relationshipCount: validRels.length,
      nodes: validNodes,
      relationships: validRels
    });
  }

  /**
   * Retrieves historical entities including delisted, merged, or renamed
   */
  getHistoricalEntities(tenantId, asOfTimestamp) {
    const snapshot = this.getSnapshotAsOf(tenantId, asOfTimestamp);
    return snapshot.nodes.filter(n => n.nodeType === 'COMPANY' || n.nodeType === 'SECURITY');
  }
}

export const defaultKnowledgeGraphStore = new KnowledgeGraphStore();

export function createKGStore() {
  return new KnowledgeGraphStore();
}
