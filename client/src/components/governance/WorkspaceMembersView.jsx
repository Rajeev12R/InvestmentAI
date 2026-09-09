import React, { useState, useEffect } from 'react';

export default function WorkspaceMembersView({ workspaceId = 'default' }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('ANALYST');
  const [message, setMessage] = useState(null);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/governance/members`, {
        headers: { 'x-workspace-id': workspaceId }
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch (err) {
      console.error('Failed to load members', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [workspaceId]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    try {
      const res = await fetch('/api/governance/members/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-workspace-id': workspaceId },
        body: JSON.stringify({ userId: inviteEmail, role: inviteRole })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: `Invited ${inviteEmail} as ${inviteRole}` });
        setInviteEmail('');
        fetchMembers();
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'Failed to invite member' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleRemove = async (userId) => {
    if (!window.confirm(`Remove user ${userId} from workspace?`)) return;
    try {
      const res = await fetch(`/api/governance/members/${userId}`, {
        method: 'DELETE',
        headers: { 'x-workspace-id': workspaceId }
      });
      if (res.ok) {
        fetchMembers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: '1.5rem', background: '#0f172a', borderRadius: '12px', color: '#f8fafc' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Workspace Members & Governance</h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '4px 0 0 0' }}>Manage RBAC roles and tenant access boundaries.</p>
        </div>
        <span style={{ fontSize: '0.75rem', background: '#1e293b', padding: '4px 10px', borderRadius: '6px', color: '#38bdf8' }}>
          Workspace: {workspaceId}
        </span>
      </div>

      {message && (
        <div style={{
          padding: '10px',
          borderRadius: '6px',
          marginBottom: '1rem',
          background: message.type === 'success' ? '#064e3b' : '#7f1d1d',
          color: message.type === 'success' ? '#6ee7b7' : '#fca5a5'
        }}>
          {message.text}
        </div>
      )}

      {/* Invite Form */}
      <form onSubmit={handleInvite} style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', background: '#1e293b', padding: '12px', borderRadius: '8px' }}>
        <input
          type="text"
          placeholder="User ID or Email"
          value={inviteEmail}
          onChange={e => setInviteEmail(e.target.value)}
          style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }}
        />
        <select
          value={inviteRole}
          onChange={e => setInviteRole(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#fff' }}
        >
          <option value="ANALYST">Analyst</option>
          <option value="VIEWER">Viewer</option>
          <option value="ADMIN">Admin</option>
          <option value="AUDITOR">Auditor</option>
        </select>
        <button
          type="submit"
          style={{ padding: '8px 16px', borderRadius: '6px', background: '#3b82f6', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer' }}
        >
          Add Member
        </button>
      </form>

      {/* Members Table */}
      {loading ? (
        <p style={{ color: '#94a3b8' }}>Loading workspace members...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155', textAlign: 'left', color: '#94a3b8' }}>
              <th style={{ padding: '10px' }}>User</th>
              <th style={{ padding: '10px' }}>Role</th>
              <th style={{ padding: '10px' }}>Status</th>
              <th style={{ padding: '10px' }}>Joined</th>
              <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.userId} style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: '10px' }}>
                  <div style={{ fontWeight: 600 }}>{m.name || m.userId}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{m.email}</div>
                </td>
                <td style={{ padding: '10px' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    background: m.role === 'OWNER' ? '#581c87' : m.role === 'ADMIN' ? '#1e3a8a' : '#064e3b',
                    color: m.role === 'OWNER' ? '#d8b4fe' : m.role === 'ADMIN' ? '#93c5fd' : '#86efac'
                  }}>
                    {m.role}
                  </span>
                </td>
                <td style={{ padding: '10px', color: m.status === 'ACTIVE' ? '#4ade80' : '#f87171' }}>{m.status}</td>
                <td style={{ padding: '10px', color: '#94a3b8' }}>{new Date(m.joinedAt).toLocaleDateString()}</td>
                <td style={{ padding: '10px', textAlign: 'right' }}>
                  {m.role !== 'OWNER' && (
                    <button
                      onClick={() => handleRemove(m.userId)}
                      style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
