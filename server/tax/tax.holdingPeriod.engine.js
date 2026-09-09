/**
 * Phase 17 — Holding Period Engine
 * Deterministic Holding Period & Classification Engine with Policy-Driven Holding Rules
 */

import { deepFreeze, HoldingPeriodClass, SecurityType, TaxStatus } from './tax.types.js';
import { TaxJurisdictionEngine } from './tax.jurisdiction.js';

export class TaxHoldingPeriodEngine {
  /**
   * Calculates holding period in days and classifies into SHORT_TERM or LONG_TERM.
   */
  static evaluateHoldingPeriod(acquisitionDate, realizationDate, jurisdiction = 'US', securityType = SecurityType.EQUITY) {
    if (!acquisitionDate) {
      return deepFreeze({
        status: TaxStatus.TAX_LOT_UNAVAILABLE,
        reason: 'Acquisition date is missing'
      });
    }

    if (!realizationDate) {
      return deepFreeze({
        status: TaxStatus.INVALID_INPUT,
        reason: 'Realization / asOf date is missing'
      });
    }

    const acqTime = new Date(acquisitionDate).getTime();
    const realTime = new Date(realizationDate).getTime();

    if (isNaN(acqTime) || isNaN(realTime)) {
      return deepFreeze({
        status: TaxStatus.INVALID_INPUT,
        reason: 'Invalid timestamp format for acquisition or realization date'
      });
    }

    if (realTime < acqTime) {
      return deepFreeze({
        status: TaxStatus.TEMPORAL_VIOLATION,
        reason: `Realization date (${realizationDate}) precedes acquisition date (${acquisitionDate})`
      });
    }

    const msPerDay = 1000 * 60 * 60 * 24;
    const daysHeld = Math.floor((realTime - acqTime) / msPerDay);

    const ruleResult = TaxJurisdictionEngine.getJurisdictionRule(jurisdiction, realizationDate, securityType);
    if (ruleResult.status !== TaxStatus.PASS) {
      return deepFreeze({
        status: ruleResult.status,
        reason: ruleResult.reason
      });
    }

    const threshold = ruleResult.rule.holdingPeriodThresholdDays || 365;
    const holdingClass = daysHeld >= threshold ? HoldingPeriodClass.LONG_TERM : HoldingPeriodClass.SHORT_TERM;

    return deepFreeze({
      status: TaxStatus.PASS,
      daysHeld,
      holdingClass,
      thresholdDays: threshold,
      holdingRuleId: ruleResult.rule.holdingRuleId,
      securityType,
      jurisdiction: jurisdiction.toUpperCase(),
      ruleVersion: ruleResult.rule.taxRuleVersion,
      effectiveRule: ruleResult.rule,
      evidence: {
        acquisitionDate,
        realizationDate,
        daysHeld,
        holdingRuleId: ruleResult.rule.holdingRuleId,
        sourceEvidenceId: ruleResult.rule.sourceEvidenceId
      }
    });
  }
}
