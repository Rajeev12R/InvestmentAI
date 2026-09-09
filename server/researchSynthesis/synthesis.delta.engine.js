/**
 * server/researchSynthesis/synthesis.delta.engine.js
 * 
 * Phase 24: Deterministic Research Delta & Materiality Rules Engine
 * Compares research context snapshots and filters material diffs based on configuration-backed thresholds.
 */

import { ClaimMateriality, deepFreeze } from './synthesis.types.js';

export const DEFAULT_MATERIALITY_THRESHOLDS = Object.freeze({
  valuationDeltaPct: 5.0,
  forecastRevisionPct: 3.0,
  earningsSurprisePct: 5.0,
  marginShiftPct: 2.0,
  riskScoreDeltaPoints: 10.0,
  macroRegimeShiftAlwaysMaterial: true,
  thesisBreakerAlwaysCritical: true
});

export class ResearchDeltaEngine {
  constructor(thresholds = DEFAULT_MATERIALITY_THRESHOLDS) {
    this.thresholds = thresholds;
  }

  /**
   * Compares two point-in-time research contexts and returns deterministic material deltas
   */
  compareResearchContexts(beforeContext = {}, afterContext = {}) {
    const bDom = beforeContext.domains || {};
    const aDom = afterContext.domains || {};

    const changes = [];
    const unchangedCount = { count: 0 };

    // 1. Fundamentals Delta
    this._checkFundamentalsDelta(bDom.fundamentals, aDom.fundamentals, changes, unchangedCount);

    // 2. Valuation Delta
    this._checkValuationDelta(bDom.valuation, aDom.valuation, changes, unchangedCount);

    // 3. Forecast Delta
    this._checkForecastDelta(bDom.forecast, aDom.forecast, changes, unchangedCount);

    // 4. Earnings Delta
    this._checkEarningsDelta(bDom.earnings, aDom.earnings, changes, unchangedCount);

    // 5. Macro Regime Delta
    this._checkMacroDelta(bDom.macro, aDom.macro, changes, unchangedCount);

    // 6. Risk Delta
    this._checkRiskDelta(bDom.risk, aDom.risk, changes, unchangedCount);

    // 7. Thesis Health Delta
    this._checkThesisDelta(bDom.thesis, aDom.thesis, changes, unchangedCount);

    const materialChanges = changes.filter(c => c.materiality === ClaimMateriality.MATERIAL);
    const secondaryChanges = changes.filter(c => c.materiality === ClaimMateriality.SECONDARY);

    return deepFreeze({
      beforeCutoff: beforeContext.knowledgeCutoff || null,
      afterCutoff: afterContext.knowledgeCutoff || null,
      totalChangesCount: changes.length,
      materialChangesCount: materialChanges.length,
      secondaryChangesCount: secondaryChanges.length,
      unchangedFieldsCount: unchangedCount.count,
      materialChanges,
      allChanges: changes,
      summary: `Discovered ${changes.length} total changes (${materialChanges.length} material) across research domains`
    });
  }

  _checkFundamentalsDelta(b = {}, a = {}, changes, unchanged) {
    if (!b || !a) return;
    if (b.revenue !== undefined && a.revenue !== undefined) {
      if (b.revenue !== a.revenue) {
        const growth = b.revenue > 0 ? ((a.revenue - b.revenue) / b.revenue) * 100 : 0;
        changes.push({
          domain: 'FUNDAMENTALS',
          field: 'revenue',
          oldValue: b.revenue,
          newValue: a.revenue,
          deltaPct: Math.round(growth * 100) / 100,
          materiality: Math.abs(growth) >= this.thresholds.forecastRevisionPct ? ClaimMateriality.MATERIAL : ClaimMateriality.SECONDARY
        });
      } else {
        unchanged.count++;
      }
    }
  }

