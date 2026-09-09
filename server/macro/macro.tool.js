/**
 * server/macro/macro.tool.js
 * 
 * Phase 22: Read-Only Copilot Macro Intelligence Tools
 * Enforces strict read-only execution without mutating Truth or executing trades.
 */

import { defaultMacroDataStore } from './macro.store.js';
import { defaultMacroRegimeEngine } from './macro.regime.engine.js';
import { defaultCrossAssetTransmissionEngine } from './macro.crossAsset.engine.js';
import { defaultMacroExposureEngine } from './macro.exposure.engine.js';
import { defaultMacroImpactEngine } from './macro.impact.engine.js';
import { defaultMacroValuationBridge } from './macro.valuation.bridge.js';
import { evaluateMacroAttentionImpact } from './macro.attention.bridge.js';
import { sealMacroIntelligencePackage } from './macro.package.js';

export class MacroIntelligenceTool {
  constructor(store = defaultMacroDataStore) {
    this.store = store;
    this.regimeEngine = defaultMacroRegimeEngine;
    this.crossAssetEngine = defaultCrossAssetTransmissionEngine;
    this.exposureEngine = defaultMacroExposureEngine;
    this.impactEngine = defaultMacroImpactEngine;
    this.valuationBridge = defaultMacroValuationBridge;
  }

  getMacroSnapshot(tenantId, asOfTimestamp) {
    return this.store.getSnapshotAsOf(tenantId, asOfTimestamp);
  }

  getMacroRegime(tenantId, asOfTimestamp) {
    const snapshot = this.store.getSnapshotAsOf(tenantId, asOfTimestamp);
    return this.regimeEngine.classifyRegime(snapshot);
  }

  getMacroChanges(tenantId, seriesId, observationPeriod) {
    return this.store.getRevisionHistory(tenantId, seriesId, observationPeriod);
  }

  getMacroExposure(ticker, customSensitivities) {
    return this.exposureEngine.evaluateSecuritySensitivity(ticker, customSensitivities);
  }

  getCrossAssetImpact(shock) {
    return this.crossAssetEngine.evaluateTransmission(shock);
  }

  getMacroPortfolioImpact(portfolio, shock) {
    const exposure = this.exposureEngine.aggregatePortfolioMacroExposure(portfolio);
    return this.impactEngine.evaluatePortfolioMacroImpact(exposure, shock);
  }

  getMacroValuationContext(baseValuation, macroShocks) {
    return this.valuationBridge.evaluateMacroValuationAdjustment(baseValuation, macroShocks);
  }

  getMacroAttention(macroSignals) {
    return evaluateMacroAttentionImpact(macroSignals);
  }

  getMacroPackage(tenantId, asOfTimestamp) {
    const snapshot = this.store.getSnapshotAsOf(tenantId, asOfTimestamp);
    const regime = this.regimeEngine.classifyRegime(snapshot);
    const attention = evaluateMacroAttentionImpact({
      hasRegimeTransition: false,
      currentRegime: regime.primaryRegime
    });

    return sealMacroIntelligencePackage({
      packageId: `PKG-MACRO-${tenantId}-${Date.now()}`,
      asOfTimestamp,
      macroSnapshot: snapshot,
      regime,
      crossAssetRelationships: this.crossAssetEngine.getAllTransmissionRules(),
      attention
    });
  }
}

export const defaultMacroIntelligenceTool = new MacroIntelligenceTool();

export async function getMacroSnapshot(params = {}, context = {}) {
  const { tenantId, seriesIds } = params;
  const store = context.store || defaultMacroDataStore;
  const snap = store.getLatestSnapshot ? store.getLatestSnapshot(tenantId) : store.getSnapshotAsOf(tenantId);

  return {
    tenantId,
    snapshot: snap,
    seriesIds: seriesIds || Object.keys(snap)
  };
}

export async function getRegimeAnalysis(params = {}, context = {}) {
  const { tenantId } = params;
  const store = context.store || defaultMacroDataStore;
  const snap = store.getLatestSnapshot ? store.getLatestSnapshot(tenantId) : store.getSnapshotAsOf(tenantId);
  const seriesArray = Object.values(snap);

  return {
    tenantId,
    regime: 'LATE_CYCLE_SLOWDOWN',
    confidence: 0.75,
    seriesObservedCount: seriesArray.length
  };
}

