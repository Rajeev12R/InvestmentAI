import { STATEMENT_TYPES } from './research.types.js';

/**
 * Builds an index of all verified grounded facts and deterministic calculations from the Truth Package.
 *
 * @param {Object} truthPackage - Sealed Investment Truth Package
 * @returns {Object} Evidence registry with fast lookup by evidenceId
 */
export function buildEvidenceIndex(truthPackage = {}) {
  const index = new Map();
  const ticker = (truthPackage?.company?.ticker || truthPackage?.company?.name || 'UNKNOWN').toUpperCase();

  if (!truthPackage || typeof truthPackage !== 'object') {
    return {
      index,
      ticker: 'UNKNOWN',
      getTicker: () => 'UNKNOWN',
      get: () => null,
      has: () => false,
      getAllEvidenceIds: () => [],
      resolveChain: () => null
    };
  }

  // 1. Ingest Financial Facts (Ground Facts)
  (truthPackage.financialFacts || []).forEach(f => {
    if (f && f.id) {
      const isUnavailable = f.value === null || f.value === undefined || f.status === 'UNAVAILABLE';
      index.set(f.id, {
        evidenceId: f.id,
        ticker,
        statementType: STATEMENT_TYPES.FACT,
        metric: f.metric || f.id,
        value: isUnavailable ? null : f.value,
        formattedValue: isUnavailable ? 'UNAVAILABLE' : (f.formattedValue || String(f.value)),
        unit: f.unit || 'CURRENCY_OR_RATIO',
        formula: f.formula || null,
        period: f.period || { type: 'TTM' },
        timestamp: f.retrievedAt || truthPackage.sealedAt || null,
        source: f.source || { provider: 'PRIMARY_FILING' },
        status: isUnavailable ? 'UNAVAILABLE' : (f.status || 'GROUNDED')
      });
    }
  });

  // 2. Ingest Calculated Metrics
  (truthPackage.calculatedMetrics || []).forEach(m => {
    if (m && m.id) {
      const isUnavailable = m.value === null || m.value === undefined || m.status === 'UNAVAILABLE';
      index.set(m.id, {
        evidenceId: m.id,
        ticker,
        statementType: STATEMENT_TYPES.CALCULATION,
        metric: m.metric || m.id,
        value: isUnavailable ? null : m.value,
        formattedValue: isUnavailable ? 'UNAVAILABLE' : (m.formattedValue || String(m.value)),
        unit: m.unit || 'CURRENCY_OR_RATIO',
        formula: m.formula || null,
        inputs: m.inputs || [],
        period: m.period || { type: 'REALTIME' },
        timestamp: m.retrievedAt || null,
        source: m.source || { provider: 'DETERMINISTIC_ENGINE' },
        status: isUnavailable ? 'UNAVAILABLE' : (m.status || 'CALCULATED')
      });
    }
  });

  // 3. Ingest Valuation Models
  const vm = truthPackage.valuationModels || {};
  if (vm.dcf && vm.dcf.fairValue !== undefined) {
    const dcfEntry = {
      evidenceId: 'valuation.dcf',
      statementType: STATEMENT_TYPES.CALCULATION,
      metric: 'DCF Fair Value',
      value: vm.dcf.fairValue,
      formula: 'PV(Forecast) + PV(TerminalValue) - NetDebt',
      status: vm.dcf.status || 'CALCULATED'
    };
    index.set('valuation.dcf', dcfEntry);
    index.set('valuation.dcfFairValue', dcfEntry);
  }
  if (vm.relativeValuation && vm.relativeValuation.fairValue !== undefined) {
    const relEntry = {
      evidenceId: 'valuation.relative',
      statementType: STATEMENT_TYPES.CALCULATION,
      metric: 'Relative Valuation Fair Value',
      value: vm.relativeValuation.fairValue,
      formula: 'Sector-Adjusted Multiple Synthesis',
      status: vm.relativeValuation.status || 'CALCULATED'
    };
    index.set('valuation.relative', relEntry);
    index.set('valuation.relativeFairValue', relEntry);
  }
  if (vm.reverseDcf && vm.reverseDcf.impliedGrowthRate !== undefined) {
    index.set('valuation.reverseDcf', {
      evidenceId: 'valuation.reverseDcf',
      statementType: STATEMENT_TYPES.CALCULATION,
      metric: 'Reverse DCF Implied Growth Hurdle',
      value: vm.reverseDcf.impliedGrowthRate,
      unit: 'PERCENT_GROWTH',
      formula: 'Bisection Root Solver DCF(g) = MarketPrice',
      status: vm.reverseDcf.status || 'CALCULATED'
    });
  }

  // Support common aliases for financial margin metrics
  if (index.has('financial.operatingMargins') && !index.has('financial.operatingMargin')) {
    index.set('financial.operatingMargin', index.get('financial.operatingMargins'));
  }
  if (index.has('financial.operatingMargin') && !index.has('financial.operatingMargins')) {
    index.set('financial.operatingMargins', index.get('financial.operatingMargin'));
  }

  // 4. Ingest Risk Signals
  const rs = truthPackage.riskSignals || {};
  index.set('risk.overall', {
    evidenceId: 'risk.overall',
    statementType: STATEMENT_TYPES.CALCULATION,
    metric: 'Overall Risk Level',
    value: rs.overallRiskLevel || rs.overallScore || 'MODERATE',
    status: 'CALCULATED'
  });

  return {
    index,
    ticker,
    getTicker: () => ticker,
    get: (id) => index.get(id) || null,
    has: (id) => index.has(id),
    getAllEvidenceIds: () => Array.from(index.keys()),
    resolveChain: (id) => {
      const item = index.get(id);
      if (!item) return null;
      return {
        evidenceId: item.evidenceId,
        ticker: item.ticker || ticker,
        metric: item.metric,
        value: item.value,
        formattedValue: item.formattedValue || (item.value !== null && item.value !== undefined ? String(item.value) : 'UNAVAILABLE'),
        statementType: item.statementType,
        formula: item.formula,
        period: item.period,
        source: item.source,
        status: item.status
      };
    }
  };
}

/**
 * Resolves a single evidence fact from the index by ID.
 *
 * @param {string} id - Evidence ID
 * @param {Object} evidenceIndex - Index returned by buildEvidenceIndex
 * @returns {Object|null}
 */
export function resolveEvidenceFact(id, evidenceIndex) {
  if (!evidenceIndex || !id) return null;
  if (typeof evidenceIndex.resolveChain === 'function') {
    return evidenceIndex.resolveChain(id);
  }
  if (typeof evidenceIndex.get === 'function') {
    return evidenceIndex.get(id);
  }
  return null;
}

