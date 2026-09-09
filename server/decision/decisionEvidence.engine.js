/**
 * Generates an auditable evidence graph connecting a decision to underlying facts and calculations.
 *
 * @param {Object} params
 * @param {string} params.decision - BUY, HOLD, WATCH, AVOID
 * @param {Object} params.valuation - Valuation engine output
 * @param {Object} params.riskProfile - Risk engine output
 * @param {Object} params.financialFacts - Grounded and calculated facts
 * @returns {Array<Object>} List of traceable evidence nodes
 */
export function buildDecisionEvidenceGraph({
  decision,
  valuation = {},
  riskProfile = {},
  financialFacts = {}
} = {}) {
  const nodes = [];

  // 1. Valuation Node
  const valSummary = valuation?.valuationSummary || {};
  if (valSummary.compositeFairValue) {
    nodes.push({
      nodeId: 'valuation-composite',
      category: 'VALUATION',
      claim: `Fair value evaluated at ${valSummary.compositeFairValue} vs market price ${valSummary.currentPrice}`,
      metric: 'compositeFairValue',
      value: valSummary.compositeFairValue,
      status: valSummary.valuationStatus,
      marginOfSafety: valSummary.marginOfSafetyPct,
      dependencies: valuation?.modelAgreement?.modelsEvaluated || ['DCF', 'RELATIVE'],
      formula: 'Weighted average of verified valuation models'
    });
  }

  // 2. Risk Nodes
  const breakdowns = riskProfile?.categoryBreakdowns || {};
  for (const [catName, catData] of Object.entries(breakdowns)) {
    if (catData.severity === 'HIGH' || catData.severity === 'CRITICAL' || catData.severity === 'LOW') {
      nodes.push({
        nodeId: `risk-${catName.toLowerCase()}`,
        category: 'RISK',
        riskCategory: catName,
        claim: `${catName} risk evaluated as ${catData.severity}`,
        severity: catData.severity,
        metrics: catData.metrics,
        flags: catData.flags
      });
    }
  }

  // 3. Grounded Facts Reference
  const factKeys = ['freeCashFlow', 'netDebt', 'totalDebt', 'operatingIncome', 'totalRevenue'];
  for (const key of factKeys) {
    if (financialFacts && financialFacts[key]) {
      const fact = financialFacts[key];
      nodes.push({
        nodeId: `fact-${key}`,
        category: 'GROUNDED_FACT',
        metric: key,
        value: fact.value,
        type: fact.type,
        source: fact.source || 'SEC_FILING_OR_FEED',
        formula: fact.formula || null,
        dependencies: fact.dependencies || null
      });
    }
  }

  return nodes;
}
