/**
 * server/riskAttribution/riskAttribution.package.js
 * 
 * Phase 32: Immutable Sealed Risk Attribution Package Builder
 * Cryptographic SHA-256 provenance sealing and recursive canonical tamper verification.
 */

import crypto from 'crypto';
import { DataClassification, deepFreeze } from './riskAttribution.types.js';
import { RiskAttributionConfig } from './riskAttribution.config.js';

function canonicalize(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(canonicalize);
  const sorted = {};
  for (const k of Object.keys(obj).sort()) {
    sorted[k] = canonicalize(obj[k]);
  }
  return sorted;
}

export class RiskAttributionPackageBuilder {
  /**
   * Build Sealed Risk Attribution Package
   */
  static buildSealedPackage({
    attributionResult,
    explanationDAG,
    portfolioSnapshotId = `PORT-SNAP-${Date.now()}`,
    tenantId = 'tenant_default',
    modelProvenance = {}
  }) {
    if (!attributionResult || !explanationDAG) {
      throw new Error('attributionResult and explanationDAG are required to seal package');
    }

    const sealedAt = new Date().toISOString();
    const asOf = attributionResult.asOf || sealedAt;
    const packageId = `${RiskAttributionConfig.SEAL_PREFIX}${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const rawPayload = {
      packageId,
      portfolioSnapshotId,
      tenantId,
      classification: DataClassification.AUDITED_ATTRIBUTION_SEAL,
      engineVersion: RiskAttributionConfig.ENGINE_VERSION,
      schemaVersion: RiskAttributionConfig.PACKAGE_SCHEMA_VERSION,
      asOf,
      sealedAt,
      modelProvenance: {
        attributionModelVersion: RiskAttributionConfig.ENGINE_VERSION,
        covarianceModelVersion: modelProvenance.covarianceModelVersion || 'v31.1.0-psd-repair',
        factorModelVersion: modelProvenance.factorModelVersion || 'v30.1.0-apt-factors',
        dataSnapshotVersion: modelProvenance.dataSnapshotVersion || 'SNAPSHOT-T1',
        ...modelProvenance
      },
      portfolioMetrics: attributionResult.portfolioMetrics,
      reconciliation: attributionResult.reconciliation,
      positions: attributionResult.positions,
      sectors: attributionResult.sectors,
      geographies: attributionResult.geographies,
      sleeves: attributionResult.sleeves,
      correlationAttribution: attributionResult.correlationAttribution,
      concentrationAttribution: attributionResult.concentrationAttribution,
      factorAttribution: attributionResult.factorAttribution,
      activeRiskAttribution: attributionResult.activeRiskAttribution,
      tailRiskAttribution: attributionResult.tailRiskAttribution,
      stressAttribution: attributionResult.stressAttribution,
      regimeAttribution: attributionResult.regimeAttribution,
      explanationDAG
    };

    // Calculate deterministic SHA-256 seal hash over recursive canonical JSON
    const canonicalString = JSON.stringify(canonicalize(rawPayload));
    const integrityHash = crypto.createHash('sha256').update(canonicalString).digest('hex');

    const sealedPackage = {
      ...rawPayload,
      integrity: {
        algorithm: 'SHA-256',
        hash: integrityHash,
        isSealed: true,
        sealTimestamp: sealedAt
      }
    };

    return deepFreeze(sealedPackage);
  }

  /**
   * Verify integrity hash of a sealed package
   */
  static verifyPackageIntegrity(sealedPackage) {
    if (!sealedPackage || !sealedPackage.integrity || !sealedPackage.integrity.hash) {
      return { isValid: false, reason: 'Missing integrity metadata' };
    }

    const { integrity, ...payloadWithoutIntegrity } = sealedPackage;
    const canonicalString = JSON.stringify(canonicalize(payloadWithoutIntegrity));
    const expectedHash = crypto.createHash('sha256').update(canonicalString).digest('hex');

    const isValid = expectedHash === integrity.hash;
    return {
      isValid,
      expectedHash,
      recordedHash: integrity.hash,
      reason: isValid ? 'Integrity verified' : 'Hash mismatch: Package has been altered after sealing'
    };
  }
}
