import { STATEMENT_TYPES } from './research.types.js';

/**
 * Deterministic Valuation Interpretation Engine.
 * Interprets multi-model valuation, model agreement dispersion, and Reverse DCF growth expectations.
 *
 * @param {Object} truthPackage - Sealed Investment Truth Package
 * @returns {Object} Structured valuation interpretation
 */
export function interpretValuation(truthPackage = {}) {
  const vm = truthPackage?.valuationModels || {};
  const company = truthPackage?.company || {};
  const currency = company.currency || 'USD';

  const dcf = vm.dcf || {};
  const rel = vm.relativeValuation || {};
  const revDcf = vm.reverseDcf || {};
  const agreement = vm.modelAgreement || {};

  const dcfVal = dcf.fairValue ?? null;
  const relVal = rel.fairValue ?? null;
  const compositeVal = vm.compositeFairValue ?? dcfVal ?? relVal ?? null;
  const currentPrice = dcf.currentPrice ?? vm.currentPrice ?? company.currentPrice ?? null;
  const marginOfSafety = vm.marginOfSafety ?? null;
  const upside = vm.upsidePotential ?? dcf.upside ?? null;
  const impliedGrowth = revDcf.impliedGrowthRate ?? (typeof revDcf.impliedGrowthPercent === 'number' ? revDcf.impliedGrowthPercent / 100 : null) ?? null;

  let valuationStatus = 'UNAVAILABLE';
  let interpretation = 'Intrinsic valuation models are unavailable due to sector profile or missing cash flow metrics.';

  if (compositeVal !== null && currentPrice !== null) {
    if (marginOfSafety !== null && marginOfSafety >= 15) {
      valuationStatus = 'UNDERVALUED';
      interpretation = `Asset is evaluated as UNDERVALUED with a ${marginOfSafety.toFixed(1)}% margin of safety to composite fair value (${compositeVal} ${currency} vs market price ${currentPrice} ${currency}).`;
    } else if (marginOfSafety !== null && marginOfSafety <= -15) {
      valuationStatus = 'OVERVALUED';
      interpretation = `Asset trades at an elevated premium (${Math.abs(upside || 0).toFixed(1)}% above estimated intrinsic value of ${compositeVal} ${currency}).`;
    } else {
      valuationStatus = 'FAIRLY_VALUED';
      interpretation = `Market price (${currentPrice} ${currency}) is trading near estimated intrinsic fair value (${compositeVal} ${currency}).`;
    }
  }

  // Reverse DCF Expectation Diagnostic
  let reverseDcfDiagnostic = 'Expectation Diagnostic: Reverse DCF hurdle rate unavailable.';
  if (impliedGrowth !== null && currentPrice !== null) {
    const growthPct = (impliedGrowth * 100).toFixed(1);
    reverseDcfDiagnostic = `Expectation Diagnostic: At current market price (${currentPrice} ${currency}), the stock embeds an implied annual cash flow growth rate of +${growthPct}% CAGR over the explicit forecast period under base WACC assumptions.`;
  }

  return {
    valuationStatus,
    interpretation,
    modelsEvaluated: {
      dcf: dcfVal !== null ? { fairValue: dcfVal, status: dcf.status || 'CALCULATED', wacc: dcf.wacc } : { status: 'UNAVAILABLE' },
      relativeValuation: relVal !== null ? { fairValue: relVal, status: rel.status || 'CALCULATED', sector: rel.sector } : { status: 'UNAVAILABLE' }
    },
    compositeFairValue: compositeVal,
    currentPrice,
    marginOfSafetyPct: marginOfSafety,
    upsidePct: upside,
    reverseDcfDiagnostic,
    modelAgreement: {
      status: agreement.status || 'UNAVAILABLE',
      dispersion: agreement.dispersion || 'UNKNOWN',
      validModelCount: agreement.validModelCount ?? (compositeVal !== null ? 1 : 0)
    },
    evidenceIds: ['valuation.dcfFairValue', 'valuation.relativeFairValue', 'valuation.reverseDcf']
  };
}
