/**
 * @file runPhase40Regression.js
 * Standalone Regression Runner for Phase 40 Institutional Reporting & Deliverables.
 */

import { spawnSync } from 'child_process';
import path from 'path';

console.log('================================================================');
console.log('INVESTMENTAI — PHASE 40 REPORTING & DELIVERABLES REGRESSION');
console.log('================================================================\n');

const testFile = path.resolve(process.cwd(), 'server', 'test-script', 'phase40ReportingTests.js');

const result = spawnSync('node', [testFile], {
  env: { ...process.env, NODE_ENV: 'test', PATH: `/Users/ranjan/.nvm/versions/node/v20.19.4/bin:${process.env.PATH}` },
  encoding: 'utf-8',
  stdio: 'inherit'
});

if (result.status === 0) {
  console.log('\n✅ Phase 40 Regression Passed Cleanly!\n');
  process.exit(0);
} else {
  console.error('\n❌ Phase 40 Regression Failed!\n');
  process.exit(1);
}
