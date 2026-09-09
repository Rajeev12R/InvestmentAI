/**
 * server/macro/macro.package.js
 * 
 * Phase 22: Cryptographically Sealed Macro Intelligence Package Engine
 * Produces immutable, SHA-256 verified macro audit packages.
 */

import { MacroClassification, canonicalHash, deepFreeze } from './macro.types.js';

export function sealMacroIntelligencePackage(params = {}) {
  const now = new Date().toISOString();
  const packageId = params.packageId || `MACRO-PKG-${Date.now()}`;
  const asOfTimestamp = params.asOfTimestamp || now;
  const informationCutoff = params.informationCutoff || asOfTimestamp;

  const rawContent = {
    packageId,
    version: '22.0.0',
    asOfTimestamp,
    informationCutoff,
    macroSnapshot: params.macroSnapshot || {},
    derivedMetrics: params.derivedMetrics || {},
    regime: params.regime || {},
    regimeTransitions: params.regimeTransitions || {},
    crossAssetRelationships: params.crossAssetRelationships || [],
    portfolioExposures: params.portfolioExposures || {},
    macroImpacts: params.macroImpacts || {},
    attention: params.attention || {},
    provenance: params.provenance || {
      sourceCount: params.macroSnapshot?.seriesCount || 0,
      classification: MacroClassification.DERIVED
    }
  };

  const packageHash = canonicalHash(rawContent);

  const sealedPackage = {
    ...rawContent,
    packageHash,
    sealedAt: now,
    classification: MacroClassification.MODEL_ESTIMATE,
    isSealed: true
  };

  return deepFreeze(sealedPackage);
}

export function sealMacroPackage(payload, creator) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Payload must be an object');
  }
  if (!creator || typeof creator !== 'string') {
    throw new Error('Creator must be specified');
  }

  const packageId = `PKG-MACRO-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const sealedAt = new Date().toISOString();
  const rawData = {
    packageId,
    payload,
    createdBy: creator,
    sealedAt
  };

  const sha256Signature = canonicalHash(rawData);

  return deepFreeze({
    ...rawData,
    sha256Signature,
    classification: 'MODEL_ESTIMATE'
  });
}

export function verifyMacroPackage(sealedPackage) {
  if (!sealedPackage || typeof sealedPackage !== 'object' || !sealedPackage.sha256Signature || typeof sealedPackage.sha256Signature !== 'string' || sealedPackage.sha256Signature.length !== 64 || !sealedPackage.payload) {
    return {
      isValid: false,
      reason: 'Invalid package structure or missing signature'
    };
  }

  const { sha256Signature, classification, ...rawContent } = sealedPackage;
  const expectedSignature = canonicalHash(rawContent);
  const isValid = sha256Signature === expectedSignature;

  return {
    isValid,
    packageId: sealedPackage.packageId,
    signature: sha256Signature,
    status: isValid ? 'VALID_UNMODIFIED' : 'TAMPERED_OR_CORRUPT'
  };
}

