import { DataClassification } from './riskForecast.types.js';

/**
 * Phase 31 — Inter-Phase Institutional Bridges
 */
export class RiskForecastBridges {
  /**
   * Phase 30 Exposure Bridge: Extract factor exposures & covariance for risk decomposition
   */
  static bridgeFromPhase30Exposure(phase30Package) {
    if (!phase30Package) return null;
    return {
      factorExposures: phase30Package.factorExposures || null,
      activeExposures: phase30Package.activeSectorExposures || null,
      commonDrivers: phase30Package.commonDrivers || null,
      status: DataClassification.DERIVED
    };
  }

  /**
   * Phase 22 Macro Bridge: Extract current macro regime & scenario multipliers
   */
  static bridgeFromPhase22Macro(macroState) {
    if (!macroState) return { regime: 'NORMAL', multiplier: 1.0 };
    return {
      regime: macroState.currentRegime || 'NORMAL',
      inflationState: macroState.inflationRegime || 'NEUTRAL',
      growthState: macroState.growthRegime || 'NEUTRAL',
      multiplier: macroState.volatilityMultiplier || 1.0,
      status: DataClassification.DERIVED
    };
  }

  /**
   * Phase 18 Liquidity Bridge: Extract transaction cost drag & market impact
   */
  static bridgeFromPhase18Liquidity(liquidityPackage) {
    if (!liquidityPackage) {
      return {
        costBps: null,
        liquidationHorizonDays: null,
        status: DataClassification.UNAVAILABLE
      };
    }
    return {
      costBps: typeof liquidityPackage.weightedSpreadBps === 'number' ? liquidityPackage.weightedSpreadBps : (liquidityPackage.averageCostBps ?? null),
      liquidationHorizonDays: liquidityPackage.portfolioTimeToLiquidateDays ?? null,
      status: DataClassification.DERIVED
    };
  }

  /**
   * Phase 17 Tax Bridge: Extract effective capital gains tax rate
   */
  static bridgeFromPhase17Tax(taxPackage) {
    if (!taxPackage) {
      return {
        effectiveTaxRate: null,
        unrealizedGainsPercent: null,
        status: DataClassification.UNAVAILABLE
      };
    }
    return {
      effectiveTaxRate: taxPackage.blendedTaxRate ?? null,
      unrealizedGainsPercent: taxPackage.unrealizedGainsPercent ?? null,
      status: DataClassification.DERIVED
    };
  }

  /**
   * Phase 16 Compliance Bridge: Validate risk forecast against canonical compliance precedence
   */
  static bridgeToPhase16Compliance(limitEvaluations) {
    if (!limitEvaluations || !Array.isArray(limitEvaluations.evaluations)) return null;
    const breaches = limitEvaluations.evaluations.filter(e => e.isBreached);
    return {
      complianceStatus: breaches.length === 0 ? 'COMPLIANT' : 'BREACH_DETECTED',
      breachCount: breaches.length,
      highestPrecedence: limitEvaluations.highestPrecedenceBreach,
      breaches: breaches.map(b => ({
        ruleId: b.limitId,
        metric: b.metric,
        threshold: b.threshold,
        observedValue: b.observedValue,
        precedence: b.precedence
      })),
      status: DataClassification.DERIVED
    };
  }
}
