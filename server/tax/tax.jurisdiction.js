/**
 * Phase 17 — Granular Tax Jurisdiction Abstraction
 * Deterministic Tax Rules by Jurisdiction, Security Type & Account Type
 */

import { canonicalHash, deepFreeze, JurisdictionStatus, SecurityType, TaxStatus } from './tax.types.js';

export const JURISDICTIONS = deepFreeze({
  US: {
    jurisdictionId: 'US',
    country: 'United States',
    currency: 'USD',
    taxRuleVersion: 'US-IRC-2024.1',
    effectiveFrom: '2024-01-01T00:00:00.000Z',
    effectiveTo: '2026-12-31T23:59:59.999Z',
    source: 'Internal Revenue Code (Title 26 USC)',
    sourceAuthority: 'United States Congress / Internal Revenue Service (IRC)',
    sourceDocument: 'Title 26, United States Code (Internal Revenue Code)',
    sourceSection: '26 U.S.C. §§ 1(h), 1091, 1222',
    sourceURI: 'https://uscode.house.gov/view.xhtml?path=/prelim@title26',
    sourceEffectiveDate: '2024-01-01T00:00:00.000Z',
    sourceRetrievedAt: '2026-09-01T00:00:00.000Z',
    evidenceId: 'EVID-SRC-US-IRC-2024',
    sourceEvidenceId: 'EVID-SRC-US-IRC-2024',
    evidenceHash: 'c4e3895e6cf793a5598687a414cb2f57091494e8031e403d16ce96531398867a',
    status: JurisdictionStatus.CONFIGURED,
    supportedSecurityTypes: [SecurityType.EQUITY, SecurityType.ETF, SecurityType.BOND, SecurityType.MUTUAL_FUND, SecurityType.REIT],
    holdingPeriodThresholdDays: 365,
    holdingRuleId: 'RULE-US-EQ-365',
    stcgRate: 0.37,
    ltcgRate: 0.20,
    stcgTaxTreatment: 'ORDINARY_INCOME',
    stcgRateType: 'CONFIGURED_ASSUMPTION',
    ltcgTaxTreatment: 'CAPITAL_GAIN',
    ltcgRateType: 'CONFIGURED_ASSUMPTION',
    ltcgConfiguredRateSchedule: [0.0, 0.15, 0.20],
    qualifiedDividendRate: 0.20,
    nonQualifiedDividendRate: 0.37,
    hasWashSaleStatute: true,
    washSaleWindowDays: 30,
    washSaleRuleId: 'RULE-US-IRC-1091-WASHSALE',
    sttRate: 0.0,
    securityTypeRules: {
      [SecurityType.EQUITY]: { stcgRate: 0.37, ltcgRate: 0.20, thresholdDays: 365, holdingRuleId: 'RULE-US-EQ-365', taxTreatment: 'CAPITAL_GAIN', rateType: 'CONFIGURED_ASSUMPTION' },
      [SecurityType.ETF]: { stcgRate: 0.37, ltcgRate: 0.20, thresholdDays: 365, holdingRuleId: 'RULE-US-ETF-365', taxTreatment: 'CAPITAL_GAIN', rateType: 'CONFIGURED_ASSUMPTION' },
      [SecurityType.BOND]: { stcgRate: 0.37, ltcgRate: 0.20, thresholdDays: 365, holdingRuleId: 'RULE-US-BOND-365', taxTreatment: 'ORDINARY_INCOME', rateType: 'CONFIGURED_ASSUMPTION' },
      [SecurityType.MUTUAL_FUND]: { stcgRate: 0.37, ltcgRate: 0.20, thresholdDays: 365, holdingRuleId: 'RULE-US-MF-365', taxTreatment: 'CAPITAL_GAIN', rateType: 'CONFIGURED_ASSUMPTION' },
      [SecurityType.REIT]: { stcgRate: 0.37, ltcgRate: 0.20, thresholdDays: 365, holdingRuleId: 'RULE-US-REIT-365', taxTreatment: 'ORDINARY_INCOME', rateType: 'CONFIGURED_ASSUMPTION' }
    }
  },
  IN: {
    jurisdictionId: 'IN',
    country: 'India',
    currency: 'INR',
    taxRuleVersion: 'IN-FINACT-2024.2',
    effectiveFrom: '2024-07-23T00:00:00.000Z',
    effectiveTo: '2026-12-31T23:59:59.999Z',
    source: 'Income Tax Act 1961 / Finance Act (No. 2) 2024',
    sourceAuthority: 'Ministry of Finance, Government of India / Central Board of Direct Taxes (CBDT)',
    sourceDocument: 'Income Tax Act 1961 as amended by Finance (No. 2) Act 2024 (Act No. 15 of 2024)',
    sourceSection: 'Sections 111A, 112A, 50AA, 56(2)(i), 98 (STT)',
    sourceURI: 'https://incometaxindia.gov.in/pages/acts/income-tax-act.aspx',
    sourceEffectiveDate: '2024-07-23T00:00:00.000Z',
    sourceRetrievedAt: '2026-09-01T00:00:00.000Z',
    evidenceId: 'EVID-SRC-IN-FINACT-2024',
    sourceEvidenceId: 'EVID-SRC-IN-FINACT-2024',
    evidenceHash: '8e2d431c4f51950e18987178d21b7ceb4d7fca13f64cfc24d1e2e1a38260d2b9',
    status: JurisdictionStatus.CONFIGURED,
    supportedSecurityTypes: [SecurityType.EQUITY, SecurityType.ETF, SecurityType.BOND, SecurityType.MUTUAL_FUND],
    holdingPeriodThresholdDays: 365,
    holdingRuleId: 'RULE-IN-EQ-365',
    stcgRate: 0.20, // Section 111A listed equities (post-budget 2024)
    ltcgRate: 0.125, // Section 112A listed equities (12.5% above threshold)
    stcgTaxTreatment: 'SPECIAL_RATE_SECTION_111A',
    stcgRateType: 'STATUTORY_FIXED',
    ltcgTaxTreatment: 'SPECIAL_RATE_SECTION_112A',
    ltcgRateType: 'STATUTORY_FIXED',
    qualifiedDividendRate: 0.30, // Taxed at slab / default institutional rate
    nonQualifiedDividendRate: 0.30,
    hasWashSaleStatute: false,
    washSaleWindowDays: 0,
    washSaleRuleId: 'RULE-IN-NO-WASH-SALE-STATUTE',
    washSaleStatusText: 'NO_CONFIGURED_WASH_SALE_RULE',
    sttRate: 0.001, // 0.1% Securities Transaction Tax
    securityTypeRules: {
      [SecurityType.EQUITY]: { stcgRate: 0.20, ltcgRate: 0.125, thresholdDays: 365, holdingRuleId: 'RULE-IN-EQ-365', taxTreatment: 'SPECIAL_RATE_SECTION_111A', rateType: 'STATUTORY_FIXED' },
      [SecurityType.ETF]: { stcgRate: 0.20, ltcgRate: 0.125, thresholdDays: 365, holdingRuleId: 'RULE-IN-ETF-365', taxTreatment: 'SPECIAL_RATE_SECTION_111A', rateType: 'STATUTORY_FIXED' },
      [SecurityType.BOND]: { stcgRate: 0.30, ltcgRate: 0.125, thresholdDays: 365, holdingRuleId: 'RULE-IN-BOND-365', taxTreatment: 'ORDINARY_INCOME', rateType: 'TAXPAYER_SLICE', configuredMarginalRate: 0.30 },
      [SecurityType.MUTUAL_FUND]: { stcgRate: 0.20, ltcgRate: 0.125, thresholdDays: 365, holdingRuleId: 'RULE-IN-MF-365', taxTreatment: 'SPECIAL_RATE_SECTION_111A', rateType: 'STATUTORY_FIXED' }
    }
  }
});

