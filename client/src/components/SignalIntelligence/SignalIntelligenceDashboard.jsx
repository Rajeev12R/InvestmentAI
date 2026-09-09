import React, { useState } from 'react';

export default function SignalIntelligenceDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [ticker, setTicker] = useState('NVDA');

  const compositeSignal = {
    entityId: ticker,
    score: 0.72,
    regime: 'STRONG_POSITIVE',
    direction: 'STRONGLY_POSITIVE',
    confidence: 0.88,
    status: 'VALIDATED',
    hasConflict: false,
    evidenceDiversityScore: 0.84,
    independentEffectiveCount: 4.8,
    methodologyVersion: '2026.1',
    knowledgeCutoff: '2026-03-01T00:00:00Z'
  };

  const contributors = [
    { type: 'FUNDAMENTAL_SIGNAL', name: 'Revenue Acceleration (YoY +125%)', normalized: 0.85, decayed: 0.85, weight: 0.25, contribution: 0.213, evidence: 'SEC EDGAR 10-K' },
    { type: 'EARNINGS_SIGNAL', name: 'Positive EPS Surprise (+12.4%)', normalized: 0.75, decayed: 0.75, weight: 0.20, contribution: 0.150, evidence: 'Quarterly Earnings Release' },
    { type: 'VALUATION_SIGNAL', name: 'DCF 15% Intrinsic Discount', normalized: 0.60, decayed: 0.60, weight: 0.20, contribution: 0.120, evidence: 'Phase 2A Valuation Model' },
    { type: 'ALTERNATIVE_DATA_SIGNAL', name: 'Datacenter Web Traffic & Supply Allocation', normalized: 0.70, decayed: 0.63, weight: 0.15, contribution: 0.095, evidence: 'SimilarWeb + TSMC Footnote' },
    { type: 'MACRO_SIGNAL', name: 'Tech Capital Investment Expansion Regime', normalized: 0.50, decayed: 0.50, weight: 0.10, contribution: 0.050, evidence: 'BEA Macro Series' },
    { type: 'REGULATORY_SIGNAL', name: 'BIS Compute Licensing Guideline (PROPOSED)', normalized: -0.20, decayed: -0.20, weight: 0.10, contribution: -0.020, evidence: 'BIS Notice of Inquiry' }
  ];

  const divergences = [
    {
      id: 'div_01',
      type: 'VALUATION_VS_FUNDAMENTALS',
      severity: 'LOW',
      description: 'DCF intrinsic discount remains moderate while fundamental revenue growth accelerates aggressively.',
      components: ['VALUATION_SIGNAL', 'FUNDAMENTAL_SIGNAL']
    },
    {
      id: 'div_02',
      type: 'MACRO_VS_COMPANY',
      severity: 'MEDIUM',
      description: 'Company-specific AI infrastructure spend outpacing overall industrial capital expenditure rates.',
      components: ['MACRO_SIGNAL', 'GROWTH_SIGNAL']
    }
  ];

  const dependencies = [
    {
      group: 'Direct Revenue Overlap',
      type: 'SHARED_UNDERLYING_FACT',
      sharedIdentifier: 'FACT_NVDA_DATACENTER_REV_Q4',
      signals: ['FUNDAMENTAL_SIGNAL (MD&A)', 'MANAGEMENT_COMMENTARY (CFO Guidance)'],
      discountFactor: 0.50
    },
    {
      group: 'Wire Syndication Wire Copy',
      type: 'DERIVED_FROM_SAME_SOURCE',
      sharedIdentifier: 'REUTERS_PR_2026_03',
      signals: ['NEWS_PORTAL_A', 'NEWS_PORTAL_B'],
      discountFactor: 0.50
    }
  ];

  const validationResults = {
    signalType: 'COMPOSITE_FUNDAMENTAL_GROWTH',
    samplePeriod: '2020-2026 (OUT_OF_SAMPLE)',
    N: 142,
    sampleStatus: 'EVALUABLE',
    hitRate: 0.684,
    falsePositiveRate: 0.182,
    falseNegativeRate: 0.134,
    informationCoefficient: 0.142,
    leadTimeDays: 24.5,
    halfLifeDays: 45,
    isHistoricallySupported: true
  };

  const portfolioSignals = {
    portfolioId: 'PORT_INSTITUTIONAL_ALPHA',
    netSignalScore: 0.54,
    grossSignalScore: 0.78,
    longExposure: 0.95,
    shortExposure: 0.15,
    grossExposure: 1.10,
    netExposure: 0.80,
    concentrationRisks: [
      {
        driver: 'AI_CAPEX_ACCELERATION',
        exposurePct: 0.48,
        affectedPositions: 6,
        severity: 'HIGH',
        description: '48% of total portfolio risk weight is tied to generative AI compute infrastructure spending.'
      }
    ]
  };

  return (
    <div style={{ padding: '24px', background: '#0a0d14', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #1e293b', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#38bdf8' }}>
            Phase 27 — Institutional Signal Fusion & Alpha Discovery Intelligence
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
            Evidence-Backed Multi-Domain Signal Synthesis, Independence Analysis & Out-of-Sample Calibration
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Entity:</span>
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            style={{ padding: '6px 12px', background: '#1e293b', border: '1px solid #334155', color: '#38bdf8', borderRadius: '6px', fontWeight: '700' }}
          />
          <span style={{ padding: '4px 8px', background: '#0369a1', color: '#ffffff', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
            KNOWLEDGE CUTOFF: 2026-03-01
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { id: 'overview', label: '1. Composite Overview' },
          { id: 'contributors', label: '2. Contributors & Attribution' },
          { id: 'divergences', label: '3. Divergence Detection' },
          { id: 'independence', label: '4. Independence & DAG' },
          { id: 'validation', label: '5. OOS Validation' },
          { id: 'decay', label: '6. Temporal Decay' },
          { id: 'portfolio', label: '7. Portfolio Signals & Concentration' },
          { id: 'methodology', label: '8. Governance & Sample Quality' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 14px',
              background: activeTab === tab.id ? '#0284c7' : '#1e293b',
              color: activeTab === tab.id ? '#ffffff' : '#94a3b8',
              border: '1px solid #334155',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '12px'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* View 1: Composite Overview */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <div style={{ background: '#131c2e', padding: '20px', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Composite Score</span>
            <div style={{ fontSize: '32px', fontWeight: '800', color: '#38bdf8', marginTop: '8px' }}>+0.72</div>
            <span style={{ fontSize: '11px', color: '#10b981' }}>Scale: [-1.00, +1.00]</span>
          </div>
          <div style={{ background: '#131c2e', padding: '20px', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Signal Regime</span>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#10b981', marginTop: '12px' }}>STRONG_POSITIVE</div>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Direction: STRONGLY_POSITIVE</span>
          </div>
          <div style={{ background: '#131c2e', padding: '20px', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Evidence Diversity Score</span>
            <div style={{ fontSize: '32px', fontWeight: '800', color: '#a855f7', marginTop: '8px' }}>0.84</div>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Independent Count: 4.8 / 6.0</span>
          </div>
          <div style={{ background: '#131c2e', padding: '20px', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Confidence & Status</span>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#e2e8f0', marginTop: '12px' }}>VALIDATED (0.88)</div>
            <span style={{ fontSize: '11px', color: '#10b981' }}>Zero Unresolved Conflicts</span>
          </div>
        </div>
      )}

      {/* View 2: Contributors & Attribution */}
      {activeTab === 'contributors' && (
        <div style={{ background: '#131c2e', padding: '20px', borderRadius: '8px', border: '1px solid #1e293b' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#38bdf8' }}>Signal Factor Contribution & Normalization Attribution</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Signal Family</th>
                <th style={{ padding: '8px' }}>Metric & Description</th>
                <th style={{ padding: '8px' }}>Normalized</th>
                <th style={{ padding: '8px' }}>Decayed</th>
                <th style={{ padding: '8px' }}>Weight</th>
                <th style={{ padding: '8px' }}>Contribution</th>
                <th style={{ padding: '8px' }}>Underlying Evidence</th>
              </tr>
            </thead>
            <tbody>
              {contributors.map((c, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '8px', fontWeight: '600', color: '#38bdf8' }}>{c.type}</td>
                  <td style={{ padding: '8px', color: '#e2e8f0' }}>{c.name}</td>
                  <td style={{ padding: '8px', color: c.normalized >= 0 ? '#10b981' : '#ef4444' }}>{c.normalized > 0 ? `+${c.normalized}` : c.normalized}</td>
                  <td style={{ padding: '8px', color: '#e2e8f0' }}>{c.decayed}</td>
                  <td style={{ padding: '8px', color: '#94a3b8' }}>{(c.weight * 100).toFixed(0)}%</td>
                  <td style={{ padding: '8px', fontWeight: '700', color: c.contribution >= 0 ? '#10b981' : '#ef4444' }}>{c.contribution > 0 ? `+${c.contribution}` : c.contribution}</td>
                  <td style={{ padding: '8px', color: '#64748b' }}>{c.evidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View 3: Divergences */}
      {activeTab === 'divergences' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {divergences.map(d => (
            <div key={d.id} style={{ background: '#131c2e', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #f59e0b', border: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#f59e0b' }}>{d.type}</span>
                <span style={{ fontSize: '11px', background: '#334155', padding: '2px 8px', borderRadius: '4px' }}>SEVERITY: {d.severity}</span>
              </div>
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#cbd5e1' }}>{d.description}</p>
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748b' }}>Components: {d.components.join(' ↔ ')}</div>
            </div>
          ))}
        </div>
      )}

      {/* View 4: Independence & DAG */}
      {activeTab === 'independence' && (
        <div style={{ background: '#131c2e', padding: '20px', borderRadius: '8px', border: '1px solid #1e293b' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#a855f7' }}>Signal Dependency DAG & Shared-Origin Discounting</h3>
          {dependencies.map((dep, i) => (
            <div key={i} style={{ background: '#0a0d14', padding: '12px', borderRadius: '6px', marginBottom: '12px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: '600', color: '#e2e8f0' }}>{dep.group} ({dep.type})</span>
                <span style={{ color: '#a855f7', fontWeight: '700' }}>Weight Discount: x{dep.discountFactor}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Shared Key: {dep.sharedIdentifier}</div>
              <div style={{ fontSize: '12px', color: '#38bdf8', marginTop: '6px' }}>Signals: {dep.signals.join(' & ')}</div>
            </div>
          ))}
        </div>
      )}

      {/* View 5: OOS Validation */}
      {activeTab === 'validation' && (
        <div style={{ background: '#131c2e', padding: '20px', borderRadius: '8px', border: '1px solid #1e293b' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#10b981' }}>Out-of-Sample Historical Predictive Validation</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
            <div style={{ background: '#0a0d14', padding: '12px', borderRadius: '6px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Sample Size (N)</span>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#e2e8f0' }}>{validationResults.N} (EVALUABLE)</div>
            </div>
            <div style={{ background: '#0a0d14', padding: '12px', borderRadius: '6px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Hit Rate</span>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#10b981' }}>{(validationResults.hitRate * 100).toFixed(1)}%</div>
            </div>
            <div style={{ background: '#0a0d14', padding: '12px', borderRadius: '6px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Information Coefficient (IC)</span>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#38bdf8' }}>+{validationResults.informationCoefficient}</div>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
            Status: <span style={{ color: '#10b981', fontWeight: '700' }}>HISTORICALLY_SUPPORTED</span> (Segregated Out-of-Sample evaluation with survivorship bias control)
          </p>
        </div>
      )}

      {/* View 7: Portfolio Signals & Concentration */}
      {activeTab === 'portfolio' && (
        <div style={{ background: '#131c2e', padding: '20px', borderRadius: '8px', border: '1px solid #1e293b' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#38bdf8' }}>Portfolio Signal Fusion & Common Driver Concentration</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
            <div style={{ background: '#0a0d14', padding: '12px', borderRadius: '6px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Net Signal Score</span>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#10b981' }}>+{portfolioSignals.netSignalScore}</div>
            </div>
            <div style={{ background: '#0a0d14', padding: '12px', borderRadius: '6px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Gross Signal Score</span>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#38bdf8' }}>+{portfolioSignals.grossSignalScore}</div>
            </div>
            <div style={{ background: '#0a0d14', padding: '12px', borderRadius: '6px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Gross Exposure</span>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#e2e8f0' }}>{(portfolioSignals.grossExposure * 100).toFixed(0)}%</div>
            </div>
            <div style={{ background: '#0a0d14', padding: '12px', borderRadius: '6px' }}>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Net Exposure</span>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#e2e8f0' }}>{(portfolioSignals.netExposure * 100).toFixed(0)}%</div>
            </div>
          </div>
          {portfolioSignals.concentrationRisks.map((risk, i) => (
            <div key={i} style={{ background: '#451a03', border: '1px solid #d97706', padding: '12px', borderRadius: '6px', color: '#fef3c7' }}>
              <div style={{ fontWeight: '700', fontSize: '13px' }}>⚠️ {risk.riskType}: {risk.driver}</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>{risk.description}</div>
            </div>
          ))}
        </div>
      )}

      {/* View 8: Methodology & Governance */}
      {activeTab === 'methodology' && (
        <div style={{ background: '#131c2e', padding: '20px', borderRadius: '8px', border: '1px solid #1e293b' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#38bdf8' }}>Institutional Signal Methodology Governance</h3>
          <ul style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.8', margin: 0, paddingLeft: '20px' }}>
            <li><strong>Invariant Rule 1:</strong> AI is strictly explanatory; authoritative composite signal scores are calculated via deterministic weighting.</li>
            <li><strong>Invariant Rule 2:</strong> Independent effective counts discount signals sharing the same underlying Knowledge Graph fact or syndicated wire source.</li>
            <li><strong>Invariant Rule 3:</strong> Conflicting directional inputs produce an explicit <code>MIXED</code> or <code>CONFLICTED</code> regime rather than synthetic averaging.</li>
            <li><strong>Invariant Rule 4:</strong> Small samples ($N &lt; 10$) are quarantined as <code>INSUFFICIENT_SAMPLE</code> and cannot claim predictive power.</li>
            <li><strong>Invariant Rule 5:</strong> Point-in-time knowledge cutoff is immutably enforced across all signal vintages.</li>
          </ul>
        </div>
      )}
    </div>
  );
}
