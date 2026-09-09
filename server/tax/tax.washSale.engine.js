/**
 * Phase 17 — Wash-Sale & Disallowed-Loss Engine
 * Deterministic Jurisdiction-Specific Window & Replacement Security Tracking
 */

import { deepFreeze, TaxStatus, WashSaleStatus } from './tax.types.js';
import { TaxJurisdictionEngine } from './tax.jurisdiction.js';

export class TaxWashSaleEngine {
  /**
   * Evaluates wash-sale / disallowed loss restrictions for a proposed or realized loss sale.
   * @param {Object} saleParams { securityId, saleDate, isLoss, replacementSecurityId }
   * @param {Array} transactionHistory Array of prior purchases and subsequent orders
   * @param {string} jurisdiction
   */
  static evaluateWashSale(saleParams, transactionHistory = [], jurisdiction = 'US') {
    const { securityId, saleDate, isLoss, replacementSecurityId } = saleParams;

    if (!securityId || !saleDate) {
      return deepFreeze({
        status: TaxStatus.INVALID_INPUT,
        washSaleStatus: WashSaleStatus.UNKNOWN,
        reason: 'Missing securityId or saleDate'
      });
    }

    const ruleRes = TaxJurisdictionEngine.getJurisdictionRule(jurisdiction, saleDate);
    if (ruleRes.status !== TaxStatus.PASS) {
      return deepFreeze({
        status: ruleRes.status,
        washSaleStatus: WashSaleStatus.TAX_RULE_UNAVAILABLE,
        reason: ruleRes.reason
      });
    }

    const rule = ruleRes.rule;

    // Jurisdiction statute check
    if (rule.hasWashSaleStatute === false) {
      return deepFreeze({
        status: TaxStatus.PASS,
        washSaleStatus: WashSaleStatus.ALLOWED,
        reason: `Jurisdiction '${jurisdiction.toUpperCase()}' has no statutory wash-sale restriction`,
        disallowedLoss: 0,
        washSaleRuleId: rule.washSaleRuleId || 'NO_WASH_SALE_STATUTE',
        jurisdiction: jurisdiction.toUpperCase(),
        ruleVersion: rule.taxRuleVersion
      });
    }

    // If sale is a gain, wash-sale rules on disallowed loss do not apply
    if (isLoss === false) {
      return deepFreeze({
        status: TaxStatus.PASS,
        washSaleStatus: WashSaleStatus.ALLOWED,
        reason: 'Wash-sale restriction applies only to loss realization; transaction is a gain',
        disallowedLoss: 0,
        washSaleRuleId: rule.washSaleRuleId,
        jurisdiction: jurisdiction.toUpperCase(),
        ruleVersion: rule.taxRuleVersion
      });
    }

    const windowDays = rule.washSaleWindowDays || 30;
    const saleTime = new Date(saleDate).getTime();
    const windowMs = windowDays * 24 * 60 * 60 * 1000;

    const violatingTransactions = [];

    for (const tx of transactionHistory) {
      // Check if buy / acquisition of same security or substantially identical replacement
      const isTargetSecurity = tx.securityId === securityId || (replacementSecurityId && tx.securityId === replacementSecurityId);
      const isAcquisition = tx.side === 'BUY' || tx.type === 'ACQUISITION';

      if (isTargetSecurity && isAcquisition && tx.date) {
        const txTime = new Date(tx.date).getTime();
        const diffMs = Math.abs(txTime - saleTime);

        if (diffMs <= windowMs && txTime !== saleTime) {
          violatingTransactions.push({
            transactionId: tx.transactionId || tx.id,
            securityId: tx.securityId,
            date: tx.date,
            quantity: tx.quantity,
            daysDifference: Math.round(diffMs / (24 * 60 * 60 * 1000)),
            isLookback: txTime < saleTime,
            isLookforward: txTime > saleTime
          });
        }
      }
    }

    if (violatingTransactions.length > 0) {
      return deepFreeze({
        status: TaxStatus.PASS,
        washSaleStatus: WashSaleStatus.DISALLOWED,
        reason: `Wash sale triggered: ${violatingTransactions.length} replacement acquisition(s) within ±${windowDays} day window`,
        violatingTransactions,
        windowDays,
        washSaleRuleId: rule.washSaleRuleId,
        jurisdiction: jurisdiction.toUpperCase(),
        ruleVersion: rule.taxRuleVersion
      });
    }

    // Check if direct replacement security is proposed without explicit equivalence clearance
    if (replacementSecurityId && replacementSecurityId !== securityId && replacementSecurityId.startsWith('SUBSTANTIALLY_IDENTICAL')) {
      return deepFreeze({
        status: TaxStatus.PASS,
        washSaleStatus: WashSaleStatus.POTENTIAL_RESTRICTION,
        reason: `Substantially identical replacement security '${replacementSecurityId}' flagged for review`,
        windowDays,
        washSaleRuleId: rule.washSaleRuleId,
        jurisdiction: jurisdiction.toUpperCase(),
        ruleVersion: rule.taxRuleVersion
      });
    }

    return deepFreeze({
      status: TaxStatus.PASS,
      washSaleStatus: WashSaleStatus.ALLOWED,
      reason: `No conflicting replacement acquisitions found within ±${windowDays} day window`,
      windowDays,
      washSaleRuleId: rule.washSaleRuleId,
      jurisdiction: jurisdiction.toUpperCase(),
      ruleVersion: rule.taxRuleVersion
    });
  }
}
