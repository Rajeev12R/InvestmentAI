/**
 * Phase 15 Test Suite 10: Policy Hardening, Determinism (100 Replays), & Concurrency (10 Parallel)
 */

import assert from 'assert';
import { ImplementationSnapshotEngine } from '../implementation/implementationSnapshot.engine.js';
import { ImplementationPlanEngine } from '../implementation/implementationPlan.engine.js';
import { HoldingsReconciliationEngine } from '../implementation/holdingsReconciliation.engine.js';
import { PortfolioDriftEngine } from '../implementation/portfolioDrift.engine.js';
import { ConstraintMonitoringEngine } from '../implementation/constraintMonitoring.engine.js';
import { RebalanceTriggerEngine } from '../implementation/rebalanceTrigger.engine.js';
import { TransactionImpactEngine } from '../implementation/transactionImpact.engine.js';
import { ImplementationQualityEngine } from '../implementation/implementationQuality.engine.js';
import { ImplementationPackageBuilder } from '../implementation/implementationPackage.js';
import { implementationRepository } from '../implementation/implementation.repository.js';
import { ImplementationStatus, ApprovalStatus, DriftStatus, ConstraintStatus, ReconciliationStatus } from '../implementation/implementation.types.js';
import { IMPLEMENTATION_POLICY_V1, IMPLEMENTATION_POLICY_V2 } from '../implementation/implementation.config.js';

console.log("Starting Phase 15 Suite 10: Policy Hardening, Determinism, & Concurrency...");

let assertions = 0;

const baseUniverse = [
  { ticker: "AAPL", shares: 1000, price: 200, sector: "Technology", geography: "US" }, // 200k
  { ticker: "MSFT", shares: 500, price: 400, sector: "Technology", geography: "US" },  // 200k
  { ticker: "JPM", shares: 500, price: 200, sector: "Financials", geography: "US" }    // 100k
];

const asOf = "2026-09-06T12:00:00.000Z";

// =========================================================================
// 1. Policy Configuration Versioning (V1 vs V2 Policy Behavior)
// =========================================================================
{
  const snap = ImplementationSnapshotEngine.buildHoldingsSnapshot({
    workspaceId: "WS-POL",
    portfolioId: "PORT-POL",
    asOf,
    holdings: baseUniverse,
    cash: 0
  }).snapshot;

  // Target with 1.8% drift on AAPL (40% actual vs 41.8% target)
  const targetPackage = {
    packageHash: "PKG-HASH-POL",
    targetWeights: { AAPL: 0.418, MSFT: 0.382, JPM: 0.20 }
  };

  // Evaluate under Policy V1 (warning threshold = 2.0%)
  const driftV1 = PortfolioDriftEngine.evaluateDrift({
    workspaceId: "WS-POL",
    portfolioId: "PORT-POL",
    asOf,
    targetPackage,
    actualHoldingsSnapshot: snap,
    policy: IMPLEMENTATION_POLICY_V1
  });

  // Evaluate under Policy V2 (warning threshold = 1.5%)
  const driftV2 = PortfolioDriftEngine.evaluateDrift({
    workspaceId: "WS-POL",
    portfolioId: "PORT-POL",
    asOf,
    targetPackage,
    actualHoldingsSnapshot: snap,
    policy: IMPLEMENTATION_POLICY_V2
  });

  assert.strictEqual(driftV1.status, ImplementationStatus.RECONCILED);
  assert.strictEqual(driftV2.status, ImplementationStatus.RECONCILED);

  // V1 should pass (1.8% < 2.0%) while V2 should flag WARNING (1.8% >= 1.5%)
  assert.strictEqual(driftV1.drift.overallStatus, DriftStatus.IN_TOLERANCE);
  assert.strictEqual(driftV2.drift.overallStatus, DriftStatus.WARNING);
  assertions += 4;
}

