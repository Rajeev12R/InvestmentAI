/**
 * test-kg-entity-resolution.js
 * Suite 3: Deterministic Entity Resolution & Corporate Action Identity Tests
 */

import assert from 'assert';
import { defaultEntityResolutionEngine } from '../knowledgeGraph/kg.entityResolution.js';

let assertionCount = 0;
function testAssert(condition, message) {
  assert(condition, message);
  assertionCount++;
}

console.log('--- Running Suite 3: Entity Resolution Tests ---');

// 1. Historical Ticker Rename: FB vs META
const resFB_2020 = defaultEntityResolutionEngine.resolveEntity('FB', '2020-01-01T00:00:00.000Z');
testAssert(resFB_2020.isResolved === true, 'FB resolved in 2020');
testAssert(resFB_2020.canonicalId === 'META_CORP', 'Canonical ID is META_CORP');

const resMETA_2024 = defaultEntityResolutionEngine.resolveEntity('META', '2024-01-01T00:00:00.000Z');
testAssert(resMETA_2024.isResolved === true, 'META resolved in 2024');
testAssert(resMETA_2024.canonicalId === 'META_CORP', 'Canonical ID is META_CORP');

// 2. Dual Share Classes
const resGOOG = defaultEntityResolutionEngine.resolveEntity('GOOG');
const resGOOGL = defaultEntityResolutionEngine.resolveEntity('GOOGL');
testAssert(resGOOG.canonicalId === 'ALPHABET_CLASS_C', 'GOOG resolves to Class C');
testAssert(resGOOGL.canonicalId === 'ALPHABET_CLASS_A', 'GOOGL resolves to Class A');
testAssert(resGOOG.canonicalId !== resGOOGL.canonicalId, 'Dual share classes remain distinct canonical entities');

// 3. Acquisition Point-in-Time Resolution
// Before acquisition: Target B was independent
const resTarget_2023 = defaultEntityResolutionEngine.resolveEntity('TARGET_B', '2023-01-01T00:00:00.000Z');
testAssert(resTarget_2023.canonicalId === 'TARGET_B_CORP', 'In 2023, TARGET_B resolves to independent TARGET_B_CORP');

// After acquisition: Target B is subsidiary of Acquirer A
const resTarget_2025 = defaultEntityResolutionEngine.resolveEntity('TARGET_B', '2025-01-01T00:00:00.000Z');
testAssert(resTarget_2025.canonicalId === 'ACQUIRER_A_CORP_SUBSIDIARY_B', 'In 2025, TARGET_B resolves to ACQUIRER_A_CORP_SUBSIDIARY_B');
testAssert(resTarget_2023.canonicalId !== resTarget_2025.canonicalId, 'Historical acquisition did not rewrite pre-acquisition identity');

// 4. Unknown entity graceful fallback
const resUnknown = defaultEntityResolutionEngine.resolveEntity('RANDOM_UNLISTED_TICKER');
testAssert(resUnknown.canonicalId === 'RANDOM_UNLISTED_TICKER', 'Unlisted ticker falls back to normalized alias');
testAssert(resUnknown.isResolved === false, 'Marked isResolved = false');

console.log(`[PASS] Suite 3 Entity Resolution passed: ${assertionCount} assertions`);
export default { assertionCount };
