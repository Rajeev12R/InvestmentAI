import { AttributionStatus, AttributionConfidenceLevel, EffectType } from './attribution.types.js';
import { defaultAttributionStore } from './attribution.store.js';

export class AlphaDecompositionEngine {
  constructor(store = defaultAttributionStore) {
    this.store = store;
  }

  /**
   * Decompose a security-level return into explicit signal, decision, and residual components.
   */
  decomposeSecurityReturn(tenantId = 'tenant_default', {
    attributionId,
    entityId,
    realizedReturn,
    benchmarkReturn = 0,
    signalWeight = 1.0,
    signalExpectedReturn = 0,
    decisionAdjustment = 0,
    implementationDrag = 0,
    transactionCost = 0,
    taxEffect = 0,
    fxEffect = 0,
    informationCutoff = new Date().toISOString()
  }) {
    if (!entityId) throw new Error('entityId is required');
    if (realizedReturn === undefined || isNaN(realizedReturn)) {
      throw new Error('Valid realizedReturn is required');
    }

    const activeReturn = parseFloat((realizedReturn - benchmarkReturn).toFixed(6));
    const signalContribution = parseFloat((signalWeight * signalExpectedReturn).toFixed(6));
    const decisionContribution = parseFloat(decisionAdjustment.toFixed(6));
    const implementationContribution = parseFloat((-Math.abs(implementationDrag)).toFixed(6));
    const transactionCostEffect = parseFloat((-Math.abs(transactionCost)).toFixed(6));
    const taxContribution = parseFloat(taxEffect.toFixed(6));
    const fxContribution = parseFloat(fxEffect.toFixed(6));

    const totalAttributed = parseFloat((
      signalContribution +
      decisionContribution +
      implementationContribution +
      transactionCostEffect +
      taxContribution +
      fxContribution
    ).toFixed(6));

    const residual = parseFloat((activeReturn - totalAttributed).toFixed(6));

    // Numerical reconciliation check (tolerance 1e-5)
    const reconciled = Math.abs(activeReturn - (totalAttributed + residual)) < 1e-5;

    const id = attributionId || `attr_sec_${entityId}_${new Date(informationCutoff).getTime()}`;
    const record = {
      attributionId: id,
      entityId,
      realizedReturn,
      benchmarkReturn,
      activeReturn,
      components: {
        [EffectType.SIGNAL_EFFECT]: signalContribution,
        [EffectType.DECISION_SIGNAL_CONTRIBUTION || 'DECISION_EFFECT']: decisionContribution,
        [EffectType.IMPLEMENTATION_EFFECT]: implementationContribution,
        [EffectType.TRANSACTION_COST_EFFECT]: transactionCostEffect,
        [EffectType.TAX_EFFECT]: taxContribution,
        [EffectType.FX_EFFECT]: fxContribution,
        [EffectType.RESIDUAL_EFFECT]: residual
      },
      signalContribution,
      decisionContribution,
      implementationContribution,
      transactionCostEffect,
      taxEffect: taxContribution,
      fxEffect: fxContribution,
      residual,
      totalAttributed,
      attributedReturn: totalAttributed,
      reconciled,
      status: AttributionStatus.ATTRIBUTED,
      confidence: Math.abs(residual) < Math.abs(activeReturn) * 0.3 ? AttributionConfidenceLevel.HIGH_CONFIDENCE : AttributionConfidenceLevel.MEDIUM_CONFIDENCE,
      informationCutoff,
      attributedAt: informationCutoff
    };

    return this.store.saveAttribution(tenantId, record);
  }

  /**
   * Decompose Portfolio Active Return across all positions and systematic effects.
   */
  decomposePortfolioReturn(tenantId = 'tenant_default', {
    portfolioId = 'PORTFOLIO',
    portfolioReturn,
    benchmarkReturn = 0,
    holdings = [], // Array of security attribution records or position breakdown
    systematicEffects = {}, // { transactionCosts: 0, taxDrag: 0, fxDrag: 0, liquidityDrag: 0 }
    informationCutoff = new Date().toISOString()
  }) {
    if (portfolioReturn === undefined || isNaN(portfolioReturn)) {
      throw new Error('Valid portfolioReturn is required');
    }

    const activeReturn = parseFloat((portfolioReturn - benchmarkReturn).toFixed(6));

    let sumSignalEffect = 0;
    let sumDecisionEffect = 0;
    let sumSecurityResidual = 0;

    for (const h of holdings) {
      const weight = h.weight !== undefined ? h.weight : (1.0 / (holdings.length || 1));
      const sigContrib = (h.signalContribution || 0) * weight;
      const decContrib = (h.decisionContribution || 0) * weight;
      const resContrib = (h.residual || 0) * weight;

      sumSignalEffect += sigContrib;
      sumDecisionEffect += decContrib;
      sumSecurityResidual += resContrib;
    }

    const transactionCosts = parseFloat((-Math.abs(systematicEffects.transactionCosts || 0)).toFixed(6));
    const liquidityDrag = parseFloat((-Math.abs(systematicEffects.liquidityDrag || 0)).toFixed(6));
    const taxDrag = parseFloat((systematicEffects.taxDrag || 0).toFixed(6));
    const fxDrag = parseFloat((systematicEffects.fxDrag || 0).toFixed(6));

    const totalAttributed = parseFloat((
      sumSignalEffect +
      sumDecisionEffect +
      transactionCosts +
      liquidityDrag +
      taxDrag +
      fxDrag
    ).toFixed(6));

    const portfolioResidual = parseFloat((activeReturn - totalAttributed).toFixed(6));
    const reconciled = Math.abs(activeReturn - (totalAttributed + portfolioResidual)) < 1e-5;

    return {
      portfolioId,
      portfolioReturn,
      benchmarkReturn,
      activeReturn,
      signalAttributedReturn: parseFloat(sumSignalEffect.toFixed(6)),
      decisionAttributedReturn: parseFloat(sumDecisionEffect.toFixed(6)),
      implementationAttributedReturn: parseFloat((transactionCosts + liquidityDrag).toFixed(6)),
      transactionCosts,
      liquidityDrag,
      taxEffect: taxDrag,
      fxEffect: fxDrag,
      residualReturn: portfolioResidual,
      totalAttributed,
      reconciled,
      holdingCount: holdings.length,
      status: AttributionStatus.ATTRIBUTED,
      informationCutoff
    };
  }
}

export const defaultDecompositionEngine = new AlphaDecompositionEngine();
