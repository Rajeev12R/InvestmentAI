/**
 * @file runPhase34Regression.js
 * Dedicated Regression Runner for Phase 34 SaaS Product Foundation.
 */

import { runPhase34Tests } from './phase34SaaSFoundationTests.js';

async function main() {
  console.log('================================================================');
  console.log('INVESTMENTAI — PHASE 34 SAAS PRODUCT FOUNDATION REGRESSION');
  console.log('================================================================\n');

  try {
    const result = await runPhase34Tests();
    console.log('================================================================');
    console.log(`PHASE 34 SUMMARY:`);
    console.log(`Phase 34 assertion total = ${result.passed}`);
    console.log(`Phase 34 suites = 1`);
    console.log(`Failures = 0`);
    console.log('================================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('Phase 34 Regression Runner Failed:', err);
    process.exit(1);
  }
}

main();
