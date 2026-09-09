/**
 * @file RolesPermissionsPage.jsx
 * Role-Based Access Control (RBAC) Matrix Inspector for Phase 35.
 */

import React, { useState, useEffect } from 'react';
import { getAdminRolesApi } from '../../utils/api.js';
import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';
import Table from '../ui/Table.jsx';
import { ShieldCheck, Check, X } from 'lucide-react';

export const RolesPermissionsPage = () => {
  const [rolesData, setRolesData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await getAdminRolesApi();
        if (res?.data) {
          setRolesData(res.data);
        }
      } catch (err) {
        console.warn('Failed to fetch roles:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRoles();
  }, []);

  const roles = ['OWNER', 'ADMIN', 'ANALYST', 'AUDITOR', 'VIEWER'];
  const permissions = rolesData?.permissions || [
    'org.read',
    'org.update',
    'org.members.read',
    'org.members.manage',
    'org.workspaces.manage',
    'workspace.read',
    'workspace.create',
    'workspace.update',
    'workspace.archive',
    'workspace.members.read',
    'workspace.members.invite',
    'workspace.members.remove',
    'workspace.roles.update',
    'portfolio.read',
    'portfolio.write',
    'research.read',
    'research.write',
    'decision.read',
    'decision.review',
    'truth.read',
    'snapshot.read',
    'audit.read',
    'security.read',
    'api_keys.create'
  ];

  const matrix = rolesData?.matrix || {};

  const columns = [
    {
      header: 'Granular Permission',
      accessor: 'permission',
      render: (val) => (
        <div>
          <span className="font-mono text-xs font-bold text-slate-900">{val}</span>
          <span className="block text-[10px] text-slate-400 capitalize">
            {val.split('.')[0]} domain action
          </span>
        </div>
      )
    },
    ...roles.map((role) => ({
      header: role,
      accessor: role,
      align: 'center',
      render: (_, row) => {
        const allowed = role === 'OWNER' || (matrix[role] && matrix[role].includes(row.permission));
        return allowed ? (
          <div className="flex justify-center">
            <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Check className="h-3.5 w-3.5 stroke-[3]" />
            </span>
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="h-5 w-5 rounded-full bg-slate-100 text-slate-300 flex items-center justify-center">
              <X className="h-3 w-3" />
            </span>
          </div>
        );
      }
    }))
  ];

  const tableData = permissions.map((p) => ({ permission: p }));

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">RBAC & Permissions Matrix</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Deterministic institutional permission mappings across workspace roles and multi-tenant security boundaries.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card noPadding className="p-4 bg-emerald-50/50 border-emerald-200">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Deny-By-Default</span>
          <p className="text-xs text-emerald-700 mt-1">
            Every API endpoint strictly verifies authentication, active membership, and role scope before execution.
          </p>
        </Card>

        <Card noPadding className="p-4 bg-blue-50/50 border-blue-200">
          <span className="text-xs font-bold text-blue-800 uppercase tracking-wider block">Privilege Escalation Guard</span>
          <p className="text-xs text-blue-700 mt-1">
            Users cannot self-promote, assign permissions beyond their authority, or manipulate tenant headers.
          </p>
        </Card>

        <Card noPadding className="p-4 bg-purple-50/50 border-purple-200">
          <span className="text-xs font-bold text-purple-800 uppercase tracking-wider block">Cryptographic Audit</span>
          <p className="text-xs text-purple-700 mt-1">
            Every role change, invitation, and permission elevation is immutably appended to the audit ledger.
          </p>
        </Card>
      </div>

      <Card noPadding title="Institutional Role-Permission Mapping Matrix">
        <Table columns={columns} data={tableData} isLoading={isLoading} emptyMessage="No permissions loaded." />
      </Card>
    </div>
  );
};

export default RolesPermissionsPage;
