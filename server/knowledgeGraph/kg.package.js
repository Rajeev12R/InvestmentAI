/**
 * server/knowledgeGraph/kg.package.js
 * 
 * Phase 23: Cryptographically Sealed Knowledge Graph Package Engine
 * Produces immutable, SHA-256 verified knowledge graph audit packages with tamper detection.
 */

import { canonicalHash, deepFreeze } from './kg.types.js';

export function sealKnowledgeGraphPackage(payload, creator = 'system') {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload must be a non-null object');
  }
  if (!creator || typeof creator !== 'string') {
    throw new Error('Creator must be specified');
  }

  const packageId = `PKG-KG-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const sealedAt = new Date().toISOString();

  const rawData = {
    packageId,
    packageVersion: '23.0.0',
    payload,
    createdBy: creator,
    sealedAt
  };

  const sha256Signature = canonicalHash(rawData);

  return deepFreeze({
    ...rawData,
    sha256Signature,
    classification: 'MODEL_ESTIMATE',
    isSealed: true
  });
}

export function verifyKnowledgeGraphPackage(sealedPackage) {
  if (!sealedPackage || typeof sealedPackage !== 'object' || !sealedPackage.sha256Signature || typeof sealedPackage.sha256Signature !== 'string' || sealedPackage.sha256Signature.length !== 64 || !sealedPackage.payload) {
    return {
      isValid: false,
      reason: 'Invalid package structure or missing signature'
    };
  }

  const { sha256Signature, classification, isSealed, ...rawContent } = sealedPackage;
  const expectedSignature = canonicalHash(rawContent);
  const isValid = sha256Signature === expectedSignature;

  return {
    isValid,
    packageId: sealedPackage.packageId,
    signature: sha256Signature,
    status: isValid ? 'VALID_UNMODIFIED' : 'TAMPERED_OR_CORRUPT'
  };
}
