/**
 * @file corporateAction.adapter.js
 * Normalized Institutional Corporate Action Adapter for Phase 10.
 */

import crypto from 'crypto';
import { BaseProviderAdapter } from './base.adapter.js';
import { SourceTier, SourceCategory, CorporateActionType } from '../source.types.js';
import { sourceRegistry } from '../sourceRegistry.js';

export class CorporateActionAdapter extends BaseProviderAdapter {
  constructor() {
    super({
      sourceId: 'SRC-SEC-EDGAR',
      sourceName: 'Exchange Corporate Actions Feed',
      tier: SourceTier.TIER_1_PRIMARY,
      category: SourceCategory.CORPORATE_ACTIONS
    });
  }

  async getCorporateActions(ticker) {
    if (!ticker) throw new Error('ticker is required for corporate actions');
    const sourceId = ticker.endsWith('.NS') ? 'SRC-NSE-BSE-INDIA' : this.sourceId;
    const cb = sourceRegistry.getCircuitBreaker(sourceId);

    return await cb.execute(async () => {
      // Deterministic corporate actions per security
      const sampleActions = {
        'AAPL': [
          {
            type: CorporateActionType.DIVIDEND,
            amount: 0.25,
            currency: 'USD',
            announcementDate: '2025-10-31',
            recordDate: '2025-11-10',
            effectiveDate: '2025-11-14',
            status: 'EXECUTED'
          }
        ],
        'RELIANCE.NS': [
          {
            type: CorporateActionType.BONUS,
            ratio: '1:1',
            announcementDate: '2024-09-05',
            recordDate: '2024-10-28',
            effectiveDate: '2024-10-28',
            status: 'EXECUTED'
          }
        ]
      };

      const rawActions = sampleActions[ticker.toUpperCase()] || [];
      const normalized = rawActions.map((action, idx) => {
        const actionPayload = JSON.stringify({ ticker, ...action });
        const actionId = `CA-${ticker.toUpperCase()}-${action.type}-${crypto.createHash('sha256').update(actionPayload).digest('hex').slice(0, 12)}`;
        return {
          actionId,
          ticker: ticker.toUpperCase(),
          sourceId,
          sourceTier: this.tier,
          confidence: 1.0,
          evidenceId: `EVID-${actionId}`,
          ...action
        };
      });

      return {
        ticker: ticker.toUpperCase(),
        sourceId,
        count: normalized.length,
        actions: normalized
      };
    });
  }

  normalizeCorporateAction(raw = {}, sourceId = this.sourceId) {
    const rawPayload = JSON.stringify({ raw, sourceId });
    const contentHash = crypto.createHash('sha256').update(rawPayload).digest('hex');
    return {
      type: raw.type || CorporateActionType.OTHER,
      symbol: raw.symbol || raw.ticker || 'UNKNOWN',
      ratio: raw.ratio || null,
      amount: raw.amount || null,
      currency: raw.currency || 'USD',
      exDate: raw.exDate || raw.effectiveDate || new Date().toISOString().split('T')[0],
      contentHash,
      sourceId
    };
  }
}

export const corporateActionAdapter = new CorporateActionAdapter();
