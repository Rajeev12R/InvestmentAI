import { spawnSync } from 'child_process';
import path from 'path';

const testSuites = [
  { name: 'Suite 1: Signal Intelligence Types, Taxonomy & Schemas', file: 'test-signal-types-schema.js', category: 'Functional' },
  { name: 'Suite 2: Multi-Tenant Signal Store & Point-in-Time Cutoff', file: 'test-signal-store-temporal.js', category: 'Functional' },
  { name: 'Suite 3: Deterministic Signal Input Normalization', file: 'test-signal-normalization.js', category: 'Functional' },
  { name: 'Suite 4: Signal Independence & Dependency DAG', file: 'test-signal-independence-dag.js', category: 'Functional' },
  { name: 'Suite 5: Signal Fusion & Conflict Preservation', file: 'test-signal-fusion-conflicts.js', category: 'Functional' },
  { name: 'Suite 6: Signal Interactions & Divergence Detection', file: 'test-signal-interactions-divergence.js', category: 'Functional' },
  { name: 'Suite 7: Signal Temporal Decay & Persistence Tracking', file: 'test-signal-decay-persistence.js', category: 'Functional' },
  { name: 'Suite 8: Historical Validation & Out-of-Sample Segregation', file: 'test-signal-validation-out-of-sample.js', category: 'Functional' },
  { name: 'Suite 9: Portfolio Signal Fusion & Concentration Risk', file: 'test-signal-portfolio-concentration.js', category: 'Functional' },
  { name: 'Suite 10: Signal Explanation DAG & Package Sealing', file: 'test-signal-package-explanation-dag.js', category: 'Functional' },
  { name: 'Suite 11: Cross-Platform Signal Intelligence Bridges', file: 'test-signal-bridges-integration.js', category: 'Functional' },
  { name: 'Suite 12: AI Boundary & Read-Only Copilot Tools', file: 'test-signal-ai-boundary-copilot.js', category: 'Functional' },
  { name: 'Suite 13: 20 Golden Signal Intelligence Traces (Cases A–T)', file: 'test-signal-golden-traces.js', category: 'Golden' },
  { name: 'Suite 14: Hostile Adversarial & Red-Team Audit (400+ Tests)', file: 'test-signal-hostile.js', category: 'Hostile' },
  { name: 'Suite 15: Mutations, Temporal, Concurrency & HTTP Suite', file: 'test-signal-mutations-concurrency-http.js', category: 'Mutations_Temporal_Concurrency_HTTP' }
];

console.log('================================================================');
console.log('INVESTMENTAI — PHASE 27 SIGNAL FUSION & ALPHA DISCOVERY RUNNER');
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

    if (suite.file === 'test-signal-mutations-concurrency-http.js') {
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
console.log('PHASE 27 DETAILED CATEGORY AUDIT TABLE');
console.log('================================================================');
console.log('| Category                 | Assertions/Operations | Result |');
console.log('| ------------------------ | --------------------: | ------ |');
console.log(`| Functional               | ${String(functionalAssertions).padStart(21)} | ${totalFailed === 0 ? 'PASS' : 'FAIL'}   |`);
console.log(`| Golden                   | ${String(goldenAssertions).padStart(21)} | ${totalFailed === 0 ? 'PASS' : 'FAIL'}   |`);
console.log(`| Hostile                  | ${String(hostileAssertions).padStart(21)} | ${totalFailed === 0 ? 'PASS' : 'FAIL'}   |`);
console.log(`| Mutation                 | ${String(mutationAssertions).padStart(21)} | ${mutationAssertions >= 120 ? 'PASS' : 'FAIL'}   |`);
console.log(`| Temporal                 | ${String(temporalAssertions).padStart(21)} | ${temporalAssertions >= 70 ? 'PASS' : 'FAIL'}   |`);
console.log(`| Concurrency              | ${String(concurrencyOperations).padStart(21)} | ${concurrencyOperations >= 50 ? 'PASS' : 'FAIL'}   |`);
console.log(`| HTTP                     | ${String(httpAssertions).padStart(21)} | ${httpAssertions > 0 ? 'PASS' : 'FAIL'}   |`);
console.log(`| RBAC                     | ${String(rbacAssertions).padStart(21)} | ${rbacAssertions > 0 ? 'PASS' : 'FAIL'}   |`);
console.log(`| Tenant Isolation         | ${String(tenantIsolationAssertions).padStart(21)} | ${tenantIsolationAssertions > 0 ? 'PASS' : 'FAIL'}   |`);

console.log('\n================================================================');
console.log(`PHASE 27 SUMMARY:`);
console.log(`Total Suites Executed: ${testSuites.length}`);
console.log(`Total Assertions Passed: ${totalPassed}`);
console.log(`Failed Suites: ${totalFailed}`);
console.log(`Mutation Assertions >= 120: ${mutationAssertions >= 120 ? 'PROVEN (' + mutationAssertions + ')' : 'FAIL'}`);
console.log(`Temporal Assertions >= 70: ${temporalAssertions >= 70 ? 'PROVEN (' + temporalAssertions + ')' : 'FAIL'}`);
console.log(`Concurrency Operations >= 50: ${concurrencyOperations >= 50 ? 'PROVEN (' + concurrencyOperations + ')' : 'FAIL'}`);
console.log('================================================================\n');

if (totalFailed > 0) {
  process.exit(1);
}
