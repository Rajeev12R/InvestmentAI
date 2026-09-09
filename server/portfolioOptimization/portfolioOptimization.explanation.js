/**
 * server/portfolioOptimization/portfolioOptimization.explanation.js
 * 
 * Phase 33: Auditable Explanation DAG & Deterministic NLG Engine
 */

import { DecisionAction, deepFreeze } from './portfolioOptimization.types.js';

export class PortfolioOptimizationExplanationDAG {
  /**
   * Constructs an immutable, auditable Explanation DAG connecting decisions to structured evidence.
   */
  static buildExplanationDAG(optimizationResult) {
    if (!optimizationResult || !optimizationResult.symbols) {
      throw new Error('Valid optimization result required to build Explanation DAG');
    }

    const nodes = [];
    const edges = [];

    // Root Node: Objective
    const rootNodeId = 'NODE-OBJECTIVE-ROOT';
    nodes.push({
      id: rootNodeId,
      type: 'OBJECTIVE',
      label: `Optimization Objective: ${optimizationResult.objectiveType}`,
      metadata: {
        objectiveType: optimizationResult.objectiveType,
        expectedReturn: optimizationResult.portfolioMetrics?.expectedReturn,
        volatility: optimizationResult.portfolioMetrics?.portfolioVolatility
      }
    });

    // Solver Node
    const solverNodeId = 'NODE-SOLVER-EXECUTION';
    nodes.push({
      id: solverNodeId,
      type: 'SOLVER_STATUS',
      label: `Solver: ${optimizationResult.solverMetadata?.solverName} (${optimizationResult.status})`,
      metadata: optimizationResult.solverMetadata
    });
    edges.push({ from: rootNodeId, to: solverNodeId, relationship: 'SOLVED_BY' });

    // Position Decision Nodes
    if (optimizationResult.positionDecisions) {
      for (const dec of optimizationResult.positionDecisions) {
        const decNodeId = `NODE-POSITION-${dec.symbol}`;
        const pctDelta = (dec.weightDelta * 100).toFixed(2);
        const newPct = (dec.optimizedWeight * 100).toFixed(2);

        nodes.push({
          id: decNodeId,
          type: 'POSITION_DECISION',
          label: `${dec.action} ${dec.symbol}: ${newPct}% (${pctDelta >= 0 ? '+' : ''}${pctDelta}%)`,
          metadata: dec
        });
        edges.push({ from: solverNodeId, to: decNodeId, relationship: 'DRIVES_WEIGHT' });
      }
    }

    // Constraint Nodes
    if (optimizationResult.postOptimizationVerification?.constraintRecords) {
      for (let i = 0; i < optimizationResult.postOptimizationVerification.constraintRecords.length; i++) {
        const c = optimizationResult.postOptimizationVerification.constraintRecords[i];
        const cNodeId = `NODE-CONSTRAINT-${i}`;
        nodes.push({
          id: cNodeId,
          type: 'CONSTRAINT_CHECK',
          label: `${c.name}: ${c.status}`,
          metadata: c
        });
        edges.push({ from: solverNodeId, to: cNodeId, relationship: 'CONSTRAINED_BY' });
      }
    }

    // Deterministic NLG Narrative
    const narrative = this.generateNLGNarrative(optimizationResult);

    return deepFreeze({
      dagId: `DAG-OPT-${Date.now()}`,
      rootNodeId,
      totalNodes: nodes.length,
      totalEdges: edges.length,
      nodes,
      edges,
      narrative,
      asOf: optimizationResult.asOf
    });
  }

  /**
   * Deterministic institutional natural language narrative generator.
   */
  static generateNLGNarrative(result) {
    if (result.status !== 'OPTIMAL') {
      return {
        summary: `Portfolio optimization was rejected or failed with status ${result.status}. ${result.message || ''}`,
        keyDrivers: [],
        constraintSummary: 'Optimization constraints could not be satisfied.'
      };
    }

    const topIncreases = result.positionDecisions?.filter(d => d.action === DecisionAction.INCREASE || d.action === DecisionAction.ENTER) || [];
    const topDecreases = result.positionDecisions?.filter(d => d.action === DecisionAction.DECREASE || d.action === DecisionAction.EXIT) || [];
    
    topIncreases.sort((a, b) => b.weightDelta - a.weightDelta);
    topDecreases.sort((a, b) => a.weightDelta - b.weightDelta);

    const incText = topIncreases.length > 0 
      ? topIncreases.map(d => `${d.symbol} (+${(d.weightDelta * 100).toFixed(1)}%)`).join(', ') 
      : 'None';

    const decText = topDecreases.length > 0 
      ? topDecreases.map(d => `${d.symbol} (${(d.weightDelta * 100).toFixed(1)}%)`).join(', ') 
      : 'None';

    const volPct = (result.portfolioMetrics.portfolioVolatility * 100).toFixed(2);
    const retPct = (result.portfolioMetrics.expectedReturn * 100).toFixed(2);
    const turnoverPct = (result.totalTurnover * 100).toFixed(2);

    const summary = `The optimizer targeted ${result.objectiveType}, arriving at an annualized volatility of ${volPct}% and expected return of ${retPct}% with total turnover of ${turnoverPct}%. Primary allocations increased in ${incText}, financed by reductions in ${decText}.`;

    const keyDrivers = [
      `Primary risk reduction driver: rebalanced weights to achieve ${volPct}% target volatility.`,
      `Turnover efficiency: total two-way portfolio turnover constrained to ${turnoverPct}%.`,
      `Diversification health: Herfindahl-Hirschman concentration index is ${(result.portfolioMetrics.herfindahlIndex * 10000).toFixed(0)} bps.`
    ];

    return {
      summary,
      keyDrivers,
      constraintSummary: result.postOptimizationVerification?.isHardConstraintsSatisfied
        ? 'All mandatory hard constraints were verified and fully satisfied.'
        : 'Warning: Hard constraint violations detected.'
    };
  }
}
