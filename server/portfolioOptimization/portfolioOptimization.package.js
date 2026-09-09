/**
 * server/portfolioOptimization/portfolioOptimization.package.js
 * 
 * Phase 33: Cryptographically Sealed Optimization Decision Package
 */

import crypto from 'crypto';
import { deepFreeze } from './portfolioOptimization.types.js';

export class PortfolioOptimizationPackageBuilder {
  /**
   * Sorts keys recursively to produce deterministic canonical JSON.
   */
  static canonicalStringify(obj) {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return '[' + obj.map(el => this.canonicalStringify(el)).join(',') + ']';
    }
    const sortedKeys = Object.keys(obj).sort();
    const keyValuePairs = sortedKeys.map(key => {
      return `${JSON.stringify(key)}:${this.canonicalStringify(obj[key])}`;
    });
    return '{' + keyValuePairs.join(',') + '}';
  }

  /**
   * Builds an immutable, sealed optimization package with SHA-256 hash.
   */
  static buildSealedPackage({
    optimizationResult,
    explanationDAG,
    portfolioSnapshotId = null,
    tenantId = 'default_tenant'
  }) {
    if (!optimizationResult) {
      throw new Error('Valid optimization result required to seal package');
    }

    const packageId = `PKG-OPT-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();

    const payloadToHash = {
      objectiveType: optimizationResult.objectiveType,
      symbols: optimizationResult.symbols,
      optimizedWeights: optimizationResult.optimizedWeights,
      portfolioMetrics: optimizationResult.portfolioMetrics,
      positionDecisions: optimizationResult.positionDecisions,
      postOptimizationVerification: optimizationResult.postOptimizationVerification,
      asOf: optimizationResult.asOf,
      tenantId,
      portfolioSnapshotId
    };

    const canonicalJson = this.canonicalStringify(payloadToHash);
    const integrityHash = crypto.createHash('sha256').update(canonicalJson).digest('hex');

    const sealedPackage = {
      packageId,
      tenantId,
      portfolioSnapshotId,
      sealedAt: timestamp,
      integrityHash,
      asOf: optimizationResult.asOf,
      objectiveType: optimizationResult.objectiveType,
      symbols: optimizationResult.symbols,
      optimizedWeights: optimizationResult.optimizedWeights,
      positionDecisions: optimizationResult.positionDecisions,
      portfolioMetrics: optimizationResult.portfolioMetrics,
      postOptimizationVerification: optimizationResult.postOptimizationVerification,
      solverMetadata: optimizationResult.solverMetadata,
      explanationDAG,
      phase32Attribution: optimizationResult.phase32Attribution
    };

    return deepFreeze(sealedPackage);
  }

  /**
   * Verifies the cryptographic integrity of a sealed package.
   */
  static verifyPackageIntegrity(sealedPackage) {
    if (!sealedPackage || !sealedPackage.integrityHash) {
      return { isValid: false, reason: 'Missing package or integrity hash' };
    }

    const payloadToHash = {
      objectiveType: sealedPackage.objectiveType,
      symbols: sealedPackage.symbols,
      optimizedWeights: sealedPackage.optimizedWeights,
      portfolioMetrics: sealedPackage.portfolioMetrics,
      positionDecisions: sealedPackage.positionDecisions,
      postOptimizationVerification: sealedPackage.postOptimizationVerification,
      asOf: sealedPackage.asOf,
      tenantId: sealedPackage.tenantId,
      portfolioSnapshotId: sealedPackage.portfolioSnapshotId
    };

    const canonicalJson = this.canonicalStringify(payloadToHash);
    const calculatedHash = crypto.createHash('sha256').update(canonicalJson).digest('hex');

    const isValid = calculatedHash === sealedPackage.integrityHash;
    return {
      isValid,
      expectedHash: sealedPackage.integrityHash,
      calculatedHash
    };
  }
}
