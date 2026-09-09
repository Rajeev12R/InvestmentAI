import { defaultAttributionStore } from './attribution.store.js';

export class SignalRealizationEngine {
  constructor(store = defaultAttributionStore) {
    this.store = store;
  }

  /**
   * Calculate deterministic realized outcomes across all institutional return dimensions.
   */
  calculateRealizedOutcome(tenantId = 'tenant_default', {
    outcomeId,
    entityId,
    signalId,
    priceStart,
    priceEnd,
    dividends = 0,
    corporateActionFactor = 1.0,
    benchmarkReturn = 0,
    sectorReturn = 0,
    riskFreeRate = 0,
    fxReturn = 0,
    priceTrajectory = [], // Array of intermediate prices [p1, p2, ...]
    outcomeStart,
    outcomeEnd,
    informationCutoff
  }) {
    if (!entityId) throw new Error('entityId is required');
    if (priceStart === undefined || priceStart === null || isNaN(priceStart) || priceStart <= 0) {
      throw new Error('Valid positive priceStart is required');
    }
    if (priceEnd === undefined || priceEnd === null || isNaN(priceEnd) || priceEnd < 0) {
      throw new Error('Valid non-negative priceEnd is required');
    }
    if (!outcomeStart || !outcomeEnd) {
      throw new Error('outcomeStart and outcomeEnd timestamps are required');
    }
    if (new Date(outcomeStart) >= new Date(outcomeEnd)) {
      throw new Error('outcomeStart must be strictly before outcomeEnd');
    }
    if (informationCutoff && new Date(informationCutoff) > new Date(outcomeStart)) {
      throw new Error('Temporal violation: informationCutoff cannot be after outcomeStart');
    }

    const adjEndPrice = priceEnd * corporateActionFactor;
    const priceReturn = parseFloat(((adjEndPrice - priceStart) / priceStart).toFixed(6));
    const totalReturn = parseFloat(((adjEndPrice - priceStart + dividends) / priceStart).toFixed(6));
    const excessReturn = parseFloat((totalReturn - riskFreeRate).toFixed(6));
    const benchmarkRelativeReturn = parseFloat((totalReturn - benchmarkReturn).toFixed(6));
    const sectorRelativeReturn = parseFloat((totalReturn - sectorReturn).toFixed(6));
    const fxAdjustedReturn = parseFloat(((1 + totalReturn) * (1 + fxReturn) - 1).toFixed(6));

    // MAE (Maximum Adverse Excursion) and MFE (Maximum Favorable Excursion)
    let maxAdverseExcursion = 0.0;
    let maxFavorableExcursion = 0.0;

    if (Array.isArray(priceTrajectory) && priceTrajectory.length > 0) {
      for (const p of priceTrajectory) {
        if (typeof p === 'number' && p > 0) {
          const intermediateReturn = (p - priceStart) / priceStart;
          if (intermediateReturn < maxAdverseExcursion) {
            maxAdverseExcursion = intermediateReturn;
          }
          if (intermediateReturn > maxFavorableExcursion) {
            maxFavorableExcursion = intermediateReturn;
          }
        }
      }
    } else {
      maxAdverseExcursion = Math.min(0, priceReturn);
      maxFavorableExcursion = Math.max(0, priceReturn);
    }

    maxAdverseExcursion = parseFloat(maxAdverseExcursion.toFixed(6));
    maxFavorableExcursion = parseFloat(maxFavorableExcursion.toFixed(6));

    const id = outcomeId || `out_${entityId}_${signalId || 'gen'}_${new Date(outcomeStart).getTime()}`;
    const record = {
      outcomeId: id,
      entityId,
      signalId: signalId || 'UNSPECIFIED',
      priceStart,
      priceEnd,
      dividends,
      corporateActionFactor,
      priceReturn,
      totalReturn,
      realizedReturn: totalReturn,
      excessReturn,
      benchmarkRelativeReturn,
      sectorRelativeReturn,
      fxAdjustedReturn,
      maxAdverseExcursion,
      maxFavorableExcursion,
      outcomeStart,
      outcomeEnd,
      informationCutoff: informationCutoff || outcomeStart,
      calculatedAt: outcomeEnd
    };

    return this.store.saveOutcome(tenantId, record);
  }
}

export const defaultRealizationEngine = new SignalRealizationEngine();
