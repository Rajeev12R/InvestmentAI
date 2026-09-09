import assert from 'assert';
import { dataQualityEngine } from '../facts/dataQuality.engine.js';
import { QualityDimension, CanonicalMetric } from '../facts/fact.types.js';
import { SourceTier } from '../connectivity/source.types.js';

console.log('================================================================');
console.log('PHASE 11 — DATA QUALITY & 7-VECTOR SCORING AUDIT');
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

// 1. Quality Engine Core Scoring & Dimensions
it('Quality engine returns 7 standard dimensions for any input', () => {
  const report = dataQualityEngine.evaluateCompanyQuality('AAPL', []);
  assert.strictEqual(report.ticker, 'AAPL');
  assert.ok(report.dimensions[QualityDimension.SOURCE_QUALITY]);
  assert.ok(report.dimensions[QualityDimension.COVERAGE]);
  assert.ok(report.dimensions[QualityDimension.FRESHNESS]);
  assert.ok(report.dimensions[QualityDimension.PERIOD_INTEGRITY]);
  assert.ok(report.dimensions[QualityDimension.ACCOUNTING_CONSISTENCY]);
  assert.ok(report.dimensions[QualityDimension.CONFLICT_RATE]);
  assert.ok(report.dimensions[QualityDimension.PROVENANCE_COMPLETENESS]);
});

it('Quality engine returns overallScore 0 and grade UNAVAILABLE on empty facts', () => {
  const report = dataQualityEngine.evaluateCompanyQuality('UNKNOWN', []);
  assert.strictEqual(report.overallScore, 0);
  assert.strictEqual(report.grade, 'UNAVAILABLE');
});

it('Quality engine weights sum to exactly 1.0 (100%)', () => {
  const report = dataQualityEngine.evaluateCompanyQuality('AAPL', []);
  const sumWeights = Object.values(report.dimensions).reduce((sum, d) => sum + d.weight, 0);
  assert.ok(Math.abs(sumWeights - 1.0) < 0.0001);
});

// 2. Source Quality Dimension
it('Tier 1 Regulatory primary facts give 100% source quality', () => {
  const facts = [
    { metric: 'REVENUE', sourceTier: SourceTier.TIER_1_PRIMARY, value: 100, isCurrent: true, filingDate: new Date().toISOString() }
  ];
  const report = dataQualityEngine.evaluateCompanyQuality('AAPL', facts);
  assert.strictEqual(report.dimensions[QualityDimension.SOURCE_QUALITY].score, 100);
});

it('Tier 2 Regulated Exchange facts yield 80% source quality', () => {
  const facts = [
    { metric: 'REVENUE', sourceTier: SourceTier.TIER_2_REGULATED, value: 100, isCurrent: true, filingDate: new Date().toISOString() }
  ];
  const report = dataQualityEngine.evaluateCompanyQuality('AAPL', facts);
  assert.strictEqual(report.dimensions[QualityDimension.SOURCE_QUALITY].score, 80);
});

it('Tier 3 Vendor Aggregator facts yield 50% source quality', () => {
  const facts = [
    { metric: 'REVENUE', sourceTier: SourceTier.TIER_3_SECONDARY, value: 100, isCurrent: true, filingDate: new Date().toISOString() }
  ];
  const report = dataQualityEngine.evaluateCompanyQuality('AAPL', facts);
  assert.strictEqual(report.dimensions[QualityDimension.SOURCE_QUALITY].score, 50);
});

it('Mixed tier facts average source quality score proportionally', () => {
  const facts = [
    { metric: 'REVENUE', sourceTier: SourceTier.TIER_1_PRIMARY, value: 100, isCurrent: true, filingDate: new Date().toISOString() },
    { metric: 'NET_INCOME', sourceTier: SourceTier.TIER_3_SECONDARY, value: 50, isCurrent: true, filingDate: new Date().toISOString() }
  ];
  const report = dataQualityEngine.evaluateCompanyQuality('AAPL', facts);
  assert.strictEqual(report.dimensions[QualityDimension.SOURCE_QUALITY].score, 75); // (100 + 50) / 2
});

// 3. Provenance Completeness Dimension
it('Provenance score is 100% when all facts have docId, evidenceId, and 64-char sha256 hash', () => {
  const facts = [
    {
      metric: 'REVENUE',
      sourceTier: SourceTier.TIER_1_PRIMARY,
      sourceDocumentId: 'DOC-1',
      evidenceId: 'EVID-1',
      hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    }
  ];
  const report = dataQualityEngine.evaluateCompanyQuality('AAPL', facts);
  assert.strictEqual(report.dimensions[QualityDimension.PROVENANCE_COMPLETENESS].score, 100);
});