export class TaxJurisdictionEngine {
  /**
   * Resolves tax jurisdiction rule for a given country code, asOf date, and optional securityType.
   */
  static getJurisdictionRule(jurisdictionCode, asOf, securityType = SecurityType.EQUITY) {
    if (!jurisdictionCode || typeof jurisdictionCode !== 'string') {
      return deepFreeze({
        status: TaxStatus.JURISDICTION_UNAVAILABLE,
        reason: 'Jurisdiction code missing or invalid'
      });
    }

    const upper = jurisdictionCode.toUpperCase();
    const rule = JURISDICTIONS[upper];
    if (!rule) {
      return deepFreeze({
        status: TaxStatus.JURISDICTION_UNAVAILABLE,
        reason: `Jurisdiction '${jurisdictionCode}' not supported or configured`
      });
    }

    if (securityType && rule.supportedSecurityTypes && !rule.supportedSecurityTypes.includes(securityType)) {
      return deepFreeze({
        status: TaxStatus.TAX_RULE_UNAVAILABLE,
        reason: `Security type '${securityType}' is not supported or configured under jurisdiction ${upper}`
      });
    }

    if (asOf) {
      const asOfTime = new Date(asOf).getTime();
      const fromTime = new Date(rule.effectiveFrom).getTime();
      const toTime = rule.effectiveTo ? new Date(rule.effectiveTo).getTime() : Infinity;

      if (isNaN(asOfTime)) {
        return deepFreeze({
          status: TaxStatus.INVALID_INPUT,
          reason: 'Invalid asOf timestamp'
        });
      }

      if (asOfTime < fromTime || asOfTime > toTime) {
        return deepFreeze({
          status: TaxStatus.TEMPORAL_VIOLATION,
          reason: `Rule ${rule.taxRuleVersion} for ${upper} is not effective at ${asOf}`
        });
      }
    }

    const secRule = rule.securityTypeRules?.[securityType] || {
      stcgRate: rule.stcgRate,
      ltcgRate: rule.ltcgRate,
      thresholdDays: rule.holdingPeriodThresholdDays,
      holdingRuleId: rule.holdingRuleId
    };

    const effectiveRule = {
      ...rule,
      stcgRate: secRule.stcgRate ?? rule.stcgRate,
      ltcgRate: secRule.ltcgRate ?? rule.ltcgRate,
      holdingPeriodThresholdDays: secRule.thresholdDays ?? rule.holdingPeriodThresholdDays,
      holdingRuleId: secRule.holdingRuleId ?? rule.holdingRuleId,
      securityType
    };

    const ruleHash = canonicalHash(effectiveRule);
    return deepFreeze({
      status: TaxStatus.PASS,
      rule: {
        ...effectiveRule,
        ruleHash
      }
    });
  }
}
