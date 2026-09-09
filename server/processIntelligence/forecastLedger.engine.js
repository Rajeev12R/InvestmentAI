/**
 * Phase 13 - Forecast Ledger Engine
 * 
 * Deterministic ledger for recording and scoring explicit forecasts.
 * Evaluates numeric, directional, threshold, and event forecasts against observed facts.
 */

import { deepFreeze, computeDeterministicHash, ForecastType, ForecastStatus } from './process.types.js';

export class ForecastLedgerEngine {
  constructor() {
    this.forecasts = new Map(); // forecastId -> ForecastRecord
    this.decisionForecasts = new Map(); // decisionId -> [forecastId]
  }

  /**
   * Record an immutable forecast
   */
  recordForecast(params) {
    const {
      forecastId,
      decisionId,
      workspaceId,
      ticker,
      metric,
      forecastType,
      predictedValue = null,
      predictedRange = null,
      predictedDirection = null,
      thresholdValue = null,
      comparisonOperator = null, // 'GTE', 'LTE', 'GT', 'LT', 'EQ'
      confidence = 0.5,
      forecastTimestamp = new Date().toISOString(),
      horizon = '12_MONTHS',
      evidenceIds = [],
      sourceDecision = 'BUY',
      status = ForecastStatus.PENDING
    } = params;

    if (!forecastId || !decisionId || !workspaceId || !ticker || !metric || !forecastType) {
      throw new Error('Missing required fields for Forecast: forecastId, decisionId, workspaceId, ticker, metric, forecastType');
    }

    if (!Object.values(ForecastType).includes(forecastType)) {
      throw new Error(`Invalid forecastType: ${forecastType}. Must be one of ${Object.values(ForecastType).join(', ')}`);
    }

    if (this.forecasts.has(forecastId)) {
      throw new Error(`Forecast already exists for forecastId: ${forecastId}. Forecasts are immutable once recorded.`);
    }

    if (confidence < 0.0 || confidence > 1.0) {
      throw new Error(`Invalid confidence score: ${confidence}. Must be between 0.0 and 1.0.`);
    }

    const payloadToHash = {
      forecastId,
      decisionId,
      workspaceId,
      ticker,
      metric,
      forecastType,
      predictedValue: typeof predictedValue === 'number' ? predictedValue : null,
      predictedRange: predictedRange ? { min: Number(predictedRange.min), max: Number(predictedRange.max) } : null,
      predictedDirection: predictedDirection || null,
      thresholdValue: typeof thresholdValue === 'number' ? thresholdValue : null,
      comparisonOperator: comparisonOperator || null,
      confidence: Number(confidence),
      forecastTimestamp: new Date(forecastTimestamp).toISOString(),
      horizon,
      evidenceIds: [...evidenceIds].sort(),
      sourceDecision,
      status
    };

    const packageHash = computeDeterministicHash(payloadToHash);

    const forecast = {
      ...payloadToHash,
      packageHash
    };

    const frozenForecast = deepFreeze(forecast);
    this.forecasts.set(forecastId, frozenForecast);

    if (!this.decisionForecasts.has(decisionId)) {
      this.decisionForecasts.set(decisionId, []);
    }
    this.decisionForecasts.get(decisionId).push(forecastId);

    return frozenForecast;
  }