it('Provenance score penalizes missing evidence or invalid hash length', () => {
  const facts = [
    { metric: 'REVENUE', sourceTier: SourceTier.TIER_1_PRIMARY, sourceDocumentId: 'DOC-1', evidenceId: 'EVID-1', hash: 'badhash' },
    { metric: 'NET_INCOME', sourceTier: SourceTier.TIER_1_PRIMARY, sourceDocumentId: 'DOC-2', evidenceId: 'EVID-2', hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' }
  ];
  const report = dataQualityEngine.evaluateCompanyQuality('AAPL', facts);
  assert.strictEqual(report.dimensions[QualityDimension.PROVENANCE_COMPLETENESS].score, 50);
});

// 4. Accounting Consistency Impact on Quality
it('Accounting consistency penalty applies when identities conflict', () => {
  const facts = [
    { metric: 'CFO', value: 1000, sourceTier: SourceTier.TIER_1_PRIMARY },
    { metric: 'CAPEX', value: 200, sourceTier: SourceTier.TIER_1_PRIMARY },
    { metric: 'FCF', value: 100, sourceTier: SourceTier.TIER_1_PRIMARY } // Conflict (expected 800)
  ];
  const report = dataQualityEngine.evaluateCompanyQuality('AAPL', facts);
  assert.strictEqual(report.dimensions[QualityDimension.ACCOUNTING_CONSISTENCY].score, 60); // 100 - 40
});

it('Accounting consistency score is 100% when identities match', () => {
  const facts = [
    { metric: 'CFO', value: 1000, sourceTier: SourceTier.TIER_1_PRIMARY },
    { metric: 'CAPEX', value: 200, sourceTier: SourceTier.TIER_1_PRIMARY },
    { metric: 'FCF', value: 800, sourceTier: SourceTier.TIER_1_PRIMARY },
    { metric: 'TOTAL_DEBT', value: 500, sourceTier: SourceTier.TIER_1_PRIMARY },
    { metric: 'CASH', value: 200, sourceTier: SourceTier.TIER_1_PRIMARY },
    { metric: 'NET_DEBT', value: 300, sourceTier: SourceTier.TIER_1_PRIMARY }
  ];
  const report = dataQualityEngine.evaluateCompanyQuality('AAPL', facts);
  assert.strictEqual(report.dimensions[QualityDimension.ACCOUNTING_CONSISTENCY].score, 100);
});

// 5. Freshness Dimension
it('Freshness dimension penalizes stale records (> 400 days old)', () => {
  const facts = [
    { metric: 'REVENUE', filingDate: '2020-01-01', isCurrent: true },
    { metric: 'NET_INCOME', filingDate: new Date().toISOString().split('T')[0], isCurrent: true }
  ];
  const report = dataQualityEngine.evaluateCompanyQuality('AAPL', facts);
  assert.strictEqual(report.dimensions[QualityDimension.FRESHNESS].score, 50);
});

// 6. Grade Thresholds
it('Grade is INSTITUTIONAL_PRIME for scores >= 85', () => {
  const metricValues = {
    REVENUE: 1000, GROSS_PROFIT: 600, OPERATING_INCOME: 300, NET_INCOME: 200, EBITDA: 400,
    CFO: 300, CAPEX: 50, FCF: 250, CASH: 500, TOTAL_DEBT: 400, NET_DEBT: -100,
    DILUTED_SHARES: 100, DILUTED_EPS: 2.0, BOOK_VALUE: 800, DIVIDENDS: 50
  };

  const perfectFacts = Object.entries(metricValues).map(([m, val]) => ({
    metric: m,
    value: val,
    sourceTier: SourceTier.TIER_1_PRIMARY,
    sourceDocumentId: `DOC-${m}`,
    evidenceId: `EVID-${m}`,
    hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    isCurrent: true,
    filingDate: new Date().toISOString().split('T')[0]
  }));

  const report = dataQualityEngine.evaluateCompanyQuality('AAPL', perfectFacts);
  assert.strictEqual(report.grade, 'INSTITUTIONAL_PRIME');
  assert.ok(report.overallScore >= 85);
});

it('Grade is DEGRADED for overall scores < 70', () => {
  const poorFacts = [
    { metric: 'REVENUE', sourceTier: 'TIER_4_UNREGULATED', value: 100, filingDate: '2019-01-01', isCurrent: true }
  ];
  const report = dataQualityEngine.evaluateCompanyQuality('DEGRADED_CO', poorFacts);
  assert.strictEqual(report.grade, 'DEGRADED');
  assert.ok(report.overallScore < 70);
});

// 7. Robustness & Multi-Asset Verification
it('Quality engine handles null ticker safely', () => {
  const report = dataQualityEngine.evaluateCompanyQuality(null, []);
  assert.strictEqual(report.ticker, undefined);
  assert.strictEqual(report.overallScore, 0);
});

it('Quality engine handles undefined facts array safely', () => {
  const report = dataQualityEngine.evaluateCompanyQuality('AAPL', undefined);
  assert.strictEqual(report.overallScore, 0);
});

it('Quality engine attaches calculatedAt ISO string', () => {
  const report = dataQualityEngine.evaluateCompanyQuality('AAPL', []);
  assert.ok(report.calculatedAt);
  assert.ok(new Date(report.calculatedAt).getTime() > 0);
});

it('Quality engine provides detailed dimensional explanations', () => {
  const report = dataQualityEngine.evaluateCompanyQuality('AAPL', []);
  for (const dim of Object.values(report.dimensions)) {
    assert.ok(typeof dim.detail === 'string');
    assert.ok(dim.detail.length > 0);
  }
});

it('Quality engine processes AAPL golden package with high composite score', () => {
  const aaplFacts = [
    { metric: 'REVENUE', value: 391035000000, sourceTier: SourceTier.TIER_1_PRIMARY, sourceDocumentId: 'DOC-1', evidenceId: 'EVID-1', hash: 'a'.repeat(64), filingDate: new Date().toISOString() },
    { metric: 'NET_INCOME', value: 93736000000, sourceTier: SourceTier.TIER_1_PRIMARY, sourceDocumentId: 'DOC-2', evidenceId: 'EVID-2', hash: 'a'.repeat(64), filingDate: new Date().toISOString() },
    { metric: 'CFO', value: 118264000000, sourceTier: SourceTier.TIER_1_PRIMARY, sourceDocumentId: 'DOC-3', evidenceId: 'EVID-3', hash: 'a'.repeat(64), filingDate: new Date().toISOString() },
    { metric: 'CAPEX', value: 9450000000, sourceTier: SourceTier.TIER_1_PRIMARY, sourceDocumentId: 'DOC-4', evidenceId: 'EVID-4', hash: 'a'.repeat(64), filingDate: new Date().toISOString() },
    { metric: 'FCF', value: 108814000000, sourceTier: SourceTier.TIER_1_PRIMARY, sourceDocumentId: 'DOC-5', evidenceId: 'EVID-5', hash: 'a'.repeat(64), filingDate: new Date().toISOString() },
    { metric: 'TOTAL_DEBT', value: 106629000000, sourceTier: SourceTier.TIER_1_PRIMARY, sourceDocumentId: 'DOC-6', evidenceId: 'EVID-6', hash: 'a'.repeat(64), filingDate: new Date().toISOString() },
    { metric: 'CASH', value: 29943000000, sourceTier: SourceTier.TIER_1_PRIMARY, sourceDocumentId: 'DOC-7', evidenceId: 'EVID-7', hash: 'a'.repeat(64), filingDate: new Date().toISOString() },
    { metric: 'NET_DEBT', value: 76686000000, sourceTier: SourceTier.TIER_1_PRIMARY, sourceDocumentId: 'DOC-8', evidenceId: 'EVID-8', hash: 'a'.repeat(64), filingDate: new Date().toISOString() }
  ];
  const report = dataQualityEngine.evaluateCompanyQuality('AAPL', aaplFacts);
  assert.ok(report.overallScore > 75);
  assert.strictEqual(report.dimensions[QualityDimension.SOURCE_QUALITY].score, 100);
});

it('Quality engine processes JPM banking metrics correctly', () => {
  const jpmFacts = [
    { metric: 'REVENUE', value: 158104000000, sourceTier: SourceTier.TIER_1_PRIMARY, sourceDocumentId: 'DOC-1', evidenceId: 'EVID-1', hash: 'b'.repeat(64), filingDate: new Date().toISOString() },
    { metric: 'NET_INCOME', value: 49552000000, sourceTier: SourceTier.TIER_1_PRIMARY, sourceDocumentId: 'DOC-2', evidenceId: 'EVID-2', hash: 'b'.repeat(64), filingDate: new Date().toISOString() }
  ];
  const report = dataQualityEngine.evaluateCompanyQuality('JPM', jpmFacts);
  assert.strictEqual(report.ticker, 'JPM');
  assert.strictEqual(report.dimensions[QualityDimension.SOURCE_QUALITY].score, 100);
});

it('Quality engine processes RELIANCE.NS NSE facts correctly', () => {
  const relFacts = [
    { metric: 'REVENUE', value: 9000000000000, sourceTier: SourceTier.TIER_2_REGULATED, sourceDocumentId: 'DOC-NSE-1', evidenceId: 'EVID-NSE-1', hash: 'c'.repeat(64), filingDate: new Date().toISOString() }
  ];
  const report = dataQualityEngine.evaluateCompanyQuality('RELIANCE.NS', relFacts);
  assert.strictEqual(report.dimensions[QualityDimension.SOURCE_QUALITY].score, 80);
});

it('Quality engine processes TMPV.NS facts correctly', () => {
  const tmpvFacts = [
    { metric: 'REVENUE', value: 4300000000000, sourceTier: SourceTier.TIER_2_REGULATED, sourceDocumentId: 'DOC-TMPV-1', evidenceId: 'EVID-TMPV-1', hash: 'd'.repeat(64), filingDate: new Date().toISOString() }
  ];
  const report = dataQualityEngine.evaluateCompanyQuality('TMPV.NS', tmpvFacts);
  assert.strictEqual(report.dimensions[QualityDimension.SOURCE_QUALITY].score, 80);
});

it('Quality engine processes TSM 20-F facts correctly', () => {
  const tsmFacts = [
    { metric: 'REVENUE', value: 2890000000000, sourceTier: SourceTier.TIER_1_PRIMARY, sourceDocumentId: 'DOC-TSM-1', evidenceId: 'EVID-TSM-1', hash: 'e'.repeat(64), filingDate: new Date().toISOString() }
  ];
  const report = dataQualityEngine.evaluateCompanyQuality('TSM', tsmFacts);
  assert.strictEqual(report.dimensions[QualityDimension.SOURCE_QUALITY].score, 100);
});

it('Period integrity dimension penalizes period type mismatches within company facts', () => {
  const facts = [
    { metric: 'REVENUE', periodType: 'FY', fiscalYear: 2024 },
    { metric: 'REVENUE', periodType: 'Q1', fiscalYear: 2024 }
  ];
  const report = dataQualityEngine.evaluateCompanyQuality('AAPL', facts);
  assert.ok(report.dimensions[QualityDimension.PERIOD_INTEGRITY].score <= 80);
});

it('Conflict rate dimension maintains 100% on reconciled active truth', () => {
  const facts = [
    { metric: 'REVENUE', value: 100, sourceTier: SourceTier.TIER_1_PRIMARY }
  ];
  const report = dataQualityEngine.evaluateCompanyQuality('AAPL', facts);
  assert.strictEqual(report.dimensions[QualityDimension.CONFLICT_RATE].score, 100);
});

it('Quality scorecard includes nested consistency report', () => {
  const facts = [
    { metric: 'CFO', value: 100 },
    { metric: 'CAPEX', value: 20 },
    { metric: 'FCF', value: 80 }
  ];
  const report = dataQualityEngine.evaluateCompanyQuality('AAPL', facts);
  assert.ok(report.consistencyReport);
  assert.strictEqual(report.consistencyReport.passedChecks, 1);
});

it('Quality score handles zero-division metric coverage safely', () => {
  const report = dataQualityEngine.evaluateCompanyQuality('AAPL', []);
  assert.strictEqual(report.dimensions[QualityDimension.COVERAGE].score, 0);
});

it('Quality engine output structure is immutable and deterministic', () => {
  const facts = [{ metric: 'REVENUE', value: 100 }];
  const rep1 = dataQualityEngine.evaluateCompanyQuality('AAPL', facts);
  const rep2 = dataQualityEngine.evaluateCompanyQuality('AAPL', facts);
  assert.strictEqual(rep1.overallScore, rep2.overallScore);
  assert.strictEqual(rep1.grade, rep2.grade);
});

it('Quality scores are strictly clamped between 0 and 100', () => {
  const severeFacts = [
    { metric: 'CFO', value: 1000 },
    { metric: 'CAPEX', value: 200 },
    { metric: 'FCF', value: -999999 } // severe conflict
  ];
  const report = dataQualityEngine.evaluateCompanyQuality('AAPL', severeFacts);
  assert.ok(report.overallScore >= 0 && report.overallScore <= 100);
  for (const dim of Object.values(report.dimensions)) {
    assert.ok(dim.score >= 0 && dim.score <= 100);
  }
});

it('Quality scorecard attaches full dimension weights and details', () => {
  const report = dataQualityEngine.evaluateCompanyQuality('AAPL', [{ metric: 'REVENUE', value: 100 }]);
  assert.strictEqual(Object.keys(report.dimensions).length, 7);
  assert.strictEqual(report.dimensions[QualityDimension.SOURCE_QUALITY].weight, 0.20);
  assert.strictEqual(report.dimensions[QualityDimension.COVERAGE].weight, 0.20);
});

console.log(`\n================================================================`);
console.log(`PHASE 11 DATA QUALITY AUDIT COMPLETE: ${passed} PASSED`);
console.log(`================================================================\n`);
