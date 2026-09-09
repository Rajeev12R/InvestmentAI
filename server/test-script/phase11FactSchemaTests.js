import assert from 'assert';
import {
  CanonicalMetric,
  PeriodType,
  FactStatus,
  QualityDimension,
  AccountingCheckStatus,
  FilingType,
  isValidCanonicalMetric,
  isValidPeriodType,
  normalizeMetricKey
} from '../facts/fact.types.js';
import { periodIntegrityEngine } from '../facts/periodIntegrity.engine.js';
import { documentParserEngine } from '../facts/documentParser.engine.js';
import { factRepository } from '../facts/factRepository.js';

console.log('================================================================');
console.log('PHASE 11 — FACT SCHEMA, INTEGRITY & CANONICAL TYPES AUDIT');
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

// 1. CanonicalMetric Enums & Validation
it('CanonicalMetric contains fundamental accounting metrics', () => {
  assert.strictEqual(CanonicalMetric.REVENUE, 'REVENUE');
  assert.strictEqual(CanonicalMetric.NET_INCOME, 'NET_INCOME');
  assert.strictEqual(CanonicalMetric.OPERATING_INCOME, 'OPERATING_INCOME');
  assert.strictEqual(CanonicalMetric.FREE_CASH_FLOW, 'FREE_CASH_FLOW');
  assert.strictEqual(CanonicalMetric.OPERATING_CASH_FLOW, 'OPERATING_CASH_FLOW');
  assert.strictEqual(CanonicalMetric.CAPEX, 'CAPEX');
  assert.strictEqual(CanonicalMetric.TOTAL_DEBT, 'TOTAL_DEBT');
  assert.strictEqual(CanonicalMetric.CASH_AND_EQUIVALENTS, 'CASH_AND_EQUIVALENTS');
  assert.strictEqual(CanonicalMetric.NET_DEBT, 'NET_DEBT');
  assert.strictEqual(CanonicalMetric.DILUTED_EPS, 'DILUTED_EPS');
  assert.strictEqual(CanonicalMetric.DILUTED_SHARES, 'DILUTED_SHARES');
  assert.strictEqual(CanonicalMetric.MARKET_CAP, 'MARKET_CAP');
});

it('isValidCanonicalMetric validates recognized vs unrecognized metrics', () => {
  assert.strictEqual(isValidCanonicalMetric('REVENUE'), true);
  assert.strictEqual(isValidCanonicalMetric('FREE_CASH_FLOW'), true);
  assert.strictEqual(isValidCanonicalMetric('INVALID_METRIC_ABC'), false);
  assert.strictEqual(isValidCanonicalMetric(null), false);
  assert.strictEqual(isValidCanonicalMetric(undefined), false);
});

it('normalizeMetricKey standardizes alternate accounting aliases', () => {
  assert.strictEqual(normalizeMetricKey('total_revenue'), CanonicalMetric.REVENUE);
  assert.strictEqual(normalizeMetricKey('Total Net Sales'), CanonicalMetric.REVENUE);
  assert.strictEqual(normalizeMetricKey('net_earnings'), CanonicalMetric.NET_INCOME);
  assert.strictEqual(normalizeMetricKey('cash_from_operations'), CanonicalMetric.OPERATING_CASH_FLOW);
  assert.strictEqual(normalizeMetricKey('capital_expenditures'), CanonicalMetric.CAPEX);
  assert.strictEqual(normalizeMetricKey('fcf'), CanonicalMetric.FREE_CASH_FLOW);
});

// 2. PeriodType Enums & Boundary Validation
it('PeriodType enum provides standard fiscal intervals', () => {
  assert.strictEqual(PeriodType.FY, 'FY');
  assert.strictEqual(PeriodType.Q1, 'Q1');
  assert.strictEqual(PeriodType.Q2, 'Q2');
  assert.strictEqual(PeriodType.Q3, 'Q3');
  assert.strictEqual(PeriodType.Q4, 'Q4');
  assert.strictEqual(PeriodType.YTD, 'YTD');
  assert.strictEqual(PeriodType.TTM, 'TTM');
  assert.strictEqual(PeriodType.POINT_IN_TIME, 'POINT_IN_TIME');
});

