/**
 * Test Suite 10: Phase 16 Hostile Coverage & Category Reconciliation Suite
 * Machine-verifies 1-to-1 reconciliation of all 154 hostile test categories (A through EX).
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

let passCount = 0;
function test(name, fn) {
  try {
    fn();
    passCount++;
    console.log(`✓ [PASS] ${name}`);
  } catch (err) {
    console.error(`✗ [FAIL] ${name}: ${err.message}`);
    throw err;
  }
}

console.log('=== PHASE 16: HOSTILE COVERAGE RECONCILIATION AUDIT ===\n');

// 1. Generate canonical expected 154 category IDs (A to EX)
const singleLetters = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)); // A-Z (26)
const doublePrefixes = ['A', 'B', 'C', 'D'];
const doubleLetters = [];

for (const p of doublePrefixes) {
  for (let i = 0; i < 26; i++) {
    doubleLetters.push(`${p}${String.fromCharCode(65 + i)}`); // AA-AZ, BA-BZ, CA-CZ, DA-DZ (4 * 26 = 104)
  }
}

// E prefix up to EX (24 letters: EA to EX)
for (let i = 0; i < 24; i++) {
  doubleLetters.push(`E${String.fromCharCode(65 + i)}`); // EA-EX (24)
}

const canonical154 = [...singleLetters, ...doubleLetters]; // Total = 26 + 104 + 24 = 154

// 2. Parse PHASE16_HOSTILE_COVERAGE.md
const mdPath = path.resolve(process.cwd(), 'PHASE16_HOSTILE_COVERAGE.md');
const mdContent = fs.readFileSync(mdPath, 'utf-8');

const mdCategoryMatches = [...mdContent.matchAll(/\|\s*\*\*([A-Z]{1,2})\*\*\s*\|/g)];
const mdCategoryIds = mdCategoryMatches.map(m => m[1]);

// 3. Parse phase16HostileAuditAtoEX.js
const testScriptPath = path.resolve(process.cwd(), 'server', 'test-script', 'phase16HostileAuditAtoEX.js');
const testScriptContent = fs.readFileSync(testScriptPath, 'utf-8');

const scriptCategoryMatches = [...testScriptContent.matchAll(/testCategory\(\s*['"]([A-Z]{1,2})['"]/g)];
const scriptCategoryIds = scriptCategoryMatches.map(m => m[1]);

// Assertions
test('Canonical taxonomy contains exactly 154 categories (A to EX)', () => {
  assert.strictEqual(canonical154.length, 154);
  assert.strictEqual(canonical154[0], 'A');
  assert.strictEqual(canonical154[153], 'EX');
});

test('Markdown documentation contains exactly 154 unique category IDs', () => {
  assert.strictEqual(mdCategoryIds.length, 154);
  const uniqueMd = new Set(mdCategoryIds);
  assert.strictEqual(uniqueMd.size, 154);
});

test('Test script executes exactly 154 unique category IDs', () => {
  assert.strictEqual(scriptCategoryIds.length, 154);
  const uniqueScript = new Set(scriptCategoryIds);
  assert.strictEqual(uniqueScript.size, 154);
});

test('Bi-directional category reconciliation: Zero missing, duplicate, or unexpected IDs', () => {
  const missingInDoc = canonical154.filter(id => !mdCategoryIds.includes(id));
  const missingInScript = canonical154.filter(id => !scriptCategoryIds.includes(id));
  const unexpectedInDoc = mdCategoryIds.filter(id => !canonical154.includes(id));
  const unexpectedInScript = scriptCategoryIds.filter(id => !canonical154.includes(id));

  assert.strictEqual(missingInDoc.length, 0, `Missing in Doc: ${missingInDoc.join(', ')}`);
  assert.strictEqual(missingInScript.length, 0, `Missing in Script: ${missingInScript.join(', ')}`);
  assert.strictEqual(unexpectedInDoc.length, 0, `Unexpected in Doc: ${unexpectedInDoc.join(', ')}`);
  assert.strictEqual(unexpectedInScript.length, 0, `Unexpected in Script: ${unexpectedInScript.join(', ')}`);
});

test('Sequential taxonomy ordering check in test script', () => {
  for (let i = 0; i < 154; i++) {
    assert.strictEqual(scriptCategoryIds[i], canonical154[i], `Order mismatch at index ${i}: expected ${canonical154[i]}, found ${scriptCategoryIds[i]}`);
  }
});

console.log('\n--- RECONCILIATION SUMMARY ---');
console.log(`Expected Hostile Categories: ${canonical154.length}`);
console.log(`Unique Executed Categories:  ${new Set(scriptCategoryIds).size}`);
console.log(`Duplicate IDs:               0`);
console.log(`Missing IDs:                 0`);
console.log(`Unexpected IDs:              0`);
console.log(`\nPASSED: ${passCount}/5 assertions`);
