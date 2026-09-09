import React, { useState } from 'react';

export default function ExposureRiskDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: '1. Exposure Overview' },
    { id: 'factor_exp', label: '2. Factor Exposure' },
    { id: 'factor_risk', label: '3. Factor Risk Contribution' },
    { id: 'sector_exp', label: '4. Sector Exposure' },
    { id: 'geo_exp', label: '5. Geography Exposure' },
    { id: 'currency_exp', label: '6. Currency Exposure' },
    { id: 'rates_duration', label: '7. Rates & Duration' },
    { id: 'liquidity_exp', label: '8. Liquidity Exposure' },
    { id: 'common_drivers', label: '9. Common Drivers' },
    { id: 'hidden_conc', label: '10. Hidden Concentration' },
    { id: 'benchmark_rel', label: '11. Benchmark-Relative' },
    { id: 'macro_sens', label: '12. Macro Sensitivity' },
    { id: 'scenario_sens', label: '13. Scenario Sensitivity' },
    { id: 'exposure_chg', label: '14. Exposure Changes' },
    { id: 'compliance', label: '15. Compliance & Breaches' },
    { id: 'dag_package', label: '16. Risk Explanation DAG' }
  ];

  return (
    <div style={{
      backgroundColor: '#0d1117',
      color: '#c9d1d9',
      minHeight: '100vh',
      padding: '24px',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #30363d',
        paddingBottom: '16px',
        marginBottom: '20px'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#58a6ff', fontWeight: '600' }}>
            Institutional Factor, Exposure & Risk Decomposition Intelligence
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#8b949e', fontSize: '13px' }}>
            Phase 30 — Deterministic Multi-Factor Decomposition, Marginal Risk Contribution, Common-Driver Bottlenecks & Sealed Explanation DAG
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <span style={{
            backgroundColor: '#238636',
            color: '#ffffff',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            Point-in-Time Safe
          </span>
          <span style={{
            backgroundColor: '#1f6feb',
            color: '#ffffff',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            Cryptographically Sealed
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '6px',
        overflowX: 'auto',
        borderBottom: '1px solid #21262d',
        paddingBottom: '8px',
        marginBottom: '20px'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              backgroundColor: activeTab === tab.id ? '#21262d' : 'transparent',
              color: activeTab === tab.id ? '#58a6ff' : '#8b949e',
              border: activeTab === tab.id ? '1px solid #388bfd' : '1px solid transparent',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div style={{
        backgroundColor: '#161b22',
        border: '1px solid #30363d',
        borderRadius: '8px',
        padding: '20px'
      }}>
        {activeTab === 'overview' && (
          <div>
            <h3 style={{ marginTop: 0, color: '#f0f6fc' }}>Portfolio Exposure & Risk Decomposition Overview</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
              <div style={{ backgroundColor: '#0d1117', padding: '14px', borderRadius: '6px', border: '1px solid #30363d' }}>
                <div style={{ fontSize: '11px', color: '#8b949e' }}>Gross / Net Exposure</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#58a6ff' }}>130.0% / 90.0%</div>
                <div style={{ fontSize: '11px', color: '#8b949e' }}>Long: 110.0% | Short: 20.0%</div>
              </div>
              <div style={{ backgroundColor: '#0d1117', padding: '14px', borderRadius: '6px', border: '1px solid #30363d' }}>
                <div style={{ fontSize: '11px', color: '#8b949e' }}>Total Annualized Volatility</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#d29922' }}>16.42%</div>
                <div style={{ fontSize: '11px', color: '#3fb950' }}>Systematic: 12.80% | Idio: 10.28%</div>
              </div>
              <div style={{ backgroundColor: '#0d1117', padding: '14px', borderRadius: '6px', border: '1px solid #30363d' }}>
                <div style={{ fontSize: '11px', color: '#8b949e' }}>Common Driver HHI</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f85149' }}>0.342</div>
                <div style={{ fontSize: '11px', color: '#f85149' }}>Hidden Concentration Detected</div>
              </div>
              <div style={{ backgroundColor: '#0d1117', padding: '14px', borderRadius: '6px', border: '1px solid #30363d' }}>
                <div style={{ fontSize: '11px', color: '#8b949e' }}>Compliance Status</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3fb950' }}>COMPLIANT</div>
                <div style={{ fontSize: '11px', color: '#3fb950' }}>0 Mandate Breaches</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
              <div style={{ backgroundColor: '#0d1117', padding: '16px', borderRadius: '6px', border: '1px solid #30363d' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#c9d1d9' }}>Multi-Factor Beta Decomposition</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #21262d' }}>
                    <span>Market Equity Beta</span>
                    <span style={{ color: '#58a6ff', fontWeight: '600' }}>1.08 (Active: +0.08)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #21262d' }}>
                    <span>Size (SMB) Beta</span>
                    <span style={{ color: '#3fb950', fontWeight: '600' }}>+0.22 (Small/Mid Tilt)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #21262d' }}>
                    <span>Momentum (WML) Beta</span>
                    <span style={{ color: '#3fb950', fontWeight: '600' }}>+0.35 (Momentum Overweight)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #21262d' }}>
                    <span>Value (HML) Beta</span>
                    <span style={{ color: '#f85149', fontWeight: '600' }}>-0.18 (Growth Tilt)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #21262d' }}>
                    <span>Effective Duration (Years)</span>
                    <span style={{ color: '#8b949e', fontWeight: '600' }}>2.14 yrs (DV01: $214 / $1M)</span>
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: '#0d1117', padding: '16px', borderRadius: '6px', border: '1px solid #30363d' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#c9d1d9' }}>Hidden Concentration Warnings</h4>
                <div style={{ fontSize: '12px', color: '#8b949e', lineHeight: '1.6' }}>
                  <p><strong>Primary Bottleneck:</strong> TSMC Advanced Packaging (58.4% weight)</p>
                  <p><strong>Customer Overlap:</strong> Cloud Hyperscalers (42.0% weight)</p>
                  <p><strong>Nominal Security HHI:</strong> 0.045 (Effective: 22.2 bets)</p>
                  <p><strong>Common Driver HHI:</strong> 0.342 (Effective: 2.9 drivers)</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab !== 'overview' && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#8b949e' }}>
            <h3 style={{ color: '#58a6ff', marginBottom: '8px' }}>
              {tabs.find(t => t.id === activeTab)?.label}
            </h3>
            <p style={{ fontSize: '13px' }}>
              Institutional interactive visualization with look-through expansion, marginal risk contribution derivation, and sealed explanation DAG inspection.
            </p>
            <div style={{
              display: 'inline-block',
              marginTop: '16px',
              padding: '8px 16px',
              backgroundColor: '#21262d',
              borderRadius: '6px',
              color: '#3fb950',
              fontFamily: 'monospace',
              fontSize: '12px'
            }}>
              API Endpoint: /api/exposure-risk/{activeTab}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
