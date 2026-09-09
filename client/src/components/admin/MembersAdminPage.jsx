/**
 * @file MembersAdminPage.jsx
 * Multi-Tenant Organization & Workspace Membership Administration for Phase 35.
 */

import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  getOrganizationMembersApi,
  addOrganizationMemberApi,
  updateOrganizationMemberRoleApi,
  removeOrganizationMemberApi,
  getWorkspaceMembersListApi,
  addWorkspaceMemberApi,
  updateWorkspaceMemberRoleApi,
  removeWorkspaceMemberApi
} from '../../utils/api.js';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Badge from '../ui/Badge.jsx';
import Table from '../ui/Table.jsx';
import Modal from '../ui/Modal.jsx';
import Alert from '../ui/Alert.jsx';
import { Users, UserPlus, Shield, Trash2, Edit2, CheckCircle2 } from 'lucide-react';

export const MembersAdminPage = () => {
  const { activeOrgId, activeOrgMeta, activeWorkspaceId, activeWorkspaceMeta } = useWorkspace();
  const { user } = useAuth();

  const [tab, setTab] = useState('ORGANIZATION'); // 'ORGANIZATION' | 'WORKSPACE'
  const [orgMembers, setOrgMembers] = useState([]);
  const [wsMembers, setWsMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Add Member Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('ANALYST');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Role Modal
  const [editTarget, setEditTarget] = useState(null);
  const [newRole, setNewRole] = useState('ANALYST');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // Remove Modal
  const [removeTarget, setRemoveTarget] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const loadMembers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (tab === 'ORGANIZATION') {
        const res = await getOrganizationMembersApi(activeOrgId);
        setOrgMembers(res?.data || []);
      } else {
        const res = await getWorkspaceMembersListApi(activeWorkspaceId);
        setWsMembers(res?.data || []);
      }
    } catch (err) {
      console.warn('Failed to load members:', err);
      setError(err.message || 'Failed to load members');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [tab, activeOrgId, activeWorkspaceId]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      if (tab === 'ORGANIZATION') {
        await addOrganizationMemberApi(activeOrgId, { email: email.trim(), role });
        setSuccessMsg(`Added ${email} to ${activeOrgMeta?.name}`);
      } else {
        await addWorkspaceMemberApi(activeWorkspaceId, { email: email.trim(), role });
        setSuccessMsg(`Added ${email} to ${activeWorkspaceMeta?.name}`);
      }
      setIsAddModalOpen(false);
      setEmail('');
      await loadMembers();
    } catch (err) {
      setError(err.message || 'Failed to add member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!editTarget) return;
    setIsUpdatingRole(true);
    setError(null);
    try {
      if (tab === 'ORGANIZATION') {
        await updateOrganizationMemberRoleApi(activeOrgId, editTarget.userId, newRole);
      } else {
        await updateWorkspaceMemberRoleApi(activeWorkspaceId, editTarget.userId, newRole);
      }
      setSuccessMsg(`Role updated for ${editTarget.name || editTarget.email}`);
      setEditTarget(null);
      await loadMembers();
    } catch (err) {
      setError(err.message || 'Failed to update role');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!removeTarget) return;
    setIsRemoving(true);
    setError(null);
    try {
      if (tab === 'ORGANIZATION') {
        await removeOrganizationMemberApi(activeOrgId, removeTarget.userId);
      } else {
        await removeWorkspaceMemberApi(activeWorkspaceId, removeTarget.userId);
      }
      setSuccessMsg(`Member ${removeTarget.name || removeTarget.email} removed.`);
      setRemoveTarget(null);
      await loadMembers();
    } catch (err) {
      setError(err.message || 'Failed to remove member');
    } finally {
      setIsRemoving(false);
    }
  };

  const columns = [
    {
      header: 'Member Name & Email',
      accessor: 'name',
      render: (val, row) => (
        <div>
          <div className="font-bold text-slate-900 flex items-center gap-2">
            <span>{val || 'Institutional User'}</span>
            {row.userId === user?.userId && (
              <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.5 rounded">YOU</span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">{row.email}</div>
        </div>
      )
    },
    {
      header: 'Institutional Role',
      accessor: 'role',
      render: (val) => (
        <Badge variant={val === 'OWNER' || val === 'ADMIN' ? 'PROVENANCE' : 'T0'} size="xs">
          {val}
        </Badge>
      )
    },
    {
      header: 'Membership Status',
      accessor: 'status',
      render: (val) => (
        <Badge variant={val === 'ACTIVE' ? 'OK' : 'STALE'} size="xs">
          {val}
        </Badge>
      )
    },
    {
      header: 'Joined Date',
      accessor: 'joinedAt',
      render: (val) => <span className="text-xs text-slate-500">{val ? new Date(val).toLocaleDateString() : 'N/A'}</span>
    },
    {
      header: 'Actions',
      accessor: 'userId',
      align: 'right',
      render: (val, row) => {
        const isSelf = row.userId === user?.userId;
        const isOwner = row.role === 'OWNER';
        return (
          <div className="flex items-center justify-end gap-1">
            {!isOwner && (
              <>
                <Button
                  variant="ghost"
                  size="xs"
                  icon={Edit2}
                  onClick={() => {
                    setEditTarget(row);
                    setNewRole(row.role);
                  }}
                  title="Change Role"
                />
                {!isSelf && (
                  <Button
                    variant="ghost"
                    size="xs"
                    icon={Trash2}
                    className="text-slate-400 hover:text-rose-600"
                    onClick={() => setRemoveTarget(row)}
                    title="Remove Member"
                  />
                )}
              </>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Members & Access Control</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage membership and institutional roles for organization <strong className="text-slate-800">{activeOrgMeta?.name}</strong> and workspace <strong className="text-slate-800">{activeWorkspaceMeta?.name}</strong>.
          </p>
        </div>
        <Button variant="primary" size="sm" icon={UserPlus} onClick={() => setIsAddModalOpen(true)}>
          Add Member
        </Button>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setTab('ORGANIZATION')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            tab === 'ORGANIZATION'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Organization Members ({activeOrgMeta?.name})
        </button>
        <button
          onClick={() => setTab('WORKSPACE')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            tab === 'WORKSPACE'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Workspace Members ({activeWorkspaceMeta?.name})
        </button>
      </div>

      {successMsg && (
        <Alert variant="success" title="Success">
          {successMsg}
        </Alert>
      )}

      {error && (
        <Alert variant="danger" title="Error">
          {error}
        </Alert>
      )}

      <Card noPadding title={tab === 'ORGANIZATION' ? 'Organization Members' : 'Workspace Members'}>
        <Table
          columns={columns}
          data={tab === 'ORGANIZATION' ? orgMembers : wsMembers}
          isLoading={isLoading}
          emptyMessage="No members found."
        />
      </Card>

      {/* Add Member Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={tab === 'ORGANIZATION' ? 'Add Organization Member' : 'Add Workspace Member'}
        subtitle={`Assign access to ${tab === 'ORGANIZATION' ? activeOrgMeta?.name : activeWorkspaceMeta?.name}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleAddMember} isLoading={isSubmitting}>Add Member</Button>
          </div>
        }
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          <Input
            label="User Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. analyst@institution.com"
            required
          />
          <Select
            label="Institutional Role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            options={
              tab === 'ORGANIZATION'
                ? [
                    { value: 'OWNER', label: 'OWNER — Full institutional ownership' },
                    { value: 'ADMIN', label: 'ADMIN — Organization administration & workspace management' },
                    { value: 'MEMBER', label: 'MEMBER — Standard organization member' },
                    { value: 'VIEWER', label: 'VIEWER — Read-only observation' }
                  ]
                : [
                    { value: 'ADMIN', label: 'ADMIN — Workspace administration & rebalancing' },
                    { value: 'ANALYST', label: 'ANALYST — Portfolio analysis & thesis authoring' },
                    { value: 'AUDITOR', label: 'AUDITOR — Compliance & audit inspection' },
                    { value: 'VIEWER', label: 'VIEWER — Read-only portfolio monitoring' }
                  ]
            }
          />
        </form>
      </Modal>

      {/* Edit Role Modal */}
      <Modal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Change Member Role"
        subtitle={`Update role for ${editTarget?.name || editTarget?.email}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleUpdateRole} isLoading={isUpdatingRole}>Update Role</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            label="Select Role"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            options={
              tab === 'ORGANIZATION'
                ? [
                    { value: 'ADMIN', label: 'ADMIN' },
                    { value: 'MEMBER', label: 'MEMBER' },
                    { value: 'VIEWER', label: 'VIEWER' }
                  ]
                : [
                    { value: 'ADMIN', label: 'ADMIN' },
                    { value: 'ANALYST', label: 'ANALYST' },
                    { value: 'AUDITOR', label: 'AUDITOR' },
                    { value: 'VIEWER', label: 'VIEWER' }
                  ]
            }
          />
        </div>
      </Modal>

      {/* Remove Member Confirmation Modal */}
      <Modal
        isOpen={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title="Remove Member"
        subtitle="Confirm membership deactivation"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setRemoveTarget(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={handleRemoveMember} isLoading={isRemoving}>Remove Member</Button>
          </div>
        }
      >
        <p className="text-xs text-slate-600">
          Are you sure you want to remove <strong className="text-slate-900">{removeTarget?.name || removeTarget?.email}</strong> from this {tab.toLowerCase()}? Their active session access will be immediately revoked.
        </p>
      </Modal>
    </div>
  );
};

export default MembersAdminPage;
