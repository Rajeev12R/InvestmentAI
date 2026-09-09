import crypto from 'crypto';
import { computeAttributionHash, deepFreeze, AttributionStatus } from './attribution.types.js';
import { defaultAttributionStore } from './attribution.store.js';

export class AlphaPackageEngine {
  constructor(store = defaultAttributionStore) {
    this.store = store;
  }

  /**
   * Build and Cryptographically Seal an Alpha Attribution Package with complete Explanation DAG.
   */
  createAndSealAttributionPackage(tenantId = 'tenant_default', {
    packageId,
    entityId = 'PORTFOLIO_PRIMARY',
    evaluationPeriod = 'HISTORICAL',
    informationCutoff = new Date().toISOString(),
    benchmark = 'S&P 500',
    portfolioReturn = 0.0,
    benchmarkReturn = 0.0,
    attributions = [], // Array of security or component attribution objects
    brinson = null,
    systematicEffects = {},
    evidenceIds = [],
    methodologyVersion = '2026.1'
  }) {
    const id = packageId || `pkg_attr_${crypto.randomBytes(8).toString('hex')}`;
    const generatedAt = informationCutoff;
    const activeReturn = parseFloat((portfolioReturn - benchmarkReturn).toFixed(6));

    // Construct Explanation DAG
    const explanationDAG = {
      rootId: 'node_root_alpha',
      nodes: [],
      edges: []
    };

    // Root Alpha node
    explanationDAG.nodes.push({
      nodeId: 'node_root_alpha',
      type: 'TOTAL_ACTIVE_ALPHA',
      value: activeReturn,
      benchmark,
      evaluationPeriod
    });

    let sumSignalEffects = 0;
    let sumDecisionEffects = 0;
    let sumResidualEffects = 0;

    for (const attr of attributions) {
      const entNodeId = `node_attr_${attr.entityId || attr.attributionId}`;
      sumSignalEffects += attr.signalContribution || 0;
      sumDecisionEffects += attr.decisionContribution || 0;
      sumResidualEffects += attr.residual || 0;

      explanationDAG.nodes.push({
        nodeId: entNodeId,
        type: 'SECURITY_ATTRIBUTION',
        entityId: attr.entityId,
        activeReturn: attr.activeReturn,
        signalContribution: attr.signalContribution,
        decisionContribution: attr.decisionContribution,
        residual: attr.residual
      });

      explanationDAG.edges.push({
        source: entNodeId,
        target: 'node_root_alpha',
        relation: 'ATTRIBUTES_TO',
        weight: attr.activeReturn
      });

      if (Array.isArray(attr.evidenceIds)) {
        for (const evId of attr.evidenceIds) {
          const evNodeId = `node_ev_${evId}`;
          explanationDAG.nodes.push({
            nodeId: evNodeId,
            type: 'EVIDENCE_RECORD',
            evidenceId: evId
          });
          explanationDAG.edges.push({
            source: evNodeId,
            target: entNodeId,
            relation: 'SUPPORTS_ATTRIBUTION'
          });
        }
      }
    }

    const transactionCosts = systematicEffects.transactionCosts || 0;
    const taxDrag = systematicEffects.taxDrag || 0;
    const fxDrag = systematicEffects.fxDrag || 0;

    const rawPackage = {
      packageId: id,
      entityId,
      evaluationPeriod,
      informationCutoff,
      benchmark,
      portfolioReturn,
      benchmarkReturn,
      activeReturn,
      summaryAttribution: {
        signalEffect: parseFloat(sumSignalEffects.toFixed(6)),
        decisionEffect: parseFloat(sumDecisionEffects.toFixed(6)),
        transactionCosts: parseFloat(transactionCosts.toFixed(6)),
        taxDrag: parseFloat(taxDrag.toFixed(6)),
        fxDrag: parseFloat(fxDrag.toFixed(6)),
        residualEffect: parseFloat(sumResidualEffects.toFixed(6))
      },
      brinson,
      attributions,
      explanationDAG,
      methodologyVersion,
      knowledgeCutoff: informationCutoff,
      generatedAt,
      version: 1
    };

    const packageHash = computeAttributionHash(rawPackage);
    const sealedPackage = {
      ...rawPackage,
      packageHash,
      isSealed: true
    };

    return this.store.savePackage(tenantId, sealedPackage);
  }

  /**
   * Verify Package Cryptographic Seal Integrity
   */
  verifyAttributionSeal(pkg) {
    if (!pkg || !pkg.packageHash) return { isValid: false, reason: 'Missing packageHash' };
    const { packageHash, isSealed, storedAt, version, contentHash, ...payloadToHash } = pkg;
    const computed = computeAttributionHash({ ...payloadToHash, version: 1 });
    const isValid = computed === packageHash;
    return {
      isValid,
      expectedHash: packageHash,
      computedHash: computed,
      verifiedAt: new Date().toISOString()
    };
  }
}

export const defaultAlphaPackageEngine = new AlphaPackageEngine();
