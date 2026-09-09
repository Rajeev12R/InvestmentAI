import crypto from 'crypto';
import { computeSignalHash, deepFreeze } from './signal.types.js';
import { defaultSignalStore } from './signal.store.js';

export class SignalPackageEngine {
  constructor(store = defaultSignalStore) {
    this.store = store;
  }

  /**
   * Build and Cryptographically Seal a Signal Intelligence Package with complete Explanation DAG.
   */
  createAndSealPackage(tenantId = 'tenant_default', {
    packageId,
    entityId,
    compositeSignals = {}, // { [entityId]: compositeSignalRecord }
    weightConfig = {},
    methodologyVersion = '2026.1',
    knowledgeCutoff = new Date().toISOString()
  }) {
    const id = packageId || `pkg_sig_${crypto.randomBytes(8).toString('hex')}`;
    const generatedAt = knowledgeCutoff || new Date().toISOString();

    // Construct Explanation DAG
    const explanationDAG = {
      rootEntityId: entityId,
      nodes: [],
      edges: []
    };

    for (const [entId, comp] of Object.entries(compositeSignals)) {
      explanationDAG.nodes.push({
        nodeId: `node_comp_${entId}`,
        type: 'COMPOSITE_SIGNAL',
        entityId: entId,
        score: comp.score,
        regime: comp.regime,
        direction: comp.direction
      });

      if (Array.isArray(comp.contributors)) {
        for (const c of comp.contributors) {
          const compNodeId = `node_input_${c.inputId}`;
          explanationDAG.nodes.push({
            nodeId: compNodeId,
            type: 'NORMALIZED_INPUT',
            signalType: c.signalType,
            normalizedValue: c.normalizedValue,
            weight: c.weight,
            contribution: c.contribution
          });

          explanationDAG.edges.push({
            source: compNodeId,
            target: `node_comp_${entId}`,
            relation: 'CONTRIBUTES_TO',
            weight: c.weight
          });

          if (Array.isArray(c.evidenceIds)) {
            for (const evId of c.evidenceIds) {
              const evNodeId = `node_ev_${evId}`;
              explanationDAG.nodes.push({
                nodeId: evNodeId,
                type: 'EVIDENCE_SPAN',
                evidenceId: evId
              });
              explanationDAG.edges.push({
                source: evNodeId,
                target: compNodeId,
                relation: 'SUPPORTS'
              });
            }
          }
        }
      }
    }

    const rawPackage = {
      packageId: id,
      entityId,
      compositeSignals,
      weightConfig,
      explanationDAG,
      methodologyVersion,
      knowledgeCutoff,
      generatedAt,
      version: 1
    };

    const packageHash = computeSignalHash(rawPackage);
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
  verifyPackageSeal(pkg) {
    if (!pkg || !pkg.packageHash) return { isValid: false, reason: 'Missing packageHash' };
    const { packageHash, isSealed, storedAt, version, contentHash, ...payloadToHash } = pkg;
    const computed = computeSignalHash({ ...payloadToHash, version: 1 });
    const isValid = computed === packageHash;
    return {
      isValid,
      expectedHash: packageHash,
      computedHash: computed,
      verifiedAt: new Date().toISOString()
    };
  }
}

export const defaultPackageEngine = new SignalPackageEngine();
