/**
 * @file WorkspacesAdminPage.jsx
 * Workspace Provisioning & Lifecycle Administration for Phase 35.
 */

import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { createOrganizationWorkspaceApi, archiveWorkspaceApi } from '../../utils/api.js';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Badge from '../ui/Badge.jsx';
import Table from '../ui/Table.jsx';
import Modal from '../ui/Modal.jsx';
import Alert from '../ui/Alert.jsx';
import { Briefcase, Plus, Archive, Check, ArrowRight, Shield } from 'lucide-react';

export const WorkspacesAdminPage = () => {
  const { activeOrgId, activeOrgMeta, workspaces, activeWorkspaceId, switchWorkspace, refreshContext } = useWorkspace();
  const { refreshWorkspaces } = useAuth();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Archive Modal State
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [isArchiving, setIsArchiving] = useState(false);

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!workspaceName.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await createOrganizationWorkspaceApi(activeOrgId, {
        name: workspaceName.trim(),
        description: description.trim()
      });
      setSuccessMsg(`Workspace '${workspaceName}' created successfully.`);
      setIsCreateModalOpen(false);
      setWorkspaceName('');
      setDescription('');
      await Promise.all([refreshContext(), refreshWorkspaces()]);
    } catch (err) {
      setError(err.message || 'Failed to create workspace');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveWorkspace = async () => {
    if (!archiveTarget) return;
    setIsArchiving(true);
    setError(null);
    try {
      await archiveWorkspaceApi(archiveTarget.workspaceId || archiveTarget.id);
      setSuccessMsg(`Workspace '${archiveTarget.name}' archived.`);
      setArchiveTarget(null);
      await Promise.all([refreshContext(), refreshWorkspaces()]);
    } catch (err) {
      setError(err.message || 'Failed to archive workspace');
    } finally {
      setIsArchiving(false);
    }
  };

  const columns = [
    {
      header: 'Workspace Name',
      accessor: 'name',
      render: (val, row) => (
        <div>
          <div className="font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="h-3.5 w-3.5 text-blue-600" />
            <span>{val}</span>
            {(row.workspaceId || row.id) === activeWorkspaceId && (
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">ACTIVE CONTEXT</span>
            )}
          </div>
          {row.description && <div className="text-[11px] text-slate-500 mt-0.5">{row.description}</div>}
        </div>
      )
    },
    {
      header: 'Workspace ID',
      accessor: 'workspaceId',
      render: (val, row) => <span className="font-mono text-xs text-slate-600">{val || row.id}</span>
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (val) => (
        <Badge variant={val === 'ARCHIVED' ? 'STALE' : 'OK'} size="xs">
          {val || 'ACTIVE'}
        </Badge>
      )
    },
    {
      header: 'Your Role',
      accessor: 'role',
      render: (val) => <span className="font-semibold text-xs text-slate-800">{val || 'OWNER'}</span>
    },
    {
      header: 'Actions',
      accessor: 'workspaceId',
      align: 'right',
      render: (val, row) => {
        const wsId = val || row.id;
        const isCurrent = wsId === activeWorkspaceId;
        return (
          <div className="flex items-center justify-end gap-2">
            {!isCurrent && (
              <Button
                variant="secondary"
                size="xs"
                onClick={() => switchWorkspace(wsId)}
              >
                Switch Context
              </Button>
            )}
            {wsId !== 'default' && (
              <Button
                variant="ghost"
                size="xs"
                icon={Archive}
                className="text-slate-400 hover:text-rose-600"
                onClick={() => setArchiveTarget(row)}
                title="Archive Workspace"
              />
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
          <h1 className="text-xl font-bold text-slate-900">Workspaces Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Operating environments scoped under organization <strong className="text-slate-800">{activeOrgMeta?.name}</strong>.
          </p>
        </div>
        <Button variant="primary" size="sm" icon={Plus} onClick={() => setIsCreateModalOpen(true)}>
          Provision Workspace
        </Button>
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

      <Card noPadding title="Active Organization Workspaces" subtitle={`${workspaces?.length || 0} workspaces configured`}>
        <Table columns={columns} data={workspaces || []} emptyMessage="No workspaces found in this organization." />
      </Card>

      {/* Provision Workspace Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Provision New Workspace"
        subtitle={`Create an isolated strategy workspace under ${activeOrgMeta?.name}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleCreateWorkspace} isLoading={isSubmitting}>Provision Workspace</Button>
          </div>
        }
      >
        <form onSubmit={handleCreateWorkspace} className="space-y-4">
          <Input
            label="Workspace Name"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            placeholder="e.g. Long-Short Growth Strategy"
            required
          />
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Quantitative equity strategy focused on technology and industrial catalysts"
          />
        </form>
      </Modal>

      {/* Archive Workspace Confirmation Modal */}
      <Modal
        isOpen={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        title="Archive Workspace"
        subtitle="Are you sure you want to archive this operating workspace?"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setArchiveTarget(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={handleArchiveWorkspace} isLoading={isArchiving}>Archive Workspace</Button>
          </div>
        }
      >
        <div className="text-xs text-slate-600 space-y-2">
          <p>
            Archiving workspace <strong className="text-slate-900">{archiveTarget?.name}</strong> will make it read-only and hide it from the active workspace switcher.
          </p>
          <p className="text-slate-500">
            Historical audit logs, sealed packages, and portfolio decisions will be preserved.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default WorkspacesAdminPage;