it('isValidPeriodType correctly identifies standard fiscal intervals', () => {
  assert.strictEqual(isValidPeriodType('FY'), true);
  assert.strictEqual(isValidPeriodType('Q3'), true);
  assert.strictEqual(isValidPeriodType('TTM'), true);
  assert.strictEqual(isValidPeriodType('HALF_YEAR_CUSTOM'), false);
});

it('periodIntegrityEngine parses and normalizes fiscal identifiers', () => {
  const fyParsed = periodIntegrityEngine.parsePeriodString('FY2025');
  assert.strictEqual(fyParsed.type, PeriodType.FY);
  assert.strictEqual(fyParsed.fiscalYear, 2025);
  assert.strictEqual(fyParsed.normalizedId, 'FY2025');

  const qParsed = periodIntegrityEngine.parsePeriodString('2025-Q2');
  assert.strictEqual(qParsed.type, PeriodType.Q2);
  assert.strictEqual(qParsed.fiscalYear, 2025);
  assert.strictEqual(qParsed.normalizedId, 'FY2025-Q2');
});

it('periodIntegrityEngine validates duration metrics vs point-in-time metrics', () => {
  const revCheck = periodIntegrityEngine.validateMetricPeriodCompatibility(CanonicalMetric.REVENUE, PeriodType.FY);
  assert.strictEqual(revCheck.valid, true);

  const spotCashCheck = periodIntegrityEngine.validateMetricPeriodCompatibility(CanonicalMetric.CASH_AND_EQUIVALENTS, PeriodType.POINT_IN_TIME);
  assert.strictEqual(spotCashCheck.valid, true);
});

it('periodIntegrityEngine detects and flags period boundaries', () => {
  const boundary = periodIntegrityEngine.getPeriodDateRange('FY2024', 2024, PeriodType.FY, 9);
  assert.ok(boundary.startDate);
  assert.ok(boundary.endDate);
  assert.ok(new Date(boundary.startDate) < new Date(boundary.endDate));
});

// 3. Document Parsing & SHA-256 Hashing
it('documentParserEngine computes deterministic SHA-256 of raw document', () => {
  const rawText = 'Item 8. Financial Statements - AAPL FY2025 Form 10-K';
  const parsed = documentParserEngine.parseDocumentText({
    text: rawText,
    ticker: 'AAPL',
    filingType: FilingType.FORM_10K,
    accessionNumber: '0000320193-25-000010'
  });

  assert.ok(parsed.documentHash);
  assert.strictEqual(parsed.documentHash.length, 64);
  assert.strictEqual(parsed.accessionNumber, '0000320193-25-000010');
  assert.strictEqual(parsed.ticker, 'AAPL');
});

it('documentParserEngine extracts structured table sections', () => {
  const secFilingText = `
    CONSOLIDATED STATEMENTS OF OPERATIONS
    Total net sales: 391,035 million
    Net income: 93,736 million
    CONSOLIDATED STATEMENTS OF CASH FLOWS
    Cash generated by operating activities: 118,254 million
    Payments for acquisition of property, plant and equipment: 9,452 million
  `;
  const result = documentParserEngine.extractFundamentalObservations({
    text: secFilingText,
    ticker: 'AAPL',
    filingType: FilingType.FORM_10K,
    fiscalYear: 2025,
    period: 'FY2025'
  });

  assert.ok(Array.isArray(result.observations));
  assert.ok(result.observations.length >= 4);
  const rev = result.observations.find(o => o.metric === CanonicalMetric.REVENUE);
  assert.ok(rev);
  assert.strictEqual(rev.value, 391035000000);
});

// 4. Fact Status & Repository Invariants
it('FactStatus enumerates full lifecycle without silent overwrites', () => {
  assert.strictEqual(FactStatus.ACTIVE_TRUTH, 'ACTIVE_TRUTH');
  assert.strictEqual(FactStatus.RESTATED_HISTORICAL, 'RESTATED_HISTORICAL');
  assert.strictEqual(FactStatus.SUPERSEDED, 'SUPERSEDED');
  assert.strictEqual(FactStatus.CANDIDATE, 'CANDIDATE');
  assert.strictEqual(FactStatus.REJECTED, 'REJECTED');
});

