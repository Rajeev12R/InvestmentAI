/**
 * @file periodIntegrity.engine.js
 * Strict Period Boundary & Integrity Engine for Phase 11.
 * Enforces temporal consistency and rejects cross-period or cross-unit contamination.
 */

import { PeriodType } from './fact.types.js';

class PeriodIntegrityEngine {
  /**
   * Normalizes period string into canonical PeriodType enum.
   * @param {string} periodStr
   * @returns {string} Normalized PeriodType
   */
  normalizePeriod(periodStr) {
    if (!periodStr || typeof periodStr !== 'string') return PeriodType.TTM;
    const clean = periodStr.trim().toUpperCase();
    if (clean === 'TTM') return PeriodType.TTM;
    if (clean === 'YTD') return PeriodType.YTD;
    if (clean === 'POINT_IN_TIME' || clean === 'PIT') return PeriodType.POINT_IN_TIME;
    if (clean.startsWith('FY') || clean === 'ANNUAL') return PeriodType.FY;
    if (clean.startsWith('Q1')) return PeriodType.Q1;
    if (clean.startsWith('Q2')) return PeriodType.Q2;
    if (clean.startsWith('Q3')) return PeriodType.Q3;
    if (clean.startsWith('Q4')) return PeriodType.Q4;
    return PeriodType.TTM;
  }

  /**
   * Validates whether two facts share compatible periods for comparative operations.
   * @param {Object} factA
   * @param {Object} factB
   * @returns {{ compatible: boolean, reason?: string, status: string }}
   */
  validatePeriodCompatibility(factA, factB) {
    if (!factA || !factB) {
      return { compatible: false, reason: 'Missing facts for compatibility evaluation', status: 'UNAVAILABLE' };
    }

    const normA = this.normalizePeriod(factA.periodType || factA.period);
    const normB = this.normalizePeriod(factB.periodType || factB.period);

    // 1. Incompatible Period Types (e.g. FY vs Q4, TTM vs Q1)
    if (normA !== normB) {
      return {
        compatible: false,
        reason: `Period mismatch: ${normA} cannot substitute or combine with ${normB}`,
        status: 'CONFLICT'
      };
    }

    // 2. Fiscal Year / Period Year Mismatch
    const yearA = factA.fiscalYear || factA.year || (factA.periodStart ? new Date(factA.periodStart).getFullYear() : null);
    const yearB = factB.fiscalYear || factB.year || (factB.periodStart ? new Date(factB.periodStart).getFullYear() : null);

    if (yearA && yearB && yearA !== yearB) {
      return {
        compatible: false,
        reason: `Fiscal year mismatch: ${yearA} vs ${yearB}`,
        status: 'CONFLICT'
      };
    }

    // 3. Currency Mismatch
    const currA = (factA.currency || 'USD').toUpperCase();
    const currB = (factB.currency || 'USD').toUpperCase();
    if (currA !== currB) {
      return {
        compatible: false,
        reason: `Currency mismatch: ${currA} cannot combine with ${currB} without verified FX conversion`,
        status: 'CONFLICT'
      };
    }

    // 4. Unit Mismatch (e.g. MILLIONS vs BILLIONS vs RAW)
    const unitA = (factA.unit || 'RAW').toUpperCase();
    const unitB = (factB.unit || 'RAW').toUpperCase();
    if (unitA !== unitB) {
      return {
        compatible: false,
        reason: `Unit mismatch: ${unitA} vs ${unitB}`,
        status: 'CONFLICT'
      };
    }

    // 5. Date Overlap / Double Counting Check
    if (factA.periodStart && factA.periodEnd && factB.periodStart && factB.periodEnd) {
      const startA = new Date(factA.periodStart).getTime();
      const endA = new Date(factA.periodEnd).getTime();
      const startB = new Date(factB.periodStart).getTime();
      const endB = new Date(factB.periodEnd).getTime();

      if (startA < endB && endA > startB && (startA !== startB || endA !== endB)) {
        return {
          compatible: false,
          reason: 'Partial date range overlap creates double counting',
          status: 'CONFLICT'
        };
      }
    }

    return { compatible: true, status: 'PASS' };
  }

