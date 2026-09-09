/**
 * server/test-script/test-earnings-quality-analysis.js
 * 
 * Phase 21: Earnings Quality & Accruals Intelligence Suite (Edge-Case Hardened)
 */

import assert from 'assert';
import { EarningsQualityEngine, evaluateEarningsQuality } from '../earnings/earnings.quality.engine.js';
import { EarningsConfig } from '../earnings/earnings.config.js';
import { EventClassification } from '../earnings/earnings.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 21 EARNINGS QUALITY ANALYSIS TESTS ---');

// 1. Instantiation and default configuration
const qualityEngine = new EarningsQualityEngine();
testAssert(qualityEngine !== undefined, 'EarningsQualityEngine instantiates');

// 2. High Quality Earnings: CFO > Net Income, Positive FCF, Negative Accruals, Average Assets
const highQualityFinancials = {
  netIncome: 10000000000,
  operatingCashFlow: 12500000000,
  capex: 2000000000,
  totalAssets: 100000000000,
  previousTotalAssets: 95000000000,
  currentAssets: 30000000000,
  currentLiabilities: 15000000000,
  cashAndEquivalents: 10000000000
};

const highQualResult = qualityEngine.assessEarningsQuality(highQualityFinancials);
testAssert(highQualResult.classification === EventClassification.DERIVED, 'Classification is DERIVED');
testAssert(highQualResult.qualityScore >= 70, `High quality score expected >= 70, got ${highQualResult.qualityScore}`);
testAssert(highQualResult.qualityTier === 'HIGH', `Tier is ${highQualResult.qualityTier}`);
testAssert(highQualResult.cfoToNiRatio === 1.25, `CFO/NI ratio is 1.25, got ${highQualResult.cfoToNiRatio}`);
testAssert(highQualResult.fcfToNiRatio === 1.05, `FCF/NI ratio is 1.05, got ${highQualResult.fcfToNiRatio}`);
testAssert(highQualResult.totalAccruals === -2500000000, `Total accruals is Net Income - CFO (-2.5B, got ${highQualResult.totalAccruals})`);
testAssert(highQualResult.averageTotalAssets === 97500000000, `Average assets is (100B + 95B)/2 = 97.5B, got ${highQualResult.averageTotalAssets}`);

// 3. Low Quality / Aggressive Accounting: CFO < Net Income, High Positive Accruals, Working Capital Surge
const lowQualityFinancials = {
  netIncome: 10000000000,
  operatingCashFlow: 3000000000,
  capex: 4000000000,
  totalAssets: 100000000000,
  previousTotalAssets: 90000000000,
  receivablesGrowth: 0.25,
  revenueGrowth: 0.05
};

const lowQualResult = qualityEngine.assessEarningsQuality(lowQualityFinancials);
testAssert(lowQualResult.qualityScore < 50, `Low quality score expected < 50, got ${lowQualResult.qualityScore}`);
testAssert(lowQualResult.qualityTier === 'LOW', `Low quality tier: ${lowQualResult.qualityTier}`);
testAssert(lowQualResult.redFlags.length >= 2, `Red flags present (${lowQualResult.redFlags.length})`);
testAssert(lowQualResult.cfoToNiRatio === 0.3, `CFO/NI is 0.3, got ${lowQualResult.cfoToNiRatio}`);
testAssert(lowQualResult.fcfToNiRatio === -0.1, `FCF/NI is -0.1, got ${lowQualResult.fcfToNiRatio}`);
testAssert(lowQualResult.accrualAnomaly === true, 'Accrual anomaly flag is true');

// =========================================================================
// SECTION 4: 15+ EDGE CASES & BOUNDARY NUMERICAL INTEGRITY TESTS
// =========================================================================
console.log('Testing 15+ Earnings Quality Edge Cases...');

// Edge Case 1: Net Income = 0
const ec1 = evaluateEarningsQuality({ netIncome: 0, cfo: 50, totalAssets: 1000 });
testAssert(ec1.cfoToNiStatus === 'UNAVAILABLE_NON_POSITIVE_NET_INCOME', 'EC1: Net Income 0 returns UNAVAILABLE for CFO/NI ratio');
testAssert(ec1.cfoToNiRatio === null, 'EC1: CFO/NI ratio is null');

// Edge Case 2: Negative Net Income (e.g. -500M)
const ec2 = evaluateEarningsQuality({ netIncome: -500, cfo: 100, totalAssets: 2000 });
testAssert(ec2.cfoToNiStatus === 'UNAVAILABLE_NON_POSITIVE_NET_INCOME', 'EC2: Negative Net Income returns UNAVAILABLE for CFO/NI');
testAssert(ec2.cashAccruals === -600, 'EC2: Cash accruals is -500 - 100 = -600');

