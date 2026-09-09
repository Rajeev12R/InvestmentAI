/**
 * server/earnings/earnings.corporateAction.engine.js
 * 
 * Phase 21: Deterministic Corporate Action & Capital Structure Engine
 * Integrates stock splits, cash dividends, share repurchases (buybacks), share issuances,
 * and debt repayments across Truth Layer (Phase 11), Portfolio (Phase 12), Tax Lots (Phase 17),
 * and Forecasting (Phase 20) with strict zero-double-counting invariants.
 */

import { EventClassification, canonicalHash, deepFreeze } from './earnings.types.js';

export const CorporateActionType = Object.freeze({
  STOCK_SPLIT: 'STOCK_SPLIT',
  REVERSE_STOCK_SPLIT: 'REVERSE_STOCK_SPLIT',
  CASH_DIVIDEND: 'CASH_DIVIDEND',
  SHARE_REPURCHASE: 'SHARE_REPURCHASE',
  SHARE_ISSUANCE: 'SHARE_ISSUANCE',
  DEBT_REPAYMENT: 'DEBT_REPAYMENT'
});

export class CorporateActionEngine {
  /**
   * Applies a deterministic corporate action to an active capital structure
   * 
   * @param {Object} baselineCapitalStructure - { sharesOutstanding, cash, totalDebt, parValue, currentSharePrice }
   * @param {Object} corporateAction - { type, ratio, amountPerShare, totalCashImpact, effectiveDate, sourceEventId }
   * @returns {Object} Updated capital structure and portfolio adjustment parameters
   */
  applyCorporateAction(baselineCapitalStructure, corporateAction) {
    if (!baselineCapitalStructure || typeof baselineCapitalStructure !== 'object') {
      throw new Error('Valid baselineCapitalStructure required');
    }
    if (!corporateAction || !corporateAction.type) {
      throw new Error('Valid corporateAction with type required');
    }

    const baseShares = baselineCapitalStructure.sharesOutstanding || 1000;
    const baseCash = baselineCapitalStructure.cash || 0;
    const baseDebt = baselineCapitalStructure.totalDebt || 0;
    const basePrice = baselineCapitalStructure.currentSharePrice || 100.0;

    let updatedShares = baseShares;
    let updatedCash = baseCash;
    let updatedDebt = baseDebt;
    let adjustedSharePrice = basePrice;
    let taxAdjustmentFactor = 1.0;
    let shareMultiplier = 1.0;

    const { type, ratio, amountPerShare, totalCashImpact } = corporateAction;

    // Corporate Issuer Capital Structure Adjustments
    switch (type) {
      case CorporateActionType.STOCK_SPLIT: {
        const splitRatio = ratio && ratio > 0 ? ratio : 2.0;
        updatedShares = baseShares * splitRatio;
        adjustedSharePrice = basePrice / splitRatio;
        shareMultiplier = splitRatio;
        taxAdjustmentFactor = 1.0 / splitRatio;
        break;
      }
      case CorporateActionType.REVERSE_STOCK_SPLIT: {
        const revRatio = ratio && ratio > 0 ? ratio : 0.10;
        updatedShares = baseShares * revRatio;
        adjustedSharePrice = basePrice / revRatio;
        shareMultiplier = revRatio;
        taxAdjustmentFactor = 1.0 / revRatio;
        break;
      }
      case CorporateActionType.CASH_DIVIDEND: {
        const divPerShare = amountPerShare && amountPerShare > 0 ? amountPerShare : 1.0;
        const totalPayout = totalCashImpact !== undefined ? totalCashImpact : (divPerShare * baseShares);
        updatedCash = Math.max(0, baseCash - totalPayout);
        adjustedSharePrice = Math.max(0, basePrice - divPerShare);
        break;
      }
      case CorporateActionType.SHARE_REPURCHASE: {
        const buybackAmount = totalCashImpact && totalCashImpact > 0 ? totalCashImpact : 1000000;
        const retiredShares = buybackAmount / (basePrice > 0 ? basePrice : 1.0);
        updatedShares = Math.max(1, baseShares - retiredShares);
        updatedCash = Math.max(0, baseCash - buybackAmount);
        break;
      }
      case CorporateActionType.SHARE_ISSUANCE: {
        const issuedShares = ratio ? (baseShares * ratio) : (corporateAction.newShares || 1000);
        const capitalRaised = totalCashImpact || (issuedShares * basePrice);
        updatedShares = baseShares + issuedShares;
        updatedCash = baseCash + capitalRaised;
        break;
      }
      case CorporateActionType.DEBT_REPAYMENT: {
        const repayAmount = totalCashImpact || 500000;
        updatedDebt = Math.max(0, baseDebt - repayAmount);
        updatedCash = Math.max(0, baseCash - repayAmount);
        break;
      }
      default:
        throw new Error(`Unsupported corporate action type: ${type}`);
    }

    const actionResult = {
      actionType: type,
      effectiveDate: corporateAction.effectiveDate || new Date().toISOString(),
      sourceEventId: corporateAction.sourceEventId || null,
      issuerBaseline: {
        sharesOutstanding: baseShares,
        cash: baseCash,
        totalDebt: baseDebt,
        sharePrice: basePrice
      },
      issuerUpdated: {
        sharesOutstanding: updatedShares,
        cash: updatedCash,
        totalDebt: updatedDebt,
        sharePrice: adjustedSharePrice
      },
      // Backward compatibility mapping
      baseline: {
        sharesOutstanding: baseShares,
        cash: baseCash,
        totalDebt: baseDebt,
        sharePrice: basePrice
      },
      updated: {
        sharesOutstanding: updatedShares,
        cash: updatedCash,
        totalDebt: updatedDebt,
        sharePrice: adjustedSharePrice
      },
      portfolioAdjustments: {
        shareMultiplier,
        taxCostBasisMultiplier: taxAdjustmentFactor,
        cashFlowDistributionPerShare: type === CorporateActionType.CASH_DIVIDEND ? (amountPerShare || 0) : 0
      },
      classification: EventClassification.DERIVED
    };

    actionResult.canonicalHash = canonicalHash({
      actionType: actionResult.actionType,
      effectiveDate: actionResult.effectiveDate,
      updatedShares: actionResult.issuerUpdated.sharesOutstanding,
      updatedCash: actionResult.issuerUpdated.cash
    });

    return deepFreeze(actionResult);
  }

