import React, { useState, useEffect } from 'react';

export default function ApiKeyManagementView({ workspaceId = 'default' }) {
  const [keys, setKeys] = useState([]);
  const [keyName, setKeyName] = useState('');
  const [createdSecret, setCreatedSecret] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/keys', {
        headers: { 'x-workspace-id': workspaceId }
      });
      if (res.ok) {
        const data = await res.json();
        setKeys(data.apiKeys || []);
      }
    } catch (err) {
      console.error('Failed to load API keys', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, [workspaceId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-workspace-id': workspaceId },
        body: JSON.stringify({ name: keyName || 'Service Key', scopes: ['copilot.read', 'truth.read', 'decision.read'] })
      });
      if (res.ok) {
        const data = await res.json();
        setCreatedSecret(data.rawSecret);
        setKeyName('');
        fetchKeys();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRevoke = async (keyId) => {
    if (!window.confirm('Revoke this API key? This action is immediate and permanent.')) return;
    try {
      const res = await fetch(`/api/auth/keys/${keyId}`, {
        method: 'DELETE',
        headers: { 'x-workspace-id': workspaceId }
      });
      if (res.ok) {
        fetchKeys();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: '1.5rem', background: '#0f172a', borderRadius: '12px', color: '#f8fafc' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Workspace API Keys</h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '4px 0 0 0' }}>Workspace-scoped API credentials for programmatic intelligence access.</p>
        </div>
      </div>

      {createdSecret && (
        <div style={{ background: '#064e3b', border: '1px solid #059669', padding: '12px', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <div style={{ color: '#6ee7b7', fontWeight: 600, fontSize: '0.85rem' }}>API Key Created Successfully (Copy now — will never be shown again):</div>
          <code style={{ display: 'block', background: '#022c22', padding: '8px', marginTop: '6px', borderRadius: '4px', color: '#a7f3d0', fontSize: '0.85rem', wordBreak: 'break-all' }}>
            {createdSecret}
          </code>
        </div>
      )}

      {/* Create Key Form */}
      <form onSubmit={handleCreate} style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', background: '#1e293b', padding: '12px', borderRadius: '8px' }}>
        <input
          type="text"
          placeholder="Key Description / Service Name"
          value={keyName}
          onChange={e => setKeyName(e.target.value)}
          style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }}
        />
        <button
          type="submit"
          style={{ padding: '8px 16px', borderRadius: '6px', background: '#10b981', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer' }}
        >
          Generate Key
        </button>
      </form>

      {/* Keys List */}
      {loading ? (
        <p style={{ color: '#94a3b8' }}>Loading keys...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155', textAlign: 'left', color: '#94a3b8' }}>
              <th style={{ padding: '10px' }}>Name</th>
              <th style={{ padding: '10px' }}>Key Mask</th>
              <th style={{ padding: '10px' }}>Scopes</th>
              <th style={{ padding: '10px' }}>Expires</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {keys.map(k => (
              <tr key={k.keyId} style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: '10px', fontWeight: 600 }}>{k.name}</td>
                <td style={{ padding: '10px', fontFamily: 'monospace', color: '#cbd5e1' }}>{k.maskedKey}</td>
                <td style={{ padding: '10px' }}>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {k.scopes.map(s => (
                      <span key={s} style={{ background: '#1e293b', color: '#38bdf8', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem' }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </td>
                <td style={{ padding: '10px', color: '#94a3b8' }}>{new Date(k.expiresAt).toLocaleDateString()}</td>
                <td style={{ padding: '10px', textAlign: 'right' }}>
                  <button
                    onClick={() => handleRevoke(k.keyId)}
                    style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                  >
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