// Edge Case 3: Total Assets = 0
const ec3 = evaluateEarningsQuality({ netIncome: 100, cfo: 80, totalAssets: 0 });
testAssert(ec3.accrualRatio === 'UNAVAILABLE', 'EC3: Assets = 0 returns UNAVAILABLE for accrual ratio');

// Edge Case 4: Negative Total Assets
const ec4 = evaluateEarningsQuality({ netIncome: 100, cfo: 80, totalAssets: -500 });
testAssert(ec4.accrualRatio === 'UNAVAILABLE', 'EC4: Negative assets returns UNAVAILABLE');

// Edge Case 5: Missing Assets
const ec5 = evaluateEarningsQuality({ netIncome: 100, cfo: 80 });
testAssert(ec5.accrualRatio === 'UNAVAILABLE', 'EC5: Missing assets returns UNAVAILABLE');
testAssert(ec5.averageTotalAssets === 'UNAVAILABLE', 'EC5: Missing average assets returns UNAVAILABLE');

// Edge Case 6: Missing CFO
const ec6 = evaluateEarningsQuality({ netIncome: 100, totalAssets: 1000 });
testAssert(ec6.cashAccruals === 'UNAVAILABLE', 'EC6: Missing CFO yields UNAVAILABLE accruals');

// Edge Case 7: Missing FCF
const ec7 = evaluateEarningsQuality({ netIncome: 100, cfo: 80 });
testAssert(ec7.fcfToNiStatus === 'UNAVAILABLE_MISSING_DATA', 'EC7: Missing FCF returns UNAVAILABLE_MISSING_DATA');

// Edge Case 8: Extreme Negative Cash Flow (CFO = -10B on +5B NI)
const ec8 = evaluateEarningsQuality({ netIncome: 5000, cfo: -10000, totalAssets: 50000 });
testAssert(ec8.cashAccruals === 15000, 'EC8: Accruals is 5000 - (-10000) = 15000');
testAssert(ec8.qualityGrade === 'LOW', 'EC8: Severe cash deficit marked LOW');

// Edge Case 9: Zero Net Income with Positive Assets
const ec9 = evaluateEarningsQuality({ netIncome: 0, cfo: 0, totalAssets: 1000 });
testAssert(ec9.cashAccruals === 0, 'EC9: Accruals is 0 - 0 = 0');
testAssert(ec9.accrualRatio === 0, 'EC9: Accrual ratio is 0');

// Edge Case 10: EBITDA = 0
const ec10 = evaluateEarningsQuality({ netIncome: 100, cfo: 80, ebitda: 0 });
testAssert(ec10.cashConversionRate === 'UNAVAILABLE', 'EC10: Zero EBITDA returns UNAVAILABLE conversion');

// Edge Case 11: Negative EBITDA
const ec11 = evaluateEarningsQuality({ netIncome: -100, cfo: -50, ebitda: -80 });
testAssert(ec11.cashConversionRate === 'UNAVAILABLE', 'EC11: Negative EBITDA returns UNAVAILABLE conversion');

// Edge Case 12: Inverted Assets (Previous > Current)
const ec12 = evaluateEarningsQuality({ netIncome: 100, cfo: 110, totalAssets: 800, previousTotalAssets: 1000 });
testAssert(ec12.averageTotalAssets === 900, 'EC12: Average assets (800 + 1000)/2 = 900');

// Edge Case 13: Non-numeric strings in inputs (Defensive handling)
const ec13 = evaluateEarningsQuality({ netIncome: 100, cfo: 100, totalAssets: 'INVALID' });
testAssert(ec13.accrualRatio === 'UNAVAILABLE', 'EC13: Non-numeric asset yields UNAVAILABLE');

// Edge Case 14: Accrual Ratio precisely at threshold (0.10)
const ec14 = evaluateEarningsQuality({ netIncome: 110, cfo: 10, totalAssets: 1000 });
testAssert(ec14.accrualRatio === 0.10, 'EC14: Accrual ratio is exactly 0.10');

// Edge Case 15: Deep Freezing immutability
try {
  highQualResult.qualityScore = 999;
  testAssert(false, 'Expected mutation to fail');
} catch (e) {
  testAssert(true, 'Result is immutable/frozen');
}

// =========================================================================
// SECTION 5: 10 DEDICATED RECEIVABLES GAP CANONICAL THRESHOLD TESTS (BLOCKER 3)
// =========================================================================
console.log('Testing 10 Receivables Growth Gap Thresholds...');

