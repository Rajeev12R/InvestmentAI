import { spawnSync } from 'child_process';
import path from 'path';

const testSuites = [
  { name: 'Suite 1: External Intelligence Types, Taxonomy & Schemas', file: 'test-external-types-schema.js', category: 'Functional' },
  { name: 'Suite 2: Immutable Raw Artifact Store & Point-in-Time Cutoff', file: 'test-external-raw-store-temporal.js', category: 'Functional' },
  { name: 'Suite 3: Source Verification Lifecycle & Revocation Propagation', file: 'test-external-source-verification-revocation.js', category: 'Functional' },
  { name: 'Suite 4: Document Segmentation, Span Evidence & AI Boundary', file: 'test-external-extraction-evidence.js', category: 'Functional' },
  { name: 'Suite 5: Transcripts & Attributed Management Commentary', file: 'test-external-management-transcripts.js', category: 'Functional' },
  { name: 'Suite 6: Regulatory Signals Proposed vs Effective', file: 'test-external-regulatory-signals.js', category: 'Functional' },
  { name: 'Suite 7: News Corroboration & Syndication Deduplication', file: 'test-external-news-corroboration.js', category: 'Functional' },
  { name: 'Suite 8: Source Conflicts & Disagreement Preservation', file: 'test-external-source-conflicts.js', category: 'Functional' },
  { name: 'Suite 9: Competitive Signals & Supply Chain Dependencies', file: 'test-external-competitive-supply-chain.js', category: 'Functional' },
  { name: 'Suite 10: Signal Quality Scoring & Performance Calibration', file: 'test-external-signals-quality-performance.js', category: 'Functional' },
  { name: 'Suite 11: Truth Promotion Boundary & Human Authorization Gate', file: 'test-external-truth-promotion-boundary.js', category: 'Functional' },
  { name: 'Suite 12: External Intelligence Bridges Integration', file: 'test-external-bridges-integration.js', category: 'Functional' },
  { name: 'Suite 13: 18 Golden External Intelligence Traces (Cases A–R)', file: 'test-external-golden-traces.js', category: 'Golden' },
  { name: 'Suite 14: Hostile Adversarial & Red-Team Audit (350+ Tests)', file: 'test-external-hostile.js', category: 'Hostile' },
  { name: 'Suite 15: Mutations, Temporal, Determinism & HTTP Suite', file: 'test-external-mutations-concurrency-http.js', category: 'Mutations_Temporal_Concurrency_HTTP' }
];

console.log('================================================================');
console.log('INVESTMENTAI — PHASE 26 EXTERNAL INTELLIGENCE & ALT DATA RUNNER');
console.log('================================================================\n');

let totalPassed = 0;
let totalFailed = 0;
const results = [];

let mutationAssertions = 0;
let temporalAssertions = 0;
let concurrencyOperations = 0;
let httpAssertions = 0;
let rbacAssertions = 0;
let tenantIsolationAssertions = 0;

let functionalAssertions = 0;
let goldenAssertions = 0;
let hostileAssertions = 0;

