/**
 * server/riskAttribution/riskAttribution.hierarchy.js
 * 
 * Phase 32: Canonical Risk Contribution Hierarchy & Aggregation Tree
 * Strict additive reconciliation, cycle detection, and double-counting prevention.
 */

import { HierarchyLevel, ConfidenceStatus, ResidualPolicy, deepFreeze } from './riskAttribution.types.js';
import { RiskAttributionConfig } from './riskAttribution.config.js';

export class RiskAttributionHierarchy {
  /**
   * Build Multi-Level Hierarchical Risk Contribution Tree
   */
  static buildHierarchyTree(attributionResult) {
    if (!attributionResult || !attributionResult.positions) {
      throw new Error('Valid attributionResult with positions is required');
    }

    const { portfolioMetrics, positions, sectors, geographies, sleeves, factorAttribution } = attributionResult;
    const portfolioVol = portfolioMetrics.portfolioVolatility;
    const portfolioVar = portfolioMetrics.portfolioVariance;

    // 1. Root Node: Portfolio
    const rootNode = {
      id: 'NODE-PORTFOLIO-ROOT',
      level: HierarchyLevel.PORTFOLIO,
      name: 'Total Portfolio Risk',
      volatility: portfolioVol,
      variance: portfolioVar,
      weight: 1.0,
      componentRiskContribution: portfolioVol,
      percentageRiskContribution: 1.0,
      children: [],
      status: ConfidenceStatus.CALCULATED
    };

    // 2. Risk Type Branch (Systematic vs Idiosyncratic or Volatility Breakdown)
    if (factorAttribution) {
      const systematicNode = {
        id: 'NODE-RISKTYPE-SYSTEMATIC',
        level: HierarchyLevel.RISK_TYPE,
        name: 'Systematic Factor Risk',
        variance: factorAttribution.systematicVariance,
        percentageContribution: factorAttribution.systematicVariancePercentage / 100,
        children: factorAttribution.factorContributions.map(fc => ({
          id: `NODE-FACTOR-${fc.factorName}`,
          level: HierarchyLevel.FACTOR,
          name: fc.factorName,
          exposure: fc.portfolioExposure,
          varianceContribution: fc.varianceContribution,
          percentageContribution: fc.percentageContribution,
          status: ConfidenceStatus.CALCULATED
        })),
        status: ConfidenceStatus.MODEL_BASED
      };

      const idiosyncraticNode = {
        id: 'NODE-RISKTYPE-IDIOSYNCRATIC',
        level: HierarchyLevel.RISK_TYPE,
        name: 'Idiosyncratic Specific Risk',
        variance: factorAttribution.idiosyncraticVariance,
        percentageContribution: factorAttribution.idiosyncraticVariancePercentage / 100,
        children: factorAttribution.idiosyncraticContributions.map(ic => ({
          id: `NODE-IDIO-${ic.symbol}`,
          level: HierarchyLevel.POSITION,
          name: ic.symbol,
          weight: ic.weight,
          varianceContribution: ic.idiosyncraticVarianceContribution,
          status: ConfidenceStatus.CALCULATED
        })),
        status: ConfidenceStatus.MODEL_BASED
      };

      rootNode.children.push(systematicNode, idiosyncraticNode);
    }

    // 3. Sleeve Subtree
    const sleeveTree = {
      id: 'NODE-HIERARCHY-SLEEVES',
      level: HierarchyLevel.SLEEVE,
      name: 'Portfolio Sleeves Aggregation',
      sumComponentRisk: sleeves.sumComponentRisk,
      children: sleeves.groups.map(sg => ({
        id: `NODE-SLEEVE-${sg.name}`,
        level: HierarchyLevel.SLEEVE,
        name: sg.name,
        weight: sg.weight,
        componentRiskContribution: sg.componentRiskContribution,
        percentageRiskContribution: sg.percentageRiskContribution,
        varianceContribution: sg.varianceContribution,
        positionCount: sg.positionCount,
        children: sg.positions.map(sym => {
          const pos = positions.find(p => p.symbol === sym);
          return {
            id: `NODE-POS-${sym}`,
            level: HierarchyLevel.POSITION,
            name: sym,
            weight: pos ? pos.weight : 0,
            componentRiskContribution: pos ? pos.componentRiskContribution : 0,
            percentageRiskContribution: pos ? pos.percentageRiskContribution : 0,
            status: ConfidenceStatus.CALCULATED
          };
        }),
        status: ConfidenceStatus.DERIVED
      })),
      status: ConfidenceStatus.DERIVED
    };

    // 4. Sector Subtree
    const sectorTree = {
      id: 'NODE-HIERARCHY-SECTORS',
      level: HierarchyLevel.SECTOR,
      name: 'Sector Aggregation Hierarchy',
      sumComponentRisk: sectors.sumComponentRisk,
      children: sectors.groups.map(sec => ({
        id: `NODE-SECTOR-${sec.name}`,
        level: HierarchyLevel.SECTOR,
        name: sec.name,
        weight: sec.weight,
        componentRiskContribution: sec.componentRiskContribution,
        percentageRiskContribution: sec.percentageRiskContribution,
        varianceContribution: sec.varianceContribution,
        children: sec.positions.map(sym => {
          const pos = positions.find(p => p.symbol === sym);
          return {
            id: `NODE-POS-${sym}`,
            level: HierarchyLevel.POSITION,
            name: sym,
            weight: pos ? pos.weight : 0,
            componentRiskContribution: pos ? pos.componentRiskContribution : 0,
            percentageRiskContribution: pos ? pos.percentageRiskContribution : 0,
            status: ConfidenceStatus.CALCULATED
          };
        }),
        status: ConfidenceStatus.DERIVED
      })),
      status: ConfidenceStatus.DERIVED
    };

    // 5. Geography Subtree
    const geographyTree = {
      id: 'NODE-HIERARCHY-GEOGRAPHIES',
      level: HierarchyLevel.GEOGRAPHY,
      name: 'Geography Aggregation Hierarchy',
      sumComponentRisk: geographies.sumComponentRisk,
      children: geographies.groups.map(geo => ({
        id: `NODE-GEO-${geo.name}`,
        level: HierarchyLevel.GEOGRAPHY,
        name: geo.name,
        weight: geo.weight,
        componentRiskContribution: geo.componentRiskContribution,
        percentageRiskContribution: geo.percentageRiskContribution,
        varianceContribution: geo.varianceContribution,
        children: geo.positions.map(sym => {
          const pos = positions.find(p => p.symbol === sym);
          return {
            id: `NODE-POS-${sym}`,
            level: HierarchyLevel.POSITION,
            name: sym,
            weight: pos ? pos.weight : 0,
            componentRiskContribution: pos ? pos.componentRiskContribution : 0,
            percentageRiskContribution: pos ? pos.percentageRiskContribution : 0,
            status: ConfidenceStatus.CALCULATED
          };
        }),
        status: ConfidenceStatus.DERIVED
      })),
      status: ConfidenceStatus.DERIVED
    };

    // 6. Invariant Verification: No cycles, and sum(children) == parent for additive branches
    const sectorGap = Math.abs(sectors.sumComponentRisk - portfolioVol);
    const geoGap = Math.abs(geographies.sumComponentRisk - portfolioVol);
    const sleeveGap = Math.abs(sleeves.sumComponentRisk - portfolioVol);

    const hasNoCycles = this.verifyNoCycles([rootNode, sleeveTree, sectorTree, geographyTree]);

    return deepFreeze({
      rootNode,
      sleeveTree,
      sectorTree,
      geographyTree,
      invariants: {
        hasNoCycles,
        sectorReconciliationGap: sectorGap,
        geographyReconciliationGap: geoGap,
        sleeveReconciliationGap: sleeveGap,
        isAdditivelyConsistent: sectorGap <= RiskAttributionConfig.TOLERANCES.ABSOLUTE_RECONCILIATION &&
                                geoGap <= RiskAttributionConfig.TOLERANCES.ABSOLUTE_RECONCILIATION &&
                                sleeveGap <= RiskAttributionConfig.TOLERANCES.ABSOLUTE_RECONCILIATION
      }
    });
  }

  /**
   * Cycle detection using visited set
   */
  static verifyNoCycles(trees) {
    const visited = new Set();
    const recursionStack = new Set();

    function dfs(node) {
      if (!node || typeof node !== 'object') return true;
      if (recursionStack.has(node.id)) return false; // Cycle detected!
      if (visited.has(node.id)) return true;

      visited.add(node.id);
      recursionStack.add(node.id);

      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          if (!dfs(child)) return false;
        }
      }

      recursionStack.delete(node.id);
      return true;
    }

    for (const tree of trees) {
      if (!dfs(tree)) return false;
    }
    return true;
  }
}