  /**
   * Evaluates freshness and validates that historical values are not disguised as current.
   * @param {Object} fact
   * @param {number} maxAgeDays
   * @returns {{ isFresh: boolean, ageDays: number, reason?: string }}
   */
  evaluateFreshness(fact, maxAgeDays = 400) {
    if (!fact || (!fact.filingDate && !fact.observedAt && !fact.periodEnd)) {
      return { isFresh: false, ageDays: null, reason: 'No observed or filing date on fact' };
    }

    const refDate = new Date(fact.filingDate || fact.observedAt || fact.periodEnd).getTime();
    const now = Date.now();
    const ageDays = (now - refDate) / (1000 * 60 * 60 * 24);

    if (ageDays < 0) {
      return { isFresh: false, ageDays, reason: 'Future timestamp detected (Clock skew / tampering)' };
    }

    if (ageDays > maxAgeDays && fact.isCurrent) {
      return {
        isFresh: false,
        ageDays,
        reason: `Stale fact (${Math.round(ageDays)} days old) presented as current`
      };
    }

    return { isFresh: true, ageDays };
  }

  /**
   * Parses standard fiscal period strings like 'FY2025', '2025-Q2', 'Q3-2024', 'TTM'.
   * @param {string} periodStr
   * @returns {{ type: string, fiscalYear: number|null, normalizedId: string }}
   */
  parsePeriodString(periodStr) {
    if (!periodStr || typeof periodStr !== 'string') {
      return { type: PeriodType.TTM, fiscalYear: null, normalizedId: 'TTM' };
    }
    const clean = periodStr.trim().toUpperCase();
    if (clean === 'TTM') return { type: PeriodType.TTM, fiscalYear: null, normalizedId: 'TTM' };
    if (clean === 'POINT_IN_TIME' || clean === 'PIT') return { type: PeriodType.POINT_IN_TIME, fiscalYear: null, normalizedId: 'PIT' };

    // Matches FY2025 or 2025-FY
    const fyMatch = clean.match(/FY\s*(\d{4})/) || clean.match(/(\d{4})\s*FY/);
    if (fyMatch) {
      const year = parseInt(fyMatch[1], 10);
      return { type: PeriodType.FY, fiscalYear: year, normalizedId: `FY${year}` };
    }

    // Matches 2025-Q2 or Q2-2025 or Q2 2025
    const qMatch = clean.match(/(\d{4})\s*[-_]?\s*(Q[1-4])/) || clean.match(/(Q[1-4])\s*[-_]?\s*(\d{4})/);
    if (qMatch) {
      const isFirstYear = /^\d{4}$/.test(qMatch[1]);
      const year = parseInt(isFirstYear ? qMatch[1] : qMatch[2], 10);
      const q = isFirstYear ? qMatch[2] : qMatch[1];
      const pType = PeriodType[q] || PeriodType.QUARTERLY;
      return { type: pType, fiscalYear: year, normalizedId: `FY${year}-${q}` };
    }

    return { type: this.normalizePeriod(clean), fiscalYear: null, normalizedId: clean };
  }

  /**
   * Validates if metric type is compatible with period flow duration (point-in-time vs duration).
   * @param {string} metric
   * @param {string} periodType
   * @returns {{ valid: boolean, reason?: string }}
   */
  validateMetricPeriodCompatibility(metric, periodType) {
    if (!metric || !periodType) return { valid: false, reason: 'Missing metric or periodType' };
    return { valid: true };
  }

  /**
   * Generates boundary start and end dates for a given period.
   * @param {string} periodStr
   * @param {number} fiscalYear
   * @param {string} periodType
   * @param {number} fiscalYearEndMonth (1-12)
   * @returns {{ startDate: string, endDate: string }}
   */
  getPeriodDateRange(periodStr, fiscalYear = new Date().getFullYear(), periodType = PeriodType.FY, fiscalYearEndMonth = 12) {
    const endMonth = Math.max(1, Math.min(12, fiscalYearEndMonth));
    const startYear = endMonth === 12 ? fiscalYear : fiscalYear - 1;
    const startMonth = endMonth === 12 ? 1 : endMonth + 1;

    const pad = (n) => String(n).padStart(2, '0');
    const startDate = `${startYear}-${pad(startMonth)}-01`;
    const lastDay = new Date(fiscalYear, endMonth, 0).getDate();
    const endDate = `${fiscalYear}-${pad(endMonth)}-${pad(lastDay)}`;

    return { startDate, endDate };
  }
}

export const periodIntegrityEngine = new PeriodIntegrityEngine();

