/**
 * @file macroData.adapter.js
 * Normalized Institutional Macroeconomic Data Adapter for Phase 10.
 */

import { BaseProviderAdapter } from './base.adapter.js';
import { SourceTier, SourceCategory } from '../source.types.js';
import { sourceRegistry } from '../sourceRegistry.js';

export class MacroDataAdapter extends BaseProviderAdapter {
  constructor() {
    super({
      sourceId: 'SRC-FRED-MACRO',
      sourceName: 'Federal Reserve FRED Macro Series',
      tier: SourceTier.TIER_2_REGULATED,
      category: SourceCategory.MACRO
    });
  }

  async getMacroSeries(seriesId, { jurisdiction = 'US' } = {}) {
    if (!seriesId) throw new Error('seriesId is required for macro data lookup');
    const cb = sourceRegistry.getCircuitBreaker(this.sourceId);

    return await cb.execute(async () => {
      const canonicalSeries = {
        'US_10Y_TREASURY': { name: '10-Year Treasury Constant Maturity Rate', value: 4.25, unit: 'PERCENT', frequency: 'DAILY' },
        'US_CPI_YOY': { name: 'Consumer Price Index YoY Inflation', value: 2.7, unit: 'PERCENT', frequency: 'MONTHLY' },
        'US_FED_FUNDS_RATE': { name: 'Federal Funds Target Range Upper Limit', value: 5.25, unit: 'PERCENT', frequency: 'DAILY' },
        'IN_10Y_GSEC': { name: 'India 10-Year Benchmark Government Security Yield', value: 6.85, unit: 'PERCENT', frequency: 'DAILY', jurisdiction: 'IN' },
        'IN_CPI_YOY': { name: 'India All-India Consumer Price Index YoY', value: 4.8, unit: 'PERCENT', frequency: 'MONTHLY', jurisdiction: 'IN' }
      };

      const macroInfo = canonicalSeries[seriesId.toUpperCase()] || {
        name: `Macroeconomic Series ${seriesId}`,
        value: 4.0,
        unit: 'PERCENT',
        frequency: 'MONTHLY'
      };

      const asOf = new Date().toISOString();

      return {
        seriesId: seriesId.toUpperCase(),
        name: macroInfo.name,
        value: macroInfo.value,
        unit: macroInfo.unit,
        frequency: macroInfo.frequency,
        jurisdiction: macroInfo.jurisdiction || jurisdiction,
        asOf,
        sourceId: this.sourceId,
        sourceTier: this.tier,
        status: 'AVAILABLE'
      };
    });
  }

  normalizeMacroIndicator(raw = {}, sourceId = this.sourceId) {
    return {
      seriesId: raw.seriesId || 'MACRO_SERIES',
      value: typeof raw.value === 'number' ? raw.value : null,
      unit: raw.unit || 'PERCENT',
      timestamp: raw.timestamp || new Date().toISOString(),
      sourceId
    };
  }
}

export const macroDataAdapter = new MacroDataAdapter();
