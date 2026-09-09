/**
 * server/scenario/scenario.package.js
 * 
 * Phase 19: Cryptographic Scenario Intelligence Package Sealing
 * Generates tamper-evident immutable scenario packages with SHA-256 seals.
 */

import crypto from 'crypto';
import { canonicalJsonStringify, canonicalHash, deepFreeze } from './scenario.types.js';
import { SCENARIO_CONFIG } from './scenario.config.js';

/**
 * Seals a scenario intelligence analysis into an immutable, verifiable package.
 */
export function sealScenarioPackage(params) {
  if (!params || typeof params !== 'object') {
    throw new TypeError('sealScenarioPackage requires params object');
  }

  const {
    tenantId,
    scenarioResult,
    portfolioSnapshot,
    scenarioDefinition,
    sealedBy = 'SCENARIO_ENGINE_SYSTEM'
  } = params;

  if (!tenantId || typeof tenantId !== 'string') {
    throw new Error('tenantId is required for package sealing');
  }
  if (!scenarioResult || typeof scenarioResult !== 'object') {
    throw new Error('scenarioResult is required for package sealing');
  }
  if (!scenarioDefinition || typeof scenarioDefinition !== 'object') {
    throw new Error('scenarioDefinition is required for package sealing');
  }

  const timestamp = new Date().toISOString();
  const dateStr = timestamp.slice(0, 10).replace(/-/g, '');

  const portfolioSnapshotSummary = portfolioSnapshot ? {
    id: portfolioSnapshot.id,
    positionsCount: Array.isArray(portfolioSnapshot.positions) ? portfolioSnapshot.positions.length : 0,
    totalNav: portfolioSnapshot.totalNav || (scenarioResult.baseline ? scenarioResult.baseline.nav : null)
  } : null;

  const payloadToHash = {
    tenantId,
    scenarioDefinition,
    portfolioSnapshot: portfolioSnapshotSummary,
    scenarioResult,
    sealedBy,
    timestamp
  };

  const fullHash = canonicalHash(payloadToHash);
  const sealId = `${SCENARIO_CONFIG.SEAL_PREFIX}${dateStr}-${fullHash.slice(0, 16).toUpperCase()}`;

  const sealedPackage = {
    sealId,
    schemaVersion: SCENARIO_CONFIG.PACKAGE_SCHEMA_VERSION,
    engineVersion: SCENARIO_CONFIG.ENGINE_VERSION,
    tenantId,
    scenarioId: scenarioDefinition.id || scenarioResult.scenarioId || 'CUSTOM_SCENARIO',
    scenarioName: scenarioDefinition.name || scenarioResult.scenarioName,
    scenarioType: scenarioDefinition.scenarioType,
    sealedBy,
    timestamp,
    canonicalHash: fullHash,
    portfolioSnapshot: portfolioSnapshotSummary,
    scenarioDefinition,
    scenarioResult,
    verification: {
      isSealed: true,
      algorithm: 'SHA-256',
      tamperEvident: true
    }
  };

  return deepFreeze(sealedPackage);
}

/**
 * Verifies integrity of a sealed scenario package
 */
export function verifyScenarioPackage(sealedPackage) {
  if (!sealedPackage || typeof sealedPackage !== 'object') {
    return { valid: false, error: 'Package must be a non-null object' };
  }

  if (!sealedPackage.sealId || !sealedPackage.canonicalHash || !sealedPackage.verification?.isSealed) {
    return { valid: false, error: 'Package missing required sealing metadata' };
  }

  const payloadToHash = {
    tenantId: sealedPackage.tenantId,
    scenarioDefinition: sealedPackage.scenarioDefinition,
    portfolioSnapshot: sealedPackage.portfolioSnapshot || null,
    scenarioResult: sealedPackage.scenarioResult,
    sealedBy: sealedPackage.sealedBy,
    timestamp: sealedPackage.timestamp
  };

  const recomputedHash = canonicalHash(payloadToHash);
  const isValid = recomputedHash === sealedPackage.canonicalHash;

  return {
    valid: isValid,
    sealId: sealedPackage.sealId,
    storedHash: sealedPackage.canonicalHash,
    recomputedHash,
    timestamp: sealedPackage.timestamp
  };
}
