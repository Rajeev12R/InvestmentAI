/**
 * server/knowledgeGraph/kg.sharedRisk.engine.js
 * 
 * Phase 23: Shared Risk & Hidden Thematic Exposure Engine
 * Maps shared risks across portfolio holdings and calculates exposed capital.
 */

import { deepFreeze } from './kg.types.js';

export class SharedRiskEngine {
  /**
   * Evaluates shared risk factors across portfolio holdings
   */
  calculateSharedRisks(positionsInput = []) {
    const positions = Array.isArray(positionsInput) ? positionsInput : (positionsInput && Array.isArray(positionsInput.positions) ? positionsInput.positions : []);

    let totalGrossValue = 0;
    const riskBuckets = new Map();

    for (const pos of positions) {
      if (!pos || typeof pos !== 'object') continue;
      const mv = typeof pos.marketValue === 'number' && Number.isFinite(pos.marketValue) ? Math.abs(pos.marketValue) : 0;
      totalGrossValue += mv;
      const risks = Array.isArray(pos.risks) ? pos.risks : (pos.sharedRisks || []);

      for (const r of risks) {
        if (!r) continue;
        const riskName = (typeof r === 'string' ? r : (r.riskName || r.name || 'UNKNOWN_RISK')).toUpperCase();
        if (!riskBuckets.has(riskName)) {
          riskBuckets.set(riskName, {
            riskName,
            exposedCapital: 0,
            holdings: []
          });
        }
        const bucket = riskBuckets.get(riskName);
        bucket.exposedCapital += mv;
        bucket.holdings.push({
          ticker: pos.ticker || 'UNKNOWN',
          marketValue: pos.marketValue
        });
      }
    }

    const sharedRiskList = Array.from(riskBuckets.values()).map(b => {
      const capitalSharePct = totalGrossValue > 0 ? (b.exposedCapital / totalGrossValue) * 100 : 0;
      return {
        riskName: b.riskName,
        exposedCapital: b.exposedCapital,
        capitalSharePct: Math.round(capitalSharePct * 100) / 100,
        holdingsCount: b.holdings.length,
        holdings: b.holdings
      };
    });

    // Sort descending by exposed capital
    sharedRiskList.sort((a, b) => b.exposedCapital - a.exposedCapital);

    return deepFreeze({
      totalGrossPortfolioValue: totalGrossValue,
      totalSharedRisksCount: sharedRiskList.length,
      topSharedRisks: sharedRiskList,
      classification: 'MODEL_ESTIMATE'
    });
  }
}

export const defaultSharedRiskEngine = new SharedRiskEngine();
