import { defaultAttributionStore } from './attribution.store.js';
import { defaultDecompositionEngine } from './attribution.decomposition.engine.js';
import { defaultDecisionAttributionEngine } from './attribution.decision.engine.js';

export class AlphaAttributionBridges {
  constructor(
    store = defaultAttributionStore,
    decomposition = defaultDecompositionEngine,
    decisionAttribution = defaultDecisionAttributionEngine
  ) {
    this.store = store;
    this.decomposition = decomposition;
    this.decisionAttribution = decisionAttribution;
  }

  /**
   * Bridge Phase 13 Decision Lineage with Phase 27 Signal Fusion & Realized Return
   */
  bridgeDecisionOutcome(tenantId = 'tenant_default', {
    decisionRecord,
    compositeSignals = [],
    realizedOutcome
  }) {
    if (!decisionRecord) throw new Error('decisionRecord is required');
    if (!realizedOutcome) throw new Error('realizedOutcome is required');

    return this.decisionAttribution.evaluateDecisionLineage(tenantId, {
      decisionId: decisionRecord.decisionId || decisionRecord.id,
      entityId: decisionRecord.entityId || realizedOutcome.entityId,
      signalsAvailable: compositeSignals,
      referencedSignalIds: decisionRecord.referencedSignalIds || [],
      actionTaken: decisionRecord.action || 'BUY',
      targetPositionWeight: decisionRecord.targetWeight || 0.05,
      actualPositionWeight: decisionRecord.actualWeight || 0.05,
      realizedReturn: realizedOutcome.realizedReturn !== undefined ? realizedOutcome.realizedReturn : realizedOutcome.totalReturn,
      benchmarkReturn: realizedOutcome.benchmarkReturn || 0.0,
      informationCutoff: decisionRecord.timestamp || realizedOutcome.informationCutoff
    });
  }

  /**
   * Bridge Phase 15 Rebalance Execution & Phase 18 Liquidity Impact with Pure Alpha
   */
  bridgeImplementationDrag(tenantId = 'tenant_default', {
    entityId,
    idealAlpha = 0.0,
    slippageBps = 0,
    commissionBps = 0,
    marketImpactBps = 0,
    taxBps = 0,
    fxBps = 0
  }) {
    const totalTransactionCost = (slippageBps + commissionBps) / 10000;
    const liquidityImpact = marketImpactBps / 10000;
    const taxCost = taxBps / 10000;
    const fxCost = fxBps / 10000;

    const netRealizedAlpha = idealAlpha - totalTransactionCost - liquidityImpact - taxCost - fxCost;

    return {
      entityId,
      idealAlpha: parseFloat(idealAlpha.toFixed(6)),
      transactionCost: parseFloat(totalTransactionCost.toFixed(6)),
      liquidityImpact: parseFloat(liquidityImpact.toFixed(6)),
      taxCost: parseFloat(taxCost.toFixed(6)),
      fxCost: parseFloat(fxCost.toFixed(6)),
      netRealizedAlpha: parseFloat(netRealizedAlpha.toFixed(6)),
      implementationEfficiencyRatio: idealAlpha > 0 ? parseFloat((netRealizedAlpha / idealAlpha).toFixed(4)) : 1.0
    };
  }

  /**
   * Bridge Phase 24 Research Synthesis Thesis Health with Signal Attribution
   */
  bridgeResearchThesisAttribution(tenantId = 'tenant_default', {
    thesisId,
    entityId,
    thesisHealth = 'STRONG',
    attributedReturn = 0.0,
    evidenceIds = []
  }) {
    const isConsistent = (thesisHealth === 'STRONG' && attributedReturn > 0) || (thesisHealth === 'WEAK' && attributedReturn <= 0);

    return {
      thesisId,
      entityId,
      thesisHealth,
      attributedReturn,
      isConsistent,
      evidenceIds,
      thesisValidationStatus: isConsistent ? 'THESIS_VALIDATED' : 'THESIS_CONTRADICTED'
    };
  }
}

export const defaultAttributionBridges = new AlphaAttributionBridges();
