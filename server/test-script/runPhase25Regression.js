import { spawnSync } from 'child_process';
import path from 'path';

const testSuites = [
  { name: 'Suite 1: Workflow Types, Enums & 17 Entity Schemas', file: 'test-workflow-types-schema.js' },
  { name: 'Suite 2: Multi-Tenant Store & Point-in-Time Temporal Cutoff', file: 'test-workflow-store-temporal.js' },
  { name: 'Suite 3: Research Assignments, Tasks & Priority Mapping', file: 'test-workflow-assignment-tasks.js' },
  { name: 'Suite 4: Review State Machine & Human Approval Gate', file: 'test-workflow-review-state-machine.js' },
  { name: 'Suite 5: Stale Approval Detection & Publication Blocking', file: 'test-workflow-stale-approval.js' },
  { name: 'Suite 6: Threaded Comments & Evidence Annotations', file: 'test-workflow-comments-annotations.js' },
  { name: 'Suite 7: Questions, Follow-ups, Answers & Lineage', file: 'test-workflow-questions-followups.js' },
  { name: 'Suite 8: Institutional Work Queues & Priority Engines', file: 'test-workflow-queues-priorities.js' },
  { name: 'Suite 9: SLA Due Dates & Deterministic Escalation', file: 'test-workflow-sla-escalation.js' },
  { name: 'Suite 10: Change-Driven Stale Research Detection', file: 'test-workflow-stale-research-detection.js' },
  { name: 'Suite 11: Immutable Publication & Distribution Ledger', file: 'test-workflow-publication-distribution.js' },
  { name: 'Suite 12: Subscriptions & Deduplicated Notification Engine', file: 'test-workflow-acknowledgement-subscriptions.js' },
  { name: 'Suite 13: 15 Golden Institutional Traces (Cases A–O)', file: 'test-workflow-golden-traces.js' },
  { name: 'Suite 14: Hostile Adversarial & Red-Team Audit (300+ Tests)', file: 'test-workflow-hostile.js' },
  { name: 'Suite 15: Mutations, Temporal, Determinism & HTTP Suite', file: 'test-workflow-mutations-concurrency-http.js' }
];

console.log('================================================================');
console.log('INVESTMENTAI — PHASE 25 RESEARCH COLLABORATION & WORKFLOW RUNNER');
console.log('================================================================\n');

let totalPassed = 0;
let totalFailed = 0;
const results = [];

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
  }
}

console.log('\n================================================================');
console.log(`PHASE 25 SUMMARY:`);
console.log(`Total Suites Executed: ${testSuites.length}`);
console.log(`Total Assertions Passed: ${totalPassed}`);
console.log(`Failed Suites: ${totalFailed}`);
console.log('================================================================\n');

if (totalFailed > 0) {
  process.exit(1);
}
