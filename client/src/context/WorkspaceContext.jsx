/**
 * @file WorkspaceContext.jsx
 * Multi-Tenant Organization & Workspace Context Scoping for Phase 35.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext.jsx';
import { getWorkspaceApi, getOrganizationApi } from '../utils/api.js';
import { setWorkspaceContext } from '../services/apiClient.js';

const WorkspaceContext = createContext(null);

export const WorkspaceStatus = Object.freeze({
  IDLE: 'IDLE',
  LOADING: 'LOADING',
  READY: 'READY',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  ERROR: 'ERROR'
});

export const WorkspaceProvider = ({ children }) => {
  const { user, userOrganizations, userWorkspaces, isAuthenticated } = useAuth();

  const [activeOrgId, setActiveOrgId] = useState(() => {
    try {
      return localStorage.getItem('investmentai_active_org') || 'ORG-ROOT-001';
    } catch {
      return 'ORG-ROOT-001';
    }
  });

  const [activeWorkspaceId, setActiveWorkspaceId] = useState(() => {
    try {
      return localStorage.getItem('investmentai_active_workspace') || 'default';
    } catch {
      return 'default';
    }
  });

  const [organizationData, setOrganizationData] = useState(null);
  const [workspaceData, setWorkspaceData] = useState(null);
  const [status, setStatus] = useState(WorkspaceStatus.IDLE);
  const [error, setError] = useState(null);

  // Sync workspace and org context to localStorage and apiClient
  const setWorkspace = useCallback((wsId) => {
    const targetId = wsId || 'default';
    setActiveWorkspaceId(targetId);
    setWorkspaceContext(targetId);
    try {
      localStorage.setItem('investmentai_active_workspace', targetId);
    } catch (e) {
      console.error('Failed to persist active workspace in localStorage:', e);
    }
  }, []);

  const setOrganization = useCallback((orgId) => {
    const targetId = orgId || 'ORG-ROOT-001';
    setActiveOrgId(targetId);
    try {
      localStorage.setItem('investmentai_active_org', targetId);
    } catch (e) {
      console.error('Failed to persist active organization in localStorage:', e);
    }
  }, []);

  // Fetch full workspace and organization state
  const loadContext = useCallback(async (orgId, wsId) => {
    if (!isAuthenticated) {
      setWorkspaceData(null);
      setOrganizationData(null);
      setStatus(WorkspaceStatus.IDLE);
      return;
    }

    const targetOrgId = orgId || activeOrgId || 'ORG-ROOT-001';
    const targetWsId = wsId || activeWorkspaceId || 'default';

    // Clear old state immediately to prevent stale cross-workspace leakage
    setWorkspaceData(null);
    setStatus(WorkspaceStatus.LOADING);
    setError(null);

    try {
      setWorkspaceContext(targetWsId);

      const [wsData, orgData] = await Promise.allSettled([
        getWorkspaceApi(targetWsId),
        getOrganizationApi(targetOrgId)
      ]);

      if (wsData.status === 'fulfilled') {
        const raw = wsData.value?.data || wsData.value?.workspace || wsData.value;
        setWorkspaceData(raw);
        setStatus(WorkspaceStatus.READY);
      } else {
        throw wsData.reason;
      }

      if (orgData.status === 'fulfilled') {
        setOrganizationData(orgData.value?.data || orgData.value);
      }
    } catch (err) {
      console.warn(`Failed to load workspace [${targetWsId}]:`, err.message);
      setError(err.message || 'Failed to load workspace');
      if (err.status === 403 || err.code === 'FORBIDDEN_PERMISSION' || err.code === 'AUTHORIZATION_ERROR') {
        setStatus(WorkspaceStatus.UNAUTHORIZED);
      } else if (err.status === 404 || err.code === 'NOT_FOUND') {
        setStatus(WorkspaceStatus.NOT_FOUND);
      } else {
        setStatus(WorkspaceStatus.ERROR);
      }
    }
  }, [isAuthenticated, activeOrgId, activeWorkspaceId]);

  useEffect(() => {
    if (isAuthenticated) {
      loadContext(activeOrgId, activeWorkspaceId);
    } else {
      setWorkspaceData(null);
      setOrganizationData(null);
      setStatus(WorkspaceStatus.IDLE);
    }
  }, [isAuthenticated, activeOrgId, activeWorkspaceId, loadContext]);

  // Clean Workspace Switching: Clear state -> set target -> fetch new state
  const switchWorkspace = async (newWorkspaceId) => {
    if (newWorkspaceId === activeWorkspaceId) return;
    setWorkspaceData(null); // Explicit zero-stale guarantee
    setWorkspace(newWorkspaceId);
    await loadContext(activeOrgId, newWorkspaceId);
  };

  // Clean Organization Switching
  const switchOrganization = async (newOrgId) => {
    if (newOrgId === activeOrgId) return;
    setWorkspaceData(null);
    setOrganizationData(null);
    setOrganization(newOrgId);

    // Find first authorized workspace in the target organization
    const available = userWorkspaces?.filter(w => w.orgId === newOrgId);
    const nextWsId = available?.length > 0 ? available[0].workspaceId : 'default';
    setWorkspace(nextWsId);
    await loadContext(newOrgId, nextWsId);
  };

  // Filter workspaces by active organization
  const organizationWorkspaces = userWorkspaces?.filter(
    (w) => !w.orgId || w.orgId === activeOrgId
  ) || [];

  // Active Organization Meta
  const activeOrgMeta = userOrganizations?.find(
    (o) => o.orgId === activeOrgId
  ) || organizationData || {
    orgId: activeOrgId,
    name: activeOrgId === 'ORG-ROOT-001' ? 'Primary Institutional Capital' : `Organization ${activeOrgId}`,
    role: 'OWNER'
  };

  // Active Workspace Meta
  const activeWorkspaceMeta = userWorkspaces?.find(
    (w) => (w.workspaceId || w.id) === activeWorkspaceId
  ) || workspaceData || {
    workspaceId: activeWorkspaceId,
    orgId: activeOrgId,
    name: workspaceData?.name || (activeWorkspaceId === 'default' ? 'Primary Institutional Portfolio' : `Workspace ${activeWorkspaceId}`),
    role: workspaceData?.role || 'OWNER'
  };

  const value = {
    activeOrgId,
    activeOrgMeta,
    organizationData,
    organizations: userOrganizations,
    activeWorkspaceId,
    activeWorkspaceMeta,
    workspaceData,
    workspaces: organizationWorkspaces,
    allWorkspaces: userWorkspaces,
    status,
    error,
    isLoading: status === WorkspaceStatus.LOADING,
    isReady: status === WorkspaceStatus.READY,
    isUnauthorized: status === WorkspaceStatus.UNAUTHORIZED,
    switchWorkspace,
    switchOrganization,
    refreshContext: () => loadContext(activeOrgId, activeWorkspaceId)
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

export default WorkspaceContext;

