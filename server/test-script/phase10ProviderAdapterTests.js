/**
 * @file phase10ProviderAdapterTests.js
 * Comprehensive Unit & Integration Tests for Phase 10 Provider Adapters.
 */

import assert from 'assert';
import { marketDataAdapter } from '../connectivity/adapters/marketData.adapter.js';
import { fundamentalDataAdapter } from '../connectivity/adapters/fundamentalData.adapter.js';
import { filingAdapter } from '../connectivity/adapters/filing.adapter.js';
import { corporateActionAdapter } from '../connectivity/adapters/corporateAction.adapter.js';
import { fxAdapter } from '../connectivity/adapters/fx.adapter.js';
import { macroDataAdapter } from '../connectivity/adapters/macroData.adapter.js';
import { newsAdapter } from '../connectivity/adapters/news.adapter.js';
import { marketStreamAdapter } from '../connectivity/adapters/marketStream.adapter.js';
import { FreshnessClassification, DocumentType, CorporateActionType } from '../connectivity/source.types.js';

console.log('================================================================');
console.log('INVESTMENTAI — PHASE 10 PROVIDER ADAPTERS TEST SUITE');
console.log('================================================================\n');

let passCount = 0;
function check(cond, msg) {
  assert.ok(cond, msg);
  passCount++;
}
function checkEqual(actual, expected, msg) {
  assert.strictEqual(actual, expected, msg);
  passCount++;
}

