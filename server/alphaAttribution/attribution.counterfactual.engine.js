import { CounterfactualType, AttributionStatus } from './attribution.types.js';
import { defaultAttributionStore } from './attribution.store.js';

export class AlphaCounterfactualEngine {
  constructor(store = defaultAttributionStore) {
    this.store = store;
  }

  /**
   * Evaluate a modelled counterfactual scenario.
   */
  evaluateCounterfactual(tenantId = 'tenant_default', {
    counterfactualId,
    counterfactualType = CounterfactualType.PORTFOLIO_WITHOUT_SIGNAL,
    entityId = 'PORTFOLIO',
    signalId = null,
    actualWeights = {}, // { ticker: weight }
    counterfactualWeights = {}, // { ticker: weight }
    returns = {}, // { ticker: return }
    benchmarkReturns = {}, // { ticker: benchmarkReturn }
    parameters = {},
    informationCutoff = new Date().toISOString()
  }) {
    let actualOutcome = 0;
    let counterfactualOutcome = 0;

    const tickers = Object.keys({ ...actualWeights, ...counterfactualWeights, ...returns });

    for (const t of tickers) {
      const wAct = actualWeights[t] || 0;
      const wCf = counterfactualWeights[t] !== undefined ? counterfactualWeights[t] : wAct;
      const r = returns[t] || 0;

      actualOutcome += wAct * r;
      counterfactualOutcome += wCf * r;
    }

    actualOutcome = parseFloat(actualOutcome.toFixed(6));
    counterfactualOutcome = parseFloat(counterfactualOutcome.toFixed(6));
    const counterfactualDelta = parseFloat((actualOutcome - counterfactualOutcome).toFixed(6));

    const id = counterfactualId || `cf_${counterfactualType}_${signalId || 'gen'}_${new Date(informationCutoff).getTime()}`;
    const record = {
      counterfactualId: id,
      counterfactualType,
      entityId,
      signalId,
      baselineOutcome: actualOutcome,
      counterfactualOutcome,
      counterfactualDelta,
      alteredVariable: signalId ? `Weight without signal ${signalId}` : 'Alternative implementation weights',
      unchangedVariables: ['Asset returns', 'Benchmark returns', 'Execution timing'],
      calculationMethod: 'Linear dot-product differential: Sum(w_act * r) - Sum(w_cf * r)',
      validityConditions: ['Market liquidity sufficient for simulated trade', 'No second-order market impact'],
      limitations: ['Simulated model assumes zero price impact from counterfactual weight removal'],
      status: AttributionStatus.MODELLED,
      isModelledCounterfactual: true,
      informationCutoff,
      calculatedAt: informationCutoff
    };

    return this.store.saveCounterfactual(tenantId, record);
  }
}

export const defaultCounterfactualEngine = new AlphaCounterfactualEngine();
