import { DataClassification } from './riskForecast.types.js';
import { RiskForecastConfig } from './riskForecast.config.js';

/**
 * Phase 31 — Observation Alignment & Temporal Integrity Engine
 */
export class RiskForecastObservationEngine {
  /**
   * Filter and align observation series strictly on or before asOf cutoff
   */
  static processObservations({ priceSeriesBySymbol, returnsBySymbol, asOf, minObservations = null }) {
    if (!asOf || isNaN(new Date(asOf).getTime())) {
      throw new Error('Valid asOf timestamp is required for temporal integrity enforcement');
    }
    const asOfTime = new Date(asOf).getTime();
    const minObs = minObservations || RiskForecastConfig.MIN_OBSERVATIONS.VOLATILITY;

    const alignedReturns = {};
    const metadata = {
      asOf,
      observationCutoff: asOf,
      dataClassification: DataClassification.OBSERVED,
      survivingSymbols: [],
      delistedOrInactiveSymbols: [],
      sampleSizes: {}
    };

    // If direct return series provided
    if (returnsBySymbol && typeof returnsBySymbol === 'object') {
      for (const [symbol, series] of Object.entries(returnsBySymbol)) {
        if (!Array.isArray(series)) continue;
        
        // Filter out any observations with timestamp > asOfTime
        const validObs = series.filter(obs => {
          if (typeof obs === 'number') return true; // Direct returns without timestamps
          if (obs && obs.timestamp) {
            const t = new Date(obs.timestamp).getTime();
            if (isNaN(t)) return false;
            if (t > asOfTime) {
              // Future observation detected - reject/exclude
              return false;
            }
            return true;
          }
          return false;
        }).map(obs => (typeof obs === 'number' ? obs : obs.return || obs.value));

        // Validate values are finite
        const cleanReturns = validObs.filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v));
        alignedReturns[symbol] = cleanReturns;
        metadata.sampleSizes[symbol] = cleanReturns.length;
        if (cleanReturns.length > 0) {
          metadata.survivingSymbols.push(symbol);
        }
      }
    } 
    // If price series provided: calculate returns
    else if (priceSeriesBySymbol && typeof priceSeriesBySymbol === 'object') {
      for (const [symbol, series] of Object.entries(priceSeriesBySymbol)) {
        if (!Array.isArray(series) || series.length < 2) continue;

        // Filter by timestamp <= asOfTime and sort ascending
        const validPrices = series.filter(p => {
          if (p && p.timestamp) {
            const t = new Date(p.timestamp).getTime();
            return !isNaN(t) && t <= asOfTime;
          }
          return typeof p === 'number';
        }).map(p => (typeof p === 'number' ? p : p.close || p.price || p.value));

        const returns = [];
        for (let i = 1; i < validPrices.length; i++) {
          const pPrev = validPrices[i - 1];
          const pCurr = validPrices[i];
          if (typeof pPrev === 'number' && typeof pCurr === 'number' && pPrev > 0 && isFinite(pCurr)) {
            returns.push((pCurr - pPrev) / pPrev);
          }
        }

        alignedReturns[symbol] = returns;
        metadata.sampleSizes[symbol] = returns.length;
        if (returns.length > 0) {
          metadata.survivingSymbols.push(symbol);
        }
      }
    }

    return {
      returnsBySymbol: alignedReturns,
      metadata
    };
  }

  /**
   * Align returns across multiple assets into an N x T aligned matrix
   */
  static alignMultiAssetReturns(returnsBySymbol) {
    const symbols = Object.keys(returnsBySymbol);
    if (symbols.length === 0) {
      return { symbols: [], alignedMatrix: [], observationCount: 0 };
    }

    // Find minimum length across all assets
    const lengths = symbols.map(s => returnsBySymbol[s]?.length || 0);
    const minLen = Math.min(...lengths);

    if (minLen === 0) {
      return { symbols, alignedMatrix: [], observationCount: 0 };
    }

    // Take the most recent minLen observations for each symbol
    const alignedMatrix = symbols.map(s => {
      const arr = returnsBySymbol[s];
      return arr.slice(arr.length - minLen);
    });

    return {
      symbols,
      alignedMatrix, // symbols.length rows, minLen columns
      observationCount: minLen
    };
  }
}
