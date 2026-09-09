/**
 * @file runPhase36Regression.js
 * Dedicated Regression Runner for Phase 36: Institutional Portfolio Operating System.
 */

import { spawnSync } from 'child_process';
import path from 'path';

console.log('================================================================');
console.log('INVESTMENTAI — PHASE 36 PORTFOLIO OPERATING SYSTEM REGRESSION');
console.log('================================================================\n');

const testFile = path.resolve(process.cwd(), 'server', 'test-script', 'phase36PortfolioOSTests.js');
const result = spawnSync('node', [testFile], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'test', PATH: `/Users/ranjan/.nvm/versions/node/v20.19.4/bin:${process.env.PATH}` }
});

if (result.status !== 0) {
  console.error('\n❌ Phase 36 Regression Failed!');
  process.exit(1);
} else {
  console.log('\n✅ Phase 36 Regression Passed Cleanly!');
  process.exit(0);
}
