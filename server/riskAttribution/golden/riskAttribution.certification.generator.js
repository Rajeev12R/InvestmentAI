/**
 * server/riskAttribution/golden/riskAttribution.certification.generator.js
 * 
 * Phase 32: Machine-Generated Certification Generator (20/20 Golden Archetypes A–T)
 * Validates production attribution engine against independent reference implementation.
 */

import { GOLDEN_ATTRIBUTION_FIXTURES } from './riskAttribution.golden.fixtures.js';
import { RiskAttributionGoldenReference } from './riskAttribution.golden.reference.js';
import { RiskAttributionEngine } from '../riskAttribution.engine.js';
import { RiskAttributionExplanationDAG } from '../riskAttribution.explanation.js';
import { RiskAttributionPackageBuilder } from '../riskAttribution.package.js';
import { RiskAttributionHierarchy } from '../riskAttribution.hierarchy.js';
import { riskAttributionRepository } from '../riskAttribution.repository.js';
import { ConfidenceStatus } from '../riskAttribution.types.js';

export class RiskAttributionCertificationGenerator {
  static generateCertification() {
    const records = [];
    let passedCount = 0;
    let failedCount = 0;

    // Iterate across all Golden archetypes A through T
    for (const [key, fix] of Object.entries(GOLDEN_ATTRIBUTION_FIXTURES)) {
      try {
        const prod = RiskAttributionEngine.runComprehensiveAttribution({
          symbols: fix.symbols,
          weights: fix.weights,
          covarianceMatrix: fix.covarianceMatrix,
          sectors: fix.sectors,
          geographies: fix.geographies,
          sleeves: fix.sleeves,
          factorExposures: fix.factorExposures,
          historicalReturns: fix.historicalReturns,
          confidence: fix.confidence,
          asOf: fix.asOf || '2026-09-07T00:00:00.000Z',
          periodsPerYear: fix.periodsPerYear || 252
        });

        // 1. Golden A: Two-Asset MRC
        if (key === 'GOLDEN_A') {
          const refMRC = RiskAttributionGoldenReference.refMRC(fix.weights, fix.covarianceMatrix, fix.periodsPerYear);
          const diff0 = Math.abs(prod.positions[0].marginalRiskContribution - refMRC[0]);
          const diff1 = Math.abs(prod.positions[1].marginalRiskContribution - refMRC[1]);
          if (diff0 > 1e-6 || diff1 > 1e-6) throw new Error(`Golden A MRC mismatch: diff0=${diff0}, diff1=${diff1}`);
        }

        // 2. Golden B: Two-Asset CRC
        if (key === 'GOLDEN_B') {
          const refCRC = RiskAttributionGoldenReference.refCRC(fix.weights, fix.covarianceMatrix, fix.periodsPerYear);
          const diff0 = Math.abs(prod.positions[0].componentRiskContribution - refCRC[0]);
          const diff1 = Math.abs(prod.positions[1].componentRiskContribution - refCRC[1]);
          if (diff0 > 1e-6 || diff1 > 1e-6) throw new Error(`Golden B CRC mismatch: diff0=${diff0}, diff1=${diff1}`);
        }

        // 3. Golden C: Percentage Risk Contribution (PRC)
        if (key === 'GOLDEN_C') {
          const refPRC = RiskAttributionGoldenReference.refPRC(fix.weights, fix.covarianceMatrix);
          const diffSum = Math.abs(prod.reconciliation.sumPercentageRisk - 1.0);
          if (diffSum > 1e-5) throw new Error(`Golden C sum(PRC) is not 1.0: ${prod.reconciliation.sumPercentageRisk}`);
          for (let i = 0; i < fix.symbols.length; i++) {
            if (Math.abs(prod.positions[i].percentageRiskContribution - refPRC[i]) > 1e-6) {
              throw new Error(`Golden C PRC mismatch at ${i}`);
            }
          }
        }

        // 4. Golden D: Euler Reconciliation
        if (key === 'GOLDEN_D') {
          if (!prod.reconciliation.isReconciled) throw new Error('Golden D Euler reconciliation failed');
          if (prod.reconciliation.residual.crcGap > 1e-6) throw new Error(`Golden D CRC gap exceeds tolerance: ${prod.reconciliation.residual.crcGap}`);
        }

        // 5. Golden E: Variance Attribution
        if (key === 'GOLDEN_E') {
          const refVarCont = RiskAttributionGoldenReference.refVarianceContribution(fix.weights, fix.covarianceMatrix, fix.periodsPerYear);
          for (let i = 0; i < fix.symbols.length; i++) {
            if (Math.abs(prod.positions[i].varianceContribution - refVarCont[i]) > 1e-5) {
              throw new Error(`Golden E Variance contribution mismatch at ${i}`);
            }
          }
          if (Math.abs(prod.reconciliation.sumVarianceContribution - prod.portfolioMetrics.portfolioVariance) > 1e-5) {
            throw new Error('Golden E Sum of variance contributions does not equal total portfolio variance');
          }
        }

        // 6. Golden F: Covariance Attribution (Standalone vs Cross-Covariance)
        if (key === 'GOLDEN_F') {
          const refStand = RiskAttributionGoldenReference.refStandaloneVariance(fix.weights, fix.covarianceMatrix, fix.periodsPerYear);
          const refCross = RiskAttributionGoldenReference.refCrossCovariance(fix.weights, fix.covarianceMatrix, fix.periodsPerYear);
          for (let i = 0; i < fix.symbols.length; i++) {
            if (Math.abs(prod.positions[i].standaloneVarianceContribution - refStand[i]) > 1e-5) throw new Error(`Golden F Standalone var mismatch at ${i}`);
            if (Math.abs(prod.positions[i].crossCovarianceContribution - refCross[i]) > 1e-5) throw new Error(`Golden F Cross cov mismatch at ${i}`);
          }
        }

        // 7. Golden G: Sector Aggregation Hierarchy
        if (key === 'GOLDEN_G') {
          if (Math.abs(prod.sectors.sumComponentRisk - prod.portfolioMetrics.portfolioVolatility) > 1e-6) {
            throw new Error('Golden G Sector sum CRC does not reconcile to portfolio volatility');
          }
          if (prod.sectors.groups.length !== 3) throw new Error('Golden G should have exactly 3 sectors');
        }

        // 8. Golden H: Geography Aggregation Hierarchy
        if (key === 'GOLDEN_H') {
          if (Math.abs(prod.geographies.sumComponentRisk - prod.portfolioMetrics.portfolioVolatility) > 1e-6) {
            throw new Error('Golden H Geography sum CRC does not reconcile to portfolio volatility');
          }
          if (prod.geographies.groups.length !== 4) throw new Error('Golden H should have exactly 4 geographies');
        }

        // 9. Golden I: Factor Attribution
        if (key === 'GOLDEN_I') {
          const refFact = RiskAttributionGoldenReference.refFactorDecomposition(fix.weights, fix.symbols, fix.factorExposures, fix.periodsPerYear);
          if (Math.abs(prod.factorAttribution.systematicVariance - refFact.systematicVariance) > 1e-5) {
            throw new Error('Golden I Systematic variance mismatch');
          }
          if (Math.abs(prod.factorAttribution.idiosyncraticVariance - refFact.idiosyncraticVariance) > 1e-5) {
            throw new Error('Golden I Idiosyncratic variance mismatch');
          }
        }

        // 10. Golden J: Factor/Idiosyncratic Decomposition
        if (key === 'GOLDEN_J') {
          const totalVarCalc = prod.factorAttribution.systematicVariance + prod.factorAttribution.idiosyncraticVariance;
          if (Math.abs(totalVarCalc - prod.factorAttribution.totalCalculatedVariance) > 1e-6) {
            throw new Error('Golden J Factor variance sum mismatch');
          }
        }

        // 11. Golden K: Concentration Attribution
        if (key === 'GOLDEN_K') {
          const refHHI_w = RiskAttributionGoldenReference.refHHI(fix.weights);
          if (Math.abs(prod.concentrationAttribution.weightHHI - refHHI_w) > 1e-6) {
            throw new Error('Golden K Weight HHI mismatch');
          }
          // High-risk asset 2 has 20% weight but majority of risk
          if (prod.positions[1].percentageRiskContribution <= prod.positions[0].percentageRiskContribution) {
            throw new Error('Golden K High risk asset should have higher PRC despite lower weight');
          }
        }

        // 12. Golden L: Correlation-Driven Risk
        if (key === 'GOLDEN_L') {
          if (prod.correlationAttribution.crossCovarianceRatio <= 0.45) {
            throw new Error('Golden L Cross covariance ratio should be > 0.45 due to 0.95 correlation');
          }
        }

        // 13. Golden M: Stress Attribution
        if (key === 'GOLDEN_M') {
          if (!prod.stressAttribution || prod.stressAttribution.scenarios.length === 0) {
            throw new Error('Golden M Missing stress scenarios');
          }
          const gfc = prod.stressAttribution.scenarios.find(s => s.scenarioId === 'GFC_2008');
          if (!gfc || gfc.stressedVolatility <= gfc.baseVolatility) {
            throw new Error('Golden M Stressed volatility must exceed base volatility under GFC');
          }
        }

        // 14. Golden N: Regime Attribution
        if (key === 'GOLDEN_N') {
          const crisis = prod.regimeAttribution.regimes.find(r => r.regimeKey === 'CRISIS_DISLOCATION');
          if (!crisis || crisis.conditionedVolatility <= prod.portfolioMetrics.portfolioVolatility) {
            throw new Error('Golden N Crisis regime volatility must exceed base volatility');
          }
        }

        // 15. Golden O: Tail Risk Attribution
        if (key === 'GOLDEN_O') {
          const refCVaR = RiskAttributionGoldenReference.refComponentVaR(fix.weights, fix.covarianceMatrix, fix.confidence, fix.periodsPerYear);
          for (let i = 0; i < fix.symbols.length; i++) {
            if (Math.abs(prod.tailRiskAttribution.tailPositions[i].componentVaR - refCVaR[i]) > 1e-5) {
              throw new Error(`Golden O Component VaR mismatch at ${i}`);
            }
          }
        }

        // 16. Golden P: Multi-Level Hierarchy Reconciliation
        if (key === 'GOLDEN_P') {
          const hierarchy = RiskAttributionHierarchy.buildHierarchyTree(prod);
          if (!hierarchy.invariants.isAdditivelyConsistent || !hierarchy.invariants.hasNoCycles) {
            throw new Error('Golden P Hierarchy tree is not additively consistent or has cycles');
          }
        }

        // 17. Golden Q: Explanation DAG Integrity
        if (key === 'GOLDEN_Q') {
          const dag = RiskAttributionExplanationDAG.buildExplanationDAG(prod);
          if (dag.totalNodes < 4 || dag.totalEdges < 3) throw new Error('Golden Q DAG node/edge count deficient');
          if (!dag.narrative || !dag.narrative.summary) throw new Error('Golden Q Narrative missing');
        }

        // 18. Golden R: Point-in-Time Attribution
        if (key === 'GOLDEN_R') {
          const dag = RiskAttributionExplanationDAG.buildExplanationDAG(prod);
          const snapId = `SNAP-T1-GOLDEN-${Date.now()}-${Math.random()}`;
          const pkg = RiskAttributionPackageBuilder.buildSealedPackage({
            attributionResult: prod,
            explanationDAG: dag,
            portfolioSnapshotId: snapId,
            tenantId: 'tenant_cert'
          });
          riskAttributionRepository.savePackage('tenant_cert', pkg);
          const retrieved = riskAttributionRepository.getAttributionAsOf('tenant_cert', snapId, '2026-01-20T00:00:00.000Z');
          if (!retrieved || retrieved.packageId !== pkg.packageId) throw new Error('Golden R PIT retrieval failed');
        }

        // 19. Golden S: Model-Version Immutability
        if (key === 'GOLDEN_S') {
          const dag = RiskAttributionExplanationDAG.buildExplanationDAG(prod);
          const pkg = RiskAttributionPackageBuilder.buildSealedPackage({
            attributionResult: prod,
            explanationDAG: dag,
            tenantId: 'tenant_cert'
          });
          const verif = RiskAttributionPackageBuilder.verifyPackageIntegrity(pkg);
          if (!verif.isValid) throw new Error('Golden S Sealed package integrity verification failed');
        }

        // 20. Golden T: Missing-Data / UNAVAILABLE Behavior
        if (key === 'GOLDEN_T') {
          if (prod.tailRiskAttribution.empiricalTailAttribution.status !== ConfidenceStatus.UNAVAILABLE) {
            throw new Error('Golden T Missing return sample must return UNAVAILABLE status without fabricating data');
          }
        }

        passedCount++;
        records.push({ archetypeId: fix.archetypeId, status: 'PASS', description: fix.description });
      } catch (err) {
        failedCount++;
        records.push({ archetypeId: fix.archetypeId, status: 'FAIL', error: err.message });
      }
    }

    return {
      totalArchetypes: Object.keys(GOLDEN_ATTRIBUTION_FIXTURES).length,
      passedCount,
      failedCount,
      records
    };
  }
}
