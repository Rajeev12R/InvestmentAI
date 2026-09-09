/**
 * @file OrganizationSettingsPage.jsx
 * Institutional Organization Settings & Configuration for Phase 35.
 */

import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { updateOrganizationApi, createOrganizationApi } from '../../utils/api.js';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Badge from '../ui/Badge.jsx';
import Alert from '../ui/Alert.jsx';
import Modal from '../ui/Modal.jsx';
import { Building2, Save, Plus, ShieldCheck, Check } from 'lucide-react';

export const OrganizationSettingsPage = () => {
  const { activeOrgId, activeOrgMeta, organizationData, organizations, refreshContext } = useWorkspace();
  const { refreshOrganizations } = useAuth();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState('UTC');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);

  // New Organization Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgCurrency, setNewOrgCurrency] = useState('USD');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (activeOrgMeta) {
      setName(activeOrgMeta.name || '');
      setSlug(activeOrgMeta.slug || '');
      setCurrency(activeOrgMeta.settings?.defaultCurrency || 'USD');
      setTimezone(activeOrgMeta.settings?.timezone || 'UTC');
    }
  }, [activeOrgMeta]);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      await updateOrganizationApi(activeOrgId, {
        name,
        slug,
        settings: {
          defaultCurrency: currency,
          timezone
        }
      });
      setSaveSuccess(true);
      await Promise.all([refreshContext(), refreshOrganizations()]);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update organization');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    setIsCreating(true);
    setError(null);
    try {
      await createOrganizationApi({
        name: newOrgName.trim(),
        settings: { defaultCurrency: newOrgCurrency }
      });
      setIsCreateModalOpen(false);
      setNewOrgName('');
      await Promise.all([refreshContext(), refreshOrganizations()]);
    } catch (err) {
      setError(err.message || 'Failed to create organization');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Organization Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure primary organization identity, institutional base currency, and default operational parameters.
          </p>
        </div>
        <Button variant="secondary" size="sm" icon={Plus} onClick={() => setIsCreateModalOpen(true)}>
          New Organization
        </Button>
      </div>

      {saveSuccess && (
        <Alert variant="success" title="Organization Updated">
          Organization settings have been saved and applied across all child workspaces.
        </Alert>
      )}

      {error && (
        <Alert variant="danger" title="Operation Failed">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <Card title="Institutional Identity" subtitle="Legal entity identity and tenant identifiers">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Organization Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              helperText="The canonical display name of the institution"
            />
            <Input
              label="Identifier Slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              helperText="URL and routing namespace identifier"
            />
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <span className="text-xs font-semibold text-slate-500 block">Organization ID</span>
              <span className="font-mono text-xs text-slate-900 font-bold">{activeOrgId}</span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 block">Status</span>
              <Badge variant="OK" size="xs">ACTIVE</Badge>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 block">Security Boundary</span>
              <span className="text-xs text-slate-700 font-medium flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Isolated Tenant
              </span>
            </div>
          </div>
        </Card>

        <Card title="Settlement & Currency Policy" subtitle="Global financial standards for all child workspaces">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Base Institutional Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              options={[
                { value: 'USD', label: 'USD ($) — US Dollar' },
                { value: 'EUR', label: 'EUR (€) — Euro' },
                { value: 'GBP', label: 'GBP (£) — British Pound' },
                { value: 'INR', label: 'INR (₹) — Indian Rupee' },
                { value: 'JPY', label: 'JPY (¥) — Japanese Yen' },
                { value: 'CHF', label: 'CHF (Fr) — Swiss Franc' }
              ]}
              helperText="Default currency used across portfolio valuations"
            />

            <Select
              label="Default Timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              options={[
                { value: 'UTC', label: 'UTC (Universal Coordinated Time)' },
                { value: 'America/New_York', label: 'America/New York (EST/EDT)' },
                { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
                { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
                { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' }
              ]}
              helperText="Standard reference timestamp timezone"
            />
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="submit"
            variant="primary"
            icon={Save}
            isLoading={isSaving}
          >
            Save Organization Settings
          </Button>
        </div>
      </form>

      {/* Create Organization Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Organization"
        subtitle="Provision a completely isolated multi-tenant organization boundary"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleCreateOrg} isLoading={isCreating}>Create Organization</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Organization Name"
            value={newOrgName}
            onChange={(e) => setNewOrgName(e.target.value)}
            placeholder="e.g. Apex Global Asset Management"
            required
          />
          <Select
            label="Base Currency"
            value={newOrgCurrency}
            onChange={(e) => setNewOrgCurrency(e.target.value)}
            options={[
              { value: 'USD', label: 'USD ($) — US Dollar' },
              { value: 'EUR', label: 'EUR (€) — Euro' },
              { value: 'GBP', label: 'GBP (£) — British Pound' },
              { value: 'INR', label: 'INR (₹) — Indian Rupee' }
            ]}
          />
        </div>
      </Modal>
    </div>
  );
};

export default OrganizationSettingsPage;