for (const suite of testSuites) {
  const filePath = path.resolve(process.cwd(), 'server', 'test-script', suite.file);
  const result = spawnSync('node', [filePath], {
    env: { ...process.env, PATH: `/Users/ranjan/.nvm/versions/node/v20.19.4/bin:${process.env.PATH}` },
    encoding: 'utf-8'
  });

  const output = result.stdout || '';
  const errOutput = result.stderr || '';

  const match = output.match(/PASSED:\s*(\d+)/i) ||
    output.match(/(\d+)\s+assertions?\s+passed/i) ||
    output.match(/(\d+)\s+PASSED/i);

  const passedCount = match ? parseInt(match[1], 10) : 0;
  const isFailed = result.status !== 0 || (passedCount === 0 && !output.includes('PASSED'));

  if (isFailed) {
    totalFailed++;
    results.push({ name: suite.name, passed: 0, status: 'FAILED', error: errOutput || output });
    console.log(`❌ [FAIL] ${suite.name}`);
    if (errOutput) console.log(errOutput);
  } else {
    totalPassed += passedCount;
    results.push({ name: suite.name, passed: passedCount, status: 'PASSED' });
    console.log(`✅ [PASS] ${suite.name} — ${passedCount} assertions`);

    if (suite.category === 'Functional') functionalAssertions += passedCount;
    if (suite.category === 'Golden') goldenAssertions += passedCount;
    if (suite.category === 'Hostile') hostileAssertions += passedCount;

    if (suite.file === 'test-external-mutations-concurrency-http.js') {
      const mutMatch = output.match(/MUTATION_ASSERTIONS:\s*(\d+)/i);
      const tempMatch = output.match(/TEMPORAL_ASSERTIONS:\s*(\d+)/i);
      const concMatch = output.match(/CONCURRENCY_OPERATIONS:\s*(\d+)/i);
      const httpMatch = output.match(/HTTP_ASSERTIONS:\s*(\d+)/i);
      const rbacMatch = output.match(/RBAC_ASSERTIONS:\s*(\d+)/i);
      const tenantMatch = output.match(/TENANT_ISOLATION_ASSERTIONS:\s*(\d+)/i);

      if (mutMatch) mutationAssertions = parseInt(mutMatch[1], 10);
      if (tempMatch) temporalAssertions = parseInt(tempMatch[1], 10);
      if (concMatch) concurrencyOperations = parseInt(concMatch[1], 10);
      if (httpMatch) httpAssertions = parseInt(httpMatch[1], 10);
      if (rbacMatch) rbacAssertions = parseInt(rbacMatch[1], 10);
      if (tenantMatch) tenantIsolationAssertions = parseInt(tenantMatch[1], 10);
    }
  }
}

console.log('\n================================================================');
console.log('PHASE 26 DETAILED CATEGORY AUDIT TABLE');
console.log('================================================================');
console.log('| Category                 | Assertions/Operations | Result |');
console.log('| ------------------------ | --------------------: | ------ |');
console.log(`| Functional               | ${String(functionalAssertions).padStart(21)} | ${totalFailed === 0 ? 'PASS' : 'FAIL'}   |`);
console.log(`| Golden                   | ${String(goldenAssertions).padStart(21)} | ${totalFailed === 0 ? 'PASS' : 'FAIL'}   |`);
console.log(`| Hostile                  | ${String(hostileAssertions).padStart(21)} | ${totalFailed === 0 ? 'PASS' : 'FAIL'}   |`);
console.log(`| Mutation                 | ${String(mutationAssertions).padStart(21)} | ${mutationAssertions >= 100 ? 'PASS' : 'FAIL'}   |`);
console.log(`| Temporal                 | ${String(temporalAssertions).padStart(21)} | ${temporalAssertions >= 60 ? 'PASS' : 'FAIL'}   |`);
console.log(`| Concurrency              | ${String(concurrencyOperations).padStart(21)} | ${concurrencyOperations >= 50 ? 'PASS' : 'FAIL'}   |`);
console.log(`| HTTP                     | ${String(httpAssertions).padStart(21)} | ${httpAssertions > 0 ? 'PASS' : 'FAIL'}   |`);
console.log(`| RBAC                     | ${String(rbacAssertions).padStart(21)} | ${rbacAssertions > 0 ? 'PASS' : 'FAIL'}   |`);
console.log(`| Tenant Isolation         | ${String(tenantIsolationAssertions).padStart(21)} | ${tenantIsolationAssertions > 0 ? 'PASS' : 'FAIL'}   |`);

console.log('\n================================================================');
console.log(`PHASE 26 SUMMARY:`);
console.log(`Total Suites Executed: ${testSuites.length}`);
console.log(`Total Assertions Passed: ${totalPassed}`);
console.log(`Failed Suites: ${totalFailed}`);
console.log(`Mutation Assertions >= 100: ${mutationAssertions >= 100 ? 'PROVEN (' + mutationAssertions + ')' : 'FAIL'}`);
console.log(`Temporal Assertions >= 60: ${temporalAssertions >= 60 ? 'PROVEN (' + temporalAssertions + ')' : 'FAIL'}`);
console.log(`Concurrency Operations >= 50: ${concurrencyOperations >= 50 ? 'PROVEN (' + concurrencyOperations + ')' : 'FAIL'}`);
console.log('================================================================\n');

if (totalFailed > 0) {
  process.exit(1);
}
