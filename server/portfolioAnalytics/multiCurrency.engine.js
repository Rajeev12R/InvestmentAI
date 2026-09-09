/**
 * Multi-Currency Portfolio Valuation Engine — Phase 12
 * Strictly deterministic FX conversion with provenance.
 * Never defaults to FXRate = 1.0 for cross-currency. Missing FX -> UNAVAILABLE.
 */

import { AnalyticsStatus } from './portfolioAnalytics.types.js';

// Default reference rates from Phase 10 ECB & FX feeds with timestamps
const KNOWN_FX_RATES = {
    'USD_INR': { rate: 86.50, source: 'ECB_FED_ORCHESTRATOR', timestamp: '2026-09-06T00:00:00.000Z' },
    'INR_USD': { rate: 1 / 86.50, source: 'ECB_FED_ORCHESTRATOR', timestamp: '2026-09-06T00:00:00.000Z' },
    'EUR_USD': { rate: 1.085, source: 'ECB_REFERENCE_RATES', timestamp: '2026-09-06T00:00:00.000Z' },
    'USD_EUR': { rate: 1 / 1.085, source: 'ECB_REFERENCE_RATES', timestamp: '2026-09-06T00:00:00.000Z' },
    'EUR_INR': { rate: 1.085 * 86.50, source: 'ECB_CROSS_CALCULATED', timestamp: '2026-09-06T00:00:00.000Z' },
    'INR_EUR': { rate: 1 / (1.085 * 86.50), source: 'ECB_CROSS_CALCULATED', timestamp: '2026-09-06T00:00:00.000Z' },
    'GBP_USD': { rate: 1.285, source: 'ECB_REFERENCE_RATES', timestamp: '2026-09-06T00:00:00.000Z' },
    'USD_GBP': { rate: 1 / 1.285, source: 'ECB_REFERENCE_RATES', timestamp: '2026-09-06T00:00:00.000Z' }
};

export class MultiCurrencyEngine {
    constructor(customRates = {}) {
        this.fxTable = { ...KNOWN_FX_RATES, ...customRates };
    }

    /**
     * Converts an amount from source currency to target currency.
     * Throws or returns UNAVAILABLE status if exchange rate is missing.
     */
    convert({ amount, sourceCurrency, targetCurrency, timestamp = null }) {
        if (typeof amount !== 'number' || isNaN(amount)) {
            return {
                status: AnalyticsStatus.CONFLICT,
                error: 'INVALID_AMOUNT: Amount must be a valid number',
                convertedValue: null
            };
        }

        const src = (sourceCurrency || '').toUpperCase();
        const tgt = (targetCurrency || '').toUpperCase();

        if (!src || !tgt) {
            return {
                status: AnalyticsStatus.UNAVAILABLE,
                error: 'MISSING_CURRENCY: Both source and target currencies must be specified',
                convertedValue: null
            };
        }

        // Same currency identity
        if (src === tgt) {
            return {
                status: AnalyticsStatus.PASS,
                sourceAmount: amount,
                sourceCurrency: src,
                targetCurrency: tgt,
                fxRate: 1.0,
                fxTimestamp: timestamp || new Date().toISOString(),
                fxSource: 'SAME_CURRENCY_IDENTITY',
                formula: 'ConvertedValue = SourceValue * 1.0',
                convertedValue: amount
            };
        }

        const pairKey = `${src}_${tgt}`;
        const fxEntry = this.fxTable[pairKey];

        if (!fxEntry || typeof fxEntry.rate !== 'number' || fxEntry.rate <= 0) {
            return {
                status: AnalyticsStatus.UNAVAILABLE,
                error: `MISSING_FX_RATE: No validated exchange rate found for pair ${pairKey}`,
                sourceCurrency: src,
                targetCurrency: tgt,
                convertedValue: null
            };
        }

        // Stale rate check (if requested timestamp differs drastically from fx timestamp, e.g. > 7 days)
        if (timestamp && fxEntry.timestamp) {
            const reqTime = new Date(timestamp).getTime();
            const fxTime = new Date(fxEntry.timestamp).getTime();
            const diffDays = Math.abs(reqTime - fxTime) / (1000 * 60 * 60 * 24);
            if (diffDays > 30) {
                return {
                    status: AnalyticsStatus.WARNING,
                    warning: `STALE_FX_RATE: FX rate timestamp is ${diffDays.toFixed(1)} days away from requested timestamp`,
                    sourceAmount: amount,
                    sourceCurrency: src,
                    targetCurrency: tgt,
                    fxRate: fxEntry.rate,
                    fxTimestamp: fxEntry.timestamp,
                    fxSource: fxEntry.source,
                    formula: `ConvertedValue = SourceValue * ${fxEntry.rate}`,
                    convertedValue: amount * fxEntry.rate
                };
            }
        }

        const convertedValue = amount * fxEntry.rate;
        return {
            status: AnalyticsStatus.PASS,
            sourceAmount: amount,
            sourceCurrency: src,
            targetCurrency: tgt,
            fxRate: fxEntry.rate,
            fxTimestamp: fxEntry.timestamp,
            fxSource: fxEntry.source,
            formula: `ConvertedValue = SourceValue * ${fxEntry.rate}`,
            convertedValue
        };
    }
}

export const multiCurrencyEngine = new MultiCurrencyEngine();