async function runTests() {
  console.log('▶ Testing Market Data Adapter (Quotes & Historical Bars)...');
  const aaplQuote = await marketDataAdapter.getQuote('AAPL');
  checkEqual(aaplQuote.ticker, 'AAPL', 'AAPL quote ticker normalized');
  checkEqual(aaplQuote.currency, 'USD', 'AAPL quote currency is USD');
  check(aaplQuote.price > 0, 'AAPL quote price is positive number');
  checkEqual(aaplQuote.freshness, FreshnessClassification.REALTIME, 'Freshness classified as REALTIME');
  check(aaplQuote.sourceRecordId.startsWith('REC-QTE-'), 'Source record ID generated with SHA-256');

  const relQuote = await marketDataAdapter.getQuote('RELIANCE.NS');
  checkEqual(relQuote.currency, 'INR', 'Reliance quote currency is INR');
  checkEqual(relQuote.exchange, 'NSE', 'Reliance exchange is NSE');

  const aaplBars = await marketDataAdapter.getHistoricalPrices('AAPL', { limit: 10 });
  checkEqual(aaplBars.count, 10, 'Returned exact requested number of price bars');
  checkEqual(aaplBars.bars[0].ticker, 'AAPL', 'Bar ticker matches AAPL');
  check(aaplBars.bars[0].adjustedClose > 0, 'Adjusted close present on historical bar');

  console.log('▶ Testing Fundamental Data Adapter & Financial Metrics...');
  const aaplFnd = await fundamentalDataAdapter.getFundamentals('AAPL', { period: 'FY2025' });
  checkEqual(aaplFnd.ticker, 'AAPL', 'AAPL fundamentals ticker normalized');
  checkEqual(aaplFnd.period, 'FY2025', 'Period matches FY2025');
  check(aaplFnd.metrics.revenue > 300000000000, 'AAPL revenue normalized (> $300B)');
  check(aaplFnd.metrics.fcf > 100000000000, 'AAPL FCF normalized (> $100B)');
  check(aaplFnd.contentHash.length === 64, 'Fundamentals payload hashed with SHA-256');

  const relFnd = await fundamentalDataAdapter.getFundamentals('RELIANCE.NS', { period: 'FY2025' });
  checkEqual(relFnd.metrics.currency, 'INR', 'Reliance fundamentals currency is INR');
  check(relFnd.metrics.revenue > 8000000000000, 'Reliance revenue normalized (> ₹8T)');

  console.log('▶ Testing Regulatory Filing Adapter & Document Versioning...');
  const aaplFiling = await filingAdapter.getFilings('AAPL', { documentType: DocumentType.FORM_10K, period: '2025' });
  checkEqual(aaplFiling.document.documentType, DocumentType.FORM_10K, 'Document type is 10-K');
  checkEqual(aaplFiling.latestVersion, 1, 'Initial document version is V1');
  check(aaplFiling.document.contentHash.length === 64, 'Document content hashed with SHA-256');

  // Register amended version (V2)
  const v2Doc = filingAdapter.registerDocumentVersion('AAPL', {
    documentType: DocumentType.FORM_10K,
    period: '2025',
    updatedSummary: 'Amended 10-K/A filing for Apple Inc. with expanded tax disclosures.'
  });
  checkEqual(v2Doc.version, 2, 'New amended version registered as V2');

  const postAmendFilings = await filingAdapter.getFilings('AAPL', { documentType: DocumentType.FORM_10K, period: '2025' });
  checkEqual(postAmendFilings.versionsCount, 2, 'Filing adapter preserves both V1 and V2 versions');

  console.log('▶ Testing Corporate Action Adapter...');
  const aaplActions = await corporateActionAdapter.getCorporateActions('AAPL');
  check(aaplActions.actions.length >= 1, 'AAPL corporate actions retrieved');
  checkEqual(aaplActions.actions[0].type, CorporateActionType.DIVIDEND, 'Dividend corporate action normalized');
  checkEqual(aaplActions.actions[0].currency, 'USD', 'Dividend currency is USD');

  const relActions = await corporateActionAdapter.getCorporateActions('RELIANCE.NS');
  check(relActions.actions.length >= 1, 'Reliance corporate actions retrieved');
  checkEqual(relActions.actions[0].type, CorporateActionType.BONUS, 'Bonus issue corporate action normalized');

  console.log('▶ Testing Foreign Exchange (FX) Conversion Engine...');
  const fxUsdInr = await fxAdapter.getFXRate('USD', 'INR');
  checkEqual(fxUsdInr.base, 'USD', 'FX base is USD');
  checkEqual(fxUsdInr.quote, 'INR', 'FX quote is INR');
  check(fxUsdInr.rate > 80, 'USD/INR exchange rate is realistic (> 80)');
  check(fxUsdInr.formula.includes('convertedValue'), 'FX conversion formula exposed');

  const convertedAmount = fxAdapter.convertAmount(100, 'USD', 'INR', fxUsdInr.rate);
  check(convertedAmount > 8000, 'Converted 100 USD to INR correctly');

  // Identical currency conversion
  const fxIdentical = await fxAdapter.getFXRate('USD', 'USD');
  checkEqual(fxIdentical.rate, 1.0, 'Identical currency conversion rate is exactly 1.0');

  // Unavailable conversion pair
  const fxUnavail = await fxAdapter.getFXRate('USD', 'UNRECOGNIZED_CURRENCY');
  checkEqual(fxUnavail.status, 'UNAVAILABLE', 'Unrecognized currency returns UNAVAILABLE without guessing');

  console.log('▶ Testing Macroeconomic Data Adapter...');
  const treasury10Y = await macroDataAdapter.getMacroSeries('US_10Y_TREASURY');
  checkEqual(treasury10Y.seriesId, 'US_10Y_TREASURY', '10Y Treasury series retrieved');
  check(treasury10Y.value > 0, '10Y Treasury yield is positive');
  checkEqual(treasury10Y.unit, 'PERCENT', 'Yield unit is PERCENT');

  console.log('▶ Testing News Adapter & Deduplication...');
  const newsRes = await newsAdapter.getNews('AAPL');
  check(newsRes.articles.length >= 1, 'News articles retrieved');
  checkEqual(newsRes.articles[0].isAccountingFact, false, 'News articles flagged as non-accounting facts');
  check(newsRes.articles[0].deduplicationKey.length === 64, 'Deduplication key is SHA-256');

  // Second fetch detects deduplicated articles
  const newsRes2 = await newsAdapter.getNews('AAPL');
  checkEqual(newsRes2.articles[0].isDuplicate, true, 'Subsequent fetch flags seen articles as duplicate');

  console.log('▶ Testing Streaming Interface Reporting...');
  const streamStatus = marketStreamAdapter.getStreamStatus();
  checkEqual(streamStatus.isStreamConnected, false, 'Stream status correctly reports isStreamConnected: false');
  checkEqual(streamStatus.activeMode, 'HTTP_POLLING', 'Reports active fallback mode as HTTP_POLLING');

  const subRes = marketStreamAdapter.subscribe('AAPL');
  checkEqual(subRes.status, 'STREAMING_UNAVAILABLE', 'Subscription explicitly reports STREAMING_UNAVAILABLE');

  console.log('\n================================================================');
  console.log(`PHASE 10 PROVIDER ADAPTERS TEST SUITE COMPLETE: ${passCount} ASSERTIONS PASSED`);
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
