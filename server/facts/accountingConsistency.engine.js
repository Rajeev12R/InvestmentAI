/**
 * @file accountingConsistency.engine.js
 * Deterministic Accounting Consistency & Formula Engine for Phase 11.
 * Validates financial identities (FCF, Net Debt, EPS, Market Cap) with structured audit results.
 */

import { AccountingCheckStatus } from './fact.types.js';

class AccountingConsistencyEngine {
  /**
   * Evaluates all accounting identities against a set of company financial facts.
   * @param {Object} facts - Map or Object of metrics { CFO, CAPEX, FCF, TOTAL_DEBT, CASH, NET_DEBT, NET_INCOME, DILUTED_SHARES, DILUTED_EPS, PRICE, MARKET_CAP }
   * @returns {Object} Comprehensive consistency report
   */
  evaluateConsistency(facts = {}) {
    const safeFacts = facts || {};
    const checks = [];

    // Helper to get number
    const getVal = (...keys) => {
      for (const k of keys) {
        const v = safeFacts[k] !== undefined ? (typeof safeFacts[k] === 'object' ? safeFacts[k]?.value : safeFacts[k]) : undefined;
        if (typeof v === 'number' && !isNaN(v)) return v;
      }
      return null;
    };

    const getEvid = (...keys) => {
      for (const k of keys) {
        if (typeof safeFacts[k] === 'object' && safeFacts[k]?.evidenceId) {
          return safeFacts[k].evidenceId;
        }
      }
      return `EVID-${keys[0]}`;
    };

    // 1. Rule: FCF = CFO - CapEx
    const cfo = getVal('CFO', 'OPERATING_CASH_FLOW');
    const capEx = getVal('CAPEX', 'CAPITAL_EXPENDITURES');
    const fcf = getVal('FCF', 'FREE_CASH_FLOW');

    if (cfo !== null && capEx !== null && fcf !== null) {
      const expectedFCF = cfo - capEx;
      const diff = Math.abs(fcf - expectedFCF);
      const isMatch = diff < 1.0 || (Math.abs(diff / (fcf || 1)) < 0.01);

      checks.push({
        rule: 'FREE_CASH_FLOW_IDENTITY',
        formula: 'FCF = CFO - CapEx',
        status: isMatch ? AccountingCheckStatus.PASS : AccountingCheckStatus.CONFLICT,
        reportedValue: fcf,
        expectedValue: expectedFCF,
        discrepancy: diff,
        evidenceIds: [getEvid('CFO', 'OPERATING_CASH_FLOW'), getEvid('CAPEX', 'CAPITAL_EXPENDITURES'), getEvid('FCF', 'FREE_CASH_FLOW')],
        message: isMatch
          ? 'Free Cash Flow strictly equals Cash from Operations minus Capital Expenditures'
          : `Discrepancy in FCF: reported ${fcf} vs computed ${expectedFCF} (diff: ${diff})`
      });
    } else {
      checks.push({
        rule: 'FREE_CASH_FLOW_IDENTITY',
        formula: 'FCF = CFO - CapEx',
        status: AccountingCheckStatus.UNAVAILABLE,
        reportedValue: fcf,
        expectedValue: null,
        evidenceIds: [],
        message: 'Insufficient facts to evaluate FCF identity'
      });
    }

    // 2. Rule: Net Debt = Total Debt - Cash
    const totalDebt = getVal('TOTAL_DEBT', 'DEBT');
    const cash = getVal('CASH', 'CASH_AND_EQUIVALENTS');
    const netDebt = getVal('NET_DEBT');

    if (totalDebt !== null && cash !== null && netDebt !== null) {
      const expectedNetDebt = totalDebt - cash;
      const diff = Math.abs(netDebt - expectedNetDebt);
      const isMatch = diff < 1.0 || (Math.abs(diff / (Math.abs(netDebt) || 1)) < 0.01);

      checks.push({
        rule: 'NET_DEBT_IDENTITY',
        formula: 'NetDebt = TotalDebt - Cash',
        status: isMatch ? AccountingCheckStatus.PASS : AccountingCheckStatus.CONFLICT,
        reportedValue: netDebt,
        expectedValue: expectedNetDebt,
        discrepancy: diff,
        evidenceIds: [getEvid('TOTAL_DEBT'), getEvid('CASH'), getEvid('NET_DEBT')],
        message: isMatch
          ? 'Net Debt strictly equals Total Debt minus Cash and equivalents'
          : `Discrepancy in Net Debt: reported ${netDebt} vs computed ${expectedNetDebt} (diff: ${diff})`
      });
    } else {
      checks.push({
        rule: 'NET_DEBT_IDENTITY',
        formula: 'NetDebt = TotalDebt - Cash',
        status: AccountingCheckStatus.UNAVAILABLE,
        reportedValue: netDebt,
        expectedValue: null,
        evidenceIds: [],
        message: 'Insufficient facts to evaluate Net Debt identity'
      });
    }

    // 3. Rule: Diluted EPS ≈ Net Income / Diluted Shares
    const netIncome = getVal('NET_INCOME');
    const dilutedShares = getVal('DILUTED_SHARES') !== null ? getVal('DILUTED_SHARES') : getVal('SHARES');
    const dilutedEps = getVal('DILUTED_EPS') !== null ? getVal('DILUTED_EPS') : getVal('EPS');

    if (netIncome !== null && dilutedShares !== null && dilutedShares > 0 && dilutedEps !== null) {
      const expectedEps = Number((netIncome / dilutedShares).toFixed(2));
      const diff = Math.abs(dilutedEps - expectedEps);
      const isMatch = diff <= 0.05 || (Math.abs(diff / (dilutedEps || 1)) < 0.05);

      checks.push({
        rule: 'DILUTED_EPS_IDENTITY',
        formula: 'DilutedEPS ≈ NetIncome / DilutedShares',
        status: isMatch ? AccountingCheckStatus.PASS : AccountingCheckStatus.WARNING,
        reportedValue: dilutedEps,
        expectedValue: expectedEps,
        discrepancy: diff,
        evidenceIds: [getEvid('NET_INCOME'), getEvid('DILUTED_SHARES'), getEvid('DILUTED_EPS')],
        message: isMatch
          ? 'Reported EPS matches derived Net Income per Diluted Share within allowable rounding tolerance'
          : `EPS discrepancy: reported ${dilutedEps} vs derived ${expectedEps} (diff: ${diff})`
      });
    } else {
      checks.push({
        rule: 'DILUTED_EPS_IDENTITY',
        formula: 'DilutedEPS ≈ NetIncome / DilutedShares',
        status: AccountingCheckStatus.UNAVAILABLE,
        reportedValue: dilutedEps,
        expectedValue: null,
        evidenceIds: [],
        message: 'Insufficient facts to evaluate EPS identity'
      });
    }

    // 4. Rule: Market Cap ≈ Price × Diluted Shares
    const price = getVal('PRICE');
    const marketCap = getVal('MARKET_CAP');

    if (price !== null && dilutedShares !== null && dilutedShares > 0 && marketCap !== null) {
      const expectedMarketCap = price * dilutedShares;
      const diff = Math.abs(marketCap - expectedMarketCap);
      const isMatch = Math.abs(diff / (marketCap || 1)) < 0.05;

      checks.push({
        rule: 'MARKET_CAP_IDENTITY',
        formula: 'MarketCap ≈ Price × DilutedShares',
        status: isMatch ? AccountingCheckStatus.PASS : AccountingCheckStatus.WARNING,
        reportedValue: marketCap,
        expectedValue: expectedMarketCap,
        discrepancy: diff,
        evidenceIds: [getEvid('PRICE'), getEvid('DILUTED_SHARES'), getEvid('MARKET_CAP')],
        message: isMatch
          ? 'Market Capitalization matches current price multiplied by diluted share count'
          : `Market Cap discrepancy: reported ${marketCap} vs derived ${expectedMarketCap}`
      });
    }

    // Overall Accounting Status
    const passCount = checks.filter(c => c.status === AccountingCheckStatus.PASS).length;
    const conflictCount = checks.filter(c => c.status === AccountingCheckStatus.CONFLICT).length;
    const warningCount = checks.filter(c => c.status === AccountingCheckStatus.WARNING).length;

    let overallStatus = AccountingCheckStatus.PASS;
    if (conflictCount > 0) overallStatus = AccountingCheckStatus.CONFLICT;
    else if (warningCount > 0) overallStatus = AccountingCheckStatus.WARNING;

    return {
      overallStatus,
      totalChecks: checks.length,
      passedChecks: passCount,
      conflicts: conflictCount,
      warnings: warningCount,
      checks
    };
  }
}

export const accountingConsistencyEngine = new AccountingConsistencyEngine();
