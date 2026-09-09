/**
 * server/forecasting/forecast.consensus.engine.js
 * 
 * Phase 20: External Consensus Integration & Conflict Engine
 * Manages external consensus estimates, dispersion, and conflict analysis with internal models.
 * Enforces explicit provenance separation (SOURCE_DEFINITION, SOURCE_VERIFICATION, CONSENSUS_OBSERVATION, CONSENSUS_DERIVATION)
 * and strict separation between internal forecasts and external consensus.
 */

import { ForecastClassification, ForecastMethod } from './forecast.types.js';
import { validateConsensusInput } from './forecast.schema.js';
import crypto from 'crypto';

export class ConsensusEngine {
  constructor() {
    // Map<ticker_metric_period, ConsensusRecord>
    this.consensusStore = new Map();
  }

  _getKey(ticker, metric, period) {
    return `${ticker.toUpperCase()}_${metric.toUpperCase()}_${period.toUpperCase()}`;
  }

  /**
   * Ingests external consensus data with strict source provenance.
   * Explicitly separates SOURCE_DEFINITION, SOURCE_VERIFICATION, and CONSENSUS_OBSERVATION.
   * 
   * @param {Object} consensusData - Ingested consensus record
   * @returns {Object} Immutable stored consensus record
   */
  recordConsensus(consensusData) {
    validateConsensusInput(consensusData);

    const ticker = consensusData.ticker.toUpperCase();
    const metric = consensusData.metric.toUpperCase();
    const period = (consensusData.period || 'FY+1').toUpperCase();
    const key = this._getKey(ticker, metric, period);

    const providerName = consensusData.sourceProvider || 'VENDOR_AGGREGATE';
    const isLiveVerified = consensusData.sourceVerificationStatus === 'VERIFIED_EXTERNAL_AUTHORITY';
    
    // Explicit Provenance Breakdown:
    const sourceDefinition = {
      sourceId: `SRC-CONSENSUS-${providerName.toUpperCase()}`,
      sourceName: providerName,
      sourceType: 'EXTERNAL_CONSENSUS_VENDOR',
      sourceTier: consensusData.sourceTier || 'TIER_2_CONSENSUS_AGGREGATOR',
      protocol: 'REST_BATCH_FEED',
      endpoint: `https://api.vendor.com/consensus/${ticker.toLowerCase()}`
    };

    const sourceVerification = {
      verificationStatus: isLiveVerified ? 'VERIFIED_DIRECT_FEED' : 'UNVERIFIED_SOURCE',
      verificationEvidenceId: consensusData.evidenceId || `EVID-FIXTURE-${crypto.randomBytes(4).toString('hex')}`,
      verificationEvidenceHash: consensusData.evidenceHash || crypto.createHash('sha256').update(JSON.stringify(sourceDefinition)).digest('hex'),
      verifiedAt: isLiveVerified ? (consensusData.verifiedAt || new Date().toISOString()) : null,
      verificationAuthority: isLiveVerified ? consensusData.verificationAuthority : 'UNVERIFIED_OFFLINE_FIXTURE',
      sourceClassification: isLiveVerified ? ForecastClassification.REAL_DATA : ForecastClassification.CONFIGURED
    };

    const consensusObservation = {
      observationTimestamp: consensusData.effectiveAt || new Date().toISOString(),
      retrievalTimestamp: new Date().toISOString(),
      forecastPeriod: period,
      metric,
      meanEstimate: consensusData.meanEstimate,
      medianEstimate: consensusData.medianEstimate !== undefined ? consensusData.medianEstimate : consensusData.meanEstimate,
      highEstimate: consensusData.highEstimate !== undefined ? consensusData.highEstimate : null,
      lowEstimate: consensusData.lowEstimate !== undefined ? consensusData.lowEstimate : null,
      analystCount: consensusData.analystCount || 1,
      sourceDocument: consensusData.sourceDocument || `Consensus Report: ${providerName} ${ticker} ${period}`,
      rawEvidenceHash: crypto.createHash('sha256').update(`${ticker}_${metric}_${period}_${consensusData.meanEstimate}`).digest('hex'),
      classification: isLiveVerified ? ForecastClassification.REAL_DATA : ForecastClassification.CONFIGURED
    };

    // Consensus Derivation (Calculated dispersion & coefficient of variation):
    let dispersionBps = null;
    let coefficientOfVariation = null;
    if (consensusData.highEstimate !== null && consensusData.highEstimate !== undefined &&
        consensusData.lowEstimate !== null && consensusData.lowEstimate !== undefined &&
        consensusData.meanEstimate > 0) {
      dispersionBps = ((consensusData.highEstimate - consensusData.lowEstimate) / consensusData.meanEstimate) * 10000;
      // Estimate standard deviation via range approximation (Range / 4 for small sample) or explicit stdDev:
      const estimatedStdDev = (consensusData.highEstimate - consensusData.lowEstimate) / 4.0;
      coefficientOfVariation = estimatedStdDev / consensusData.meanEstimate;
    }

    const record = {
      ticker,
      metric,
      period,
      sourceDefinition,
      sourceVerification,
      consensusObservation,
      consensusDerivation: {
        dispersionBps,
        coefficientOfVariation,
        derivationMethod: 'DISPERSION_FROM_VENDOR_BOUNDS',
        classification: ForecastClassification.DERIVED
      },
      // Summary fields for backward-compatible consumer access
      meanEstimate: consensusData.meanEstimate,
      medianEstimate: consensusObservation.medianEstimate,
      highEstimate: consensusObservation.highEstimate,
      lowEstimate: consensusObservation.lowEstimate,
      analystCount: consensusObservation.analystCount,
      sourceProvider: providerName,
      effectiveAt: consensusObservation.observationTimestamp,
      dispersionBps,
      classification: ForecastClassification.DERIVED
    };

    this.consensusStore.set(key, Object.freeze(record));
    return this.consensusStore.get(key);
  }

