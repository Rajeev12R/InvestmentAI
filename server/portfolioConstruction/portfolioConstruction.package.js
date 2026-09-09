import { deepFreeze, canonicalHash, ExecutionStatus, OptimizationStatus } from "./portfolioConstruction.types.js";
import { PORTFOLIO_OPTIMIZATION_CONFIG_V1 } from "./portfolioConstructionConfig.js";

/**
 * Builds and seals a PortfolioConstructionIntelligencePackage.
 */
export class PortfolioConstructionPackageBuilder {
  static buildPackage(data) {
    const {
      packageId = `PCP-${data.portfolioId || "PORT"}-${Date.now()}`,
      workspaceId,
      portfolioId,
      portfolioSnapshotId = null,
      inputPackageHash = "0000000000000000000000000000000000000000000000000000000000000000",
      optimizationMethod,
      configurationVersion = PORTFOLIO_OPTIMIZATION_CONFIG_V1.configId,
      constraints = {},
      optimizationStatus = OptimizationStatus.OPTIMAL,
      executionStatus = ExecutionStatus.PROPOSED,
      targetWeights = {},
      currentWeights = {},
      turnover = null,
      expectedReturn = null,
      portfolioRisk = null,
      riskBudget = null,
      diversification = null,
      liquidity = null,
      transactionCosts = null,
      stressTesting = null,
      explanationGraph = null,
      evidenceIds = [],
      warnings = [],
      asOf = new Date().toISOString(),
      createdAt = new Date().toISOString()
    } = data;

    const unhashedPackage = {
      packageId,
      workspaceId,
      portfolioId,
      portfolioSnapshotId,
      inputPackageHash,
      optimizationMethod,
      configurationVersion,
      constraints,
      optimizationStatus,
      executionStatus,
      targetWeights,
      currentWeights,
      turnover,
      expectedReturn,
      portfolioRisk,
      riskBudget,
      diversification,
      liquidity,
      transactionCosts,
      stressTesting,
      explanationGraph,
      evidenceIds,
      warnings,
      asOf,
      createdAt
    };

    // Calculate deterministic SHA-256 seal
    const packageHash = canonicalHash(unhashedPackage);

    const sealedPackage = {
      ...unhashedPackage,
      packageHash
    };

    return deepFreeze(sealedPackage);
  }
}
