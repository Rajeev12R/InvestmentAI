import { ModelHealthState, DataClassification } from './riskForecast.types.js';
import { RiskForecastConfig } from './riskForecast.config.js';

/**
 * Phase 31 — Model Validation & Model Health Assessment Engine
 */
export class RiskForecastModelRiskEngine {
  /**
   * Assess Model Health and Data Sufficiency for Risk Forecasting
   */
  static evaluateModelHealth({
    modelId = 'MODEL_RISK_FORECAST_V1',
    modelVersion = RiskForecastConfig.VERSION,
    observationCount,
    assetCount,
    covarianceQuality = null,
    isStale = false,
    asOfCutoff
  }) {
    const minObsVol = RiskForecastConfig.MIN_OBSERVATIONS.VOLATILITY;
    const minObsCov = RiskForecastConfig.MIN_OBSERVATIONS.COVARIANCE;

    let healthState = ModelHealthState.VALID;
    const diagnostics = [];

    if (typeof observationCount !== 'number' || observationCount < minObsVol) {
      healthState = ModelHealthState.INSUFFICIENT_DATA;
      diagnostics.push(`Observation count ${observationCount} is below minimum requirement (${minObsVol})`);
    }

    if (assetCount > 1 && (typeof observationCount !== 'number' || observationCount < minObsCov)) {
      healthState = ModelHealthState.INSUFFICIENT_DATA;
      diagnostics.push(`Observation count ${observationCount} is insufficient for multi-asset covariance (${minObsCov})`);
    }

    if (covarianceQuality) {
      if (!covarianceQuality.positiveSemidefinite) {
        healthState = ModelHealthState.FAILED;
        diagnostics.push(`Covariance matrix is non-positive semidefinite (min eigenvalue: ${covarianceQuality.minimumEigenvalue})`);
      } else if (covarianceQuality.isIllConditioned) {
        if (healthState === ModelHealthState.VALID) {
          healthState = ModelHealthState.DEGRADED;
        }
        diagnostics.push(`Covariance matrix is ill-conditioned (condition number: ${covarianceQuality.conditionNumber})`);
      }
    }

    if (isStale) {
      healthState = ModelHealthState.STALE;
      diagnostics.push('Input observation data or configuration version is stale');
    }

    return {
      status: DataClassification.DERIVED,
      modelId,
      modelVersion,
      healthState,
      isValid: healthState === ModelHealthState.VALID || healthState === ModelHealthState.DEGRADED,
      isDegraded: healthState === ModelHealthState.DEGRADED,
      isFailed: healthState === ModelHealthState.FAILED,
      isInsufficientData: healthState === ModelHealthState.INSUFFICIENT_DATA,
      isStale: healthState === ModelHealthState.STALE,
      observationCount,
      assetCount,
      asOfCutoff,
      diagnostics,
      limitations: [
        'Forecast assumes point-in-time stationarity of covariance over the selected horizon.',
        'Parametric VaR assumes Gaussian return distribution.',
        'High market stress may cause non-linear correlation breakdowns.'
      ]
    };
  }
}
