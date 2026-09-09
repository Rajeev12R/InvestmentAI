/**
 * test-macro-series-registry.js
 * Suite 2: Macro Series Registry & Catalog Tests
 */

import assert from 'assert';
import { MacroSeriesRegistry, MacroSeriesCatalog } from '../macro/macro.series.registry.js';
import { MacroEnums } from '../macro/macro.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 2: Macro Series Registry Tests ---');

// 1. Catalog Coverage
testAssert(Object.keys(MacroSeriesCatalog).length >= 10, 'Catalog contains core series');
testAssert(MacroSeriesCatalog.US_CPI_YOY !== undefined, 'US_CPI_YOY registered');
testAssert(MacroSeriesCatalog.US_FED_FUNDS_TARGET_UPPER !== undefined, 'US_FED_FUNDS registered');
testAssert(MacroSeriesCatalog.US_10Y_YIELD !== undefined, 'US_10Y_YIELD registered');
testAssert(MacroSeriesCatalog.US_2Y_YIELD !== undefined, 'US_2Y_YIELD registered');

// 2. Registry Lookup
const cpiMeta = MacroSeriesRegistry.getSeries('US_CPI_YOY');
testAssert(cpiMeta !== null, 'Found US_CPI_YOY in registry');
testAssert(cpiMeta.category === MacroEnums.MacroCategory.INFLATION, 'Category is INFLATION');
testAssert(cpiMeta.unit === '%' || cpiMeta.unit === 'PERCENT', 'Unit is PERCENT / %');

// 3. Category queries
const rateSeries = MacroSeriesRegistry.getSeriesByCategory(MacroEnums.MacroCategory.RATES);
testAssert(rateSeries.length >= 2, 'Rates category returns multiple series');

// 4. Unknown Series Lookup
testAssert(MacroSeriesRegistry.getSeries('NON_EXISTENT_SERIES') === null, 'Non-existent series returns null');

console.log(`[PASS] Suite 2 Macro Series Registry passed: ${assertionCount} assertions`);
export default { assertionCount };
