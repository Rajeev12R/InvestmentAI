/**
 * @file report.validator.js
 * Deterministic Data Quality, Integrity & Reconciliation Validator for Phase 40 Institutional Reporting.
 */

import { computeSnapshotHash, ReportValidationStatus, DataFreshness } from './report.types.js';

export class ReportValidator {
  /**
   * Validates a report and its underlying point-in-time snapshot.
   *
   * @param {Object} params
   * @param {Object} params.report
   * @param {Object} params.snapshot
   * @param {Object} params.template
   * @returns {Object} Validation outcome
   */
  static validate({ report, snapshot, template }) {
    const errors = [];
    const warnings = [];
    const reconciliation = {};

    // 1. Mandatory Report Metadata
    if (!report.reportId) errors.push('Missing reportId');
    if (!report.orgId) errors.push('Missing orgId');
    if (!report.workspaceId) errors.push('Missing workspaceId');
    if (!report.reportType) errors.push('Missing reportType');
    if (!report.templateId) errors.push('Missing templateId');

    // 2. Snapshot Sealing & Integrity Verification
    if (!snapshot) {
      errors.push('Missing underlying point-in-time snapshot');
    } else {
      if (!snapshot.isSealed) {
        errors.push('Point-in-time snapshot is not cryptographically sealed');
      }
      const recalculatedSnapshotHash = computeSnapshotHash(snapshot);
      if (snapshot.snapshotHash && recalculatedSnapshotHash !== snapshot.snapshotHash) {
        errors.push(`Snapshot integrity violation: hash mismatch (expected ${snapshot.snapshotHash}, recalculated ${recalculatedSnapshotHash})`);
      }
      reconciliation.snapshotIntegrity = {
        passed: errors.length === 0,
        snapshotId: snapshot.snapshotId,
        hash: snapshot.snapshotHash
      };
    }

    // 3. Template Required Sections Verification
    const sections = report.sections || {};
    if (template && Array.isArray(template.requiredSections)) {
      for (const reqSec of template.requiredSections) {
        if (!sections[reqSec]) {
          errors.push(`Template violation: missing required section '${reqSec}'`);
        }
      }
    }

    // 4. Quantitative Holdings & AUM Reconciliation
    if (snapshot && snapshot.portfolio) {
      const p = snapshot.portfolio;
      const holdings = p.holdings || [];
      const stockTotal = holdings.reduce((sum, h) => sum + (Number(h.marketValue) || 0), 0);
      const cash = Number(p.cashBalance) || 0;
      const totalCalculated = stockTotal + cash;
      const reportedAum = Number(p.aum) || 0;

      const diff = Math.abs(totalCalculated - reportedAum);
      const tolerance = 1.0; // $1.00 floating point tolerance for institutional precision

      if (diff > tolerance && reportedAum > 0) {
        errors.push(`Holdings reconciliation failure: stock sum ($${stockTotal.toFixed(2)}) + cash ($${cash.toFixed(2)}) = $${totalCalculated.toFixed(2)}, differs from reported AUM $${reportedAum.toFixed(2)} by $${diff.toFixed(2)}`);
      }

      reconciliation.aumReconciliation = {
        passed: diff <= tolerance,
        stockTotal,
        cash,
        totalCalculated,
        reportedAum,
        diff
      };
    }

    // 5. Risk Metric Semantic Constraints
    if (snapshot && snapshot.riskMetrics) {
      const rm = snapshot.riskMetrics;
      const var95 = Number(rm.var95);
      const es95 = Number(rm.expectedShortfall95);

      if (var95 < 0) {
        errors.push(`Mathematical integrity violation: VaR 95% cannot be negative (${var95})`);
      }
      if (es95 < var95) {
        errors.push(`Risk ordering violation: Expected Shortfall (${es95}) must be >= VaR (${var95})`);
      }

      reconciliation.riskConstraints = {
        passed: var95 >= 0 && es95 >= var95,
        var95,
        expectedShortfall95: es95
      };
    }

    // 6. Compliance Integrity Invariant: UNKNOWN != PASS
    if (snapshot && snapshot.complianceState) {
      const cs = snapshot.complianceState;
      if (cs.status === 'UNKNOWN') {
        warnings.push('Compliance status is UNKNOWN: must not be treated or displayed as PASS');
      }
      reconciliation.complianceIntegrity = {
        status: cs.status,
        breachCount: cs.breachCount || 0,
        unknownRuleChecked: cs.status !== 'PASS' || cs.breachCount === 0
      };
    }

    // 7. Freshness Disclosures & Limitations
    if (snapshot) {
      if (snapshot.riskMetrics?.freshness === DataFreshness.STALE) {
        warnings.push('Risk metrics are based on STALE market snapshot');
      }
      if (snapshot.exposureMetrics?.freshness === DataFreshness.PARTIAL) {
        warnings.push('Exposure metrics contain PARTIAL asset coverage');
      }
    }

    // 8. Evidence & Claims Backing
    const evidenceList = report.evidenceReferences || (snapshot && snapshot.evidenceReferences) || [];
    if (!evidenceList || evidenceList.length === 0) {
      warnings.push('No explicit evidence references attached to report claims');
    }

    const isValid = errors.length === 0;
    const status = !isValid
      ? ReportValidationStatus.FAILED
      : warnings.length > 0
        ? ReportValidationStatus.WARNING
        : ReportValidationStatus.PASSED;

    return {
      isValid,
      status,
      errors,
      warnings,
      reconciliation,
      validatedAt: new Date().toISOString()
    };
  }
}
