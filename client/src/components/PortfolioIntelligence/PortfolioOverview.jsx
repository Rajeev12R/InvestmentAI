import React, { useState, useEffect } from 'react';
import ConcentrationPanel from './ConcentrationPanel.jsx';
import ExposurePanel from './ExposurePanel.jsx';
import CorrelationPanel from './CorrelationPanel.jsx';
import PortfolioChangeSummary from './PortfolioChangeSummary.jsx';
import PortfolioBenchmarkComparison from './PortfolioBenchmarkComparison.jsx';

export default function PortfolioOverview() {
  const [portfolioState, setPortfolioState] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchPortfolioState = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/portfolio-intelligence/state');
      if (res.ok) {
        const data = await res.json();
        setPortfolioState(data.state);
      }
    } catch (e) {
      console.error('Failed to fetch portfolio state:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolioState();
  }, []);

  const exposure = portfolioState?.exposureMetrics || null;
  const drift = portfolioState?.driftReport || null;
  const alerts = portfolioState?.portfolioAlerts || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Portfolio Intelligence</h2>
          <p className="text-sm text-slate-400 mt-1">
            Multi-asset portfolio concentration, pairwise correlation clustering, sector exposures, and multi-period state drift.
          </p>
        </div>

        <button
          onClick={fetchPortfolioState}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2"
        >
          {loading ? 'Refreshing...' : 'Refresh Portfolio'}
        </button>
      </div>

      {/* Portfolio Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map(a => (
            <div key={a.alertId} className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-start gap-3">
              <span className="text-amber-400 font-bold text-sm">⚠</span>
              <div className="text-xs">
                <span className="font-bold text-amber-300 block">{a.title}</span>
                <span className="text-slate-300">{a.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Concentration & Exposure Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ConcentrationPanel exposure={exposure} />
        <ExposurePanel exposure={exposure} />
      </div>

      {/* Correlation & Multi-Period Drift */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CorrelationPanel exposure={exposure} />
        <PortfolioChangeSummary driftReport={drift} />
      </div>

      {/* Phase 12 Institutional Performance & Benchmark Attribution */}
      <PortfolioBenchmarkComparison portfolioId="MAIN_PORTFOLIO" />
    </div>
  );
}
