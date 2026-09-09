/**
 * Phase 18 — Institutional Investor Copilot Liquidity Tool
 * Strictly read-only tool interface for Copilot to explain deterministic liquidity metrics.
 */

import { LiquidityStatus, deepFreeze } from './liquidity.types.js';
import { LiquidityEngine } from './liquidity.engine.js';
import { LiquidityFeasibilityEngine } from './liquidity.feasibility.engine.js';
import { LiquidityCostEngine } from './liquidity.cost.engine.js';
import { LiquidityStressEngine } from './liquidity.stress.engine.js';
import { LiquidityExplanationEngine } from './liquidity.explanation.engine.js';
import { liquidityRepository } from './liquidity.repository.js';

export class LiquidityCopilotTool {
  /**
   * Explains single-security liquidity to Copilot.
   */
  static querySecurityLiquidity(workspaceId, ticker) {
    if (!ticker) {
      return { status: LiquidityStatus.INVALID_INPUT, explanation: 'Ticker is required.' };
    }

    const obs = liquidityRepository.getObservation(workspaceId, ticker);
    if (!obs) {
      return {
        status: LiquidityStatus.UNAVAILABLE,
        explanation: `Liquidity data is UNAVAILABLE: no verified observation found for ticker ${ticker} in workspace ${workspaceId}.`
      };
    }

    const evalResult = LiquidityEngine.evaluateSecurityLiquidity(obs);
    const explanation = LiquidityExplanationEngine.explainSecurityLiquidity(evalResult);

    return deepFreeze({
      status: evalResult.status,
      ticker,
      metrics: evalResult,
      explanation
    });
  }

  /**
   * Evaluates proposed trade feasibility for Copilot queries.
   */
  static queryTradeFeasibility(workspaceId, params) {
    const { ticker, orderQuantity, orderNotional } = params;
    const obs = liquidityRepository.getObservation(workspaceId, ticker);

    if (!obs) {
      return {
        status: LiquidityStatus.UNAVAILABLE,
        explanation: `Cannot evaluate feasibility: verified liquidity observation missing for ticker ${ticker}.`
      };
    }

    const evalParams = {
      ticker,
      orderQuantity,
      orderNotional,
      adv: obs.adv,
      dollarAdv: obs.dollarAdv || (obs.adv * obs.price),
      bid: obs.bid,
      ask: obs.ask,
      referencePrice: obs.price
    };

    const feasResult = LiquidityFeasibilityEngine.evaluateFeasibility(evalParams);
    const explanation = LiquidityExplanationEngine.explainFeasibility(feasResult);

    return deepFreeze({
      status: feasResult.status,
      ticker,
      feasibility: feasResult,
      explanation
    });
  }

  /**
   * Evaluates stress scenarios for Copilot queries.
   */
  static queryLiquidityStress(workspaceId, params) {
    const { ticker, orderQuantity, orderNotional, scenarioType } = params;
    const obs = liquidityRepository.getObservation(workspaceId, ticker);

    if (!obs) {
      return {
        status: LiquidityStatus.UNAVAILABLE,
        explanation: `Cannot run stress test: verified observation missing for ticker ${ticker}.`
      };
    }

    const stressResult = LiquidityStressEngine.evaluateStressScenario({
      orderQuantity,
      orderNotional,
      adv: obs.adv,
      dollarAdv: obs.dollarAdv || (obs.adv * obs.price),
      spreadBps: obs.spreadBps || 10.0,
      referencePrice: obs.price,
      scenarioType
    });

    const explanation = LiquidityExplanationEngine.explainStressResult(stressResult);

    return deepFreeze({
      status: stressResult.status,
      ticker,
      stressResult,
      explanation
    });
  }
}
