import { DECISION_OUTCOMES, FIT_SCORES } from './decision.types.js';
import { evaluateInvestorFit } from './investorFit.engine.js';
import { calculateConviction } from './conviction.engine.js';
import { buildDecisionEvidenceGraph } from './decisionEvidence.engine.js';
import { makeIpoInvestmentDecision } from '../features/ipo/ipoDecision.engine.js';

/**
 * Generates falsification conditions ("What could change this decision?").
 */
function generateDecisionFalsificationTriggers({ decision, valuation, riskProfile }) {
  const triggers = [];
  const valSummary = valuation?.valuationSummary || {};
  const currentPrice = valSummary.currentPrice;
  const compositeFairValue = valSummary.compositeFairValue;

  if (decision === DECISION_OUTCOMES.BUY) {
    if (compositeFairValue && currentPrice) {
      const breakEvenPrice = compositeFairValue;
      triggers.push(`Market price appreciation above fair value ($${breakEvenPrice}) would eliminate the margin of safety, triggering a downgrade to HOLD or WATCH.`);
    }
    triggers.push('Material deterioration in operating margins (>200 bps) or revenue contraction would reduce projected cash flows.');
    triggers.push('Emergence of cash flow divergence or sudden leverage spike (Net Debt/EBITDA > 3.0x).');
  } else if (decision === DECISION_OUTCOMES.HOLD) {
    if (compositeFairValue) {
      const discountPrice = Math.round(compositeFairValue * 0.85 * 100) / 100;
      triggers.push(`Price pullback below $${discountPrice} (15% margin of safety) would upgrade recommendation to BUY.`);
      const premiumPrice = Math.round(compositeFairValue * 1.20 * 100) / 100;
      triggers.push(`Price surge above $${premiumPrice} (20% premium) would trigger an overvaluation downgrade to WATCH or TRIM.`);
    }
    triggers.push('Acceleration in top-line growth or expansion in return on capital (ROIC).');
  } else if (decision === DECISION_OUTCOMES.WATCH) {
    if (compositeFairValue) {
      triggers.push(`Significant price correction towards fair value ($${compositeFairValue}) could open an attractive risk-adjusted entry point.`);
    }
    triggers.push('Resolution of pending event risks or improvement in data availability/coverage.');
  } else if (decision === DECISION_OUTCOMES.AVOID) {
    triggers.push('Substantial balance sheet de-leveraging or turnaround in operating cash flow generation.');
    triggers.push('Resolution of critical governance, earnings quality, or liquidity distress flags.');
  }

  return triggers;
}

/**
 * Deterministic Investment Decision Engine.
 *
 * @param {Object} params
 * @param {Object} params.valuation - Comprehensive valuation output
 * @param {Object} params.riskProfile - Risk engine output
 * @param {string} [params.investorProfile] - User investor profile
 * @param {Object} [params.financialFacts] - Grounded facts
 * @returns {Object} Auditable decision payload
 */
