import React, { useState } from 'react';

export default function PerformanceSkillDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: '1. Executive Overview' },
    { id: 'measurement', label: '2. Return & Risk Metrics' },
    { id: 'benchmark', label: '3. Benchmark & Relative' },
    { id: 'factors', label: '4. Factor Exposure & Betas' },
    { id: 'timing', label: '5. Market & Asset Timing' },
    { id: 'selection', label: '6. Security Selection Skill' },
    { id: 'allocation', label: '7. Sector Allocation' },
    { id: 'signals', label: '8. Signal Skill Bridge' },
    { id: 'process', label: '9. Process Discipline' },
    { id: 'persistence', label: '10. Rolling Persistence' },
    { id: 'regimes', label: '11. Regime Conditionality' },
    { id: 'luck', label: '12. Luck & Bootstrap Significance' },
    { id: 'capacity', label: '13. Capacity & Scalability' },
    { id: 'scorecard', label: '14. Manager Scorecard' },
    { id: 'dag_package', label: '15. Explanation DAG & Seal' }
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
            Institutional Performance Measurement & Manager Skill Intelligence
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#8b949e', fontSize: '13px' }}>
            Phase 29 — Deterministic Skill Decomposition, Multi-Factor Alpha, Persistence, Bootstrap Significance & Cryptographic Sealing
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
            Skill vs Luck Validated
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
            <h3 style={{ marginTop: 0, color: '#f0f6fc' }}>Executive Performance & Skill Evaluation</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
              <div style={{ backgroundColor: '#0d1117', padding: '14px', borderRadius: '6px', border: '1px solid #30363d' }}>
                <div style={{ fontSize: '11px', color: '#8b949e' }}>Manager Skill Score</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3fb950' }}>84.5 / 100</div>
                <div style={{ fontSize: '11px', color: '#3fb950' }}>SUPPORTED_SKILL_INDICATOR</div>
              </div>
              <div style={{ backgroundColor: '#0d1117', padding: '14px', borderRadius: '6px', border: '1px solid #30363d' }}>
                <div style={{ fontSize: '11px', color: '#8b949e' }}>Factor-Adjusted Alpha (Ann.)</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#58a6ff' }}>+3.42%</div>
                <div style={{ fontSize: '11px', color: '#58a6ff' }}>t-stat: 2.34 (p &lt; 0.02)</div>
              </div>
              <div style={{ backgroundColor: '#0d1117', padding: '14px', borderRadius: '6px', border: '1px solid #30363d' }}>
                <div style={{ fontSize: '11px', color: '#8b949e' }}>Sharpe / Information Ratio</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#d29922' }}>1.48 / 0.82</div>
                <div style={{ fontSize: '11px', color: '#8b949e' }}>Tracking Error: 4.15%</div>
              </div>
              <div style={{ backgroundColor: '#0d1117', padding: '14px', borderRadius: '6px', border: '1px solid #30363d' }}>
                <div style={{ fontSize: '11px', color: '#8b949e' }}>Persistence & Discipline</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3fb950' }}>PERSISTENT</div>
                <div style={{ fontSize: '11px', color: '#3fb950' }}>Process: DISCIPLINED (100% adherence)</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
              <div style={{ backgroundColor: '#0d1117', padding: '16px', borderRadius: '6px', border: '1px solid #30363d' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#c9d1d9' }}>Multi-Dimensional Skill Decomposition</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #21262d' }}>
                    <span>Security Selection (Breadth: 45, Hit Rate: 62.2%)</span>
                    <span style={{ color: '#3fb950', fontWeight: '600' }}>+2.10% (Score: 88)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #21262d' }}>
                    <span>Sector Allocation (Brinson-Fachler Overweights)</span>
                    <span style={{ color: '#3fb950', fontWeight: '600' }}>+0.75% (Score: 72)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #21262d' }}>
                    <span>Market & Factor Timing (Treynor-Mazuy Gamma)</span>
                    <span style={{ color: '#3fb950', fontWeight: '600' }}>+0.57% (Score: 68)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #21262d' }}>
                    <span>Systematic Factor Betas (Market + Momentum)</span>
                    <span style={{ color: '#58a6ff', fontWeight: '600' }}>+6.80% (Systematic)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #21262d' }}>
                    <span>Capacity / Liquidity Drag ($120M AUM)</span>
                    <span style={{ color: '#f85149', fontWeight: '600' }}>-0.22% (Low Risk)</span>
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: '#0d1117', padding: '16px', borderRadius: '6px', border: '1px solid #30363d' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#c9d1d9' }}>Statistical Significance & Governance</h4>
                <div style={{ fontSize: '12px', color: '#8b949e', lineHeight: '1.6' }}>
                  <p><strong>Bootstrap 95% Alpha CI:</strong> [+0.85%, +5.95%]</p>
                  <p><strong>Probability Alpha &gt; 0:</strong> 98.6%</p>
                  <p><strong>Multiple-Testing Haircut:</strong> PASSED (Bonferroni)</p>
                  <p><strong>Package Seal:</strong> SHA-256 Verified (10 DAG Nodes)</p>
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
              Interactive institutional visualization with point-in-time filtering, parameter isolation, and live Copilot inspection tools.
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
              API Endpoint: /api/performance-skill/{activeTab}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
