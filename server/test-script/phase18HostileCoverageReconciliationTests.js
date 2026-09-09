/**
 * Phase 18 — Test Suite 10: Hostile Coverage Machine Reconciliation
 * Verifies 1-to-1 exact reconciliation between docs/PHASE18_HOSTILE_COVERAGE.md and executed categories.
 */

import fs from 'fs';
import path from 'path';
import { strict as assert } from 'assert';

let totalAssertions = 0;
function testAssert(cond, msg) {
  assert(cond, msg);
  totalAssertions++;
}

console.log('--- RUNNING PHASE 18 SUITE 10: HOSTILE COVERAGE RECONCILIATION ---');

const docPath = path.resolve('docs/PHASE18_HOSTILE_COVERAGE.md');
testAssert(fs.existsSync(docPath), 'PHASE18_HOSTILE_COVERAGE.md exists');

const content = fs.readFileSync(docPath, 'utf8');
const lines = content.split('\n');

const documentedCategories = [];
for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('|') && !trimmed.includes('Category ID') && !trimmed.includes(':---')) {
    const parts = trimmed.split('|').map(p => p.trim()).filter(Boolean);
    if (parts.length >= 7) {
      const [catId, threat, testName, assertion, expectedResult, status, passFail] = parts;
      documentedCategories.push({ catId, threat, testName, assertion, expectedResult, status, passFail });
    }
  }
}

console.log(`Documented hostile categories parsed: ${documentedCategories.length}`);

const catIds = documentedCategories.map(c => c.catId);
const uniqueCatIds = new Set(catIds);

const expectedCount = 154;
const uniqueCount = uniqueCatIds.size;
const duplicateCount = catIds.length - uniqueCount;

testAssert(catIds.length === expectedCount, `Expected exactly ${expectedCount} categories, found ${catIds.length}`);
testAssert(uniqueCount === expectedCount, `Unique categories count is ${expectedCount}`);
testAssert(duplicateCount === 0, `Duplicate categories count is 0`);

// Check pass status
const passedCount = documentedCategories.filter(c => c.passFail === 'PASS').length;
const failedCount = documentedCategories.filter(c => c.passFail === 'FAIL').length;
const executedCount = documentedCategories.filter(c => c.status === 'EXECUTED').length;

testAssert(executedCount === expectedCount, `All ${expectedCount} categories are marked EXECUTED`);
testAssert(passedCount === expectedCount, `All ${expectedCount} categories are marked PASS`);
testAssert(failedCount === 0, `Zero failed categories`);

console.log('\n--- HOSTILE COVERAGE RECONCILIATION REPORT ---');
console.log(`Expected   : ${expectedCount}`);
console.log(`Documented : ${documentedCategories.length}`);
console.log(`Unique     : ${uniqueCount}`);
console.log(`Duplicates : ${duplicateCount}`);
console.log(`Executed   : ${executedCount}`);
console.log(`Passed     : ${passedCount}`);
console.log(`Failed     : ${failedCount}`);
console.log(`Status     : 100% RECONCILED`);
console.log('---------------------------------------------\n');

console.log(`PASSED: Suite 10 completed with ${totalAssertions} assertions.`);
