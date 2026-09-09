import { RiskHorizon, VolatilityModel, CovarianceModel, VaRMethod, BudgetScope, CompliancePrecedence } from './riskForecast.types.js';
import { RiskForecastConfig } from './riskForecast.config.js';

/**
 * Phase 31 — Deterministic Schemas and Validation Rules
 */

export class RiskForecastSchema {
  static validateForecastRequest(payload) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Forecast request payload must be a non-null object');
    }
    const { portfolioSnapshotId, asOf, horizons, holdings, benchmarkHoldings } = payload;
    if (!portfolioSnapshotId || typeof portfolioSnapshotId !== 'string') {
      throw new Error('portfolioSnapshotId is required and must be a string');
    }
    if (!asOf || isNaN(new Date(asOf).getTime())) {
      throw new Error('asOf is required and must be a valid ISO timestamp');
    }
    if (horizons && !Array.isArray(horizons)) {
      throw new Error('horizons must be an array of supported horizons');
    }
    if (horizons) {
      const allowedHorizons = Object.values(RiskHorizon);
      for (const h of horizons) {
        if (!allowedHorizons.includes(h)) {
          throw new Error(`Unsupported risk horizon: ${h}. Allowed: ${allowedHorizons.join(', ')}`);
        }
      }
    }
    if (!Array.isArray(holdings) || holdings.length === 0) {
      throw new Error('holdings must be a non-empty array of asset holdings');
    }
    for (const h of holdings) {
      if (!h.symbol || typeof h.symbol !== 'string') {
        throw new Error('Each holding must have a valid symbol');
      }
      if (typeof h.weight !== 'number' || isNaN(h.weight)) {
        throw new Error(`Holding ${h.symbol} must have a valid numeric weight`);
      }
    }
    return true;
  }

  static validateRiskBudget(budget) {
    if (!budget || typeof budget !== 'object') {
      throw new Error('Risk budget must be a non-null object');
    }
    const { budgetId, scope, metric, limit, unit } = budget;
    if (!budgetId || typeof budgetId !== 'string') {
      throw new Error('budgetId is required and must be a string');
    }
    const allowedScopes = Object.values(BudgetScope);
    if (!scope || !allowedScopes.includes(scope)) {
      throw new Error(`Invalid budget scope: ${scope}. Allowed: ${allowedScopes.join(', ')}`);
    }
    if (!metric || typeof metric !== 'string') {
      throw new Error('metric is required and must be a string');
    }
    if (typeof limit !== 'number' || isNaN(limit) || !isFinite(limit) || limit <= 0) {
      throw new Error(`Risk budget limit must be a positive finite number, received: ${limit}`);
    }
    return true;
  }

  static validateRiskLimit(limit) {
    if (!limit || typeof limit !== 'object') {
      throw new Error('Risk limit must be a non-null object');
    }
    const { limitId, precedence, threshold, metric } = limit;
    if (!limitId || typeof limitId !== 'string') {
      throw new Error('limitId is required and must be a string');
    }
    const allowedPrecedences = Object.values(CompliancePrecedence);
    if (!precedence || !allowedPrecedences.includes(precedence)) {
      throw new Error(`Invalid precedence: ${precedence}. Allowed: ${allowedPrecedences.join(', ')}`);
    }
    if (!metric || typeof metric !== 'string') {
      throw new Error('metric is required and must be a string');
    }
    if (typeof threshold !== 'number' || isNaN(threshold) || !isFinite(threshold)) {
      throw new Error(`Risk limit threshold must be a finite number, received: ${threshold}`);
    }
    return true;
  }
}
