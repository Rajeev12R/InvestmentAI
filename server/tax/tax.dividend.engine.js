/**
 * Phase 17 — Dividend & Distribution Tax Engine
 * Deterministic Dividend Tax Treatment by Jurisdiction & Classification
 */

import { deepFreeze, DividendClassification, TaxLabel, TaxStatus } from './tax.types.js';
import { TaxJurisdictionEngine } from './tax.jurisdiction.js';

export class TaxDividendEngine {
  /**
   * Evaluates tax liability on a dividend distribution.
   */
  static evaluateDividendTax(dividendRecord) {
    if (!dividendRecord || typeof dividendRecord !== 'object') {
      return deepFreeze({
        status: TaxStatus.INVALID_INPUT,
        reason: 'Dividend record missing or malformed'
      });
    }

    const {
      dividendId,
      securityId,
      accountId,
      amount,
      dividendDate,
      classification,
      jurisdiction = 'US',
      accountType = 'TAXABLE'
    } = dividendRecord;

    if (!dividendId || typeof dividendId !== 'string') {
      return deepFreeze({ status: TaxStatus.INVALID_INPUT, reason: 'Missing dividendId' });
    }
    if (!securityId || typeof securityId !== 'string') {
      return deepFreeze({ status: TaxStatus.INVALID_INPUT, reason: 'Missing securityId' });
    }
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      return deepFreeze({ status: TaxStatus.INVALID_INPUT, reason: 'Dividend amount must be positive' });
    }
    if (!dividendDate) {
      return deepFreeze({ status: TaxStatus.INVALID_INPUT, reason: 'Missing dividendDate' });
    }

    if (!classification || !Object.values(DividendClassification).includes(classification) || classification === DividendClassification.UNKNOWN) {
      return deepFreeze({
        status: TaxStatus.TAX_RULE_UNAVAILABLE,
        reason: `Missing or unknown dividend classification: ${classification}`
      });
    }

    const ruleRes = TaxJurisdictionEngine.getJurisdictionRule(jurisdiction, dividendDate);
    if (ruleRes.status !== TaxStatus.PASS) {
      return deepFreeze({
        status: ruleRes.status,
        reason: ruleRes.reason
      });
    }
    const rule = ruleRes.rule;

    let appliedRate = 0;
    if (accountType === 'TAXABLE') {
      if (jurisdiction.toUpperCase() === 'IN') {
        // India: all domestic dividends taxable under Section 56(2)(i) at applicable slab/rate
        if (classification === DividendClassification.RETURN_OF_CAPITAL) {
          appliedRate = 0.0;
        } else {
          appliedRate = rule.qualifiedDividendRate || 0.30;
        }
      } else {
        // US: Qualified vs Non-Qualified distinction
        if (classification === DividendClassification.QUALIFIED) {
          appliedRate = rule.qualifiedDividendRate;
        } else if (classification === DividendClassification.NON_QUALIFIED || classification === DividendClassification.ORDINARY) {
          appliedRate = rule.nonQualifiedDividendRate;
        } else if (classification === DividendClassification.CAPITAL_GAIN_DISTRIBUTION) {
          appliedRate = rule.ltcgRate;
        } else if (classification === DividendClassification.RETURN_OF_CAPITAL) {
          appliedRate = 0.0;
        }
      }
    }

    const estimatedTax = amount * appliedRate;
    const netDividend = amount - estimatedTax;

    return deepFreeze({
      status: TaxStatus.PASS,
      dividendId,
      securityId,
      accountId,
      amount,
      dividendDate,
      classification,
      jurisdiction: jurisdiction.toUpperCase(),
      accountType,
      appliedRate,
      estimatedTax,
      netDividend,
      taxLabel: TaxLabel.ESTIMATED,
      ruleVersion: rule.taxRuleVersion,
      sourceEvidenceId: rule.sourceEvidenceId,
      formula: 'EstimatedTax = GrossDividend × ApplicableDividendTaxRate'
    });
  }
}
