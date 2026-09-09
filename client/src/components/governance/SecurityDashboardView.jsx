import React, { useState, useEffect } from 'react';

export default function SecurityDashboardView({ workspaceId = 'default' }) {
  const [metrics, setMetrics] = useState(null);
  const [ready, setReady] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const [resMetrics, resReady] = await Promise.all([
        fetch('/metrics'),
        fetch('/ready')
      ]);
      if (resMetrics.ok) setMetrics(await resMetrics.json());
      if (resReady.ok) setReady(await resReady.json());
    } catch (err) {
      console.error('Failed to load metrics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '1.5rem', background: '#0f172a', borderRadius: '12px', color: '#f8fafc' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Security & Infrastructure Health</h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '4px 0 0 0' }}>Live operational telemetry, rate-limiting, and tenant isolation status.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', background: ready?.status === 'READY' ? '#064e3b' : '#7f1d1d', color: ready?.status === 'READY' ? '#6ee7b7' : '#fca5a5' }}>
            System: {ready?.status || 'CHECKING'}
          </span>
        </div>
      </div>

      {loading && !metrics ? (
        <p style={{ color: '#94a3b8' }}>Loading telemetry...</p>
      ) : metrics ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ background: '#1e293b', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>HTTP Requests Total</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#38bdf8' }}>{metrics.requests?.total || 0}</div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Errors: {metrics.requests?.errors || 0}</div>
          </div>

          <div style={{ background: '#1e293b', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Auth & Rate Violations</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f87171' }}>
              {(metrics.requests?.authFailures || 0) + (metrics.requests?.rateLimitExceeded || 0)}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
              Auth: {metrics.requests?.authFailures || 0} | Rate: {metrics.requests?.rateLimitExceeded || 0}
            </div>
          </div>

          <div style={{ background: '#1e293b', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Latency (Avg / P95)</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#4ade80' }}>
              {metrics.latencyMs?.avg || 0}ms
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>P95: {metrics.latencyMs?.p95 || 0}ms</div>
          </div>

          <div style={{ background: '#1e293b', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Job Queue State</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fbbf24' }}>
              {metrics.jobQueue?.queued || 0} queued
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Total Processed: {metrics.jobQueue?.totalJobs || 0}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