  /**
   * Score a forecast deterministically against an outcome observation
   */
  scoreForecast(forecastId, observation, workspaceId) {
    const forecast = this.forecasts.get(forecastId);
    if (!forecast) {
      throw new Error(`Forecast not found: ${forecastId}`);
    }

    if (workspaceId && forecast.workspaceId !== workspaceId) {
      throw new Error(`Unauthorized workspace access for forecastId ${forecastId}`);
    }

    if (!observation || observation.actualValue === null || observation.actualValue === undefined) {
      return {
        forecastId,
        status: ForecastStatus.INSUFFICIENT_DATA,
        reason: 'Missing observed actual value',
        normalizedError: null,
        absoluteError: null,
        percentageError: null,
        isValidated: false,
        isFalsified: false
      };
    }

    const actual = observation.actualValue;
    let status = ForecastStatus.PENDING;
    let normalizedError = null;
    let absoluteError = null;
    let percentageError = null;
    let isValidated = false;
    let isFalsified = false;

    // Check forecast types
    switch (forecast.forecastType) {
      case ForecastType.NUMERIC_RANGE: {
        if (!forecast.predictedRange || typeof forecast.predictedRange.min !== 'number' || typeof forecast.predictedRange.max !== 'number') {
          status = ForecastStatus.INSUFFICIENT_DATA;
          break;
        }
        const { min, max } = forecast.predictedRange;
        const midPoint = (min + max) / 2;
        absoluteError = Math.abs(actual - midPoint);
        percentageError = midPoint !== 0 ? absoluteError / Math.abs(midPoint) : 0;
        normalizedError = (max - min) > 0 ? absoluteError / (max - min) : absoluteError;

        if (actual >= min && actual <= max) {
          status = ForecastStatus.VALIDATED;
          isValidated = true;
        } else {
          status = ForecastStatus.FALSIFIED;
          isFalsified = true;
        }
        break;
      }

      case ForecastType.NUMERIC_POINT: {
        if (typeof forecast.predictedValue !== 'number') {
          status = ForecastStatus.INSUFFICIENT_DATA;
          break;
        }
        absoluteError = Math.abs(actual - forecast.predictedValue);
        percentageError = forecast.predictedValue !== 0 ? absoluteError / Math.abs(forecast.predictedValue) : (actual === 0 ? 0 : 1);
        normalizedError = percentageError;

        // Exact match or within reasonable tolerance (e.g. 5%)
        if (percentageError <= 0.05) {
          status = ForecastStatus.VALIDATED;
          isValidated = true;
        } else if (percentageError <= 0.15) {
          status = ForecastStatus.PARTIALLY_VALIDATED;
          isValidated = true;
        } else {
          status = ForecastStatus.FALSIFIED;
          isFalsified = true;
        }
        break;
      }

      case ForecastType.DIRECTIONAL: {
        if (!forecast.predictedDirection) {
          status = ForecastStatus.INSUFFICIENT_DATA;
          break;
        }
        const baseline = typeof forecast.predictedValue === 'number' ? forecast.predictedValue : 0;
        const change = actual - baseline;

        if (forecast.predictedDirection === 'IMPROVE' || forecast.predictedDirection === 'GROWTH' || forecast.predictedDirection === 'UP') {
          if (change > 0) {
            status = ForecastStatus.VALIDATED;
            isValidated = true;
          } else {
            status = ForecastStatus.FALSIFIED;
            isFalsified = true;
          }
        } else if (forecast.predictedDirection === 'DECLINE' || forecast.predictedDirection === 'DOWN') {
          if (change < 0) {
            status = ForecastStatus.VALIDATED;
            isValidated = true;
          } else {
            status = ForecastStatus.FALSIFIED;
            isFalsified = true;
          }
        } else if (forecast.predictedDirection === 'STABLE') {
          if (Math.abs(change) <= 0.02 * Math.abs(baseline || 1)) {
            status = ForecastStatus.VALIDATED;
            isValidated = true;
          } else {
            status = ForecastStatus.FALSIFIED;
            isFalsified = true;
          }
        } else {
          status = ForecastStatus.INSUFFICIENT_DATA;
        }
        break;
      }

      case ForecastType.THRESHOLD: {
        const threshold = typeof forecast.thresholdValue === 'number' ? forecast.thresholdValue : forecast.predictedValue;
        if (typeof threshold !== 'number') {
          status = ForecastStatus.INSUFFICIENT_DATA;
          break;
        }
        const op = forecast.comparisonOperator || 'GTE';
        let conditionMet = false;
        if (op === 'GTE' || op === '>=' || op === 'ABOVE_THRESHOLD') conditionMet = actual >= threshold;
        else if (op === 'LTE' || op === '<=' || op === 'BELOW_THRESHOLD') conditionMet = actual <= threshold;
        else if (op === 'GT' || op === '>') conditionMet = actual > threshold;
        else if (op === 'LT' || op === '<') conditionMet = actual < threshold;
        else if (op === 'EQ' || op === '==') conditionMet = actual === threshold;

        if (conditionMet) {
          status = ForecastStatus.VALIDATED;
          isValidated = true;
        } else {
          status = ForecastStatus.FALSIFIED;
          isFalsified = true;
        }
        break;
      }

      case ForecastType.EVENT: {
        const realized = Boolean(observation.realized !== undefined ? observation.realized : actual);
        const expected = forecast.predictedDirection === 'REALIZE' || forecast.predictedValue === 1;
        if (realized === expected) {
          status = ForecastStatus.VALIDATED;
          isValidated = true;
        } else {
          status = ForecastStatus.FALSIFIED;
          isFalsified = true;
        }
        break;
      }

      default:
        status = ForecastStatus.INSUFFICIENT_DATA;
    }

    const evaluationResult = {
      forecastId,
      metric: forecast.metric,
      forecastType: forecast.forecastType,
      confidence: forecast.confidence,
      actualValue: actual,
      status,
      absoluteError,
      percentageError,
      normalizedError,
      isValidated,
      isFalsified,
      evaluatedAt: new Date().toISOString()
    };

    return deepFreeze(evaluationResult);
  }

  /**
   * Get forecasts for a decision
   */
  getForecastsByDecision(decisionId, workspaceId) {
    const ids = this.decisionForecasts.get(decisionId) || [];
    const results = [];
    for (const fId of ids) {
      const f = this.forecasts.get(fId);
      if (f) {
        if (workspaceId && f.workspaceId !== workspaceId) {
          throw new Error(`Unauthorized workspace access for forecastId ${fId}`);
        }
        results.push(f);
      }
    }
    return results;
  }

  /**
   * Clear store for testing
   */
  clear() {
    this.forecasts.clear();
    this.decisionForecasts.clear();
  }
}

export const forecastLedgerEngine = new ForecastLedgerEngine();