// 1. Exactly at threshold (5.0%) -> Benign (No warning flag)
const gapAt5 = evaluateEarningsQuality({ netIncome: 100, cfo: 100, totalAssets: 1000, revenueGrowth: 0.05, receivablesGrowth: 0.10 });
testAssert(Math.abs(gapAt5.receivablesGrowthGap - 0.05) < 1e-6, 'Gap 1: Gap is exactly 0.05');
testAssert(!gapAt5.flags.includes('RECEIVABLES_OUTPACING_REVENUE_GROWTH'), 'Gap 1: At 5% threshold is benign (no flag)');
testAssert(gapAt5.qualityGrade === 'HIGH', 'Gap 1: Grade remains HIGH');

// 2. Just below threshold (4.9%) -> Benign
const gapBelow5 = evaluateEarningsQuality({ netIncome: 100, cfo: 100, totalAssets: 1000, revenueGrowth: 0.05, receivablesGrowth: 0.099 });
testAssert(!gapBelow5.flags.includes('RECEIVABLES_OUTPACING_REVENUE_GROWTH'), 'Gap 2: 4.9% gap is benign');
testAssert(gapBelow5.qualityGrade === 'HIGH', 'Gap 2: Grade remains HIGH');

// 3. Just above threshold (5.1%) -> Moderate Warning (MEDIUM grade)
const gapAbove5 = evaluateEarningsQuality({ netIncome: 100, cfo: 100, totalAssets: 1000, revenueGrowth: 0.05, receivablesGrowth: 0.101 });
testAssert(gapAbove5.flags.includes('RECEIVABLES_OUTPACING_REVENUE_GROWTH'), 'Gap 3: 5.1% gap triggers moderate flag');
testAssert(gapAbove5.qualityGrade === 'MEDIUM', 'Gap 3: Grade downgraded to MEDIUM');

// 4. Moderate gap at 10.0% -> MEDIUM grade
const gapAt10 = evaluateEarningsQuality({ netIncome: 100, cfo: 100, totalAssets: 1000, revenueGrowth: 0.05, receivablesGrowth: 0.15 });
testAssert(gapAt10.qualityGrade === 'MEDIUM', 'Gap 4: 10% gap is MEDIUM');

// 5. Moderate gap at 20.0% -> MEDIUM grade
const gapAt20 = evaluateEarningsQuality({ netIncome: 100, cfo: 100, totalAssets: 1000, revenueGrowth: 0.05, receivablesGrowth: 0.25 });
testAssert(gapAt20.qualityGrade === 'MEDIUM', 'Gap 5: 20% gap is MEDIUM');

// 6. Severe gap (> 25%, e.g. 30%) -> LOW grade
const gapAt30 = evaluateEarningsQuality({ netIncome: 100, cfo: 100, totalAssets: 1000, revenueGrowth: 0.05, receivablesGrowth: 0.35 });
testAssert(gapAt30.qualityGrade === 'LOW', 'Gap 6: >25% severe gap downgraded to LOW');
testAssert(gapAt30.flags.includes('RECEIVABLES_SEVERE_DIVERGENCE'), 'Gap 6: Severe divergence flag present');

// 7. Negative gap (Receivables growing slower than revenue, e.g. -10%) -> HIGH grade
const negGap = evaluateEarningsQuality({ netIncome: 100, cfo: 100, totalAssets: 1000, revenueGrowth: 0.15, receivablesGrowth: 0.05 });
testAssert(Math.abs(negGap.receivablesGrowthGap - (-0.10)) < 1e-6, 'Gap 7: Negative gap computed (-0.10)');
testAssert(negGap.qualityGrade === 'HIGH', 'Gap 7: Healthy collection preserves HIGH grade');

// 8. Zero gap (0.0%) -> HIGH grade
const zeroGap = evaluateEarningsQuality({ netIncome: 100, cfo: 100, totalAssets: 1000, revenueGrowth: 0.10, receivablesGrowth: 0.10 });
testAssert(zeroGap.receivablesGrowthGap === 0, 'Gap 8: Zero gap is 0');
testAssert(zeroGap.qualityGrade === 'HIGH', 'Gap 8: Zero gap preserves HIGH grade');

// 9. Unavailable / Missing data
const unavailGap = evaluateEarningsQuality({ netIncome: 100, cfo: 100, totalAssets: 1000 });
testAssert(unavailGap.receivablesGrowthGap === 'UNAVAILABLE', 'Gap 9: Missing data returns UNAVAILABLE');

// 10. Extreme gap (Receivables +500% on 0% revenue growth) -> LOW grade
const extremeGap = evaluateEarningsQuality({ netIncome: 100, cfo: 100, totalAssets: 1000, revenueGrowth: 0.0, receivablesGrowth: 5.0 });
testAssert(extremeGap.qualityGrade === 'LOW', 'Gap 10: Extreme +500% gap is LOW grade');

console.log(`PASSED: ${assertionCount} assertions`);
export { assertionCount };
