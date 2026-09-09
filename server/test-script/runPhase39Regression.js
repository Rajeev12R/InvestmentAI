/**
 * @file runPhase39Regression.js
 * Standalone Regression Runner for Phase 39 Institutional Alerts & Attention Center.
 */

import { spawnSync } from 'child_process';
import path from 'path';

console.log('================================================================');
console.log('INVESTMENTAI — PHASE 39 ALERTS & ATTENTION CENTER REGRESSION');
console.log('================================================================\n');

const testFile = path.resolve(process.cwd(), 'server', 'test-script', 'phase39AlertsAttentionCenterTests.js');

const result = spawnSync('node', [testFile], {
  env: { ...process.env, NODE_ENV: 'test', PATH: `/Users/ranjan/.nvm/versions/node/v20.19.4/bin:${process.env.PATH}` },
  encoding: 'utf-8',
  stdio: 'inherit'
});

if (result.status === 0) {
  console.log('\n✅ Phase 39 Regression Passed Cleanly!\n');
  process.exit(0);
} else {
  console.error('\n❌ Phase 39 Regression Failed!\n');
  process.exit(1);
}