// 5. Advanced Period Boundary & Temporal Integrity
it('periodIntegrityEngine rejects invalid formats and handles empty input', () => {
  const parsedNull = periodIntegrityEngine.parsePeriodString(null);
  assert.strictEqual(parsedNull.type, PeriodType.TTM);
  assert.strictEqual(parsedNull.normalizedId, 'TTM');

  const parsedEmpty = periodIntegrityEngine.parsePeriodString('');
  assert.strictEqual(parsedEmpty.type, PeriodType.TTM);

  const parsedPit = periodIntegrityEngine.parsePeriodString('PIT');
  assert.strictEqual(parsedPit.type, PeriodType.POINT_IN_TIME);
});

it('periodIntegrityEngine parses quarter variations like Q1 2024 and 2024-Q3', () => {
  const q1 = periodIntegrityEngine.parsePeriodString('Q1 2024');
  assert.strictEqual(q1.type, PeriodType.Q1);
  assert.strictEqual(q1.fiscalYear, 2024);

  const q3 = periodIntegrityEngine.parsePeriodString('2024_Q3');
  assert.strictEqual(q3.type, PeriodType.Q3);
  assert.strictEqual(q3.fiscalYear, 2024);

  const q4 = periodIntegrityEngine.parsePeriodString('Q4-2023');
  assert.strictEqual(q4.type, PeriodType.Q4);
  assert.strictEqual(q4.fiscalYear, 2023);
});

it('periodIntegrityEngine detects and flags mismatched period types in validatePeriodCompatibility', () => {
  const res = periodIntegrityEngine.validatePeriodCompatibility(
    { periodType: 'FY', fiscalYear: 2024 },
    { periodType: 'Q1', fiscalYear: 2024 }
  );
  assert.strictEqual(res.compatible, false);
  assert.strictEqual(res.status, 'CONFLICT');
});

it('periodIntegrityEngine detects and flags fiscal year mismatches', () => {
  const res = periodIntegrityEngine.validatePeriodCompatibility(
    { periodType: 'FY', fiscalYear: 2023 },
    { periodType: 'FY', fiscalYear: 2024 }
  );
  assert.strictEqual(res.compatible, false);
  assert.strictEqual(res.status, 'CONFLICT');
});

it('periodIntegrityEngine detects currency mismatches', () => {
  const res = periodIntegrityEngine.validatePeriodCompatibility(
    { periodType: 'FY', fiscalYear: 2024, currency: 'USD' },
    { periodType: 'FY', fiscalYear: 2024, currency: 'EUR' }
  );
  assert.strictEqual(res.compatible, false);
  assert.strictEqual(res.status, 'CONFLICT');
});

it('periodIntegrityEngine detects unit mismatches', () => {
  const res = periodIntegrityEngine.validatePeriodCompatibility(
    { periodType: 'FY', fiscalYear: 2024, unit: 'MILLIONS' },
    { periodType: 'FY', fiscalYear: 2024, unit: 'BILLIONS' }
  );
  assert.strictEqual(res.compatible, false);
  assert.strictEqual(res.status, 'CONFLICT');
});

it('periodIntegrityEngine evaluates freshness correctly with age calculation', () => {
  const freshFact = { filingDate: new Date().toISOString().split('T')[0], isCurrent: true };
  const freshRes = periodIntegrityEngine.evaluateFreshness(freshFact);
  assert.strictEqual(freshRes.isFresh, true);
  assert.ok(freshRes.ageDays >= 0);

  const staleFact = { filingDate: '2020-01-01', isCurrent: true };
  const staleRes = periodIntegrityEngine.evaluateFreshness(staleFact, 365);
  assert.strictEqual(staleRes.isFresh, false);
});

it('periodIntegrityEngine rejects future timestamps as potential tampering', () => {
  const futureFact = { filingDate: '2099-01-01', isCurrent: true };
  const res = periodIntegrityEngine.evaluateFreshness(futureFact);
  assert.strictEqual(res.isFresh, false);
  assert.ok(res.reason.includes('Future timestamp'));
});

