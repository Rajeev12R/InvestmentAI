import React, { useState } from 'react';

export default function ImplementationPanel({ packageData, onApprovePlan }) {
  const [activeTab, setActiveTab] = useState('overview');

  const pkg = packageData || {
    packageId: 'PKG-DEMO-IMPL',
    portfolioId: 'PORT-MAIN',
    asOf: '2026-09-06T12:00:00.000Z',
    status: 'PLAN_GENERATED',
    policyVersion: 'IMPLEMENTATION_POLICY_V1',
    packageHash: '8f7d9a8e2b1c4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f',
    holdingsSnapshot: {
      totalValue: 1250000.00,
      cash: 50000.00,
      cashWeight: 0.04,
      positionCount: 3,
      holdings: [
        { ticker: 'AAPL', shares: 2500, price: 220.00, value: 550000.00, weight: 0.44, sector: 'Technology', geography: 'US' },
        { ticker: 'MSFT', shares: 1000, price: 420.00, value: 420000.00, weight: 0.336, sector: 'Technology', geography: 'US' },
        { ticker: 'JPM', shares: 1150, price: 200.00, value: 230000.00, weight: 0.184, sector: 'Financials', geography: 'US' }
      ]
    },
    implementationPlan: {
      planId: 'PLAN-PORT-MAIN-2026-09-06',
      portfolioValue: 1250000.00,
      grossTradeValue: 125000.00,
      oneWayTurnover: 0.05,
      twoWayTurnover: 0.10,
      approvalStatus: 'REVIEW_REQUIRED',
      orders: [
        { ticker: 'AAPL', currentWeight: 0.44, targetWeight: 0.35, currentShares: 2500, targetShares: 1988, shareDelta: -512, action: 'SELL', estimatedTradeValue: 112500.00 },
        { ticker: 'MSFT', currentWeight: 0.336, targetWeight: 0.35, currentShares: 1000, targetShares: 1041, shareDelta: 41, action: 'BUY', estimatedTradeValue: 17500.00 },
        { ticker: 'JPM', currentWeight: 0.184, targetWeight: 0.25, currentShares: 1150, targetShares: 1562, shareDelta: 412, action: 'BUY', estimatedTradeValue: 82500.00 }
      ]
    },
    reconciliation: {
      completenessRatio: 1.0,
      matchedCount: 1,
      driftedCount: 2,
      missingCount: 0,
      unexpectedCount: 0,
      totalWeightError: 0.18,
      overallStatus: 'DRIFTED'
    },
    driftReport: {
      overallStatus: 'WARNING',
      maxAbsolutePositionDrift: 0.09,
      maxRelativePositionDrift: 0.257,
      totalAbsolutePortfolioDrift: 0.18,
      cashDrift: { targetCashWeight: 0.05, actualCashWeight: 0.04, drift: 0.01, status: 'IN_TOLERANCE' },
      concentrationDrift: { targetHHI: 0.3075, actualHHI: 0.3404, hhiDrift: 0.0329, status: 'IN_TOLERANCE' }
    },
    constraintReport: {
      overallStatus: 'WARNING',
      breachCount: 0,
      warningCount: 1,
      constraints: [
        { constraintId: 'MAX_POSITION_AAPL', configuredLimit: 0.40, actualValue: 0.44, status: 'BREACH' },
        { constraintId: 'MAX_SECTOR_Technology', configuredLimit: 0.80, actualValue: 0.776, status: 'WARNING' },
        { constraintId: 'MIN_CASH_BUFFER', configuredLimit: 0.02, actualValue: 0.04, status: 'PASS' }
      ]
    },
    triggerReport: {
      rebalanceStatus: 'REBALANCE_RECOMMENDED',
      primaryTrigger: 'THRESHOLD_DRIFT',
      activeTriggers: [
        { trigger: 'THRESHOLD_DRIFT', severity: 'HIGH', reason: 'AAPL weight (44.0%) exceeds 40.0% mandate cap.' },
        { trigger: 'DECISION_CHANGE', severity: 'MEDIUM', reason: 'JPM conviction updated to HIGH.' }
      ]
    },
    impactReport: {
      totalImplementationCost: 187.50,
      totalCostBps: 1.5,
      maxDaysToTrade: 0.2,
      expectedReturnImprovementBps: 45.0,
      netExpectedBenefitBps: 43.5,
      isEconomicallyJustified: true
    },
    qualityReport: {
      qualityScore: 'ACCEPTABLE',
      rmsWeightTrackingError: 0.052,
      maxAbsWeightError: 0.09,
      completenessRatio: 1.0
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'targetVsActual', label: 'Target vs Actual' },
    { id: 'drift', label: 'Drift Audit' },
    { id: 'constraints', label: 'Mandate Constraints' },
    { id: 'rebalance', label: 'Rebalance & Triggers' },
    { id: 'quality', label: 'Fidelity & Quality' },
    { id: 'audit', label: 'Audit Trail & DAG' }
  ];

  return (
    <div style={{ backgroundColor: '#0f172a', color: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #1e293b' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Portfolio Implementation & Monitoring</h2>
            <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px', backgroundColor: '#334155', color: '#94a3b8' }}>
              Phase 15 Institutional
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
            Portfolio: <strong style={{ color: '#e2e8f0' }}>{pkg.portfolioId}</strong> | As of: {new Date(pkg.asOf).toLocaleString()} | Policy: {pkg.policyVersion}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Cryptographic Seal</div>
            <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#38bdf8' }}>
              {pkg.packageHash ? `${pkg.packageHash.substring(0, 16)}...` : 'SEALED'}
            </div>
          </div>
          <span style={{
            fontSize: '12px',
            padding: '4px 10px',
            borderRadius: '6px',
            fontWeight: '600',
            backgroundColor: pkg.status === 'HUMAN_APPROVED' ? '#065f46' : '#854d0e',
            color: pkg.status === 'HUMAN_APPROVED' ? '#34d399' : '#fde047'
          }}>
            {pkg.status}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #334155', paddingBottom: '10px', marginBottom: '20px' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: activeTab === t.id ? '600' : '400',
              color: activeTab === t.id ? '#38bdf8' : '#94a3b8',
              backgroundColor: activeTab === t.id ? '#1e293b' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Portfolio Total Value</div>
              <div style={{ fontSize: '20px', fontWeight: '600', marginTop: '4px' }}>
                ${pkg.holdingsSnapshot?.totalValue?.toLocaleString() || 'N/A'}
              </div>
              <div style={{ fontSize: '11px', color: '#34d399', marginTop: '4px' }}>FACT (Reconciled)</div>
            </div>

            <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Rebalance Status</div>
              <div style={{ fontSize: '18px', fontWeight: '600', marginTop: '4px', color: '#fde047' }}>
                {pkg.triggerReport?.rebalanceStatus || 'NO_REBALANCE'}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>SYSTEM DECISION</div>
            </div>

            <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Max Position Drift</div>
              <div style={{ fontSize: '20px', fontWeight: '600', marginTop: '4px', color: '#f87171' }}>
                {((pkg.driftReport?.maxAbsolutePositionDrift || 0) * 100).toFixed(1)}%
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>CALCULATION</div>
            </div>

            <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Implementation Quality</div>
              <div style={{ fontSize: '20px', fontWeight: '600', marginTop: '4px', color: '#38bdf8' }}>
                {pkg.qualityReport?.qualityScore || 'ACCEPTABLE'}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>AUDIT VERIFIED</div>
            </div>
          </div>

          {/* Active Mandate Warnings / Triggers */}
          <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Active Rebalance Triggers & Mandate Alerts</h4>
            {pkg.triggerReport?.activeTriggers?.map((trig, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #334155', fontSize: '13px' }}>
                <div>
                  <strong style={{ color: trig.severity === 'HIGH' ? '#f87171' : '#fde047' }}>[{trig.trigger}]</strong> {trig.reason}
                </div>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Severity: {trig.severity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Target vs Actual */}
      {activeTab === 'targetVsActual' && (
        <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: '14px' }}>Target Allocation vs Reported Holdings</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', textAlign: 'left', color: '#94a3b8' }}>
                <th style={{ padding: '8px' }}>Ticker</th>
                <th style={{ padding: '8px' }}>Sector</th>
                <th style={{ padding: '8px' }}>Target Weight</th>
                <th style={{ padding: '8px' }}>Actual Weight</th>
                <th style={{ padding: '8px' }}>Weight Delta</th>
                <th style={{ padding: '8px' }}>Action</th>
                <th style={{ padding: '8px' }}>Order Value</th>
              </tr>
            </thead>
            <tbody>
              {pkg.implementationPlan?.orders?.map((ord, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '8px', fontWeight: '600' }}>{ord.ticker}</td>
                  <td style={{ padding: '8px', color: '#94a3b8' }}>Technology</td>
                  <td style={{ padding: '8px' }}>{(ord.targetWeight * 100).toFixed(1)}%</td>
                  <td style={{ padding: '8px' }}>{(ord.currentWeight * 100).toFixed(1)}%</td>
                  <td style={{ padding: '8px', color: ord.weightDelta > 0 ? '#34d399' : ord.weightDelta < 0 ? '#f87171' : '#94a3b8' }}>
                    {ord.weightDelta > 0 ? `+${(ord.weightDelta * 100).toFixed(1)}%` : `${(ord.weightDelta * 100).toFixed(1)}%`}
                  </td>
                  <td style={{ padding: '8px' }}>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600',
                      backgroundColor: ord.action === 'BUY' ? '#065f46' : ord.action === 'SELL' ? '#7f1d1d' : '#334155',
                      color: ord.action === 'BUY' ? '#34d399' : ord.action === 'SELL' ? '#f87171' : '#cbd5e1'
                    }}>
                      {ord.action} {Math.abs(ord.shareDelta)} sh
                    </span>
                  </td>
                  <td style={{ padding: '8px' }}>${ord.estimatedTradeValue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 5: Rebalance & Triggers */}
      {activeTab === 'rebalance' && (
        <div>
          <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px' }}>Proposed Implementation Trade Plan</h4>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                  Gross Trade Value: ${pkg.implementationPlan?.grossTradeValue?.toLocaleString()} | One-Way Turnover: {((pkg.implementationPlan?.oneWayTurnover || 0) * 100).toFixed(1)}%
                </div>
              </div>

              {pkg.implementationPlan?.approvalStatus !== 'APPROVED' ? (
                <button
                  onClick={() => onApprovePlan && onApprovePlan(pkg.implementationPlan?.planId)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Approve Implementation Plan
                </button>
              ) : (
                <span style={{ color: '#34d399', fontWeight: '600', fontSize: '13px' }}>
                  ✓ HUMAN APPROVED
                </span>
              )}
            </div>
          </div>

          <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Transaction Cost & Net Benefit Analysis</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '13px' }}>
              <div>
                <span style={{ color: '#94a3b8' }}>Total Rebalance Cost:</span>
                <div style={{ fontSize: '16px', fontWeight: '600', marginTop: '2px' }}>
                  ${pkg.impactReport?.totalImplementationCost} ({pkg.impactReport?.totalCostBps} bps)
                </div>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Expected Return Improvement:</span>
                <div style={{ fontSize: '16px', fontWeight: '600', marginTop: '2px', color: '#34d399' }}>
                  +{pkg.impactReport?.expectedReturnImprovementBps} bps
                </div>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Net Economic Benefit:</span>
                <div style={{ fontSize: '16px', fontWeight: '600', marginTop: '2px', color: '#38bdf8' }}>
                  +{pkg.impactReport?.netExpectedBenefitBps} bps
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 7: Audit Trail & DAG */}
      {activeTab === 'audit' && (
        <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>Deterministic Explanation & Audit DAG</h4>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
            Traceable causal chain connecting Phase 14 Target Portfolio $\rightarrow$ Human Approval $\rightarrow$ Plan $\rightarrow$ Holdings $\rightarrow$ Rebalance.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
            <div style={{ padding: '8px', backgroundColor: '#0f172a', borderRadius: '6px' }}>
              [1] Target Portfolio (Phase 14 Package Hash: <code style={{ color: '#38bdf8' }}>{pkg.packageHash.substring(0, 16)}...</code>)
            </div>
            <div style={{ padding: '8px', backgroundColor: '#0f172a', borderRadius: '6px' }}>
              [2] Implementation Plan Generated (Turnover: {((pkg.implementationPlan?.oneWayTurnover || 0) * 100).toFixed(1)}%)
            </div>
            <div style={{ padding: '8px', backgroundColor: '#0f172a', borderRadius: '6px' }}>
              [3] Holdings Reconciled (Completeness: 100%, Matched: 1, Drifted: 2)
            </div>
            <div style={{ padding: '8px', backgroundColor: '#0f172a', borderRadius: '6px' }}>
              [4] Rebalance Trigger Fired (Threshold Drift: AAPL &gt; 40% mandate cap)
            </div>
            <div style={{ padding: '8px', backgroundColor: '#0f172a', borderRadius: '6px' }}>
              [5] Human Signoff Boundary (Status: <strong style={{ color: '#fde047' }}>{pkg.implementationPlan?.approvalStatus}</strong>)
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
