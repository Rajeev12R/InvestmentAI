/**
 * server/knowledgeGraph/kg.schema.js
 * 
 * Phase 23: Knowledge Graph Node, Relationship, Provenance, & Package Schema Validation
 */

import { KGNodeType, KGRelationshipType, KGRelationshipStatus, KGSourceTier } from './kg.types.js';

export function validateKGNode(node) {
  const errors = [];
  if (!node || typeof node !== 'object') {
    errors.push('KGNode must be a non-null object');
    return { isValid: false, errors };
  }

  if (!node.nodeId || typeof node.nodeId !== 'string') {
    errors.push('nodeId is required and must be a string');
  }
  if (!node.nodeType || !Object.values(KGNodeType).includes(node.nodeType)) {
    errors.push(`Invalid or missing nodeType: ${node.nodeType}`);
  }
  if (!node.tenantId || typeof node.tenantId !== 'string') {
    errors.push('tenantId is required and must be a string');
  }
  if (node.effectiveFrom && new Date(node.effectiveFrom).toString() === 'Invalid Date') {
    errors.push('effectiveFrom must be a valid ISO date');
  }
  if (node.effectiveTo && new Date(node.effectiveTo).toString() === 'Invalid Date') {
    errors.push('effectiveTo must be a valid ISO date');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateKGRelationship(rel) {
  const errors = [];
  if (!rel || typeof rel !== 'object') {
    errors.push('KGRelationship must be a non-null object');
    return { isValid: false, errors };
  }

  if (!rel.relationshipId || typeof rel.relationshipId !== 'string') {
    errors.push('relationshipId is required');
  }
  if (!rel.fromNodeId || typeof rel.fromNodeId !== 'string') {
    errors.push('fromNodeId is required');
  }
  if (!rel.toNodeId || typeof rel.toNodeId !== 'string') {
    errors.push('toNodeId is required');
  }
  if (!rel.relationshipType || !Object.values(KGRelationshipType).includes(rel.relationshipType)) {
    errors.push(`Invalid relationshipType: ${rel.relationshipType}`);
  }
  if (!rel.status || !Object.values(KGRelationshipStatus).includes(rel.status)) {
    errors.push(`Invalid relationship status: ${rel.status}`);
  }
  if (!rel.tenantId || typeof rel.tenantId !== 'string') {
    errors.push('tenantId is required');
  }

  // Provenance validation for authoritative relationships
  if (rel.status === KGRelationshipStatus.VERIFIED || rel.status === KGRelationshipStatus.VALIDATED) {
    if (!rel.provenance || typeof rel.provenance !== 'object') {
      errors.push('Authoritative relationship requires provenance object');
    } else {
      if (!Array.isArray(rel.provenance.sourceEvidenceIds) || rel.provenance.sourceEvidenceIds.length === 0) {
        errors.push('Authoritative relationship requires sourceEvidenceIds array');
      }
      if (!rel.provenance.sourceTier || !Object.values(KGSourceTier).includes(rel.provenance.sourceTier)) {
        errors.push(`Invalid sourceTier in provenance: ${rel.provenance.sourceTier}`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateKGPackage(pkg) {
  const errors = [];
  if (!pkg || typeof pkg !== 'object') {
    errors.push('KGPackage must be a non-null object');
    return { isValid: false, errors };
  }
  if (!pkg.packageId || typeof pkg.packageId !== 'string') {
    errors.push('packageId is required');
  }
  if (!pkg.sha256Signature || typeof pkg.sha256Signature !== 'string' || pkg.sha256Signature.length !== 64) {
    errors.push('sha256Signature is required (64 hex characters)');
  }
  return {
    isValid: errors.length === 0,
    errors
  };
}
