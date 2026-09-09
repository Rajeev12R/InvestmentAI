/**
 * server/researchSynthesis/synthesis.package.js
 * 
 * Phase 24: Cryptographically Sealed Research Package Engine
 * Produces immutable, SHA-256 verified research audit packages with tamper detection.
 */

import { canonicalHash, deepFreeze } from './synthesis.types.js';

export function sealResearchPackage(researchProduct, creator = 'system') {
  if (!researchProduct || typeof researchProduct !== 'object') {
    throw new Error('Research product must be a non-null object');
  }
  if (!creator || typeof creator !== 'string') {
    throw new Error('Creator string must be specified');
  }

  const packageId = `PKG-RESEARCH-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const sealedAt = new Date().toISOString();

  const rawData = {
    packageId,
    packageVersion: '24.0.0',
    researchProduct,
    createdBy: creator,
    sealedAt
  };

  const sha256Signature = canonicalHash(rawData);

  return deepFreeze({
    ...rawData,
    sha256Signature,
    classification: 'RESEARCH_SYNTHESIS_PACKAGE',
    isSealed: true
  });
}

export function verifyResearchPackage(sealedPackage) {
  if (
    !sealedPackage ||
    typeof sealedPackage !== 'object' ||
    !sealedPackage.sha256Signature ||
    typeof sealedPackage.sha256Signature !== 'string' ||
    sealedPackage.sha256Signature.length !== 64 ||
    !sealedPackage.researchProduct
  ) {
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
