import { deepFreeze, computeExposureHash } from './exposure.types.js';
import { validateExposureRiskPackage } from './exposure.schema.js';

/**
 * Phase 30 — Sealed Exposure & Risk Intelligence Package with Explanation DAG
 */
export class ExposurePackageBuilder {
  /**
   * Build and Cryptographically Seal ExposureRiskPackage
   * @param {Object} params
   * @param {string} params.packageId
   * @param {string} params.portfolioId
   * @param {string} params.informationCutoff
   * @param {Object} params.portfolioExposure
   * @param {Object} params.factorExposures
   * @param {Object} params.factorDecomposition
   * @param {Object} params.riskDecomposition
   * @param {Object} params.commonDrivers
   * @param {Object} params.concentration
   * @param {Object} params.macroSensitivities
   * @param {Object} params.scenarioSensitivities
   * @param {Object} params.complianceStatus
   */
  static sealPackage({
    packageId = `exp-pkg-${Date.now()}`,
    portfolioId = 'port-1',
    informationCutoff = new Date().toISOString(),
    portfolioExposure = {},
    factorExposures = {},
    factorDecomposition = {},
    riskDecomposition = {},
    commonDrivers = {},
    concentration = {},
    macroSensitivities = {},
    scenarioSensitivities = {},
    complianceStatus = {}
  } = {}) {
    const nodes = [
      {
        id: 'node_holdings',
        type: 'HOLDINGS_LOOK_THROUGH',
        label: 'Portfolio Holdings & Look-Through Coverage',
        data: {
          grossExposure: portfolioExposure.grossExposure,
          netExposure: portfolioExposure.netExposure,
          lookThroughCoverage: portfolioExposure.lookThroughMetrics?.lookThroughCoverage
        }
      },
      {
        id: 'node_economic_exp',
        type: 'ECONOMIC_EXPOSURE',
        label: 'Sector, Geography, Currency & Duration Exposures',
        data: {
          sectorExposures: portfolioExposure.sectorExposures,
          currencyExposures: portfolioExposure.currencyExposures,
          duration: portfolioExposure.durationMetrics?.effectiveDuration
        }
      },
      {
        id: 'node_factor_exp',
        type: 'FACTOR_EXPOSURE',
        label: 'Multi-Factor Betas (Market, Style, Rates, Credit)',
        data: {
          portfolioFactorBetas: factorExposures.portfolioFactorBetas,
          activeFactorBetas: factorExposures.activeFactorBetas
        }
      },
      {
        id: 'node_return_decomp',
        type: 'RETURN_DECOMPOSITION',
        label: 'Factor Return Decomposition & Exact Residual',
        data: {
          factorContributions: factorDecomposition.factorContributions,
          residual: factorDecomposition.residual,
          reconciled: factorDecomposition.reconciled
        }
      },
      {
        id: 'node_covariance_risk',
        type: 'COVARIANCE_RISK',
        label: 'Total Portfolio Volatility & Covariance Matrix',
        data: {
          totalVolatility: riskDecomposition.totalVolatility,
          isReconciled: riskDecomposition.isReconciled
        }
      },
      {
        id: 'node_marginal_risk',
        type: 'MARGINAL_RISK_CONTRIBUTION',
        label: 'Marginal (MRC) & Component Risk Contributions (CRC)',
        data: {
          componentRiskContributions: riskDecomposition.componentRiskContributions,
          exposureVsRiskDivergences: riskDecomposition.exposureVsRiskDivergences
        }
      },
      {
        id: 'node_common_drivers',
        type: 'COMMON_DRIVERS',
        label: 'Knowledge Graph Shared Bottlenecks & Supply Chains',
        data: {
          driverCount: commonDrivers.driverCount,
          commonDrivers: commonDrivers.commonDrivers
        }
      },
      {
        id: 'node_concentration',
        type: 'HIDDEN_CONCENTRATION',
        label: 'Nominal vs Common-Driver HHI Concentration',
        data: {
          securityHHI: concentration.securityHHI,
          commonDriverHHI: concentration.commonDriverHHI,
          isHiddenConcentrationDetected: concentration.isHiddenConcentrationDetected
        }
      },
      {
        id: 'node_macro_sens',
        type: 'MACRO_SENSITIVITIES',
        label: 'Macro Factor Elasticity (Rates, Inflation, Commodities)',
        data: {
          sensitivities: macroSensitivities.sensitivities
        }
      },
      {
        id: 'node_scenarios',
        type: 'SCENARIO_STRESS',
        label: 'Phase 19 Scenario Stress Sensitivities',
        data: {
          expectedPortfolioImpact: scenarioSensitivities.expectedPortfolioImpact,
          scenarioName: scenarioSensitivities.scenarioName
        }
      },
      {
        id: 'node_compliance_seal',
        type: 'COMPLIANCE_LIMITS_SEAL',
        label: 'Phase 16 Precedence Compliance & Authoritative Seal',
        data: {
          isCompliant: complianceStatus.isCompliant,
          breachCount: complianceStatus.breachCount
        }
      }
    ];

    const edges = [
      { from: 'node_holdings', to: 'node_economic_exp', label: 'aggregation' },
      { from: 'node_holdings', to: 'node_factor_exp', label: 'factor_mapping' },
      { from: 'node_factor_exp', to: 'node_return_decomp', label: 'return_attribution' },
      { from: 'node_holdings', to: 'node_covariance_risk', label: 'covariance_product' },
      { from: 'node_covariance_risk', to: 'node_marginal_risk', label: 'mrc_crc_derivation' },
      { from: 'node_holdings', to: 'node_common_drivers', label: 'graph_traversal' },
      { from: 'node_common_drivers', to: 'node_concentration', label: 'hhi_computation' },
      { from: 'node_factor_exp', to: 'node_macro_sens', label: 'macro_elasticity' },
      { from: 'node_factor_exp', to: 'node_scenarios', label: 'scenario_shock' },
      { from: 'node_economic_exp', to: 'node_compliance_seal', label: 'limit_check' },
      { from: 'node_marginal_risk', to: 'node_compliance_seal', label: 'risk_limit_check' },
      { from: 'node_concentration', to: 'node_compliance_seal', label: 'concentration_check' }
    ];

    const payload = {
      packageId,
      portfolioId,
      informationCutoff,
      portfolioExposure,
      factorExposures,
      factorDecomposition,
      riskDecomposition,
      commonDrivers,
      concentration,
      macroSensitivities,
      scenarioSensitivities,
      complianceStatus,
      explanationDAG: {
        nodes,
        edges
      },
      sealedAt: new Date().toISOString()
    };

    validateExposureRiskPackage(payload);

    const hash = computeExposureHash(payload);
    payload.seal = {
      algorithm: 'SHA-256',
      hash,
      status: 'SEALED_AUTHORITATIVE'
    };

    return deepFreeze(payload);
  }

  /**
   * Verify Sealed ExposureRiskPackage
   * @param {Object} pkg 
   */
  static verifyPackage(pkg) {
    if (!pkg || typeof pkg !== 'object' || !pkg.seal || !pkg.seal.hash) {
      return { isValid: false, reason: 'Missing seal or package payload' };
    }

    const { seal, ...payloadToVerify } = pkg;
    const computedHash = computeExposureHash(payloadToVerify);

    const isValid = computedHash === seal.hash;
    return {
      isValid,
      expectedHash: seal.hash,
      computedHash,
      verifiedAt: new Date().toISOString()
    };
  }
}
