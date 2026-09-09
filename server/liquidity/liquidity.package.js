/**
 * Phase 18 — Sealed Liquidity Intelligence Package
 * Deterministic canonical serialization and SHA-256 cryptographic sealing.
 */

import { canonicalHash, deepFreeze, LiquidityStatus, LiquidityDataStatus } from './liquidity.types.js';

export class SealedLiquidityIntelligencePackage {
  /**
   * Constructs and seals an immutable liquidity intelligence package.
   */
  static sealPackage(payload) {
    if (!payload || typeof payload !== 'object') {
      return deepFreeze({
        status: LiquidityStatus.INVALID_INPUT,
        reason: 'Package payload missing or invalid'
      });
    }

    const {
      workspaceId = 'WS-DEFAULT',
      portfolioId = 'PORT-DEFAULT',
      timestamp = new Date().toISOString(),
      observations = [],
      metrics = {},
      costs = {},
      capacity = {},
      stressResults = {},
      feasibility = {},
      rebalance = {},
      constraints = {},
      assumptions = {},
      evidenceGraph = [],
      dataQuality = 'PRIME',
      methodologyVersions = {
        policyVersion: 'LIQUIDITY_POLICY_V1.0',
        impactModelVersion: 'SQRT_ALMGREN_CHRISS_V1',
        scoreVersion: 'LIQ_SCORE_V1',
        stressVersion: 'LIQ_STRESS_V1'
      }
    } = payload;

    const unsealedBody = {
      packageVersion: 'SEALED_LIQUIDITY_INTELLIGENCE_V1.0',
      workspaceId,
      portfolioId,
      timestamp,
      observations,
      metrics,
      costs,
      capacity,
      stressResults,
      feasibility,
      rebalance,
      constraints,
      assumptions,
      evidenceGraph,
      dataQuality,
      methodologyVersions,
      dataStatus: LiquidityDataStatus.CONFIGURED
    };

    const packageHash = canonicalHash(unsealedBody);
    const sealedPackageId = `SEAL-LIQ-${workspaceId}-${portfolioId}-${packageHash.substring(0, 16)}`;

    return deepFreeze({
      status: LiquidityStatus.PASS,
      packageId: sealedPackageId,
      packageHash,
      package: unsealedBody
    });
  }

  /**
   * Verifies the cryptographic integrity of a sealed package.
   */
  static verifyPackage(sealedWrapper) {
    if (!sealedWrapper || !sealedWrapper.package || !sealedWrapper.packageHash) {
      return false;
    }
    const computedHash = canonicalHash(sealedWrapper.package);
    return computedHash === sealedWrapper.packageHash;
  }
}
