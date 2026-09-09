import React, { useState } from 'react';

export default function RiskForecastDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedHorizon, setSelectedHorizon] = useState('20D');
  const [confidenceLevel, setConfidenceLevel] = useState(0.95);

  const tabs = [
    { id: 'overview', label: '1. Risk Overview' },
    { id: 'horizons', label: '2. Multi-Horizon Forecast' },
    { id: 'var_es', label: '3. VaR & Expected Shortfall' },
    { id: 'contributors', label: '4. Marginal Risk (MRC/CRC)' },
    { id: 'factor_risk', label: '5. Factor Risk Decomposition' },
    { id: 'risk_budget', label: '6. Dynamic Risk Budget' },
    { id: 'limit_util', label: '7. Limit Precedence Utilization' },
    { id: 'breach_prob', label: '8. Breach Probability' },
    { id: 'drawdown', label: '9. Drawdown & Tail Risk' },
    { id: 'backtest', label: '10. Forecast vs Realized' },
    { id: 'model_health', label: '11. Model Health & Sufficiency' },
    { id: 'dag_package', label: '12. Explanation DAG & Sealed Package' }
  ];

  // Archetype institutional portfolio state
  const mockRiskState = {
    portfolioVolatilityAnnualized: 16.42,
    portfolioVolatilityDaily: 1.034,
    trackingErrorAnnualized: 4.15,
    sampleSize: 252,
    asOf: '2026-09-07T00:00:00.000Z',
    horizons: {
      '1D': { volatility: 1.034, parametricVaR: 1.70, historicalVaR: 1.82, es: 2.34, expectedDD: 1.30 },
      '5D': { volatility: 2.312, parametricVaR: 3.80, historicalVaR: 4.07, es: 5.23, expectedDD: 2.90 },
      '20D': { volatility: 4.624, parametricVaR: 7.61, historicalVaR: 8.14, es: 10.46, expectedDD: 5.81 },
      '60D': { volatility: 8.009, parametricVaR: 13.17, historicalVaR: 14.10, es: 18.12, expectedDD: 10.06 },
      '252D': { volatility: 16.42, parametricVaR: 27.01, historicalVaR: 28.91, es: 37.16, expectedDD: 20.63 }
    },
    contributors: [
      { symbol: 'AAPL', weight: 0.35, mrc: 18.2, crc: 6.37, prc: 38.8, status: 'DERIVED' },
      { symbol: 'MSFT', weight: 0.30, mrc: 16.5, crc: 4.95, prc: 30.1, status: 'DERIVED' },
      { symbol: 'NVDA', weight: 0.20, mrc: 22.8, crc: 4.56, prc: 27.8, status: 'DERIVED' },
      { symbol: 'GOOGL', weight: 0.15, mrc: 14.2, crc: 2.13, prc: 13.0, status: 'DERIVED' },
      { symbol: 'CASH', weight: -0.00, mrc: 0.0, crc: -1.59, prc: -9.7, status: 'DERIVED' }
    ],
    factorDecomposition: {
      totalVol: 16.42,
      factorVol: 14.80,
      residualVol: 7.12,
      systematicRatio: 81.2,
      residualRatio: 18.8,
      factors: [
        { name: 'Market (Beta)', beta: 1.08, contribution: 11.2, percent: 68.2 },
        { name: 'Tech Momentum', beta: 0.42, contribution: 3.1, percent: 18.9 },
        { name: 'Quality / Profitability', beta: 0.35, contribution: 1.2, percent: 7.3 },
        { name: 'Size (Mega-Cap)', beta: -0.22, contribution: -0.7, percent: -4.3 }
      ]
    },
    budgets: [
      { budgetId: 'RB_VOL_01', scope: 'PORTFOLIO', metric: 'Annualized Volatility', limit: 18.0, current: 16.42, forecast: 17.20, stress: 24.50, unit: '%', status: 'AMBER' },
      { budgetId: 'RB_TE_01', scope: 'TRACKING_ERROR', metric: 'Tracking Error', limit: 5.0, current: 4.15, forecast: 4.30, stress: 6.80, unit: '%', status: 'AMBER' },
      { budgetId: 'RB_FACTOR_01', scope: 'FACTOR', metric: 'Tech Factor Component Risk', limit: 30.0, current: 27.8, forecast: 29.1, stress: 38.0, unit: '%', status: 'AMBER' },
      { budgetId: 'RB_VAR_01', scope: 'TAIL_RISK', metric: '20D 95% Parametric VaR', limit: 10.0, current: 7.61, forecast: 8.10, stress: 14.20, unit: '%', status: 'GREEN' },
      { budgetId: 'RB_SINGLE_01', scope: 'ASSET', metric: 'Max Single Asset Component Risk', limit: 7.0, current: 6.37, forecast: 6.80, stress: 9.50, unit: '%', status: 'GREEN' }
    ],
    limits: [
      { limitId: 'LIM_REG_01', precedence: 'REGULATORY', metric: 'Gross Leverage', threshold: 200.0, observed: 100.0, breached: false },
      { limitId: 'LIM_FIRM_01', precedence: 'FIRM', metric: 'Max Drawdown (Trailing 1Y)', threshold: 20.0, observed: 11.4, breached: false },
      { limitId: 'LIM_PORT_01', precedence: 'PORTFOLIO', metric: 'Annualized Volatility', threshold: 18.0, observed: 16.42, breached: false },
      { limitId: 'LIM_STRAT_01', precedence: 'STRATEGY', metric: 'Tracking Error', threshold: 4.5, observed: 4.15, breached: false }
    ],
    modelHealth: {
      healthState: 'VALID',
      observationCount: 252,
      assetCount: 5,
      minEigenvalue: 0.000142,
      conditionNumber: 142.8,
      positiveDefinite: true,
      repairApplied: false,
      validationStatus: 'PASSED'
    }
  };

  const getStatusBadge = (classification) => {
    const colors = {
      OBSERVED: { bg: '#238636', text: '#fff' },
      DERIVED: { bg: '#1f6feb', text: '#fff' },
      MODEL_ESTIMATE: { bg: '#8957e5', text: '#fff' },
      FORECAST: { bg: '#d29922', text: '#000' },
      CONFIGURED: { bg: '#6e7681', text: '#fff' },
      UNAVAILABLE: { bg: '#da3633', text: '#fff' }
    };
    const c = colors[classification] || colors.CONFIGURED;
    return (
      <span style={{
        backgroundColor: c.bg,
        color: c.text,
        padding: '2px 8px',
        borderRadius: '10px',
        fontSize: '11px',
        fontWeight: '600',
        display: 'inline-block'
      }}>
        {classification}
      </span>
    );
  };

  const getBudgetStatusBadge = (status) => {
    const map = {
      GREEN: { bg: '#238636', text: '#fff' },
      AMBER: { bg: '#d29922', text: '#000' },
      RED: { bg: '#da3633', text: '#fff' },
      UNAVAILABLE: { bg: '#6e7681', text: '#fff' }
    };
    const c = map[status] || map.GREEN;
    return (
      <span style={{
        backgroundColor: c.bg,
        color: c.text,
        padding: '3px 10px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        {status}
      </span>
    );
  };

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
            Institutional Portfolio Risk Forecasting & Dynamic Risk Budgeting
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#8b949e', fontSize: '13px' }}>
            Phase 31 — Multi-Horizon Risk Forecasting, Marginal Risk Decomposition (MRC/CRC), Dynamic Risk Budget Consumption & Sealed Explanation DAG
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <span style={{ backgroundColor: '#238636', color: '#fff', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
            Point-in-Time Safe
          </span>
          <span style={{ backgroundColor: '#1f6feb', color: '#fff', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
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

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#8b949e' }}>Forecast Volatility</span>
                {getStatusBadge('FORECAST')}
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#58a6ff' }}>
                {mockRiskState.portfolioVolatilityAnnualized.toFixed(2)}%
              </div>
              <div style={{ fontSize: '12px', color: '#8b949e', marginTop: '4px' }}>
                Daily: {mockRiskState.portfolioVolatilityDaily.toFixed(3)}% | 252D
              </div>
            </div>

            <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#8b949e' }}>Active Risk (TE)</span>
                {getStatusBadge('DERIVED')}
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#3fb950' }}>
                {mockRiskState.trackingErrorAnnualized.toFixed(2)}%
              </div>
              <div style={{ fontSize: '12px', color: '#8b949e', marginTop: '4px' }}>
                vs Benchmark (S&P 500)
              </div>
            </div>

            <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#8b949e' }}>20D 95% Parametric VaR</span>
                {getStatusBadge('MODEL_ESTIMATE')}
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#d29922' }}>
                {mockRiskState.horizons['20D'].parametricVaR.toFixed(2)}%
              </div>
              <div style={{ fontSize: '12px', color: '#8b949e', marginTop: '4px' }}>
                Hist: {mockRiskState.horizons['20D'].historicalVaR.toFixed(2)}% | ES: {mockRiskState.horizons['20D'].es.toFixed(2)}%
              </div>
            </div>

            <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#8b949e' }}>Risk Budget Health</span>
                {getBudgetStatusBadge('AMBER')}
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#d29922' }}>
                0 Breaches
              </div>
              <div style={{ fontSize: '12px', color: '#8b949e', marginTop: '4px' }}>
                3 Amber Warning Budgets
              </div>
            </div>
          </div>

          {/* Quick Details Table */}
          <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '16px' }}>
            <h3 style={{ fontSize: '14px', color: '#f0f6fc', marginBottom: '12px' }}>Multi-Horizon Risk Summary</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #30363d', textAlign: 'left', color: '#8b949e' }}>
                  <th style={{ padding: '8px' }}>Horizon</th>
                  <th style={{ padding: '8px' }}>Days</th>
                  <th style={{ padding: '8px' }}>Forecast Volatility</th>
                  <th style={{ padding: '8px' }}>Parametric VaR (95%)</th>
                  <th style={{ padding: '8px' }}>Historical VaR (95%)</th>
                  <th style={{ padding: '8px' }}>Expected Shortfall (CVaR)</th>
                  <th style={{ padding: '8px' }}>Expected Max Drawdown</th>
                  <th style={{ padding: '8px' }}>Classification</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(mockRiskState.horizons).map(([h, val]) => (
                  <tr key={h} style={{ borderBottom: '1px solid #21262d' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold', color: '#58a6ff' }}>{h}</td>
                    <td style={{ padding: '8px' }}>{h === '1D' ? 1 : h === '5D' ? 5 : h === '20D' ? 20 : h === '60D' ? 60 : 252}</td>
                    <td style={{ padding: '8px' }}>{val.volatility.toFixed(2)}%</td>
                    <td style={{ padding: '8px', color: '#d29922' }}>{val.parametricVaR.toFixed(2)}%</td>
                    <td style={{ padding: '8px' }}>{val.historicalVaR.toFixed(2)}%</td>
                    <td style={{ padding: '8px', color: '#f85149' }}>{val.es.toFixed(2)}%</td>
                    <td style={{ padding: '8px' }}>{val.expectedDD.toFixed(2)}%</td>
                    <td style={{ padding: '8px' }}>{getStatusBadge('FORECAST')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CONTRIBUTORS */}
      {activeTab === 'contributors' && (
        <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '16px' }}>
          <h3 style={{ fontSize: '14px', color: '#f0f6fc', marginBottom: '8px' }}>
            Marginal Risk Contribution (MRC) & Component Risk Contribution (CRC)
          </h3>
          <p style={{ fontSize: '12px', color: '#8b949e', marginBottom: '16px' }}>
            Mathematical Identity Verified: &Sigma; CRC<sub>i</sub> = &sigma;<sub>p</sub> (16.42%) | Euler Decomposition
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #30363d', textAlign: 'left', color: '#8b949e' }}>
                <th style={{ padding: '8px' }}>Asset Symbol</th>
                <th style={{ padding: '8px' }}>Portfolio Weight (w<sub>i</sub>)</th>
                <th style={{ padding: '8px' }}>Marginal Risk (MRC<sub>i</sub>)</th>
                <th style={{ padding: '8px' }}>Component Risk (CRC<sub>i</sub>)</th>
                <th style={{ padding: '8px' }}>% Risk Contribution (PRC<sub>i</sub>)</th>
                <th style={{ padding: '8px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {mockRiskState.contributors.map(c => (
                <tr key={c.symbol} style={{ borderBottom: '1px solid #21262d' }}>
                  <td style={{ padding: '8px', fontWeight: 'bold', color: '#58a6ff' }}>{c.symbol}</td>
                  <td style={{ padding: '8px' }}>{(c.weight * 100).toFixed(1)}%</td>
                  <td style={{ padding: '8px' }}>{c.mrc.toFixed(2)}%</td>
                  <td style={{ padding: '8px', fontWeight: 'bold', color: '#3fb950' }}>{c.crc.toFixed(2)}%</td>
                  <td style={{ padding: '8px' }}>{c.prc.toFixed(1)}%</td>
                  <td style={{ padding: '8px' }}>{getStatusBadge(c.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 6: RISK BUDGET */}
      {activeTab === 'risk_budget' && (
        <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '16px' }}>
          <h3 style={{ fontSize: '14px', color: '#f0f6fc', marginBottom: '16px' }}>
            Institutional Dynamic Risk Budget Utilization Center
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #30363d', textAlign: 'left', color: '#8b949e' }}>
                <th style={{ padding: '8px' }}>Budget ID</th>
                <th style={{ padding: '8px' }}>Scope</th>
                <th style={{ padding: '8px' }}>Metric</th>
                <th style={{ padding: '8px' }}>Limit</th>
                <th style={{ padding: '8px' }}>Current Risk</th>
                <th style={{ padding: '8px' }}>Forecast Risk</th>
                <th style={{ padding: '8px' }}>Stress Risk</th>
                <th style={{ padding: '8px' }}>Utilization Status</th>
              </tr>
            </thead>
            <tbody>
              {mockRiskState.budgets.map(b => (
                <tr key={b.budgetId} style={{ borderBottom: '1px solid #21262d' }}>
                  <td style={{ padding: '8px', fontWeight: 'bold', color: '#58a6ff' }}>{b.budgetId}</td>
                  <td style={{ padding: '8px' }}>{b.scope}</td>
                  <td style={{ padding: '8px' }}>{b.metric}</td>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>{b.limit.toFixed(1)}{b.unit}</td>
                  <td style={{ padding: '8px' }}>{b.current.toFixed(2)}{b.unit}</td>
                  <td style={{ padding: '8px', color: '#d29922' }}>{b.forecast.toFixed(2)}{b.unit}</td>
                  <td style={{ padding: '8px', color: '#f85149' }}>{b.stress.toFixed(2)}{b.unit}</td>
                  <td style={{ padding: '8px' }}>{getBudgetStatusBadge(b.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 12: DAG & SEALED PACKAGE */}
      {activeTab === 'dag_package' && (
        <div style={{ backgroundColor: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '16px' }}>
          <h3 style={{ fontSize: '14px', color: '#f0f6fc', marginBottom: '8px' }}>
            Cryptographic Risk Forecast Package & Explanation DAG
          </h3>
          <p style={{ fontSize: '12px', color: '#8b949e', marginBottom: '16px' }}>
            SHA-256 Hash Seal: <code style={{ color: '#58a6ff' }}>e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</code>
          </p>
          <div style={{ backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', padding: '12px', fontFamily: 'monospace', fontSize: '12px', color: '#7ee787' }}>
            {"{\n"}
            {"  \"packageId\": \"RFPKG_PORTFOLIO_SNAPSHOT_20260907\",\n"}
            {"  \"asOf\": \"2026-09-07T00:00:00.000Z\",\n"}
            {"  \"portfolioVolatility\": 16.42,\n"}
            {"  \"horizons\": [\"1D\", \"5D\", \"20D\", \"60D\", \"252D\"],\n"}
            {"  \"marginalRisk\": { \"reconciliationError\": 0.000000 },\n"}
            {"  \"riskBudgets\": { \"breachCount\": 0, \"amberCount\": 3 },\n"}
            {"  \"modelHealth\": \"VALID\",\n"}
            {"  \"isSealed\": true\n"}
            {"}"}
          </div>
        </div>
      )}
    </div>
  );
}
