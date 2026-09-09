import React, { useState, useEffect } from 'react';

export default function AuditLogView({ workspaceId = 'default' }) {
  const [events, setEvents] = useState([]);
  const [integrity, setIntegrity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchAudit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/governance/audit?limit=50', {
        headers: { 'x-workspace-id': workspaceId }
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        setIntegrity(data.integrity || null);
      }
    } catch (err) {
      console.error('Failed to load audit trail', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit();
  }, [workspaceId]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/governance/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-workspace-id': workspaceId },
        body: JSON.stringify({ exportType: 'FULL_WORKSPACE' })
      });
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `compliance_export_${workspaceId}_${Date.now()}.json`;
        a.click();
      }
    } catch (err) {
      console.error('Failed export', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ padding: '1.5rem', background: '#0f172a', borderRadius: '12px', color: '#f8fafc' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Immutable Audit Trail</h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '4px 0 0 0' }}>Cryptographically chained, append-only institutional event ledger.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {integrity && (
            <span style={{
              fontSize: '0.75rem',
              padding: '4px 8px',
              borderRadius: '6px',
              background: integrity.isValid ? '#064e3b' : '#7f1d1d',
              color: integrity.isValid ? '#6ee7b7' : '#fca5a5'
            }}>
              {integrity.isValid ? `✓ SHA-256 Chain Verified (${integrity.totalEvents} events)` : '✗ Chain Corrupted'}
            </span>
          )}
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{ padding: '6px 12px', borderRadius: '6px', background: '#3b82f6', color: '#fff', fontSize: '0.8rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}
          >
            {exporting ? 'Exporting...' : 'Compliance Export'}
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8' }}>Verifying & loading audit trail...</p>
      ) : (
        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', textAlign: 'left', color: '#94a3b8' }}>
                <th style={{ padding: '8px' }}>Timestamp</th>
                <th style={{ padding: '8px' }}>Action</th>
                <th style={{ padding: '8px' }}>Actor</th>
                <th style={{ padding: '8px' }}>Resource</th>
                <th style={{ padding: '8px' }}>Result</th>
                <th style={{ padding: '8px' }}>Event Hash</th>
              </tr>
            </thead>
            <tbody>
              {events.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '8px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{new Date(e.timestamp).toLocaleTimeString()}</td>
                  <td style={{ padding: '8px', fontWeight: 600, color: '#38bdf8' }}>{e.action}</td>
                  <td style={{ padding: '8px', color: '#cbd5e1' }}>{e.actorId}</td>
                  <td style={{ padding: '8px', color: '#94a3b8' }}>{e.resourceType}: {e.resourceId}</td>
                  <td style={{ padding: '8px' }}>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      background: e.result === 'SUCCESS' ? '#064e3b' : '#7f1d1d',
                      color: e.result === 'SUCCESS' ? '#86efac' : '#fca5a5'
                    }}>
                      {e.result}
                    </span>
                  </td>
                  <td style={{ padding: '8px', fontFamily: 'monospace', color: '#64748b', fontSize: '0.7rem' }}>
                    {e.hash ? `${e.hash.slice(0, 8)}...${e.hash.slice(-6)}` : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
