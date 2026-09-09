/**
 * @file decisionWorkbench.engine.js
 * Multi-Domain Decision Operating Orchestrator for Phase 37 Investment Decision Workbench.
 * Connects decisions to Portfolio, Exposure, Risk Forecasting, Attribution, Scenarios, Compliance, and Optimization.
 */

import { decisionWorkbenchRepository } from './decisionWorkbench.repository.js';
import { portfolioRepository } from '../portfolio/portfolio.repository.js';
import { PortfolioOperatingEngine } from '../portfolio/portfolioOperating.engine.js';
import { calculateConcentration } from '../portfolio/concentration.engine.js';
import { computeDeterministicHash } from './decisionWorkbench.types.js';

export class DecisionWorkbenchEngine {
  /**
   * Evaluates comprehensive multi-domain portfolio, risk, exposure, and compliance impact of a proposed decision.
   */
  static evaluateDecisionImpact(decisionId, workspaceId = null, orgId = null) {
    const decision = decisionWorkbenchRepository.getDecisionById(decisionId, workspaceId, orgId);
    if (!decision) throw new Error(`Decision ${decisionId} not found`);

    const portfolio = portfolioRepository.getPortfolioById(decision.portfolioId, workspaceId, orgId);
    if (!portfolio) throw new Error(`Portfolio ${decision.portfolioId} not found`);

    // 1. Current Baseline Portfolio Analytics
    const baselineExposure = PortfolioOperatingEngine.evaluateExposure(portfolio);
    const baselineRisk = PortfolioOperatingEngine.evaluateRisk(portfolio);
    const baselineCompliance = PortfolioOperatingEngine.evaluateCompliance(portfolio);

    // 2. Simulated Post-Action Portfolio
    const targetWeight = decision.proposedPosition.targetWeight;
    const ticker = decision.ticker;
    const originalHoldings = portfolio.holdings || [];

    // Normalize weights to accommodate the new target weight
    const existingIndex = originalHoldings.findIndex(h => h.ticker === ticker);
    let simulatedHoldings = [];

    if (existingIndex >= 0) {
      simulatedHoldings = originalHoldings.map((h, idx) => {
        if (idx === existingIndex) {
          return { ...h, weight: targetWeight, marketValue: portfolio.aum * targetWeight };
        }
        return { ...h };
      });
    } else {
      simulatedHoldings = [
        ...originalHoldings,
        {
          ticker,
          securityName: ticker,
          weight: targetWeight,
          marketValue: portfolio.aum * targetWeight,
          price: decision.proposedPosition.price || 100,
          quantity: Math.floor((portfolio.aum * targetWeight) / (decision.proposedPosition.price || 100)),
          sector: 'Technology',
          geography: 'US'
        }
      ];
    }

    // Re-scale other weights proportionally so total sum = 1.0 (or cash adjusted)
    const otherWeightSum = simulatedHoldings
      .filter(h => h.ticker !== ticker)
      .reduce((sum, h) => sum + h.weight, 0);
    const targetRemaining = Math.max(0, 1.0 - targetWeight);

    if (otherWeightSum > 0) {
      simulatedHoldings = simulatedHoldings.map(h => {
        if (h.ticker === ticker) return h;
        const rescaledWeight = (h.weight / otherWeightSum) * targetRemaining;
        return {
          ...h,
          weight: rescaledWeight,
          marketValue: portfolio.aum * rescaledWeight
        };
      });
    }

    const simulatedPortfolio = {
      ...portfolio,
      holdings: simulatedHoldings
    };

    // 3. Simulated Post-Action Analytics
    const projectedExposure = PortfolioOperatingEngine.evaluateExposure(simulatedPortfolio);
    const projectedRisk = PortfolioOperatingEngine.evaluateRisk(simulatedPortfolio);
    const projectedCompliance = PortfolioOperatingEngine.evaluateCompliance(simulatedPortfolio);

    // 4. Marginal Deltas
    const weightDelta = targetWeight - decision.currentPosition.weight;
    const marketValueDelta = (portfolio.aum * targetWeight) - decision.currentPosition.marketValue;
    const volatilityDelta = projectedRisk.annualizedVolatility - baselineRisk.annualizedVolatility;
    const var95Delta = projectedRisk.parametricVaR95 - baselineRisk.parametricVaR95;
    const es95Delta = projectedRisk.expectedShortfall95 - baselineRisk.expectedShortfall95;
    const hhiDelta = projectedExposure.hhi - baselineExposure.hhi;

    // 5. Scenario Stress Impact
    const scenarios = [
      {
        scenarioId: 'SCEN-BASE',
        name: 'Baseline Projection',
        expectedReturn: decision.version?.thesis?.expectedReturn ?? 0.12,
        maxDrawdown: baselineRisk.annualizedVolatility * 1.5,
        portfolioReturnImpact: weightDelta * (decision.version?.thesis?.expectedReturn ?? 0.12)
      },
      {
        scenarioId: 'SCEN-BULL',
        name: 'Secular AI Acceleration (Bull)',
        expectedReturn: (decision.version?.thesis?.expectedReturn ?? 0.12) * 1.8,
        maxDrawdown: baselineRisk.annualizedVolatility * 0.8,
        portfolioReturnImpact: weightDelta * ((decision.version?.thesis?.expectedReturn ?? 0.12) * 1.8)
      },
      {
        scenarioId: 'SCEN-BEAR',
        name: 'Capex Digestion / Multiple Contraction (Bear)',
        expectedReturn: -0.22,
        maxDrawdown: -0.35,
        portfolioReturnImpact: weightDelta * -0.22
      },
      {
        scenarioId: 'SCEN-MACRO-SHOCK',
        name: 'Higher-for-Longer Rates Shock',
        expectedReturn: -0.15,
        maxDrawdown: -0.28,
        portfolioReturnImpact: weightDelta * -0.15
      }
    ];

    return {
      decisionId,
      portfolioId: portfolio.portfolioId,
      ticker,
      currentWeight: decision.currentPosition.weight,
      proposedWeight: targetWeight,
      weightDelta,
      marketValueDelta,
      exposureImpact: {
        baselineHHI: baselineExposure.hhi,
        projectedHHI: projectedExposure.hhi,
        hhiDelta,
        baselineNEff: baselineExposure.nEff,
        projectedNEff: projectedExposure.nEff
      },
      riskImpact: {
        baselineVolatility: baselineRisk.annualizedVolatility,
        projectedVolatility: projectedRisk.annualizedVolatility,
        volatilityDelta,
        baselineVaR95: baselineRisk.parametricVaR95,
        projectedVaR95: projectedRisk.parametricVaR95,
        var95Delta,
        baselineES95: baselineRisk.expectedShortfall95,
        projectedES95: projectedRisk.expectedShortfall95,
        es95Delta
      },
      complianceImpact: {
        isWithinLimits: projectedCompliance.isCompliant,
        breaches: projectedCompliance.breaches || [],
        maxSinglePositionLimit: portfolio.mandate?.maxSinglePositionWeight || 0.25,
        projectedSinglePositionWeight: targetWeight,
        singlePositionStatus: targetWeight <= (portfolio.mandate?.maxSinglePositionWeight || 0.25) ? 'PASS' : 'BREACH'
      },
      scenarios,
      evaluatedAt: new Date().toISOString()
    };
  }

  /**
   * Reconstructs point-in-time decision context as of timestamp T0.
   */
  static reconstructPointInTimeContext(decisionId, asOfTimestamp, workspaceId = null, orgId = null) {
    const snapshot = decisionWorkbenchRepository.getSnapshotAsOf(decisionId, asOfTimestamp, workspaceId, orgId);
    if (snapshot) {
      return {
        isReconstructedFromSnapshot: true,
        asOf: snapshot.asOf,
        decision: snapshot
      };
    }

    const decision = decisionWorkbenchRepository.getDecisionById(decisionId, workspaceId, orgId);
    if (!decision) throw new Error(`Decision ${decisionId} not found`);

    return {
      isReconstructedFromSnapshot: false,
      asOf: decision.asOf,
      decision
    };
  }
}

export default DecisionWorkbenchEngine;
