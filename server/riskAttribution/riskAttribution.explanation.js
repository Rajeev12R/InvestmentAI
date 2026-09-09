/**
 * server/riskAttribution/riskAttribution.explanation.js
 * 
 * Phase 32: Auditable Explanation DAG & Deterministic Natural Language Generator
 * Machine-auditable lineage nodes and strictly consistent human explanations.
 */

import { ConfidenceStatus, deepFreeze } from './riskAttribution.types.js';
import { RiskAttributionConfig } from './riskAttribution.config.js';

export class RiskAttributionExplanationDAG {
  /**
   * Build Explanation DAG from Attribution Result
   */
  static buildExplanationDAG(attributionResult) {
    if (!attributionResult || !attributionResult.positions) {
      throw new Error('Valid attributionResult is required to build explanation DAG');
    }

    const { portfolioMetrics, positions, sectors, geographies, factorAttribution, correlationAttribution, concentrationAttribution, asOf } = attributionResult;
    const nodes = [];
    const edges = [];

    // 1. Root Node: Total Portfolio Volatility
    const rootNodeId = 'NODE-PORTFOLIO-VOLATILITY';
    nodes.push({
      nodeId: rootNodeId,
      label: 'Portfolio Annualized Volatility',
      value: portfolioMetrics.portfolioVolatility,
      unit: 'ANNUALIZED_VOL',
      calculation: 'sigma_p = sqrt(w^T * Sigma * w) * sqrt(252)',
      modelVersion: RiskAttributionConfig.ENGINE_VERSION,
      timestamp: asOf,
      confidence: portfolioMetrics.isZeroRisk ? ConfidenceStatus.DERIVED : ConfidenceStatus.CALCULATED,
      dependencies: ['NODE-ASSET-WEIGHTS', 'NODE-COVARIANCE-MATRIX']
    });

    // 2. Component Risk Contribution Nodes
    for (const pos of positions) {
      const posNodeId = `NODE-CRC-${pos.symbol}`;
      nodes.push({
        nodeId: posNodeId,
        label: `Component Risk Contribution: ${pos.symbol}`,
        symbol: pos.symbol,
        weight: pos.weight,
        mrc: pos.marginalRiskContribution,
        crc: pos.componentRiskContribution,
        prc: pos.percentageRiskContribution,
        calculation: 'CRC_i = w_i * ((Sigma * w)_i / sigma_p)',
        modelVersion: RiskAttributionConfig.ENGINE_VERSION,
        timestamp: asOf,
        confidence: ConfidenceStatus.CALCULATED,
        dependencies: [rootNodeId, `NODE-WEIGHT-${pos.symbol}`]
      });

      edges.push({
        from: posNodeId,
        to: rootNodeId,
        relation: 'ADDITIVE_CONTRIBUTOR_TO',
        weight: pos.percentageRiskContribution
      });
    }

    // 3. Sector Aggregation Nodes
    for (const sec of sectors.groups) {
      const secNodeId = `NODE-SECTOR-${sec.name}`;
      nodes.push({
        nodeId: secNodeId,
        label: `Sector Risk Contribution: ${sec.name}`,
        sector: sec.name,
        weight: sec.weight,
        crc: sec.componentRiskContribution,
        prc: sec.percentageRiskContribution,
        calculation: 'Sector_CRC = sum(CRC_i for i in Sector)',
        modelVersion: RiskAttributionConfig.ENGINE_VERSION,
        timestamp: asOf,
        confidence: ConfidenceStatus.DERIVED,
        dependencies: sec.positions.map(sym => `NODE-CRC-${sym}`)
      });

      for (const sym of sec.positions) {
        edges.push({
          from: `NODE-CRC-${sym}`,
          to: secNodeId,
          relation: 'ROLLS_UP_TO'
        });
      }
    }

    // 4. Factor Decomposition Nodes (if available)
    if (factorAttribution) {
      const factorNodeId = 'NODE-FACTOR-DECOMPOSITION';
      nodes.push({
        nodeId: factorNodeId,
        label: 'Systematic vs Idiosyncratic Factor Variance',
        systematicPercentage: factorAttribution.systematicVariancePercentage,
        idiosyncraticPercentage: factorAttribution.idiosyncraticVariancePercentage,
        calculation: 'Sigma_p^2 = w_F^T * F * w_F + sum(w_i^2 * D_ii)',
        modelVersion: RiskAttributionConfig.ENGINE_VERSION,
        timestamp: asOf,
        confidence: ConfidenceStatus.MODEL_BASED,
        dependencies: [rootNodeId]
      });

      edges.push({
        from: factorNodeId,
        to: rootNodeId,
        relation: 'DECOMPOSES_VARIANCE_OF'
      });
    }

    // 5. Generate Natural Language Explanation from Structured Data
    const narrative = this.generateDeterministicNarrative(attributionResult);

    return deepFreeze({
      dagId: `DAG-ATTR-${Date.now()}`,
      asOf,
      engineVersion: RiskAttributionConfig.ENGINE_VERSION,
      totalNodes: nodes.length,
      totalEdges: edges.length,
      nodes,
      edges,
      narrative
    });
  }