  _checkValuationDelta(b = {}, a = {}, changes, unchanged) {
    if (!b || !a) return;
    if (b.dcfFairValue !== undefined && a.dcfFairValue !== undefined) {
      if (b.dcfFairValue !== a.dcfFairValue) {
        const diffPct = b.dcfFairValue > 0 ? ((a.dcfFairValue - b.dcfFairValue) / b.dcfFairValue) * 100 : 0;
        const absDiff = Math.abs(diffPct);
        changes.push({
          domain: 'VALUATION',
          field: 'dcfFairValue',
          oldValue: b.dcfFairValue,
          newValue: a.dcfFairValue,
          deltaPct: Math.round(diffPct * 100) / 100,
          materiality: absDiff >= this.thresholds.valuationDeltaPct ? ClaimMateriality.MATERIAL : ClaimMateriality.SECONDARY
        });
      } else {
        unchanged.count++;
      }
    }
  }

  _checkForecastDelta(b = {}, a = {}, changes, unchanged) {
    if (!b || !a) return;
    if (b.forwardEps !== undefined && a.forwardEps !== undefined) {
      if (b.forwardEps !== a.forwardEps) {
        const diffPct = b.forwardEps > 0 ? ((a.forwardEps - b.forwardEps) / b.forwardEps) * 100 : 0;
        changes.push({
          domain: 'FORECAST',
          field: 'forwardEps',
          oldValue: b.forwardEps,
          newValue: a.forwardEps,
          deltaPct: Math.round(diffPct * 100) / 100,
          materiality: Math.abs(diffPct) >= this.thresholds.forecastRevisionPct ? ClaimMateriality.MATERIAL : ClaimMateriality.SECONDARY
        });
      } else {
        unchanged.count++;
      }
    }
  }

  _checkEarningsDelta(b = {}, a = {}, changes, unchanged) {
    if (!b || !a) return;
    if (b.reportedEps !== undefined && a.reportedEps !== undefined && b.reportedEps !== a.reportedEps) {
      changes.push({
        domain: 'EARNINGS',
        field: 'reportedEps',
        oldValue: b.reportedEps,
        newValue: a.reportedEps,
        materiality: ClaimMateriality.MATERIAL
      });
    } else {
      unchanged.count++;
    }
  }

  _checkMacroDelta(b = {}, a = {}, changes, unchanged) {
    if (!b || !a) return;
    if (b.currentRegime && a.currentRegime && b.currentRegime !== a.currentRegime) {
      changes.push({
        domain: 'MACRO',
        field: 'currentRegime',
        oldValue: b.currentRegime,
        newValue: a.currentRegime,
        materiality: ClaimMateriality.MATERIAL
      });
    } else {
      unchanged.count++;
    }
  }

  _checkRiskDelta(b = {}, a = {}, changes, unchanged) {
    if (!b || !a) return;
    if (b.overallRiskScore !== undefined && a.overallRiskScore !== undefined) {
      const diff = a.overallRiskScore - b.overallRiskScore;
      if (diff !== 0) {
        changes.push({
          domain: 'RISK',
          field: 'overallRiskScore',
          oldValue: b.overallRiskScore,
          newValue: a.overallRiskScore,
          deltaPoints: diff,
          materiality: Math.abs(diff) >= this.thresholds.riskScoreDeltaPoints ? ClaimMateriality.MATERIAL : ClaimMateriality.SECONDARY
        });
      } else {
        unchanged.count++;
      }
    }
  }

  _checkThesisDelta(b = {}, a = {}, changes, unchanged) {
    if (!b || !a) return;
    if (b.healthStatus && a.healthStatus && b.healthStatus !== a.healthStatus) {
      changes.push({
        domain: 'THESIS',
        field: 'healthStatus',
        oldValue: b.healthStatus,
        newValue: a.healthStatus,
        materiality: ClaimMateriality.MATERIAL
      });
    } else {
      unchanged.count++;
    }
  }
}

export const defaultResearchDeltaEngine = new ResearchDeltaEngine();
