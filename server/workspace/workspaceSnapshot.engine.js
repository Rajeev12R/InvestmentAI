import { sealTruthPackage } from '../tools/evidence.tool.js';
import { generateThesisBreakers } from '../research/thesisBreaker.engine.js';
import { buildInvestmentThesis } from '../research/thesis.engine.js';
import { identifyCatalysts } from '../research/catalyst.engine.js';
import { buildEvidenceIndex } from '../research/researchEvidence.engine.js';

/**
 * Transforms a sealed Truth Package into an immutable Investment Snapshot.
 *
 * @param {Object} params
 * @param {string} params.workspaceId - ID of parent workspace
 * @param {Object} params.truthPackage - Sealed Truth Package
 * @param {string} [params.customSnapshotId] - Optional explicit snapshot ID
 * @returns {Object} Immutable snapshot payload
 */
export function createSnapshotFromTruthPackage({
  workspaceId,
  truthPackage,
  customSnapshotId = null
}) {
  if (!workspaceId) {
    throw new Error('workspaceId is required to create a snapshot.');
  }
  if (!truthPackage || !truthPackage.integrity || !truthPackage.integrity.valid) {
    throw new Error('Valid sealed Truth Package is required to create a snapshot.');
  }

  // Verify SHA-256 seal integrity
  const computedSeal = sealTruthPackage(truthPackage);
  if (computedSeal.packageHash !== truthPackage.integrity.packageHash) {
    throw new Error('Truth Package cryptographic SHA-256 seal mismatch (tampered or unsealed package).');
  }

  const ticker = (truthPackage.company?.ticker || truthPackage.company?.name || 'UNKNOWN').toUpperCase();
  const snapshotId = customSnapshotId || `SNAP_${ticker}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const asOf = truthPackage.company?.asOf || truthPackage.integrity.sealedAt || new Date().toISOString();

  // Extract financial metrics safely
  const facts = [...(truthPackage.financialFacts || []), ...(truthPackage.calculatedMetrics || [])];
  const findFact = (id) => facts.find(f => f.id === id)?.value ?? 'UNAVAILABLE';

  const vm = truthPackage.valuationModels || {};
  const vs = vm.valuationSummary || {};
  const risks = truthPackage.riskSignals || {};
  const dec = truthPackage.decision || {};

  // Deterministic pillars
  const thesis = buildInvestmentThesis(truthPackage);
  const catalysts = identifyCatalysts(truthPackage);
  const breakers = generateThesisBreakers(truthPackage);
  const evidenceIndex = buildEvidenceIndex(truthPackage);

  const marketState = {
    currentPrice: truthPackage.company?.currentPrice ?? vs.currentPrice ?? 'UNAVAILABLE',
    marketCap: truthPackage.company?.marketCap ?? findFact('financial.marketCap'),
    currency: truthPackage.company?.currency || 'USD',
    beta: findFact('market.beta'),
    pe: findFact('valuation.peRatio') !== 'UNAVAILABLE' ? findFact('valuation.peRatio') : (truthPackage.company?.pe ?? 'UNAVAILABLE'),
    pb: findFact('valuation.pbRatio') !== 'UNAVAILABLE' ? findFact('valuation.pbRatio') : (truthPackage.company?.pb ?? 'UNAVAILABLE'),
    volatility: findFact('market.annualizedVolatility')
  };

  const financialState = {
    revenue: findFact('financial.revenue'),
    fcf: findFact('financial.freeCashFlow'),
    netIncome: findFact('financial.netIncome'),
    operatingCashFlow: findFact('financial.operatingCashFlow'),
    totalDebt: findFact('financial.totalDebt'),
    totalCash: findFact('financial.totalCash'),
    netDebt: findFact('financial.netDebt'),
    operatingMargin: findFact('financial.operatingMargin') !== 'UNAVAILABLE' ? findFact('financial.operatingMargin') : findFact('financial.operatingMargins'),
    fcfMargin: findFact('financial.fcfMargin'),
    debtToEbitda: risks.financialRisk?.debtToEbitda ?? findFact('financial.debtToEbitda'),
    currentRatio: risks.liquidityRisk?.currentRatio ?? findFact('financial.currentRatio'),
    reportingPeriod: truthPackage.company?.reportingPeriod || 'TTM'
  };

  const valuationState = {
    dcfFairValue: vm.dcf?.fairValue ?? 'UNAVAILABLE',
    dcfUpside: vm.dcf?.upside ?? 'UNAVAILABLE',
    reverseDcfGrowth: vm.reverseDcf?.impliedGrowthRate ?? 'UNAVAILABLE',
    relativeFairValue: vm.relativeValuation?.fairValue ?? 'UNAVAILABLE',
    compositeFairValue: vs.compositeFairValue ?? 'UNAVAILABLE',
    modelAgreement: vs.modelAgreement ?? 'UNAVAILABLE'
  };

  const riskState = {
    overallScore: risks.overallScore ?? 'UNAVAILABLE',
    overallCategory: risks.overallCategory ?? 'UNAVAILABLE',
    financialRisk: risks.financialRisk?.level ?? 'UNAVAILABLE',
    marketRisk: risks.marketRisk?.level ?? 'UNAVAILABLE',
    liquidityRisk: risks.liquidityRisk?.level ?? 'UNAVAILABLE',
    earningsQuality: risks.earningsQuality?.level ?? 'UNAVAILABLE',
    categorySummary: risks.categorySummary || {}
  };

  const decisionState = {
    decision: dec.decision ?? 'WATCH',
    convictionScore: dec.conviction?.score ?? 'UNAVAILABLE',
    convictionLevel: dec.conviction?.level ?? 'UNAVAILABLE',
    primaryDrivers: dec.primaryDrivers || [],
    falsificationTriggers: dec.falsificationTriggers || []
  };

  return {
    snapshotId,
    workspaceId,
    ticker,
    createdAt: new Date().toISOString(),
    asOf,
    truthPackageHash: truthPackage.integrity.packageHash,
    truthPackageVersion: truthPackage.integrity.version || '1.0.0',
    marketState,
    financialState,
    valuationState,
    riskState,
    decisionState,
    thesisState: {
      summary: thesis.summary,
      bullCase: thesis.bullCase,
      baseCase: thesis.baseCase,
      bearCase: thesis.bearCase,
      keyDrivers: thesis.keyDrivers
    },
    catalystState: catalysts,
    thesisBreakerState: breakers,
    confidence: truthPackage.confidence || { overall: 80 },
    evidenceSummary: {
      factCount: facts.length,
      evidenceIds: evidenceIndex.getAllEvidenceIds()
    }
  };
}