  /**
   * Retrieves consensus record
   */
  getConsensus(ticker, metric, period = 'FY+1') {
    const key = this._getKey(ticker, metric, period);
    return this.consensusStore.get(key) || null;
  }

  /**
   * Compares internal model forecast against external consensus without silent blending.
   * Output is classified as DERIVED (comparison metrics), keeping internal FORECAST and external consensus separate.
   */
  compareInternalVsConsensus(internalForecast, ticker, metric, period = 'FY+1') {
    const consensus = this.getConsensus(ticker, metric, period);
    const internalValue = typeof internalForecast === 'number' ? internalForecast : (internalForecast?.forecastValue || null);

    if (internalValue === null || !Number.isFinite(internalValue)) {
      throw new Error('Valid numerical internal forecast value required for consensus comparison');
    }

    if (!consensus) {
      return {
        hasConsensus: false,
        ticker: ticker.toUpperCase(),
        metric: metric.toUpperCase(),
        period: period.toUpperCase(),
        internalValue,
        consensus: null,
        comparison: null
      };
    }

    const deltaDollar = internalValue - consensus.meanEstimate;
    const deltaPercent = consensus.meanEstimate !== 0 ? (deltaDollar / Math.abs(consensus.meanEstimate)) : 0.0;
    const isWithinConsensusRange = (consensus.highEstimate !== null && consensus.lowEstimate !== null)
      ? (internalValue >= consensus.lowEstimate && internalValue <= consensus.highEstimate)
      : null;

    return {
      hasConsensus: true,
      ticker: ticker.toUpperCase(),
      metric: metric.toUpperCase(),
      period: period.toUpperCase(),
      internal: {
        value: internalValue,
        classification: ForecastClassification.FORECAST
      },
      consensus: {
        mean: consensus.meanEstimate,
        median: consensus.medianEstimate,
        high: consensus.highEstimate,
        low: consensus.lowEstimate,
        analystCount: consensus.analystCount,
        sourceProvider: consensus.sourceProvider,
        sourceVerification: consensus.sourceVerification.verificationStatus,
        effectiveAt: consensus.effectiveAt,
        dispersionBps: consensus.dispersionBps,
        classification: consensus.classification
      },
      comparison: {
        deltaDollar,
        deltaPercent,
        isAboveConsensus: deltaDollar > 0,
        isBelowConsensus: deltaDollar < 0,
        isWithinConsensusRange,
        divergenceClassification: Math.abs(deltaPercent) > 0.15 ? 'HIGH_DIVERGENCE' : 'ALIGNED',
        classification: ForecastClassification.DERIVED
      },
      divergence: {
        deltaDollar,
        deltaPercent,
        isAboveConsensus: deltaDollar > 0,
        isBelowConsensus: deltaDollar < 0,
        isWithinConsensusRange,
        classification: ForecastClassification.DERIVED
      },
      separationRule: 'INTERNAL_FORECAST_AND_CONSENSUS_STRICTLY_SEPARATED_NO_AUTO_BLEND'
    };
  }
}

export const defaultConsensusEngine = new ConsensusEngine();
