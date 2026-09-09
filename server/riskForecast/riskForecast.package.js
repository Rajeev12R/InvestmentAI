import crypto from 'crypto';
import { deepFreeze, computeRiskForecastHash, DataClassification } from './riskForecast.types.js';
import { RiskForecastConfig } from './riskForecast.config.js';
import { RiskForecastExplanationDAG } from './riskForecast.explanation.js';

/**
 * Phase 31 — Sealed Risk Forecast Package Builder & Verifier
 */
export class RiskForecastPackageBuilder {
  /**
   * Construct and cryptographically seal an immutable RiskForecastPackage
   */
  static sealPackage({
    packageId: customPackageId = null,
    portfolioSnapshotId,
    truthSnapshotId = 'TRUTH_SNAPSHOT_DEFAULT',
    asOf,
    forecastResult,
    budgetEvaluation = null,
    limitEvaluation = null,
    breachProbabilities = null,
    modelHealth = null,
    uncertainty = null,
    backtestResults = null,
    tenantId = 'tenant_default',
    provenance = {}
  }) {
    if (!portfolioSnapshotId || !asOf) {
      throw new Error('portfolioSnapshotId and asOf timestamp are required to seal a RiskForecastPackage');
    }

    const packageId = customPackageId || `RFPKG_${portfolioSnapshotId}_${asOf.replace(/[^0-9]/g, '').slice(0, 14)}`;
    const createdAt = new Date().toISOString();

    const explanationDAG = RiskForecastExplanationDAG.buildForecastExplanationDAG({
      portfolioSnapshotId,
      forecastResult,
      budgetEvaluation,
      limitEvaluation
    });

    const unsealed = {
      packageId,
      tenantId,
      portfolioSnapshotId,
      truthSnapshotId,
      asOf,
      forecastResults: {
        portfolioVolatility: forecastResult?.portfolioVolatility,
        dailyVolatility: forecastResult?.dailyVolatility,
        horizons: forecastResult?.horizons
      },
      VaR: {
        horizons: Object.entries(forecastResult?.horizons || {}).reduce((acc, [h, val]) => {
          acc[h] = { parametricVaR: val.parametricVaR, historicalVaR: val.historicalVaR };
          return acc;
        }, {})
      },
      ExpectedShortfall: {
        horizons: Object.entries(forecastResult?.horizons || {}).reduce((acc, [h, val]) => {
          acc[h] = val.expectedShortfall;
          return acc;
        }, {})
      },
      drawdown: {
        forwardDrawdowns: Object.entries(forecastResult?.horizons || {}).reduce((acc, [h, val]) => {
          acc[h] = val.expectedMaxDrawdown;
          return acc;
        }, {})
      },
      marginalRisk: forecastResult?.marginalRiskDecomposition,
      factorRisk: forecastResult?.factorRiskContribution,
      regimeAwareRisk: forecastResult?.regimeAwareRisk,
      liquidityAdjustedRisk: forecastResult?.liquidityAdjustedRisk,
      taxAdjustedRisk: forecastResult?.taxAdjustedRisk,
      riskBudgets: budgetEvaluation,
      limitUtilization: limitEvaluation,
      breachProbabilities: breachProbabilities || [],
      modelHealth: modelHealth || { status: DataClassification.UNAVAILABLE },
      uncertainty: uncertainty || { status: DataClassification.UNAVAILABLE },
      backtestResults: backtestResults || { status: DataClassification.UNAVAILABLE },
      explanationDAG,
      provenance: {
        ...provenance,
        source: 'INVESTMENTAI_PHASE31_RISK_FORECAST_ENGINE',
        deterministic: true,
        temporalCutoff: asOf
      },
      configurationVersion: RiskForecastConfig.VERSION,
      modelVersions: {
        volatilityModel: '1.0.0',
        covarianceModel: '1.0.0',
        varModel: '1.0.0',
        expectedShortfallModel: '1.0.0',
        budgetEngine: '1.0.0'
      },
      createdAt,
      isSealed: true
    };

    // Calculate deterministic cryptographic hash
    const hash = computeRiskForecastHash(unsealed);
    const sealedPackage = {
      ...unsealed,
      hash
    };

    return deepFreeze(sealedPackage);
  }

  /**
   * Verify cryptographic integrity of a sealed package
   */
  static verifyPackage(pkg) {
    if (!pkg || typeof pkg !== 'object' || !pkg.hash) {
      return { isValid: false, reason: 'Malformed or unsealed package' };
    }
    const { hash, ...unsealedPart } = pkg;
    const computedHash = computeRiskForecastHash(unsealedPart);
    const isValid = computedHash === hash;
    return {
      isValid,
      expectedHash: hash,
      computedHash,
      reason: isValid ? 'Package seal is intact and valid' : 'Cryptographic hash mismatch: package has been tampered with'
    };
  }
}
