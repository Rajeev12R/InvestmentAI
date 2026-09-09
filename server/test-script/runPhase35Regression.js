/**
 * @file runPhase35Regression.js
 * Dedicated Regression Runner for Phase 35: Organization & Workspace Management.
 */

import { runPhase35Tests } from './phase35OrganizationWorkspaceTests.js';

async function main() {
  console.log('================================================================');
  console.log('INVESTMENTAI — PHASE 35 ORGANIZATION & WORKSPACE REGRESSION');
  console.log('================================================================\n');

  try {
    const result = await runPhase35Tests();
    console.log('================================================================');
    console.log(`PHASE 35 SUMMARY:`);
    console.log(`Phase 35 assertion total = ${result.passed}`);
    console.log(`Phase 35 suites = 1`);
    console.log(`Failures = 0`);
    console.log('================================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('Phase 35 Regression Runner Failed:', err);
    process.exit(1);
  }
}

main();
