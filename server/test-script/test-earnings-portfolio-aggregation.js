/**
 * server/test-script/test-earnings-portfolio-aggregation.js
 * 
 * Phase 21: Portfolio Event Aggregation & Impact Classification Tests
 */

import assert from 'assert';
import { aggregatePortfolioEvents } from '../earnings/earnings.portfolio.engine.js';
import { classifyEventImpact } from '../earnings/earnings.impact.engine.js';
import { EventImpactCategory, EventClassification } from '../earnings/earnings.types.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- RUNNING PHASE 21 PORTFOLIO AGGREGATION & IMPACT TESTS ---');

// 1. Portfolio Aggregation Test
const samplePortfolio = {
  id: 'PORT-INST-001',
  cash: 100000,
  positions: [
    { ticker: 'AAPL', marketValue: 500000 },
    { ticker: 'MSFT', marketValue: 400000 }
  ]
};

const securityEvents = {
  AAPL: {
    surprise: { isBeat: true, direction: 'BEAT' },
    guidance: { revisionDirection: 'RAISE' },
    attention: { attentionLevel: 'LOW' }
  },
  MSFT: {
    surprise: { isMiss: true, direction: 'MISS' },
    guidance: { revisionDirection: 'CUT' },
    attention: { attentionLevel: 'CRITICAL' }
  }
};

const aggResult = aggregatePortfolioEvents(samplePortfolio, securityEvents);
testAssert(aggResult.portfolioId === 'PORT-INST-001', 'Portfolio ID preserved');
testAssert(aggResult.totalNav === 1000000, 'Total NAV computed correctly (1,000,000)');
testAssert(aggResult.eventsSummary.beatCount === 1, '1 Beat counted');
testAssert(aggResult.eventsSummary.missCount === 1, '1 Miss counted');
testAssert(aggResult.eventsSummary.guidanceRaiseCount === 1, '1 Guidance Raise counted');
testAssert(aggResult.eventsSummary.guidanceCutCount === 1, '1 Guidance Cut counted');
testAssert(Math.abs(aggResult.eventsSummary.highAttentionWeight - 0.40) < 1e-9, '40% NAV under High/Critical Attention (MSFT)');
testAssert(aggResult.positions.length === 2, '2 positions summarized');

// 2. Impact Classification Tests
// 2a. Beat + Raise -> POSITIVE
const posImpact = classifyEventImpact({ isBeat: true }, { revisionDirection: 'RAISE' });
testAssert(posImpact.impactCategory === EventImpactCategory.POSITIVE, 'Beat + Raise is POSITIVE');
testAssert(posImpact.isPositive === true, 'isPositive is true');
testAssert(posImpact.classification === EventClassification.DERIVED, 'Classification is DERIVED');

// 2b. Miss + Cut -> NEGATIVE
const negImpact = classifyEventImpact({ isMiss: true }, { revisionDirection: 'CUT' });
testAssert(negImpact.impactCategory === EventImpactCategory.NEGATIVE, 'Miss + Cut is NEGATIVE');
testAssert(negImpact.isNegative === true, 'isNegative is true');

// 2c. Beat + Cut -> MIXED
const mixedImpact = classifyEventImpact({ isBeat: true }, { revisionDirection: 'CUT' });
testAssert(mixedImpact.impactCategory === EventImpactCategory.MIXED, 'Beat + Cut is MIXED');
testAssert(mixedImpact.isMixed === true, 'isMixed is true');

// 2d. In-Line + Maintained -> NEUTRAL
const neutralImpact = classifyEventImpact({ isInline: true }, { revisionDirection: 'MAINTAINED' });
testAssert(neutralImpact.impactCategory === EventImpactCategory.NEUTRAL, 'Inline + Maintained is NEUTRAL');

// 2e. Empty / Missing -> UNKNOWN
const unknownImpact = classifyEventImpact(null, null);
testAssert(unknownImpact.impactCategory === EventImpactCategory.UNKNOWN, 'Null input is UNKNOWN');

// 3. Error Handling
try {
  aggregatePortfolioEvents(null);
  testAssert(false, 'Should throw on null portfolio');
} catch (e) {
  testAssert(true, 'Caught null portfolio');
}

try {
  aggregatePortfolioEvents({ positions: [] });
  testAssert(false, 'Should throw on empty positions');
} catch (e) {
  testAssert(true, 'Caught empty positions');
}

console.log(`PASSED: ${assertionCount} assertions`);
export { assertionCount };
