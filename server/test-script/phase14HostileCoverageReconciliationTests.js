/**
 * Phase 14 Test Suite 12: Hostile Coverage & Category Reconciliation Tests
 * 
 * Programmatically extracts and reconciles all 154 hostile categories A through EX
 * between executable tests (phase14HostileAuditAtoEX.js) and documentation (PHASE14_HOSTILE_COVERAGE.md).
 * Fails if counts, category IDs, or invariants diverge.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log("Starting Phase 14 Suite 12: Hostile Coverage Reconciliation Tests...");

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

// 2. Parse executable test file: server/test-script/phase14HostileAuditAtoEX.js
const testFilePath = path.resolve(process.cwd(), 'server', 'test-script', 'phase14HostileAuditAtoEX.js');
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

// 3. Parse documentation file: PHASE14_HOSTILE_COVERAGE.md
const docFilePath = path.resolve(process.cwd(), 'PHASE14_HOSTILE_COVERAGE.md');
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

// 4. Verify all documented entries have PASS verdict and non-empty metadata
for (const id of expectedIds) {
  const doc = documentedMap[id];
  assert.ok(doc, `Documentation missing entry for ${id}`);
  assert.strictEqual(doc.verdict, "PASS", `Category ${id} must have PASS verdict`);
  assert.ok(doc.attackName.length > 0, `Category ${id} missing attack name`);
  assert.ok(doc.invariant.length > 0, `Category ${id} missing invariant`);
  assert.ok(doc.reference.length > 0, `Category ${id} missing reference`);
}
assertions += 5;

// 5. Verify attack family cross-listing reconciliation
const attackFamilyTaxonomy = {
  "Input & Sanity": ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "DF", "DG", "DN", "DO", "DA"],
  "Constraints & Feasibility": ["M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"],
  "Covariance & Numerical": ["AA", "AB", "AC", "AD", "AE", "AF", "AG", "AH", "AI", "AJ", "AK", "AL", "AM", "AN", "AO", "AP", "AQ", "AR", "AS", "AT", "AU", "AV", "AW"],
  "Solver Convergence": ["AX", "AY", "AZ"],
  "Data & Provenance": ["BA", "BB", "BC", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BK", "BL", "BM", "BN", "BO", "BP", "BQ", "BR", "BS", "BT", "BU", "BV", "BW", "BX", "BY", "BZ", "CR", "DB", "DC", "DD", "DE", "EW"],
  "AI Boundary & Safety": ["CA", "CB", "CC", "CD", "CE", "CF", "CG", "CH", "CI", "CJ", "CK", "CL", "CM", "CN", "CO", "CP", "CQ", "CR", "CS", "CT", "CU", "CV", "CW", "CX", "CY", "CZ"],
  "Multi-Tenancy & RBAC": ["CS", "CT", "DH", "DI", "DJ", "DK", "DL", "DM", "DP", "DQ", "DR", "DS", "DT", "DU", "DV"],
  "Execution & Liquidity": ["AL", "CF", "CG", "CL", "DW", "DX", "DY", "DZ", "ER"],
  "Turnover & Costs": ["W", "EP", "EQ", "ES", "ET", "EU", "EV"],
  "Scenarios & Stress Testing": ["EA", "EB", "EC", "ED", "EE", "EF"],
  "DAG & Hashing Architecture": ["EG", "EH", "EI", "EJ", "EK", "EL", "EM", "EN", "EO", "EX"]
};

const familyRefCounts = {};
let totalFamilyReferences = 0;
for (const [fam, ids] of Object.entries(attackFamilyTaxonomy)) {
  totalFamilyReferences += ids.length;
  for (const id of ids) {
    familyRefCounts[id] = (familyRefCounts[id] || 0) + 1;
  }
}

// Verify that all 154 unique IDs are present across the family taxonomy
const allTaxonomyIds = Object.keys(familyRefCounts);
assert.strictEqual(allTaxonomyIds.length, 154, "All 154 unique categories must be present in taxonomy");
const missingInTaxonomy = expectedIds.filter(id => !familyRefCounts[id]);
assert.strictEqual(missingInTaxonomy.length, 0, `Missing in taxonomy: ${missingInTaxonomy.join(', ')}`);
assertions += 2;

// Identify all cross-listed categories
const crossListedIds = Object.keys(familyRefCounts).filter(id => familyRefCounts[id] > 1);
assert.ok(crossListedIds.length > 0, "Cross-listed categories must be present and traceable");
assert.strictEqual(crossListedIds.includes("W"), true, "W must be cross-listed in Constraints and Turnover");
assert.strictEqual(crossListedIds.includes("AL"), true, "AL must be cross-listed in Covariance and Liquidity");
assert.strictEqual(crossListedIds.includes("CR"), true, "CR must be cross-listed in Provenance and AI Boundary");
assert.strictEqual(crossListedIds.includes("CS"), true, "CS must be cross-listed in AI Boundary and Multi-Tenancy");
assert.strictEqual(crossListedIds.includes("CT"), true, "CT must be cross-listed in AI Boundary and Multi-Tenancy");
assert.strictEqual(crossListedIds.includes("CF"), true, "CF must be cross-listed in AI Boundary and Execution");
assert.strictEqual(crossListedIds.includes("CG"), true, "CG must be cross-listed in AI Boundary and Execution");
assert.strictEqual(crossListedIds.includes("CL"), true, "CL must be cross-listed in AI Boundary and Execution");
assertions += 10;

console.log(`✓ Phase 14 Suite 12 Passed: ${assertions} assertions`);
export { assertions };