export function makeInvestmentDecision({
  valuation = {},
  riskProfile = {},
  investorProfile = 'BALANCED_VALUE',
  financialFacts = {},
  securityContext = {}
} = {}) {
  if (String(securityContext.securityType || '').toUpperCase() === 'IPO') {
    return {
      ...makeIpoInvestmentDecision({ securityContext, riskProfile }),
      investorFit: null,
      evidenceGraph: [],
      metadata: {
        engine: 'InvestmentAI-IPO-UnderwritingFeature',
        evaluatedAt: new Date().toISOString()
      }
    };
  }

  // 1. Evaluate Investor Fit
  const investorFit = evaluateInvestorFit({
    investorProfile,
    valuation,
    riskProfile,
    financialFacts
  });

  // 2. Evaluate Conviction
  const conviction = calculateConviction({
    valuation,
    riskProfile,
    fitResult: investorFit
  });

  // 3. Extract Core Signals
  const valSummary = valuation?.valuationSummary || {};
  const valStatus = valSummary.valuationStatus || 'UNAVAILABLE';
  const marginOfSafety = valSummary.marginOfSafetyPct ?? null;
  const overallRisk = riskProfile?.overallRiskLevel || 'UNKNOWN';
  const criticalFlags = riskProfile?.criticalFlags || [];
  const hasCriticalRisk = criticalFlags.length > 0 || overallRisk === 'CRITICAL';

  let decision = DECISION_OUTCOMES.WATCH;
  const primaryDrivers = [];
  const keyTradeoffs = [];

  // Deterministic Decision Matrix
  if (hasCriticalRisk) {
    decision = DECISION_OUTCOMES.AVOID;
    primaryDrivers.push(`Critical risk flags detected (${criticalFlags.join(', ') || overallRisk}); capital preservation takes absolute priority.`);
  } else if (valStatus === 'UNDERVALUED') {
    if (overallRisk === 'HIGH') {
      // Conflicting signals: Undervalued but High Risk -> WATCH with tradeoff
      decision = DECISION_OUTCOMES.WATCH;
      primaryDrivers.push(`Stock appears undervalued (Margin of safety: ${marginOfSafety ? marginOfSafety.toFixed(1) + '%' : 'Positive'}), but elevated risk profile (${overallRisk}) warrants caution.`);
      keyTradeoffs.push({
        positive: 'Attractive valuation discount to intrinsic value',
        negative: 'Elevated fundamental or market risk profile',
        resolution: 'Await risk stabilization or margin expansion before initiating position'
      });
    } else if (investorFit.fitStatus === FIT_SCORES.MISALIGNED) {
      decision = DECISION_OUTCOMES.WATCH;
      primaryDrivers.push(`Undervalued asset does not meet ${investorProfile} mandate.`);
    } else {
      decision = DECISION_OUTCOMES.BUY;
      primaryDrivers.push(`Attractive valuation with ${(marginOfSafety !== null ? marginOfSafety.toFixed(1) + '%' : 'positive')} margin of safety and acceptable risk (${overallRisk}).`);
    }
  } else if (valStatus === 'FAIRLY_VALUED') {
    if (overallRisk === 'HIGH') {
      decision = DECISION_OUTCOMES.WATCH;
      primaryDrivers.push(`Fair valuation does not compensate for HIGH risk profile.`);
    } else {
      decision = DECISION_OUTCOMES.HOLD;
      primaryDrivers.push(`Trading near intrinsic fair value with balanced risk-reward profile.`);
    }
  } else if (valStatus === 'OVERVALUED') {
    if (investorProfile === 'AGGRESSIVE_GROWTH' && overallRisk === 'LOW') {
      decision = DECISION_OUTCOMES.HOLD;
      primaryDrivers.push(`Premium valuation supported by strong growth and low balance sheet risk.`);
    } else {
      decision = DECISION_OUTCOMES.WATCH;
      primaryDrivers.push(`Trading at a premium to estimated intrinsic value; unfavorable entry point.`);
    }
  } else {
    // Valuation UNAVAILABLE
    decision = DECISION_OUTCOMES.WATCH;
    primaryDrivers.push('Insufficient fundamental data to confirm intrinsic valuation.');
  }

  // Generate "What could change this decision?"
  const triggers = generateDecisionFalsificationTriggers({ decision, valuation, riskProfile });

  // Generate Evidence Graph
  const evidenceGraph = buildDecisionEvidenceGraph({
    decision,
    valuation,
    riskProfile,
    financialFacts
  });

  return {
    decision,
    convictionLevel: conviction.convictionLevel,
    convictionScore: conviction.convictionScore,
    investorFit,
    primaryDrivers,
    keyTradeoffs,
    whatCouldChangeThisDecision: triggers,
    evidenceGraph,
    metadata: {
      engine: 'InvestmentAI-Phase3-DeterministicDecisionEngine',
      evaluatedAt: new Date().toISOString()
    }
  };
}