  /**
   * Deterministic Natural Language Generator strictly bound to quantitative attribution metrics
   */
  static generateDeterministicNarrative(attributionResult) {
    const { portfolioMetrics, positions, sectors, factorAttribution, correlationAttribution, concentrationAttribution } = attributionResult;
    const volPct = (portfolioMetrics.portfolioVolatility * 100).toFixed(2);
    const divRatio = portfolioMetrics.diversificationRatio.toFixed(2);

    // Top 3 positions by risk
    const sortedPos = [...positions].sort((a, b) => b.componentRiskContribution - a.componentRiskContribution);
    const top3Pos = sortedPos.slice(0, 3);

    // Top 2 sectors by risk
    const sortedSectors = [...sectors.groups].sort((a, b) => b.componentRiskContribution - a.componentRiskContribution);
    const top2Sectors = sortedSectors.slice(0, 2);

    const lines = [];
    lines.push(`Portfolio annualized volatility is ${volPct}%. Diversification ratio is ${divRatio}x.`);

    if (top2Sectors.length > 0) {
      const sec1 = top2Sectors[0];
      const sec1Prc = (sec1.percentageRiskContribution * 100).toFixed(1);
      lines.push(`Sector leadership: ${sec1.name} accounts for ${sec1Prc}% of total portfolio risk.`);
      if (top2Sectors.length > 1) {
        const sec2 = top2Sectors[1];
        const sec2Prc = (sec2.percentageRiskContribution * 100).toFixed(1);
        lines.push(`Secondary sector: ${sec2.name} contributes ${sec2Prc}% of risk.`);
      }
    }

    if (top3Pos.length > 0) {
      lines.push('Top risk-driving positions:');
      top3Pos.forEach((p, idx) => {
        const prcPct = (p.percentageRiskContribution * 100).toFixed(1);
        const wPct = (p.weight * 100).toFixed(1);
        let driver = 'standalone volatility';
        if (p.percentageRiskContribution > (Math.abs(p.weight) * 1.5)) {
          driver = 'high marginal risk / cross-correlation';
        } else if (Math.abs(p.weight) > 0.20) {
          driver = 'large nominal weight concentration';
        }
        lines.push(`  ${idx + 1}. ${p.symbol} (${prcPct}% risk, ${wPct}% weight) — Primary driver: ${driver}.`);
      });
    }

    // Concentration vs Correlation narrative
    const isConcentrationDominated = concentrationAttribution.riskHHI > 0.25;
    const isCorrelationDominated = correlationAttribution.crossCovarianceRatio > 0.50;
    if (isConcentrationDominated && isCorrelationDominated) {
      lines.push('Risk structure is co-dominated by high single-name concentration and strong cross-asset covariance.');
    } else if (isConcentrationDominated) {
      lines.push('Risk is predominantly driven by position concentration rather than broad market factor exposure.');
    } else if (isCorrelationDominated) {
      lines.push('Risk is predominantly driven by cross-asset covariance and common factor coupling.');
    }

    // Factor summary if available
    if (factorAttribution) {
      const sysPct = factorAttribution.systematicVariancePercentage.toFixed(1);
      const idioPct = factorAttribution.idiosyncraticVariancePercentage.toFixed(1);
      lines.push(`Variance decomposition: ${sysPct}% systematic factor variance vs ${idioPct}% idiosyncratic specific variance.`);
    }

    return {
      summary: lines.join('\n'),
      bulletPoints: lines,
      status: ConfidenceStatus.DERIVED
    };
  }
}
