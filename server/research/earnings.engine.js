import { STATEMENT_TYPES } from './research.types.js';

/**
 * Deterministic Earnings Quality & Cash Flow Intelligence Engine.
 *
 * @param {Object} truthPackage - Sealed Investment Truth Package
 * @returns {Object} Structured earnings quality analysis
 */
export function analyzeEarningsQuality(truthPackage = {}) {
  const facts = [...(truthPackage?.financialFacts || []), ...(truthPackage?.calculatedMetrics || [])];
  const risks = truthPackage?.riskSignals || {};

  const niFact = facts.find(f => f.id === 'financial.netIncome');
  const cfoFact = facts.find(f => f.id === 'financial.operatingCashFlow');
  const fcfFact = facts.find(f => f.id === 'financial.freeCashFlow');
  const revFact = facts.find(f => f.id === 'financial.totalRevenue');

  const ni = typeof niFact?.value === 'number' ? niFact.value : null;
  const cfo = typeof cfoFact?.value === 'number' ? cfoFact.value : null;
  const fcf = typeof fcfFact?.value === 'number' ? fcfFact.value : null;
  const rev = typeof revFact?.value === 'number' ? revFact.value : null;

  let cfoToNi = null;
  let fcfToNi = null;
  let fcfToRev = null;
  let divergenceDetected = false;

  if (cfo !== null && ni !== null && ni > 0) {
    cfoToNi = Math.round((cfo / ni) * 100) / 100;
    if (cfoToNi < 0.80) {
      divergenceDetected = true;
    }
  }

  if (fcf !== null && ni !== null && ni > 0) {
    fcfToNi = Math.round((fcf / ni) * 100) / 100;
  }

  if (fcf !== null && rev !== null && rev > 0) {
    fcfToRev = Math.round((fcf / rev) * 10000) / 100; // % of revenue
  }

  let qualityGrade = 'SOLID';
  let qualityAssessment = 'Reported accounting net income is backed by operational cash flow conversion.';

  if (divergenceDetected) {
    qualityGrade = 'LOW_CONVERSION';
    qualityAssessment = `Cash flow divergence is present: Operating cash flow conversion (${cfoToNi}x Net Income) trails reported accounting profit, indicating a significant portion of earnings stems from non-cash accruals.`;
  } else if (cfoToNi !== null && cfoToNi >= 1.15) {
    qualityGrade = 'HIGH_QUALITY';
    qualityAssessment = `Superior earnings quality: Operating cash flow conversion (${cfoToNi}x Net Income) exceeds reported net profit, confirming conservative accounting practices and strong cash realization.`;
  }

  return {
    qualityGrade,
    qualityAssessment,
    metrics: {
      cfoToNetIncome: cfoToNi,
      fcfToNetIncome: fcfToNi,
      fcfToRevenuePct: fcfToRev,
      netIncome: ni,
      operatingCashFlow: cfo,
      freeCashFlow: fcf
    },
    divergenceDetected,
    evidenceIds: ['financial.operatingCashFlow', 'financial.netIncome', 'financial.freeCashFlow']
  };
}