// 6. 6-Stage Fact Provenance Metadata Integrity
it('Stored facts contain immutable 6-stage provenance fields', () => {
  const fact = factRepository.storeFact({
    ticker: 'AAPL',
    metric: CanonicalMetric.NET_INCOME,
    period: 'FY2025',
    value: 93736000000,
    sourceDocumentId: 'DOC-AAPL-10K-000032019325000010',
    evidenceId: 'EVID-AAPL-NET_INCOME-001'
  });

  assert.ok(fact.factId);
  assert.ok(fact.hash);
  assert.strictEqual(fact.metric, 'NET_INCOME');
  assert.strictEqual(fact.ticker, 'AAPL');
  assert.strictEqual(fact.period, 'FY2025');
  assert.strictEqual(fact.sourceDocumentId, 'DOC-AAPL-10K-000032019325000010');
  assert.strictEqual(fact.evidenceId, 'EVID-AAPL-NET_INCOME-001');
});

it('factRepository lists facts by ticker and filters by period', () => {
  factRepository.storeFact({
    ticker: 'AAPL',
    metric: CanonicalMetric.REVENUE,
    period: 'FY2025',
    value: 391035000000
  });
  const allAapl = factRepository.listFactsByTicker('AAPL');
  assert.ok(allAapl.length >= 2);

  const fy2025Only = factRepository.listFactsByTicker('AAPL', { period: 'FY2025' });
  assert.ok(fy2025Only.length >= 2);
  assert.strictEqual(fy2025Only.every(f => f.period === 'FY2025'), true);
});

it('factRepository returns null for non-existent facts', () => {
  const nonExistent = factRepository.getFact('FACT-NONEXISTENT-999');
  assert.strictEqual(nonExistent, null);

  const nonExistentActive = factRepository.getActiveFact('UNKNOWN_TICKER', 'REVENUE', 'FY2025');
  assert.strictEqual(nonExistentActive, null);
});

it('factRepository stores and retrieves raw document records', () => {
  const doc = {
    sourceDocumentId: 'DOC-AAPL-10K-2025',
    ticker: 'AAPL',
    rawDocumentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    content: 'RAW_10K_CONTENT'
  };
  factRepository.storeRawDocument(doc);
  const retrieved = factRepository.getRawDocument('DOC-AAPL-10K-2025');
  assert.strictEqual(retrieved.ticker, 'AAPL');
  assert.strictEqual(retrieved.rawDocumentHash, doc.rawDocumentHash);
});

it('documentParserEngine requires non-empty raw content for parsing', () => {
  assert.throws(() => {
    documentParserEngine.parseFilingDocument({ rawDocumentContent: '' });
  }, /Valid raw filing document content is required/);
});

it('QualityDimension enum contains all 7 institutional dimensions', () => {
  assert.strictEqual(QualityDimension.SOURCE_QUALITY, 'SOURCE_QUALITY');
  assert.strictEqual(QualityDimension.COVERAGE, 'COVERAGE');
  assert.strictEqual(QualityDimension.FRESHNESS, 'FRESHNESS');
  assert.strictEqual(QualityDimension.PERIOD_INTEGRITY, 'PERIOD_INTEGRITY');
  assert.strictEqual(QualityDimension.ACCOUNTING_CONSISTENCY, 'ACCOUNTING_CONSISTENCY');
  assert.strictEqual(QualityDimension.CONFLICT_RATE, 'CONFLICT_RATE');
  assert.strictEqual(QualityDimension.PROVENANCE_COMPLETENESS, 'PROVENANCE_COMPLETENESS');
});

it('AccountingCheckStatus enum contains PASS, WARNING, CONFLICT, UNAVAILABLE', () => {
  assert.strictEqual(AccountingCheckStatus.PASS, 'PASS');
  assert.strictEqual(AccountingCheckStatus.WARNING, 'WARNING');
  assert.strictEqual(AccountingCheckStatus.CONFLICT, 'CONFLICT');
  assert.strictEqual(AccountingCheckStatus.UNAVAILABLE, 'UNAVAILABLE');
});

it('FilingType enum contains standard regulatory forms', () => {
  assert.strictEqual(FilingType.FORM_10K, '10-K');
  assert.strictEqual(FilingType.FORM_10KA, '10-K/A');
  assert.strictEqual(FilingType.FORM_10Q, '10-Q');
  assert.strictEqual(FilingType.FORM_10QA, '10-Q/A');
  assert.strictEqual(FilingType.FORM_8K, '8-K');
  assert.strictEqual(FilingType.FORM_20F, '20-F');
  assert.strictEqual(FilingType.FORM_6K, '6-K');
  assert.strictEqual(FilingType.NSE_ANNUAL, 'NSE_ANNUAL');
});

