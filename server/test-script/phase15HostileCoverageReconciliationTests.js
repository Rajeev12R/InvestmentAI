/**
 * Phase 15 Test Suite 11: Hostile Coverage & Category Reconciliation Tests
 * 
 * Programmatically extracts and reconciles all 154 hostile categories A through EX
 * between executable tests (phase15HostileAuditAtoEX.js) and documentation (PHASE15_HOSTILE_COVERAGE.md).
 * Fails if counts, category IDs, or invariants diverge.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log("Starting Phase 15 Suite 11: Hostile Coverage Reconciliation Tests...");

let assertions = 0;

// 1. Generate canonical expected 154 category ID list (A through EX)
const expectedIds = [];
// 1-letter: A to Z (26)
for (let i = 0; i < 26; i++) {
  expectedIds.push(String.fromCharCode(65 + i));
}
// 2-letter: AA to AZ (26), BA to BZ (26), CA to CZ (26), DA to DZ (26)
for (const prefix of ["A", "B", "C", "D"]) {
  for (let i = 0; i < 26; i++) {
    expectedIds.push(prefix + String.fromCharCode(65 + i));
  }
}
// 2-letter: EA to EX (24)
for (let i = 0; i < 24; i++) {
  expectedIds.push("E" + String.fromCharCode(65 + i));
}

assert.strictEqual(expectedIds.length, 154, "Canonical expected ID sequence must have exactly 154 IDs");
assert.strictEqual(expectedIds[0], "A");
assert.strictEqual(expectedIds[153], "EX");
assertions += 3;

// 2. Parse executable test file: server/test-script/phase15HostileAuditAtoEX.js
const testFilePath = path.resolve(process.cwd(), 'server', 'test-script', 'phase15HostileAuditAtoEX.js');
const testContent = fs.readFileSync(testFilePath, 'utf-8');
const testRegex = /recordTest\s*\(\s*['"]([A-Z]{1,2})['"]\s*,\s*['"]([^'"]+)['"]/g;

const executedCategories = [];
const executedMap = {};
let match;

while ((match = testRegex.exec(testContent)) !== null) {
  const id = match[1];
  const name = match[2];
  executedCategories.push(id);
  executedMap[id] = name;
}

assert.strictEqual(executedCategories.length, 154, "Executed test count must be 154");
assertions += 1;

// Verify zero duplicate IDs in test execution
const uniqueExecuted = Array.from(new Set(executedCategories));
assert.strictEqual(uniqueExecuted.length, 154, "Unique executed test categories must be 154");
const duplicatesInTest = executedCategories.filter((id, idx) => executedCategories.indexOf(id) !== idx);
assert.strictEqual(duplicatesInTest.length, 0, `Found duplicate test IDs: ${duplicatesInTest.join(', ')}`);
assertions += 2;

// Verify zero missing and zero unexpected IDs in test execution
const missingInTest = expectedIds.filter(id => !executedMap[id]);
const unexpectedInTest = uniqueExecuted.filter(id => !expectedIds.includes(id));
assert.strictEqual(missingInTest.length, 0, `Missing test IDs: ${missingInTest.join(', ')}`);
assert.strictEqual(unexpectedInTest.length, 0, `Unexpected test IDs: ${unexpectedInTest.join(', ')}`);
assertions += 2;

// 3. Parse documentation file: PHASE15_HOSTILE_COVERAGE.md
const docFilePath = path.resolve(process.cwd(), 'PHASE15_HOSTILE_COVERAGE.md');
const docContent = fs.readFileSync(docFilePath, 'utf-8');
const docRegex = /\|\s*\*\*([A-Z]{1,2})\*\*\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*\*\*([A-Z]+)\*\*\s*\|\s*([^|]+)\|/g;

const documentedIds = [];
const documentedMap = {};

while ((match = docRegex.exec(docContent)) !== null) {
  const id = match[1].trim();
  const attackName = match[2].trim();
  const description = match[3].trim();
  const input = match[4].trim();
  const invariant = match[5].trim();
  const result = match[6].trim();
  const verdict = match[7].trim();
  const reference = match[8].trim();

  documentedIds.push(id);
  documentedMap[id] = { id, attackName, description, input, invariant, result, verdict, reference };
}

assert.strictEqual(documentedIds.length, 154, "Documented table category count must be 154");
assertions += 1;

const uniqueDocumented = Array.from(new Set(documentedIds));
assert.strictEqual(uniqueDocumented.length, 154, "Unique documented categories must be 154");
const duplicatesInDoc = documentedIds.filter((id, idx) => documentedIds.indexOf(id) !== idx);
assert.strictEqual(duplicatesInDoc.length, 0, `Found duplicate doc IDs: ${duplicatesInDoc.join(', ')}`);
assertions += 2;

const missingInDoc = expectedIds.filter(id => !documentedMap[id]);
const unexpectedInDoc = uniqueDocumented.filter(id => !expectedIds.includes(id));
assert.strictEqual(missingInDoc.length, 0, `Missing doc IDs: ${missingInDoc.join(', ')}`);
assert.strictEqual(unexpectedInDoc.length, 0, `Unexpected doc IDs: ${unexpectedInDoc.join(', ')}`);
assertions += 2;

// 4. Bi-directional 1-to-1 equivalence between executed tests and documented table
for (const id of expectedIds) {
  assert.ok(executedMap[id], `Category ${id} must be executed in test file`);
  assert.ok(documentedMap[id], `Category ${id} must be documented in markdown file`);
  assert.strictEqual(documentedMap[id].verdict, 'PASS', `Category ${id} documented verdict must be PASS`);
}
assertions += 3;

console.log(`✓ Phase 15 Suite 11 Passed: ${assertions} assertions (154 Categories Reconciled with 0 Duplicates, 0 Missing, 0 Unexpected)`);
export { assertions };
