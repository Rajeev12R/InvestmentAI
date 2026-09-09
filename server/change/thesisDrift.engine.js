import { THESIS_DRIFT_STATUS, BREAKER_MONITOR_STATUS } from './change.types.js';

/**
 * Deterministic Thesis Drift Engine.
 * Evaluates whether grounded financial evidence strengthens, weakens, or invalidates the investment thesis.
 */
export function analyzeThesisDrift({
  previousSnapshot,
  currentSnapshot,
  changes = [],
  monitoredBreakers = [],
  valuationDrift = null,
  riskDrift = null
}) {
  if (!previousSnapshot || !currentSnapshot) {
    return {
      status: THESIS_DRIFT_STATUS.THESIS_UNCHANGED,
      summary: 'Initial snapshot established. Monitoring baseline thesis.',
      score: 0,
      pillars: {
        growth: 'STABLE',
        profitability: 'STABLE',
        valuation: 'STABLE',
        balanceSheet: 'STABLE',
        risk: 'STABLE'
      },
      keyDrivers: []
    };
  }

  let positivePillars = 0;
  let negativePillars = 0;
  const keyDrivers = [];

  const pillars = {
    growth: 'STABLE',
    profitability: 'STABLE',
    valuation: 'STABLE',
    balanceSheet: 'STABLE',
    risk: 'STABLE'
  };

  // 1. Check Breaker Triggers
  const triggeredBreakers = monitoredBreakers.filter(b => b.status === BREAKER_MONITOR_STATUS.TRIGGERED);
  if (triggeredBreakers.length > 0) {
    return {
      status: THESIS_DRIFT_STATUS.THESIS_INVALIDATED,
      summary: `Investment thesis compromised: ${triggeredBreakers.length} thesis breaker(s) triggered (${triggeredBreakers.map(b => b.trigger).join('; ')}).`,
      score: -100,
      pillars: {
        ...pillars,
        risk: 'CRITICAL_BREACH'
      },
      keyDrivers: triggeredBreakers.map(b => b.detail)
    };
  }

  // 2. Evaluate Growth Pillar (Revenue, FCF growth)
  const revChange = changes.find(c => c.field === 'financialState.revenue');
  const fcfChange = changes.find(c => c.field === 'financialState.fcf');

  if (revChange && revChange.percentageChange !== null) {
    if (revChange.percentageChange >= 5.0) {
      pillars.growth = 'ACCELERATING';
      positivePillars++;
      keyDrivers.push(`Revenue expanded +${revChange.percentageChange.toFixed(1)}%`);
    } else if (revChange.percentageChange <= -5.0) {
      pillars.growth = 'DECELERATING';
      negativePillars++;
      keyDrivers.push(`Revenue contracted ${revChange.percentageChange.toFixed(1)}%`);
    }
  }

  // 3. Evaluate Profitability Pillar (Operating Margin, FCF)
  const marginChange = changes.find(c => c.field === 'financialState.operatingMargin');
  if (marginChange) {
    if (marginChange.direction === 'IMPROVING') {
      pillars.profitability = 'EXPANDING';
      positivePillars++;
      keyDrivers.push('Operating margins expanded');
    } else if (marginChange.direction === 'DETERIORATING') {
      pillars.profitability = 'CONTRACTING';
      negativePillars++;
      keyDrivers.push('Operating margins contracted');
    }
  }

  // 4. Evaluate Valuation Pillar
  if (valuationDrift && valuationDrift.hasDrift) {
    if (valuationDrift.direction === 'IMPROVING') {
      pillars.valuation = 'EXPANDING';
      positivePillars++;
      keyDrivers.push(`DCF fair value increased +${valuationDrift.fairValueChangePct}%`);
    } else if (valuationDrift.direction === 'DETERIORATING') {
      pillars.valuation = 'COMPRESSING';
      negativePillars++;
      keyDrivers.push(`DCF fair value fell ${valuationDrift.fairValueChangePct}%`);
    }
  }

  // 5. Evaluate Balance Sheet & Leverage Pillar
  const debtChange = changes.find(c => c.field === 'financialState.totalDebt');
  const leverageChange = changes.find(c => c.field === 'financialState.debtToEbitda');
  if (leverageChange && leverageChange.direction === 'DETERIORATING') {
    pillars.balanceSheet = 'LEVERAGING';
    negativePillars++;
    keyDrivers.push('Leverage ratio increased');
  } else if (debtChange && debtChange.direction === 'IMPROVING') {
    pillars.balanceSheet = 'DELEVERAGING';
    positivePillars++;
    keyDrivers.push('Debt obligations reduced');
  }

  // 6. Evaluate Risk Drift
  if (riskDrift && riskDrift.hasDrift) {
    if (riskDrift.overallDirection === 'DETERIORATING') {
      pillars.risk = 'ELEVATED';
      negativePillars++;
      keyDrivers.push('Risk profile deteriorated');
    } else if (riskDrift.overallDirection === 'IMPROVING') {
      pillars.risk = 'IMPROVING';
      positivePillars++;
      keyDrivers.push('Risk metrics improved');
    }
  }

  // Determine thesis drift status
  let status = THESIS_DRIFT_STATUS.THESIS_UNCHANGED;
  let summary = 'Investment thesis remains intact with steady fundamental metrics.';

  if (positivePillars > 0 && negativePillars === 0) {
    status = THESIS_DRIFT_STATUS.THESIS_STRENGTHENED;
    summary = `Investment thesis strengthened across ${positivePillars} fundamental pillar(s).`;
  } else if (negativePillars > 0 && positivePillars === 0) {
    status = THESIS_DRIFT_STATUS.THESIS_WEAKENED;
    summary = `Investment thesis weakened due to deterioration in ${negativePillars} pillar(s).`;
  } else if (positivePillars > 0 && negativePillars > 0) {
    status = THESIS_DRIFT_STATUS.THESIS_MIXED;
    summary = `Mixed fundamental signals: positive progress in ${positivePillars} pillar(s) offset by headwinds in ${negativePillars} pillar(s).`;
  }

  const score = (positivePillars - negativePillars) * 20;

  return {
    status,
    summary,
    score,
    pillars,
    keyDrivers,
    positivePillars,
    negativePillars,
    evaluatedAt: new Date().toISOString()
  };
}