  /**
   * Applies corporate action directly to an Investor's Portfolio Position
   * 
   * Invariant for Cash Dividend:
   * DividendCashReceived = dividendPerShare * sharesHeld
   * CashAfter = CashBefore + DividendCashReceived
   * AdjustedSharePrice = PreDividendPrice - DividendPerShare
   * Pre-tax Total Economic Value Preserved:
   * (SharesHeld * PrePrice + CashBefore) === (SharesHeld * AdjustedPrice + CashAfter)
   * 
   * @param {Object} investorPortfolio - { cash, positions: [{ ticker, sharesHeld, costBasisPerShare, currentPrice }] }
   * @param {Object} corporateAction - { type, ticker, amountPerShare, ratio, effectiveDate }
   * @returns {Object} Updated investor portfolio position and cash
   */
  applyCorporateActionToInvestor(investorPortfolio, corporateAction) {
    if (!investorPortfolio || typeof investorPortfolio !== 'object') {
      throw new Error('Valid investorPortfolio required');
    }
    const { type, ticker, amountPerShare, ratio } = corporateAction;
    const initialCash = typeof investorPortfolio.cash === 'number' ? investorPortfolio.cash : 0;
    const positions = investorPortfolio.positions || [];

    let updatedCash = initialCash;
    let dividendCashReceived = 0;
    const updatedPositions = [];

    let initialPortfolioValue = initialCash;
    let updatedPortfolioValue = 0;

    for (const pos of positions) {
      const isTarget = (!ticker || pos.ticker.toUpperCase() === ticker.toUpperCase());
      const sharesHeld = pos.sharesHeld || pos.quantity || 0;
      const prePrice = pos.currentPrice || pos.sharePrice || 100.0;
      const costBasis = pos.costBasisPerShare || prePrice;

      initialPortfolioValue += (sharesHeld * prePrice);

      if (!isTarget) {
        updatedPositions.push({ ...pos });
        updatedPortfolioValue += (sharesHeld * prePrice);
        continue;
      }

      let newShares = sharesHeld;
      let newPrice = prePrice;
      let newCostBasis = costBasis;

      if (type === CorporateActionType.CASH_DIVIDEND) {
        const divPerShare = amountPerShare && amountPerShare > 0 ? amountPerShare : 1.0;
        dividendCashReceived += (divPerShare * sharesHeld);
        updatedCash += (divPerShare * sharesHeld);
        newPrice = Math.max(0, prePrice - divPerShare);
      } else if (type === CorporateActionType.STOCK_SPLIT) {
        const splitRatio = ratio && ratio > 0 ? ratio : 2.0;
        newShares = sharesHeld * splitRatio;
        newPrice = prePrice / splitRatio;
        newCostBasis = costBasis / splitRatio;
      } else if (type === CorporateActionType.REVERSE_STOCK_SPLIT) {
        const revRatio = ratio && ratio > 0 ? ratio : 0.10;
        newShares = sharesHeld * revRatio;
        newPrice = prePrice / revRatio;
        newCostBasis = costBasis / revRatio;
      }

      updatedPositions.push(Object.freeze({
        ticker: pos.ticker,
        sharesHeld: newShares,
        currentPrice: newPrice,
        costBasisPerShare: newCostBasis,
        marketValue: newShares * newPrice
      }));

      updatedPortfolioValue += (newShares * newPrice);
    }

    updatedPortfolioValue += updatedCash;

    return deepFreeze({
      actionType: type,
      targetTicker: ticker ? ticker.toUpperCase() : 'ALL',
      initialCash,
      updatedCash,
      dividendCashReceived,
      initialPortfolioTotalValue: initialPortfolioValue,
      updatedPortfolioTotalValue: updatedPortfolioValue,
      preTaxEconomicValuePreserved: Math.abs(initialPortfolioValue - updatedPortfolioValue) < 1e-6,
      positions: Object.freeze(updatedPositions),
      rule: 'INVESTOR_CASH_DIVIDEND_INCREASES_PORTFOLIO_CASH_AND_PRESERVES_PRETAX_VALUE',
      classification: EventClassification.DERIVED
    });
  }
}

export const defaultCorporateActionEngine = new CorporateActionEngine();
