/**
 * Deterministic Explanation DAG Engine for Phase 14
 * Constructs an auditable causal lineage for every target weight.
 */
export class ExplanationEngine {
  /**
   * Build complete explanation graph for the portfolio construction package.
   */
  static buildExplanationGraph(targetWeights, method, universeSecurities, expectedReturns, riskBudget, constraints, config) {
    const nodes = [];
    const edges = [];

    // Root objective node
    const objectiveNodeId = `NODE_OBJ_${method}`;
    nodes.push({
      id: objectiveNodeId,
      type: "OPTIMIZATION_OBJECTIVE",
      label: `Optimization Method: ${method}`,
      method,
      configVersion: config.configId
    });

    for (const sec of universeSecurities) {
      const t = sec.ticker;
      const weight = targetWeights[t] || 0;
      const expRetData = expectedReturns[t] || {};
      const rcData = riskBudget?.byTicker?.find(b => b.ticker === t) || {};

      // 1. Target weight node
      const weightNodeId = `NODE_WEIGHT_${t}`;
      nodes.push({
        id: weightNodeId,
        type: "TARGET_WEIGHT",
        ticker: t,
        targetWeight: weight,
        sector: sec.sector || "UNKNOWN"
      });
      edges.push({ from: objectiveNodeId, to: weightNodeId, relation: "DETERMINED_BY_OBJECTIVE" });

      // 2. Constraint node
      const minW = constraints.positionMinWeights?.[t] ?? constraints.minWeight ?? 0;
      const maxW = constraints.positionMaxWeights?.[t] ?? constraints.maxWeight ?? 0.25;
      const constraintNodeId = `NODE_CONST_${t}`;
      nodes.push({
        id: constraintNodeId,
        type: "BOUND_CONSTRAINT",
        ticker: t,
        minWeight: minW,
        maxWeight: maxW,
        isCapped: Math.abs(weight - maxW) < 1e-4,
        isFloored: Math.abs(weight - minW) < 1e-4
      });
      edges.push({ from: constraintNodeId, to: weightNodeId, relation: "BOUNDED_BY" });

      // 3. Expected return & valuation node
      if (expRetData.expectedReturn !== undefined && expRetData.expectedReturn !== null) {
        const retNodeId = `NODE_RET_${t}`;
        nodes.push({
          id: retNodeId,
          type: "EXPECTED_RETURN",
          ticker: t,
          expectedReturn: expRetData.expectedReturn,
          source: expRetData.source,
          formula: expRetData.formula,
          evidenceIds: expRetData.evidenceIds || []
        });
        edges.push({ from: retNodeId, to: weightNodeId, relation: "INPUT_EXPECTED_RETURN" });
      }

      // 4. Risk / Volatility node
      if (rcData.riskContribution !== undefined) {
        const riskNodeId = `NODE_RISK_${t}`;
        nodes.push({
          id: riskNodeId,
          type: "RISK_BUDGET",
          ticker: t,
          riskContribution: rcData.riskContribution,
          percentageRiskContribution: rcData.percentageRiskContribution,
          marginalRiskContribution: rcData.marginalRiskContribution
        });
        edges.push({ from: riskNodeId, to: weightNodeId, relation: "INPUT_RISK_CONTRIBUTION" });
      }
    }

    return {
      nodes,
      edges,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      summary: `Auditable causal DAG generated with ${nodes.length} nodes and ${edges.length} relationships.`
    };
  }
}
