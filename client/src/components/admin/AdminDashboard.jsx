/**
 * @file AdminDashboard.jsx
 * Multi-Tenant Administration Cockpit for Phase 35.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { getAdminOverviewApi } from '../../utils/api.js';
import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import Button from '../ui/Button.jsx';
import StateView from '../ui/StateView.jsx';
import { Building2, Briefcase, Users, Shield, ArrowUpRight, Activity, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminDashboard = () => {
  const { user } = useAuth();
  const { activeOrgMeta, activeWorkspaceMeta, workspaces, organizations } = useWorkspace();
  const [overview, setOverview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOverview = async () => {
      setIsLoading(true);
      try {
        const res = await getAdminOverviewApi();
        if (res?.data) {
          setOverview(res.data);
        }
      } catch (err) {
        console.warn('Failed to load admin overview:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchOverview();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md">
              Phase 35 Multi-Tenant Control Plane
            </span>
            <Badge variant="OK" size="xs">SYSTEM ACTIVE</Badge>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Organization & Tenancy Administration</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage institutional organization boundaries, isolated workspaces, member roles, and security policies.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/app/admin/organizations">
            <Button variant="secondary" size="sm" icon={Building2}>Organization Settings</Button>
          </Link>
          <Link to="/app/admin/workspaces">
            <Button variant="primary" size="sm" icon={Briefcase}>Manage Workspaces</Button>
          </Link>
        </div>
      </div>

      {/* Tenancy Context Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card noPadding className="p-5 border-l-4 border-l-blue-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Organization</span>
            <Building2 className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-2 truncate">
            {activeOrgMeta?.name || 'Primary Institutional Capital'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono truncate">
            ID: {activeOrgMeta?.orgId || 'ORG-ROOT-001'}
          </div>
        </Card>

        <Card noPadding className="p-5 border-l-4 border-l-indigo-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Workspace</span>
            <Briefcase className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-2 truncate">
            {activeWorkspaceMeta?.name || 'Primary Portfolio'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 font-mono truncate">
            ID: {activeWorkspaceMeta?.workspaceId || 'default'}
          </div>
        </Card>

        <Card noPadding className="p-5 border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Workspaces in Org</span>
            <Activity className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {workspaces?.length || 1}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Strict Tenant Isolation
          </div>
        </Card>

        <Card noPadding className="p-5 border-l-4 border-l-purple-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Your Authority</span>
            <Shield className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-lg font-bold text-purple-900 mt-2">
            {activeWorkspaceMeta?.role || 'OWNER'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Full Administrative Permissions
          </div>
        </Card>
      </div>

      {/* Quick Navigation Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Organization Management" subtitle="Manage legal entity metadata, base currency, and policies">
          <p className="text-xs text-slate-600 mb-4">
            Configure primary organization identity, default settlement currency, timezone, and security posture.
          </p>
          <Link to="/app/admin/organizations">
            <Button variant="secondary" size="sm" fullWidth icon={ArrowUpRight}>
              Configure Organization
            </Button>
          </Link>
        </Card>

        <Card title="Workspaces & Portfolios" subtitle="Provision and control operating environments">
          <p className="text-xs text-slate-600 mb-4">
            Create isolated strategy workspaces, configure parameters, and manage workspace archiving.
          </p>
          <Link to="/app/admin/workspaces">
            <Button variant="secondary" size="sm" fullWidth icon={ArrowUpRight}>
              Manage Workspaces
            </Button>
          </Link>
        </Card>

        <Card title="Members & RBAC" subtitle="Role assignments and security boundaries">
          <p className="text-xs text-slate-600 mb-4">
            Invite analysts, assign granular permissions, inspect the RBAC matrix, and audit membership lineage.
          </p>
          <Link to="/app/admin/members">
            <Button variant="secondary" size="sm" fullWidth icon={ArrowUpRight}>
              Manage Members & Roles
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
