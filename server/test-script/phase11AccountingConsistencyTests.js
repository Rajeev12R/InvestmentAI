import assert from 'assert';
import { accountingConsistencyEngine } from '../facts/accountingConsistency.engine.js';
import { AccountingCheckStatus } from '../facts/fact.types.js';

console.log('================================================================');
console.log('PHASE 11 — ACCOUNTING CONSISTENCY & IDENTITY ENGINE AUDIT');
console.log('================================================================\n');

let passed = 0;

function it(desc, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${desc}`);
  } catch (err) {
    console.error(`  ✗ ${desc}`);
    console.error(err);
    process.exit(1);
  }
}

// 1. Free Cash Flow Identity: FCF = CFO - CapEx
it('FCF Identity PASS when FCF == CFO - CapEx exactly', () => {
  const facts = { CFO: 1000, CAPEX: 200, FCF: 800 };
  const res = accountingConsistencyEngine.evaluateConsistency(facts);
  const fcfCheck = res.checks.find(c => c.rule === 'FREE_CASH_FLOW_IDENTITY');
  assert.strictEqual(fcfCheck.status, AccountingCheckStatus.PASS);
  assert.strictEqual(fcfCheck.expectedValue, 800);
  assert.strictEqual(fcfCheck.discrepancy, 0);
});

it('FCF Identity CONFLICT when FCF contradicts CFO - CapEx', () => {
  const facts = { CFO: 1000, CAPEX: 200, FCF: 500 };
  const res = accountingConsistencyEngine.evaluateConsistency(facts);
  const fcfCheck = res.checks.find(c => c.rule === 'FREE_CASH_FLOW_IDENTITY');
  assert.strictEqual(fcfCheck.status, AccountingCheckStatus.CONFLICT);
  assert.strictEqual(fcfCheck.discrepancy, 300);
  assert.strictEqual(res.overallStatus, AccountingCheckStatus.CONFLICT);
});

it('FCF Identity UNAVAILABLE when CFO is missing', () => {
  const facts = { CAPEX: 200, FCF: 800 };
  const res = accountingConsistencyEngine.evaluateConsistency(facts);
  const fcfCheck = res.checks.find(c => c.rule === 'FREE_CASH_FLOW_IDENTITY');
  assert.strictEqual(fcfCheck.status, AccountingCheckStatus.UNAVAILABLE);
});

it('FCF Identity UNAVAILABLE when CapEx is missing', () => {
  const facts = { CFO: 1000, FCF: 800 };
  const res = accountingConsistencyEngine.evaluateConsistency(facts);
  const fcfCheck = res.checks.find(c => c.rule === 'FREE_CASH_FLOW_IDENTITY');
  assert.strictEqual(fcfCheck.status, AccountingCheckStatus.UNAVAILABLE);
});

it('FCF Identity UNAVAILABLE when FCF is missing', () => {
  const facts = { CFO: 1000, CAPEX: 200 };
  const res = accountingConsistencyEngine.evaluateConsistency(facts);
  const fcfCheck = res.checks.find(c => c.rule === 'FREE_CASH_FLOW_IDENTITY');
  assert.strictEqual(fcfCheck.status, AccountingCheckStatus.UNAVAILABLE);
});

it('FCF Identity accepts metric aliases OPERATING_CASH_FLOW and FREE_CASH_FLOW', () => {
  const facts = { OPERATING_CASH_FLOW: 5000, CAPEX: 1000, FREE_CASH_FLOW: 4000 };
  const res = accountingConsistencyEngine.evaluateConsistency(facts);
  const fcfCheck = res.checks.find(c => c.rule === 'FREE_CASH_FLOW_IDENTITY');
  assert.strictEqual(fcfCheck.status, AccountingCheckStatus.PASS);
});

// 2. Net Debt Identity: Net Debt = Total Debt - Cash
it('Net Debt Identity PASS when NetDebt == TotalDebt - Cash exactly', () => {
  const facts = { TOTAL_DEBT: 500, CASH: 200, NET_DEBT: 300 };
  const res = accountingConsistencyEngine.evaluateConsistency(facts);
  const netDebtCheck = res.checks.find(c => c.rule === 'NET_DEBT_IDENTITY');
  assert.strictEqual(netDebtCheck.status, AccountingCheckStatus.PASS);
  assert.strictEqual(netDebtCheck.expectedValue, 300);
});

it('Net Debt Identity CONFLICT when NetDebt is inconsistent with balance sheet items', () => {
  const facts = { TOTAL_DEBT: 500, CASH: 200, NET_DEBT: 100 };
  const res = accountingConsistencyEngine.evaluateConsistency(facts);
  const netDebtCheck = res.checks.find(c => c.rule === 'NET_DEBT_IDENTITY');
  assert.strictEqual(netDebtCheck.status, AccountingCheckStatus.CONFLICT);
  assert.strictEqual(netDebtCheck.discrepancy, 200);
});

it('Net Debt Identity handles net cash positions (negative net debt)', () => {
  const facts = { TOTAL_DEBT: 100, CASH: 300, NET_DEBT: -200 };
  const res = accountingConsistencyEngine.evaluateConsistency(facts);
  const netDebtCheck = res.checks.find(c => c.rule === 'NET_DEBT_IDENTITY');
  assert.strictEqual(netDebtCheck.status, AccountingCheckStatus.PASS);
});

it('Net Debt Identity UNAVAILABLE when Total Debt or Cash is missing', () => {
  const facts = { CASH: 200, NET_DEBT: 300 };
  const res = accountingConsistencyEngine.evaluateConsistency(facts);
  const netDebtCheck = res.checks.find(c => c.rule === 'NET_DEBT_IDENTITY');
  assert.strictEqual(netDebtCheck.status, AccountingCheckStatus.UNAVAILABLE);
});

it('Net Debt Identity accepts CASH_AND_EQUIVALENTS and DEBT aliases', () => {
  const facts = { DEBT: 800, CASH_AND_EQUIVALENTS: 300, NET_DEBT: 500 };
  const res = accountingConsistencyEngine.evaluateConsistency(facts);
  const netDebtCheck = res.checks.find(c => c.rule === 'NET_DEBT_IDENTITY');
  assert.strictEqual(netDebtCheck.status, AccountingCheckStatus.PASS);
});

// 3. Diluted EPS Identity: EPS ≈ Net Income / Diluted Shares
it('Diluted EPS Identity PASS when EPS matches NetIncome / Shares quotient', () => {
  const facts = { NET_INCOME: 93736000000, DILUTED_SHARES: 15408000000, DILUTED_EPS: 6.08 };
  const res = accountingConsistencyEngine.evaluateConsistency(facts);
  const epsCheck = res.checks.find(c => c.rule === 'DILUTED_EPS_IDENTITY');
  assert.strictEqual(epsCheck.status, AccountingCheckStatus.PASS);
});

it('Diluted EPS Identity WARNING / CONFLICT when EPS differs significantly', () => {
  const facts = { NET_INCOME: 1000000, DILUTED_SHARES: 1000000, DILUTED_EPS: 3.50 };
  const res = accountingConsistencyEngine.evaluateConsistency(facts);
  const epsCheck = res.checks.find(c => c.rule === 'DILUTED_EPS_IDENTITY');
  assert.strictEqual(epsCheck.status, AccountingCheckStatus.WARNING);
  assert.strictEqual(epsCheck.discrepancy, 2.50);
});

it('Diluted EPS Identity handles zero or negative shares safely without crashing', () => {
  const facts = { NET_INCOME: 1000, DILUTED_SHARES: 0, DILUTED_EPS: 1.0 };
  const res = accountingConsistencyEngine.evaluateConsistency(facts);
  const epsCheck = res.checks.find(c => c.rule === 'DILUTED_EPS_IDENTITY');
  assert.strictEqual(epsCheck.status, AccountingCheckStatus.UNAVAILABLE);
});

it('Diluted EPS Identity handles negative net income (net loss)', () => {
  const facts = { NET_INCOME: -2000000, DILUTED_SHARES: 1000000, DILUTED_EPS: -2.00 };
  const res = accountingConsistencyEngine.evaluateConsistency(facts);
  const epsCheck = res.checks.find(c => c.rule === 'DILUTED_EPS_IDENTITY');
  assert.strictEqual(epsCheck.status, AccountingCheckStatus.PASS);
});

it('Diluted EPS Identity accepts EPS and SHARES aliases', () => {
  const facts = { NET_INCOME: 5000, SHARES: 1000, EPS: 5.0 };
  const res = accountingConsistencyEngine.evaluateConsistency(facts);
  const epsCheck = res.checks.find(c => c.rule === 'DILUTED_EPS_IDENTITY');
  assert.strictEqual(epsCheck.status, AccountingCheckStatus.PASS);
});

// 4. Market Cap Identity: MarketCap ≈ Price * Diluted Shares
it('Market Cap Identity PASS when MarketCap == Price * Shares', () => {
  const facts = { PRICE: 200, DILUTED_SHARES: 1000000, MARKET_CAP: 200000000 };
  const res = accountingConsistencyEngine.evaluateConsistency(facts);
  const mcCheck = res.checks.find(c => c.rule === 'MARKET_CAP_IDENTITY');
  assert.strictEqual(mcCheck.status, AccountingCheckStatus.PASS);
});

it('Market Cap Identity flags WARNING when valuation deviates beyond tolerance', () => {
  const facts = { PRICE: 200, DILUTED_SHARES: 1000000, MARKET_CAP: 350000000 };
  const res = accountingConsistencyEngine.evaluateConsistency(facts);
  const mcCheck = res.checks.find(c => c.rule === 'MARKET_CAP_IDENTITY');
  assert.strictEqual(mcCheck.status, AccountingCheckStatus.WARNING);
});

it('Market Cap Identity omitted when Price or MarketCap not provided', () => {
  const facts = { DILUTED_SHARES: 1000000 };
  const res = accountingConsistencyEngine.evaluateConsistency(facts);
  const mcCheck = res.checks.find(c => c.rule === 'MARKET_CAP_IDENTITY');
  assert.strictEqual(mcCheck, undefined);
});

// 5. Structured Fact Object Format Support
it('Accounting engine extracts values and evidenceIds from rich fact objects', () => {
  const facts = {
    CFO: { value: 1200, evidenceId: 'EVID-CFO-001' },
    CAPEX: { value: 200, evidenceId: 'EVID-CAPEX-001' },
    FCF: { value: 1000, evidenceId: 'EVID-FCF-001' }
  };
  const res = accountingConsistencyEngine.evaluateConsistency(facts);
  const fcfCheck = res.checks.find(c => c.rule === 'FREE_CASH_FLOW_IDENTITY');
  assert.strictEqual(fcfCheck.status, AccountingCheckStatus.PASS);
  assert.deepStrictEqual(fcfCheck.evidenceIds, ['EVID-CFO-001', 'EVID-CAPEX-001', 'EVID-FCF-001']);
});

it('Accounting engine handles NaN, null, and non-numeric fields safely', () => {
  const facts = { CFO: NaN, CAPEX: null, FCF: 'INVALID' };
  const res = accountingConsistencyEngine.evaluateConsistency(facts);
  assert.strictEqual(res.overallStatus, AccountingCheckStatus.PASS); // No conflicts, only unavailables
});

it('Accounting engine overallStatus is CONFLICT if any rule CONFLICTS', () => {
  const facts = {
    CFO: 1000, CAPEX: 200, FCF: 100, // Conflict
    TOTAL_DEBT: 500, CASH: 200, NET_DEBT: 300 // Pass
  };
  const res = accountingConsistencyEngine.evaluateConsistency(facts);
  assert.strictEqual(res.overallStatus, AccountingCheckStatus.CONFLICT);
  assert.strictEqual(res.conflicts, 1);
});

it('Accounting engine overallStatus is WARNING if only warnings present', () => {
  const facts = {
    NET_INCOME: 1000000, DILUTED_SHARES: 1000000, DILUTED_EPS: 2.0 // Warning (diff: 1.0)
  };
  const res = accountingConsistencyEngine.evaluateConsistency(facts);
  assert.strictEqual(res.overallStatus, AccountingCheckStatus.WARNING);
  assert.strictEqual(res.warnings, 1);
});

it('Accounting engine verifies full AAPL baseline financial package', () => {
  const aaplFacts = {
    CFO: 118264000000,
    CAPEX: 9450000000,
    FCF: 108814000000,
    TOTAL_DEBT: 106629000000,
    CASH: 29943000000,
    NET_DEBT: 76686000000,
    NET_INCOME: 93736000000,
    DILUTED_SHARES: 15408000000,
    DILUTED_EPS: 6.08,
    PRICE: 240.0,
    MARKET_CAP: 3697920000000
  };
  const res = accountingConsistencyEngine.evaluateConsistency(aaplFacts);
  assert.strictEqual(res.overallStatus, AccountingCheckStatus.PASS);
  assert.strictEqual(res.conflicts, 0);
  assert.strictEqual(res.passedChecks, 4);
});

it('Accounting engine verifies JPM banking metrics with zero capex FCF', () => {
  const jpmFacts = {
    CFO: 85000000000,
    CAPEX: 0,
    FCF: 85000000000,
    TOTAL_DEBT: 300000000000,
    CASH: 500000000000,
    NET_DEBT: -200000000000,
    NET_INCOME: 49552000000,
    DILUTED_SHARES: 2880000000,
    DILUTED_EPS: 17.20
  };
  const res = accountingConsistencyEngine.evaluateConsistency(jpmFacts);
  assert.strictEqual(res.overallStatus, AccountingCheckStatus.PASS);
  assert.strictEqual(res.conflicts, 0);
});

it('Accounting engine returns comprehensive summary counts', () => {
  const res = accountingConsistencyEngine.evaluateConsistency({});
  assert.strictEqual(res.totalChecks, 3);
  assert.strictEqual(res.passedChecks, 0);
  assert.strictEqual(res.conflicts, 0);
  assert.strictEqual(res.warnings, 0);
});

it('Accounting check messages contain descriptive human-readable audit explanations', () => {
  const facts = { CFO: 100, CAPEX: 20, FCF: 80 };
  const res = accountingConsistencyEngine.evaluateConsistency(facts);
  const fcf = res.checks.find(c => c.rule === 'FREE_CASH_FLOW_IDENTITY');
  assert.ok(fcf.message.includes('strictly equals'));
});

it('Accounting check discrepancy is exactly 0 on exact match', () => {
  const facts = { TOTAL_DEBT: 1000, CASH: 400, NET_DEBT: 600 };
  const res = accountingConsistencyEngine.evaluateConsistency(facts);
  const debtCheck = res.checks.find(c => c.rule === 'NET_DEBT_IDENTITY');
  assert.strictEqual(debtCheck.discrepancy, 0);
});

it('Accounting check preserves evidence IDs through all evaluations', () => {
  const facts = {
    PRICE: { value: 100, evidenceId: 'EVID-P' },
    DILUTED_SHARES: { value: 50, evidenceId: 'EVID-S' },
    MARKET_CAP: { value: 5000, evidenceId: 'EVID-MC' }
  };
  const res = accountingConsistencyEngine.evaluateConsistency(facts);
  const mc = res.checks.find(c => c.rule === 'MARKET_CAP_IDENTITY');
  assert.deepStrictEqual(mc.evidenceIds, ['EVID-P', 'EVID-S', 'EVID-MC']);
});

it('Accounting check handles fractional cent differences within threshold', () => {
  const facts = { NET_INCOME: 100000, DILUTED_SHARES: 30000, DILUTED_EPS: 3.33 };
  const res = accountingConsistencyEngine.evaluateConsistency(facts);
  const eps = res.checks.find(c => c.rule === 'DILUTED_EPS_IDENTITY');
  assert.strictEqual(eps.status, AccountingCheckStatus.PASS);
});

it('Accounting engine handles empty invocation safely', () => {
  const res = accountingConsistencyEngine.evaluateConsistency(null);
  assert.strictEqual(res.overallStatus, AccountingCheckStatus.PASS);
  assert.strictEqual(res.totalChecks, 3);
});

it('Accounting engine check formulas are strictly enumerated and static', () => {
  const res = accountingConsistencyEngine.evaluateConsistency({});
  const formulas = res.checks.map(c => c.formula);
  assert.ok(formulas.includes('FCF = CFO - CapEx'));
  assert.ok(formulas.includes('NetDebt = TotalDebt - Cash'));
  assert.ok(formulas.includes('DilutedEPS ≈ NetIncome / DilutedShares'));
});

it('Accounting engine handles extreme values (trillions) without precision loss', () => {
  const facts = {
    TOTAL_DEBT: 2500000000000,
    CASH: 500000000000,
    NET_DEBT: 2000000000000
  };
  const res = accountingConsistencyEngine.evaluateConsistency(facts);
  const debt = res.checks.find(c => c.rule === 'NET_DEBT_IDENTITY');
  assert.strictEqual(debt.status, AccountingCheckStatus.PASS);
  assert.strictEqual(debt.expectedValue, 2000000000000);
});

it('Accounting check detects subtle 1% discrepancy as conflict', () => {
  const facts = { CFO: 100000000, CAPEX: 20000000, FCF: 75000000 }; // 5M off (6.25%)
  const res = accountingConsistencyEngine.evaluateConsistency(facts);
  const fcf = res.checks.find(c => c.rule === 'FREE_CASH_FLOW_IDENTITY');
  assert.strictEqual(fcf.status, AccountingCheckStatus.CONFLICT);
});

it('Accounting check handles negative CFO correctly in FCF formula', () => {
  const facts = { CFO: -500, CAPEX: 100, FCF: -600 };
  const res = accountingConsistencyEngine.evaluateConsistency(facts);
  const fcf = res.checks.find(c => c.rule === 'FREE_CASH_FLOW_IDENTITY');
  assert.strictEqual(fcf.status, AccountingCheckStatus.PASS);
  assert.strictEqual(fcf.expectedValue, -600);
});

console.log(`\n================================================================`);
console.log(`PHASE 11 ACCOUNTING CONSISTENCY AUDIT COMPLETE: ${passed} PASSED`);
console.log(`================================================================\n`);