// =========================================================================
// 2. 100-Run Determinism Deep Test
// =========================================================================
{
  let firstPackageHash = null;
  let firstPlanHash = null;
  let firstReconHash = null;

  const targetPackage = {
    packageHash: "PKG-DETERMINISM-BASE",
    targetWeights: { AAPL: 0.40, MSFT: 0.40, JPM: 0.20 }
  };

  const marketPrices = { AAPL: 200, MSFT: 400, JPM: 200 };

  for (let i = 0; i < 100; i++) {
    const snapRes = ImplementationSnapshotEngine.buildHoldingsSnapshot({
      workspaceId: "WS-DET",
      portfolioId: "PORT-DET",
      asOf,
      holdings: baseUniverse,
      cash: 50000
    });

    const planRes = ImplementationPlanEngine.generatePlan({
      workspaceId: "WS-DET",
      portfolioId: "PORT-DET",
      asOf,
      targetPackage,
      currentHoldingsSnapshot: snapRes.snapshot,
      marketPrices
    });

    const approvedRes = ImplementationPlanEngine.approvePlan(planRes.plan, {
      approverId: "USR-PM-DET",
      workspaceId: "WS-DET",
      role: "PORTFOLIO_MANAGER",
      timestamp: asOf
    });

    const reconRes = HoldingsReconciliationEngine.reconcile({
      workspaceId: "WS-DET",
      portfolioId: "PORT-DET",
      asOf,
      targetPackage,
      implementationPlan: approvedRes.approvedPlan,
      actualHoldingsSnapshot: snapRes.snapshot
    });

    const driftRes = PortfolioDriftEngine.evaluateDrift({
      workspaceId: "WS-DET",
      portfolioId: "PORT-DET",
      asOf,
      targetPackage,
      actualHoldingsSnapshot: snapRes.snapshot
    });

    const constRes = ConstraintMonitoringEngine.monitorConstraints({
      workspaceId: "WS-DET",
      portfolioId: "PORT-DET",
      asOf,
      actualHoldingsSnapshot: snapRes.snapshot,
      constraints: { defaultMaxWeight: 0.50 }
    });

    const triggerRes = RebalanceTriggerEngine.evaluateTriggers({
      workspaceId: "WS-DET",
      portfolioId: "PORT-DET",
      asOf,
      driftReport: driftRes.drift,
      constraintReport: constRes.constraintReport
    });

    const impactRes = TransactionImpactEngine.evaluateImpact({
      workspaceId: "WS-DET",
      portfolioId: "PORT-DET",
      asOf,
      plan: approvedRes.approvedPlan,
      expectedReturnImprovementBps: 100.0
    });

    const qualityRes = ImplementationQualityEngine.evaluateQuality({
      workspaceId: "WS-DET",
      portfolioId: "PORT-DET",
      asOf,
      reconciliation: reconRes.reconciliation
    });

    const pkgResult = ImplementationPackageBuilder.buildPackage({
      packageId: `PKG-DET-RUN-${i}`,
      workspaceId: "WS-DET",
      portfolioId: "PORT-DET",
      asOf,
      policyVersion: "IMPLEMENTATION_POLICY_V1",
      targetPortfolio: targetPackage,
      implementationPlan: approvedRes.approvedPlan,
      holdingsSnapshot: snapRes.snapshot,
      reconciliation: reconRes.reconciliation,
      driftReport: driftRes.drift,
      constraintReport: constRes.constraintReport,
      triggerReport: triggerRes.triggerReport,
      impactReport: impactRes.impactReport,
      qualityReport: qualityRes.qualityReport
    });
    const pkg = pkgResult.package;

    if (i === 0) {
      firstPackageHash = pkg.packageHash;
      firstPlanHash = planRes.plan.planHash;
      firstReconHash = reconRes.reconciliation.reconciliationHash;
    } else {
      assert.strictEqual(planRes.plan.planHash, firstPlanHash, `Plan hash divergence at iteration ${i}`);
      assert.strictEqual(reconRes.reconciliation.reconciliationHash, firstReconHash, `Recon hash divergence at iteration ${i}`);
      // Package hash seals packageId which has run index, but deterministic sub-hashes must match
      assert.strictEqual(pkg.targetPortfolioHash, targetPackage.packageHash);
      assert.strictEqual(pkg.implementationPlanHash, approvedRes.approvedPlan.approvalHash);
      assert.strictEqual(pkg.holdingsSnapshotHash, snapRes.snapshot.snapshotHash);
    }
  }

  assert.ok(firstPlanHash !== null && firstPlanHash.length === 64);
  assert.ok(firstReconHash !== null && firstReconHash.length === 64);
  assertions += 5;
}