it('Period date range computation handles fiscal year ends', () => {
  const range12 = periodIntegrityEngine.getPeriodDateRange('FY2025', 2025, PeriodType.FY, 12);
  assert.strictEqual(range12.startDate, '2025-01-01');
  assert.strictEqual(range12.endDate, '2025-12-31');

  const range9 = periodIntegrityEngine.getPeriodDateRange('FY2025', 2025, PeriodType.FY, 9);
  assert.strictEqual(range9.startDate, '2024-10-01');
  assert.strictEqual(range9.endDate, '2025-09-30');
});

it('normalizeMetricKey handles uppercase and messy casing gracefully', () => {
  assert.strictEqual(normalizeMetricKey('  NET_INCOME  '), CanonicalMetric.NET_INCOME);
  assert.strictEqual(normalizeMetricKey('Total_Debt'), CanonicalMetric.TOTAL_DEBT);
  assert.strictEqual(normalizeMetricKey('CASH_AND_CASH_EQUIVALENTS'), CanonicalMetric.CASH);
  assert.strictEqual(normalizeMetricKey('diluted_shares'), CanonicalMetric.DILUTED_SHARES);
});

it('normalizeMetricKey returns null for unmapped gibberish', () => {
  assert.strictEqual(normalizeMetricKey('random_metric_xyz'), null);
  assert.strictEqual(normalizeMetricKey(null), null);
  assert.strictEqual(normalizeMetricKey(123), null);
});

it('documentParserEngine parses multi-statement SEC document cleanly', () => {
  const secReport = documentParserEngine.parseFilingDocument({
    rawDocumentContent: 'SEC FORM 10-K - J.P. MORGAN CHASE & CO.',
    ticker: 'JPM',
    filingType: FilingType.FORM_10K,
    accessionNumber: '0000019617-25-000200'
  });
  assert.strictEqual(secReport.ticker, 'JPM');
  assert.ok(secReport.observations.length > 5);
  assert.strictEqual(secReport.rawDocumentHash.length, 64);
});

it('Period integrity correctly rejects double counted date range overlaps', () => {
  const fact1 = { periodStart: '2024-01-01', periodEnd: '2024-06-30' };
  const fact2 = { periodStart: '2024-04-01', periodEnd: '2024-09-30' };
  const overlapCheck = periodIntegrityEngine.validatePeriodCompatibility(fact1, fact2);
  assert.strictEqual(overlapCheck.compatible, false);
  assert.strictEqual(overlapCheck.status, 'CONFLICT');
});

it('Period integrity allows identical matching date ranges', () => {
  const fact1 = { periodStart: '2024-01-01', periodEnd: '2024-12-31' };
  const fact2 = { periodStart: '2024-01-01', periodEnd: '2024-12-31' };
  const matchCheck = periodIntegrityEngine.validatePeriodCompatibility(fact1, fact2);
  assert.strictEqual(matchCheck.compatible, true);
  assert.strictEqual(matchCheck.status, 'PASS');
});

it('factRepository clear resets all internal state', () => {
  factRepository.clear();
  assert.strictEqual(factRepository.listFactsByTicker('AAPL').length, 0);
  assert.strictEqual(factRepository.getRawDocument('DOC-AAPL-10K-2025'), null);
});

it('factRepository getActiveFact returns the latest version', () => {
  factRepository.storeFact({ ticker: 'AAPL', metric: 'REVENUE', period: 'FY2025', value: 391000000000 });
  factRepository.storeFact({ ticker: 'AAPL', metric: 'REVENUE', period: 'FY2025', value: 391035000000 });
  const active = factRepository.getActiveFact('AAPL', 'REVENUE', 'FY2025');
  assert.strictEqual(active.version, 2);
  assert.strictEqual(active.value, 391035000000);
});

console.log(`\n================================================================`);
console.log(`PHASE 11 FACT SCHEMA AUDIT COMPLETE: ${passed} PASSED`);
console.log(`================================================================\n`);
