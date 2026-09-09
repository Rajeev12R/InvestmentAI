/**
 * Phase 17 — Multi-Objective Tax-Aware Rebalancing Engine
 * Optimizes Rebalance Trades Balancing Tracking Error, Transaction Friction, and Realized Tax
 */

import { CostBasisMethod, deepFreeze, TaxLabel, TaxStatus } from './tax.types.js';
import { TaxTransactionTaxEngine } from './tax.transactionTax.engine.js';
import { TaxConstraintEngine } from './tax.constraint.engine.js';
import { TAX_POLICY_V1 } from './tax.config.js';

export class TaxRebalanceEngine {
  /**
   * Generates a tax-aware rebalancing proposal and compares it against the nominal target.
   */
  static generateTaxAwareRebalance(params) {
    const {
      portfolioId,
      workspaceId,
      currentWeights, // { secId: weight }
      targetWeights,  // { secId: weight } (from Phase 14)
      currentPrices,  // { secId: price }
      portfolioValue,
      openLotsBySecurity = {}, // secId -> array of open lots
      expectedReturns = {},    // secId -> annual expected return
      volatilities = {},       // secId -> annual volatility
      constraints = {},        // Phase 14/15/16 constraints
      policy = TAX_POLICY_V1,
      asOf,
      jurisdiction = 'US',
      accountType = 'TAXABLE',
      basisMethod = CostBasisMethod.FIFO
    } = params;

    if (!currentWeights || !targetWeights || !currentPrices || !portfolioValue || !asOf) {
      return deepFreeze({
        status: TaxStatus.INVALID_INPUT,
        reason: 'Required rebalance parameters missing'
      });
    }

    // Step 1: Constraint Verification of Target
    const targetConstraintRes = TaxConstraintEngine.validateCandidateConstraints(targetWeights, constraints);
    if (targetConstraintRes.status !== TaxStatus.PASS) {
      return deepFreeze({
        status: TaxStatus.INFEASIBLE_CONSTRAINTS,
        reason: `Target weights violate inherited constraints: ${targetConstraintRes.violations.join('; ')}`
      });
    }

    const securities = Array.from(new Set([...Object.keys(currentWeights), ...Object.keys(targetWeights)]));
    const nominalTrades = [];
    const taxAwareTrades = [];
    let nominalRealizedTax = 0;
    let nominalTxCost = 0;
    let nominalTurnover = 0;

    let taxAwareRealizedTax = 0;
    let taxAwareTxCost = 0;
    let taxAwareTurnover = 0;

    const candidateWeights = { ...currentWeights };

    // First pass: identify sell trades and tax throttling ratio
    let totalNominalSellWeight = 0;
    let totalTaxAwareSellWeight = 0;
    const sellDeltas = {};

    for (const secId of securities) {
      const curW = currentWeights[secId] || 0;
      const tgtW = targetWeights[secId] || 0;
      const diffW = tgtW - curW;
      if (diffW < -0.0001) {
        const tradeValue = Math.abs(diffW) * portfolioValue;
        const price = currentPrices[secId];
        const openLots = openLotsBySecurity[secId] || [];

        const nomTxImpact = TaxTransactionTaxEngine.evaluateTransactionTax({
          securityId: secId,
          side: 'SELL',
          quantity: tradeValue / price,
          price,
          openLots,
          basisMethod,
          asOf,
          jurisdiction,
          accountType,
          estimatedTransactionCost: tradeValue * 0.001
        });

        if (nomTxImpact.status !== TaxStatus.PASS) {
          return deepFreeze({ status: nomTxImpact.status, reason: nomTxImpact.reason });
        }

        totalNominalSellWeight += Math.abs(diffW);
        let throttleRatio = 1.0;
        if (nomTxImpact.gainDetails) {
          const stcgGain = nomTxImpact.gainDetails.totalStcgGain || 0;
          if (stcgGain > tradeValue * 0.20 && accountType === 'TAXABLE') {
            throttleRatio = 0.5; // Throttle 50%
          }
        }
        sellDeltas[secId] = { diffW, throttleRatio, price, openLots, tradeValue };
        totalTaxAwareSellWeight += Math.abs(diffW) * throttleRatio;
      }
    }

    const buyScaleRatio = totalNominalSellWeight > 0.0001 ? (totalTaxAwareSellWeight / totalNominalSellWeight) : 1.0;

    for (const secId of securities) {
      const curW = currentWeights[secId] || 0;
      const tgtW = targetWeights[secId] || 0;
      const diffW = tgtW - curW;
      const price = currentPrices[secId];

      if (!price || price <= 0) {
        return deepFreeze({
          status: TaxStatus.AFTER_TAX_RESULT_UNAVAILABLE,
          reason: `Market price unavailable for ${secId}`
        });
      }

      if (Math.abs(diffW) < 0.0001) continue;

      const tradeValue = Math.abs(diffW) * portfolioValue;
      const tradeQty = tradeValue / price;
      const side = diffW > 0 ? 'BUY' : 'SELL';
      const openLots = openLotsBySecurity[secId] || [];

      // Evaluate Nominal Trade
      const nomTxImpact = TaxTransactionTaxEngine.evaluateTransactionTax({
        securityId: secId,
        side,
        quantity: tradeQty,
        price,
        openLots,
        basisMethod,
        asOf,
        jurisdiction,
        accountType,
        estimatedTransactionCost: tradeValue * 0.001
      });

      if (nomTxImpact.status !== TaxStatus.PASS) {
        return deepFreeze({
          status: nomTxImpact.status,
          reason: nomTxImpact.reason
        });
      }

      nominalTrades.push(nomTxImpact);
      nominalRealizedTax += nomTxImpact.estimatedTax || 0;
      nominalTxCost += nomTxImpact.estimatedTransactionCost || 0;
      nominalTurnover += Math.abs(diffW) / 2;

      // Tax-Aware Trade Sizing
      let adjustedDiffW = diffW;
      if (side === 'SELL') {
        const sInfo = sellDeltas[secId];
        adjustedDiffW = diffW * (sInfo ? sInfo.throttleRatio : 1.0);
      } else {
        adjustedDiffW = diffW * buyScaleRatio;
      }

      const adjustedTradeValue = Math.abs(adjustedDiffW) * portfolioValue;
      const adjustedTradeQty = adjustedTradeValue / price;

      const taxAwareTxImpact = TaxTransactionTaxEngine.evaluateTransactionTax({
        securityId: secId,
        side,
        quantity: adjustedTradeQty,
        price,
        openLots,
        basisMethod,
        asOf,
        jurisdiction,
        accountType,
        estimatedTransactionCost: adjustedTradeValue * 0.001
      });

      taxAwareTrades.push(taxAwareTxImpact);
      taxAwareRealizedTax += taxAwareTxImpact.estimatedTax || 0;
      taxAwareTxCost += taxAwareTxImpact.estimatedTransactionCost || 0;
      taxAwareTurnover += Math.abs(adjustedDiffW) / 2;

      candidateWeights[secId] = curW + adjustedDiffW;
    }

    // Step 2: Validate Tax-Aware Candidate Portfolio Constraints
    const candidateConstraintRes = TaxConstraintEngine.validateCandidateConstraints(candidateWeights, constraints);
    if (candidateConstraintRes.status !== TaxStatus.PASS) {
      return deepFreeze({
        status: TaxStatus.INFEASIBLE_CONSTRAINTS,
        reason: `Tax-aware candidate portfolio violates constraints: ${candidateConstraintRes.violations.join('; ')}`
      });
    }

    // Step 3: Multi-Objective Scoring
    const weights = policy.objectiveWeights || { lambda1Risk: 1.0, lambda2TransactionCost: 1.0, lambda3TaxCost: 1.5, lambda4TurnoverPenalty: 0.5 };

    // Returns calculation
    let curExpRet = 0, tgtExpRet = 0, candExpRet = 0;
    for (const secId of securities) {
      const r = expectedReturns[secId] || 0.08;
      curExpRet += (currentWeights[secId] || 0) * r;
      tgtExpRet += (targetWeights[secId] || 0) * r;
      candExpRet += (candidateWeights[secId] || 0) * r;
    }

    const nominalTaxDrag = (nominalRealizedTax + nominalTxCost) / portfolioValue;
    const taxAwareTaxDrag = (taxAwareRealizedTax + taxAwareTxCost) / portfolioValue;

    const nominalAfterTaxExpReturn = tgtExpRet - nominalTaxDrag;
    const taxAwareAfterTaxExpReturn = candExpRet - taxAwareTaxDrag;

    const nominalUtility = tgtExpRet - (weights.lambda2TransactionCost * (nominalTxCost / portfolioValue)) - (weights.lambda3TaxCost * (nominalRealizedTax / portfolioValue)) - (weights.lambda4TurnoverPenalty * nominalTurnover);
    const taxAwareUtility = candExpRet - (weights.lambda2TransactionCost * (taxAwareTxCost / portfolioValue)) - (weights.lambda3TaxCost * (taxAwareRealizedTax / portfolioValue)) - (weights.lambda4TurnoverPenalty * taxAwareTurnover);

    const isTaxAwarePreferred = taxAwareUtility >= nominalUtility;

    return deepFreeze({
      status: TaxStatus.PASS,
      decision: isTaxAwarePreferred ? TaxStatus.TAX_AWARE_REBALANCE_PREFERRED : 'FULL_REBALANCE_PREFERRED',
      portfolioId,
      workspaceId,
      asOf,
      policyId: policy.policyId,
      nominalRebalance: {
        trades: nominalTrades,
        turnover: nominalTurnover,
        transactionCost: nominalTxCost,
        realizedTax: nominalRealizedTax,
        expectedReturn: tgtExpRet,
        afterTaxExpectedReturn: nominalAfterTaxExpReturn,
        taxDrag: nominalTaxDrag,
        utilityScore: nominalUtility
      },
      taxAwareRebalance: {
        candidateWeights,
        trades: taxAwareTrades,
        turnover: taxAwareTurnover,
        transactionCost: taxAwareTxCost,
        realizedTax: taxAwareRealizedTax,
        expectedReturn: candExpRet,
        afterTaxExpectedReturn: taxAwareAfterTaxExpReturn,
        taxDrag: taxAwareTaxDrag,
        utilityScore: taxAwareUtility
      },
      taxSavings: nominalRealizedTax - taxAwareRealizedTax,
      totalFrictionSavings: (nominalRealizedTax + nominalTxCost) - (taxAwareRealizedTax + taxAwareTxCost),
      taxLabel: TaxLabel.ESTIMATED
    });
  }
}