// =========================================================================
// 3. 10 Parallel Worker Concurrency & Multi-Tenant Isolation
// =========================================================================
{
  implementationRepository.clear();

  const parallelRuns = Array.from({ length: 10 }, (_, idx) => {
    return new Promise(resolve => {
      setTimeout(() => {
        const tenantWs = `WS-TENANT-${idx % 3}`;
        const portId = `PORT-${idx}`;

        const snap = ImplementationSnapshotEngine.buildHoldingsSnapshot({
          workspaceId: tenantWs,
          portfolioId: portId,
          asOf,
          holdings: [
            { ticker: "AAPL", shares: 100 * (idx + 1), price: 200, sector: "Technology" },
            { ticker: "MSFT", shares: 50 * (idx + 1), price: 400, sector: "Technology" }
          ],
          cash: 10000 * (idx + 1)
        }).snapshot;

        const plan = ImplementationPlanEngine.generatePlan({
          workspaceId: tenantWs,
          portfolioId: portId,
          asOf,
          targetPackage: { targetWeights: { AAPL: 0.60, MSFT: 0.40 } },
          currentHoldingsSnapshot: snap,
          marketPrices: { AAPL: 200, MSFT: 400 }
        }).plan;

        const pkgRes = ImplementationPackageBuilder.buildPackage({
          packageId: `PKG-PARALLEL-${idx}`,
          workspaceId: tenantWs,
          portfolioId: portId,
          asOf,
          policyVersion: "IMPLEMENTATION_POLICY_V1",
          targetPortfolio: { packageHash: `PKG-TGT-${idx}`, targetWeights: { AAPL: 0.60, MSFT: 0.40 } },
          holdingsSnapshot: snap,
          implementationPlan: plan
        });

        implementationRepository.saveSnapshot(snap);
        implementationRepository.savePlan(plan);
        implementationRepository.savePackage(pkgRes.package);

        resolve({ idx, tenantWs, portId, pkgHash: pkgRes.package.packageHash });
      }, Math.floor(Math.random() * 20));
    });
  });

  const runResults = await Promise.all(parallelRuns);
  assert.strictEqual(runResults.length, 10);

  // Verify workspace multi-tenant isolation
  const ws0Packages = implementationRepository.listPackagesByWorkspace("WS-TENANT-0");
  const ws1Packages = implementationRepository.listPackagesByWorkspace("WS-TENANT-1");
  const ws2Packages = implementationRepository.listPackagesByWorkspace("WS-TENANT-2");

  // Indices: 0, 3, 6, 9 -> 4 items in WS-0
  // Indices: 1, 4, 7 -> 3 items in WS-1
  // Indices: 2, 5, 8 -> 3 items in WS-2
  assert.strictEqual(ws0Packages.length, 4);
  assert.strictEqual(ws1Packages.length, 3);
  assert.strictEqual(ws2Packages.length, 3);

  for (const p of ws0Packages) {
    assert.strictEqual(p.workspaceId, "WS-TENANT-0");
  }

  assertions += 6;
}

console.log(`✓ Phase 15 Suite 10 Passed: ${assertions} assertions`);
