/**
 * server/researchSynthesis/synthesis.modelAgreement.engine.js
 * 
 * Phase 24: Model Disagreement & Contradictory Evidence Surfacing Engine
 * Preserves valuation model dispersion and highlights opposing evidence signals without smoothing.
 */

import { ModelAgreementClass, deepFreeze } from './synthesis.types.js';

export class ModelAgreementEngine {
  /**
   * Evaluates valuation model agreement, dispersion, and driver divergence
   */
  evaluateModelAgreement(modelsInput = {}, marketPrice = null) {
    const models = [];
    if (typeof modelsInput.dcfFairValue === 'number' && Number.isFinite(modelsInput.dcfFairValue)) {
      models.push({ modelName: 'DCF_MODEL', value: modelsInput.dcfFairValue, weight: 1.0 });
    }
    if (typeof modelsInput.relativeFairValue === 'number' && Number.isFinite(modelsInput.relativeFairValue)) {
      models.push({ modelName: 'RELATIVE_VALUATION', value: modelsInput.relativeFairValue, weight: 1.0 });
    }
    if (typeof modelsInput.reverseDcfFairValue === 'number' && Number.isFinite(modelsInput.reverseDcfFairValue)) {
      models.push({ modelName: 'REVERSE_DCF', value: modelsInput.reverseDcfFairValue, weight: 1.0 });
    }
    if (Array.isArray(modelsInput.additionalModels)) {
      for (const m of modelsInput.additionalModels) {
        if (m && typeof m.value === 'number' && Number.isFinite(m.value)) {
          models.push({ modelName: m.name || 'CUSTOM_MODEL', value: m.value, weight: m.weight || 1.0 });
        }
      }
    }

    if (models.length < 2) {
      return deepFreeze({
        modelsCount: models.length,
        agreementClass: ModelAgreementClass.INSUFFICIENT_MODELS,
        dispersionSpreadPct: 0,
        minValue: models[0]?.value || null,
        maxValue: models[0]?.value || null,
        medianValue: models[0]?.value || null,
        models,
        driversOfDisagreement: ['Insufficient independent valuation models available to evaluate dispersion']
      });
    }

    const values = models.map(m => m.value).sort((a, b) => a - b);
    const minVal = values[0];
    const maxVal = values[values.length - 1];
    const midIdx = Math.floor(values.length / 2);
    const medianVal = values.length % 2 !== 0 ? values[midIdx] : (values[midIdx - 1] + values[midIdx]) / 2;

    const spreadPct = medianVal > 0 ? ((maxVal - minVal) / medianVal) * 100 : 0;
    const roundedSpread = Math.round(spreadPct * 100) / 100;

    let agreementClass = ModelAgreementClass.MODERATE_DISPERSION;
    const driversOfDisagreement = [];

    // Check for conflicting upside/downside directions relative to market price
    if (typeof marketPrice === 'number' && marketPrice > 0) {
      const hasUpside = models.some(m => m.value > marketPrice * 1.05);
      const hasDownside = models.some(m => m.value < marketPrice * 0.95);
      if (hasUpside && hasDownside) {
        agreementClass = ModelAgreementClass.CONFLICTING;
        driversOfDisagreement.push(`Models provide contradictory investment directions relative to spot price ($${marketPrice}): some indicate upside while others indicate downside`);
      }
    }

    if (agreementClass !== ModelAgreementClass.CONFLICTING) {
      if (roundedSpread <= 10.0) {
        agreementClass = ModelAgreementClass.CONVERGENT;
      } else if (roundedSpread <= 25.0) {
        agreementClass = ModelAgreementClass.MODERATE_DISPERSION;
      } else {
        agreementClass = ModelAgreementClass.DIVERGENT;
        driversOfDisagreement.push(`High model dispersion (${roundedSpread}% spread between $${minVal} and $${maxVal}) driven by differing terminal growth and discount rate assumptions`);
      }
    }

    return deepFreeze({
      modelsCount: models.length,
      agreementClass,
      dispersionSpreadPct: roundedSpread,
      minValue: minVal,
      maxValue: maxVal,
      medianValue: medianVal,
      marketPrice,
      models,
      driversOfDisagreement,
      classification: 'MODEL_ESTIMATE'
    });
  }

  /**
   * Surfaces contradictory evidence pairs across operational and financial signals
   */
  surfaceEvidenceContradictions(evidenceSignals = []) {
    const contradictions = [];

    for (let i = 0; i < evidenceSignals.length; i++) {
      for (let j = i + 1; j < evidenceSignals.length; j++) {
        const sigA = evidenceSignals[i];
        const sigB = evidenceSignals[j];

        // Case 1: Positive earnings surprise vs negative cash conversion
        if (
          (sigA.category === 'EARNINGS_SURPRISE' && sigA.direction === 'POSITIVE' && sigB.category === 'CASH_CONVERSION' && sigB.direction === 'NEGATIVE') ||
          (sigB.category === 'EARNINGS_SURPRISE' && sigB.direction === 'POSITIVE' && sigA.category === 'CASH_CONVERSION' && sigA.direction === 'NEGATIVE')
        ) {
          contradictions.push({
            pairType: 'EARNINGS_BEAT_VS_CASH_DEVIATION',
            signalA: sigA,
            signalB: sigB,
            description: 'Positive reported accounting earnings beat coexists with deteriorating operating cash conversion',
            severity: 'HIGH'
          });
        }

        // Case 2: Margin expansion vs customer churn / pricing pressure
        if (
          (sigA.category === 'MARGIN_EXPANSION' && sigB.category === 'CUSTOMER_CHURN_RISK') ||
          (sigB.category === 'MARGIN_EXPANSION' && sigA.category === 'CUSTOMER_CHURN_RISK')
        ) {
          contradictions.push({
            pairType: 'MARGIN_EXPANSION_VS_CHURN',
            signalA: sigA,
            signalB: sigB,
            description: 'Reported gross margin expansion coexists with increasing customer concentration or churn risk',
            severity: 'MEDIUM'
          });
        }

        // Case 3: Multiple expansion vs rising rate regime
        if (
          (sigA.category === 'VALUATION_MULTIPLE' && sigA.direction === 'EXPANDING' && sigB.category === 'MACRO_REGIME' && sigB.regime === 'TIGHTENING_RATES') ||
          (sigB.category === 'VALUATION_MULTIPLE' && sigB.direction === 'EXPANDING' && sigA.category === 'MACRO_REGIME' && sigA.regime === 'TIGHTENING_RATES')
        ) {
          contradictions.push({
            pairType: 'MULTIPLE_EXPANSION_VS_RISING_RATES',
            signalA: sigA,
            signalB: sigB,
            description: 'Equity valuation multiple expansion occurs during an aggressive central bank tightening rate regime',
            severity: 'HIGH'
          });
        }
      }
    }

    return deepFreeze({
      totalContradictionsCount: contradictions.length,
      hasContradictions: contradictions.length > 0,
      contradictions
    });
  }
}

export const defaultModelAgreementEngine = new ModelAgreementEngine();
