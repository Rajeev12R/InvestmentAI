import { deepFreeze, computePerformanceHash } from './performance.types.js';

/**
 * Phase 29 — Cross-Phase Bridges
 * Integrates Phase 29 with Phase 12, 13, 18, 19, 22, 27, 28.
 */
export class PerformanceBridgeManager {
  /**
   * Bridge Phase 28 Signal Performance & Alpha Attribution
   */
  static bridgeSignalPerformance(signalAttributionPackage) {
    if (!signalAttributionPackage) {
      return {
        hasSignalAttribution: false,
        signalAlphaContribution: 0,
        realizedIC: 0,
        signalCount: 0
      };
    }

    const sigs = signalAttributionPackage.signals || [];
    const avgIC = sigs.length > 0
      ? sigs.reduce((acc, s) => acc + (s.realizedIC || 0), 0) / sigs.length
      : 0;

    return deepFreeze({
      hasSignalAttribution: true,
      packageId: signalAttributionPackage.packageId,
      signalAlphaContribution: signalAttributionPackage.totalSignalContribution || 0,
      realizedIC: Number(avgIC.toFixed(4)),
      signalCount: sigs.length,
      bridgedAt: new Date().toISOString()
    });
  }

  /**
   * Bridge Phase 13 Investment Process Discipline
   */
  static bridgeProcessDiscipline(processAuditRecord) {
    if (!processAuditRecord) {
      return {
        hasProcessAudit: false,
        mandateAdherenceRate: 1.0,
        riskLimitBreaches: 0,
        decisionConsistencyRate: 0.95
      };
    }

    return deepFreeze({
      hasProcessAudit: true,
      auditId: processAuditRecord.auditId,
      mandateAdherenceRate: processAuditRecord.adherenceRate || 1.0,
      riskLimitBreaches: processAuditRecord.breachesCount || 0,
      decisionConsistencyRate: processAuditRecord.consistencyRate || 0.95,
      bridgedAt: new Date().toISOString()
    });
  }

  /**
   * Bridge Phase 22 Macro Regime Context
   */
  static bridgeMacroRegimes(macroContext) {
    if (!macroContext || !Array.isArray(macroContext.regimes)) {
      return {
        hasMacroRegimes: false,
        currentRegime: 'NEUTRAL_GROWTH',
        regimeHistory: []
      };
    }

    return deepFreeze({
      hasMacroRegimes: true,
      currentRegime: macroContext.currentRegime || 'NEUTRAL_GROWTH',
      regimeHistory: macroContext.regimes,
      bridgedAt: new Date().toISOString()
    });
  }

  /**
   * Bridge Phase 18 Liquidity & Slippage Impact
   */
  static bridgeLiquidityDrag(liquidityReport) {
    if (!liquidityReport) {
      return {
        hasLiquidityReport: false,
        slippageBps: 10,
        advParticipationRate: 0.02
      };
    }

    return deepFreeze({
      hasLiquidityReport: true,
      slippageBps: liquidityReport.estimatedSlippageBps || 10,
      advParticipationRate: liquidityReport.participationRate || 0.02,
      bridgedAt: new Date().toISOString()
    });
  }
}
