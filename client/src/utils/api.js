/**
 * @file api.js
 * Unified API Facade for InvestmentAI.
 * Routes all requests through the centralized apiClient while maintaining 100% backward compatibility.
 */

import { apiClient, ApiError, ApiErrorCode } from '../services/apiClient.js';

// --- Analysis & Research APIs ---

export const analyzeCompany = async (companyName) => {
  try {
    return await apiClient.post('/api/analyze', { companyName });
  } catch (error) {
    console.error('API Error:', error);
    throw new Error(error.message || 'Failed to analyze company');
  }
};

export const compareCompanies = async (tickers) => {
  try {
    return await apiClient.post('/api/compare', { tickers });
  } catch (error) {
    console.error('Compare API Error:', error);
    throw new Error(error.message || 'Failed to compare companies');
  }
};

export const getMarketTickersApi = async () => {
  try {
    return await apiClient.get('/api/market/ticker', { retries: 2 });
  } catch (error) {
    console.warn('Market Ticker API Error:', error.message);
    return { success: false, data: [] };
  }
};

export const askResearchQuestionApi = async (ticker, question) => {
  try {
    return await apiClient.post('/api/research/question', { ticker, question });
  } catch (error) {
    console.error('askResearchQuestionApi Error:', error);
    throw error;
  }
};

export const getResearchReportApi = async (ticker) => {
  try {
    return await apiClient.get(`/api/research/${ticker}`);
  } catch (error) {
    console.error('getResearchReportApi Error:', error);
    throw error;
  }
};

// --- Phase 5 Workspace & Change Intelligence APIs ---

export const getWorkspaceApi = async (workspaceId = 'default') => {
  try {
    return await apiClient.get(`/api/workspaces/${workspaceId}`);
  } catch (error) {
    console.error('getWorkspaceApi Error:', error);
    throw error;
  }
};

export const addWatchlistApi = async (workspaceId, ticker, tags = []) => {
  try {
    return await apiClient.post(`/api/workspaces/${workspaceId}/watchlist`, { ticker, tags });
  } catch (error) {
    console.error('addWatchlistApi Error:', error);
    throw error;
  }
};

export const removeWatchlistApi = async (workspaceId, ticker) => {
  try {
    return await apiClient.delete(`/api/workspaces/${workspaceId}/watchlist/${ticker}`);
  } catch (error) {
    console.error('removeWatchlistApi Error:', error);
    throw error;
  }
};

export const createSnapshotApi = async (workspaceId, ticker, truthPackage = null) => {
  try {
    return await apiClient.post(`/api/workspaces/${workspaceId}/snapshot/${ticker}`, { truthPackage });
  } catch (error) {
    console.error('createSnapshotApi Error:', error);
    throw error;
  }
};

export const getSnapshotsApi = async (workspaceId, ticker) => {
  try {
    return await apiClient.get(`/api/workspaces/${workspaceId}/snapshots/${ticker}`);
  } catch (error) {
    console.error('getSnapshotsApi Error:', error);
    throw error;
  }
};

export const getTimelineApi = async (workspaceId, ticker) => {
  try {
    return await apiClient.get(`/api/workspaces/${workspaceId}/timeline/${ticker}`);
  } catch (error) {
    console.error('getTimelineApi Error:', error);
    throw error;
  }
};

export const getChangesApi = async (workspaceId, ticker) => {
  try {
    return await apiClient.get(`/api/workspaces/${workspaceId}/changes/${ticker}`);
  } catch (error) {
    console.error('getChangesApi Error:', error);
    throw error;
  }
};

export const askChangeQuestionApi = async (workspaceId, ticker, question) => {
  try {
    return await apiClient.post(`/api/workspaces/${workspaceId}/changes/${ticker}/question`, { question });
  } catch (error) {
    console.error('askChangeQuestionApi Error:', error);
    throw error;
  }
};

export const getAlertsApi = async (workspaceId, filter = {}) => {
  try {
    return await apiClient.get(`/api/workspaces/${workspaceId}/alerts`, { params: filter });
  } catch (error) {
    console.error('getAlertsApi Error:', error);
    throw error;
  }
};

export const acknowledgeAlertApi = async (arg1, arg2) => {
  try {
    if (typeof arg2 === 'string') {
      return await apiClient.post(`/api/workspaces/${arg1}/alerts/${arg2}/ack`);
    }
    return await apiClient.post(`/api/alerts/${arg1}/acknowledge`, arg2 || {});
  } catch (error) {
    console.error('acknowledgeAlertApi Error:', error);
    throw error;
  }
};

// --- Phase 6 Ingestion & Event Detection APIs ---

export const runIngestionApi = async (ticker, workspaceId = 'default') => {
  try {
    return await apiClient.post('/api/ingestion/run', { ticker, workspaceId });
  } catch (error) {
    console.error('runIngestionApi Error:', error);
    throw error;
  }
};

export const ingestEventApi = async (eventPayload) => {
  try {
    return await apiClient.post('/api/ingestion/event', eventPayload);
  } catch (error) {
    console.error('ingestEventApi Error:', error);
    throw error;
  }
};

export const getIngestedEventsApi = async (ticker) => {
  try {
    return await apiClient.get(`/api/ingestion/${ticker}/events`);
  } catch (error) {
    console.error('getIngestedEventsApi Error:', error);
    throw error;
  }
};

export const getIngestionStatusApi = async (ticker) => {
  try {
    return await apiClient.get(`/api/ingestion/${ticker}/status`);
  } catch (error) {
    console.error('getIngestionStatusApi Error:', error);
    throw error;
  }
};

// --- Phase 9 Authentication & Multi-Tenant Governance APIs ---

export const loginApi = async ({ email, password, workspaceId }) => {
  return await apiClient.post('/api/auth/login', { email, password, workspaceId });
};

export const registerApi = async ({ email, password, name }) => {
  return await apiClient.post('/api/auth/register', { email, password, name });
};

export const logoutApi = async () => {
  return await apiClient.post('/api/auth/logout');
};

export const getSessionApi = async () => {
  return await apiClient.get('/api/auth/session');
};

export const getUserWorkspacesApi = async () => {
  return await apiClient.get('/api/auth/workspaces');
};

export const createWorkspaceApi = async ({ name }) => {
  return await apiClient.post('/api/auth/workspaces', { name });
};

export const getApiKeysApi = async () => {
  return await apiClient.get('/api/auth/keys');
};

export const createApiKeyApi = async ({ name, scopes, expiresDays }) => {
  return await apiClient.post('/api/auth/keys', { name, scopes, expiresDays });
};

export const revokeApiKeyApi = async (keyId) => {
  return await apiClient.delete(`/api/auth/keys/${keyId}`);
};

export const getAuditLogsApi = async (params = {}) => {
  return await apiClient.get('/api/governance/audit', { params });
};

export const getSecurityOverviewApi = async () => {
  return await apiClient.get('/api/governance/security');
};

export const getWorkspaceMembersApi = async (workspaceId) => {
  return await apiClient.get(`/api/governance/workspaces/${workspaceId}/members`);
};

export const inviteWorkspaceMemberApi = async (workspaceId, { email, role }) => {
  return await apiClient.post(`/api/governance/workspaces/${workspaceId}/members`, { email, role });
};

// --- Phase 35 Multi-Tenant Organization & Workspace APIs ---

export const getOrganizationsApi = async () => {
  return await apiClient.get('/api/organizations');
};

export const createOrganizationApi = async ({ name, slug, settings }) => {
  return await apiClient.post('/api/organizations', { name, slug, settings });
};

export const getOrganizationApi = async (orgId) => {
  return await apiClient.get(`/api/organizations/${orgId}`);
};

export const updateOrganizationApi = async (orgId, updates) => {
  return await apiClient.patch(`/api/organizations/${orgId}`, updates);
};

export const getOrganizationMembersApi = async (orgId) => {
  return await apiClient.get(`/api/organizations/${orgId}/members`);
};

export const addOrganizationMemberApi = async (orgId, { email, userId, role }) => {
  return await apiClient.post(`/api/organizations/${orgId}/members`, { email, userId, role });
};

export const updateOrganizationMemberRoleApi = async (orgId, userId, role) => {
  return await apiClient.patch(`/api/organizations/${orgId}/members/${userId}`, { role });
};

export const removeOrganizationMemberApi = async (orgId, userId) => {
  return await apiClient.delete(`/api/organizations/${orgId}/members/${userId}`);
};

export const getOrganizationWorkspacesApi = async (orgId) => {
  return await apiClient.get(`/api/organizations/${orgId}/workspaces`);
};

export const createOrganizationWorkspaceApi = async (orgId, { name, description, settings }) => {
  return await apiClient.post(`/api/organizations/${orgId}/workspaces`, { name, description, settings });
};

export const updateWorkspaceSettingsApi = async (workspaceId, updates) => {
  return await apiClient.patch(`/api/workspaces/${workspaceId}`, updates);
};

export const archiveWorkspaceApi = async (workspaceId) => {
  return await apiClient.post(`/api/workspaces/${workspaceId}/archive`);
};

export const getWorkspaceMembersListApi = async (workspaceId) => {
  return await apiClient.get(`/api/workspaces/${workspaceId}/members`);
};

export const addWorkspaceMemberApi = async (workspaceId, { email, userId, role }) => {
  return await apiClient.post(`/api/workspaces/${workspaceId}/members`, { email, userId, role });
};

export const updateWorkspaceMemberRoleApi = async (workspaceId, userId, role) => {
  return await apiClient.patch(`/api/workspaces/${workspaceId}/members/${userId}`, { role });
};

export const removeWorkspaceMemberApi = async (workspaceId, userId) => {
  return await apiClient.delete(`/api/workspaces/${workspaceId}/members/${userId}`);
};

export const getAdminOverviewApi = async () => {
  return await apiClient.get('/api/admin/overview');
};

export const getAdminRolesApi = async () => {
  return await apiClient.get('/api/admin/roles');
};

// --- Phase 36 Institutional Portfolio Operating System APIs ---

export const listPortfoliosApi = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.strategy) query.set('strategy', params.strategy);
  if (params.query) query.set('query', params.query);
  const qs = query.toString();
  return await apiClient.get(`/api/portfolios${qs ? `?${qs}` : ''}`);
};

export const getPortfolioApi = async (portfolioId) => {
  return await apiClient.get(`/api/portfolios/${portfolioId}`);
};

export const createPortfolioApi = async (portfolioData) => {
  return await apiClient.post('/api/portfolios', portfolioData);
};

export const updatePortfolioApi = async (portfolioId, updates) => {
  return await apiClient.put(`/api/portfolios/${portfolioId}`, updates);
};

export const updatePortfolioStatusApi = async (portfolioId, status) => {
  return await apiClient.post(`/api/portfolios/${portfolioId}/status`, { status });
};

export const getPortfolioHoldingsApi = async (portfolioId) => {
  return await apiClient.get(`/api/portfolios/${portfolioId}/holdings`);
};

export const updatePortfolioHoldingsApi = async (portfolioId, { holdings, cashBalance }) => {
  return await apiClient.put(`/api/portfolios/${portfolioId}/holdings`, { holdings, cashBalance });
};

export const getPortfolioSummaryApi = async (portfolioId) => {
  return await apiClient.get(`/api/portfolios/${portfolioId}/summary`);
};

export const getPortfolioAnalyticsApi = async (portfolioId) => {
  return await apiClient.get(`/api/portfolios/${portfolioId}/analytics`);
};

export const getPortfolioSnapshotsApi = async (portfolioId) => {
  return await apiClient.get(`/api/portfolios/${portfolioId}/snapshots`);
};

export const createPortfolioSnapshotApi = async (portfolioId, snapshotPayload = {}) => {
  return await apiClient.post(`/api/portfolios/${portfolioId}/snapshots`, snapshotPayload);
};

export const getPortfolioSnapshotByIdApi = async (portfolioId, snapshotId) => {
  return await apiClient.get(`/api/portfolios/${portfolioId}/snapshots/${snapshotId}`);
};

export const proposePortfolioOptimizationApi = async (portfolioId, { objective, constraints } = {}) => {
  return await apiClient.post(`/api/portfolios/${portfolioId}/optimize`, { objective, constraints });
};

// --- Phase 37 Investment Decision Workbench APIs ---

export const listDecisionsApi = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.ticker) query.set('ticker', params.ticker);
  if (params.portfolioId) query.set('portfolioId', params.portfolioId);
  if (params.query) query.set('query', params.query);
  const qs = query.toString();
  return await apiClient.get(`/api/decisions${qs ? `?${qs}` : ''}`);
};

export const getDecisionApi = async (decisionId) => {
  return await apiClient.get(`/api/decisions/${decisionId}`);
};

export const createDecisionApi = async (decisionData) => {
  return await apiClient.post('/api/decisions', decisionData);
};

export const updateDecisionApi = async (decisionId, updates) => {
  return await apiClient.put(`/api/decisions/${decisionId}`, updates);
};

export const updateDecisionStatusApi = async (decisionId, status) => {
  return await apiClient.post(`/api/decisions/${decisionId}/status`, { status });
};

export const submitDecisionReviewApi = async (decisionId, { comment, isChallenge, challengeCategory } = {}) => {
  return await apiClient.post(`/api/decisions/${decisionId}/review`, { comment, isChallenge, challengeCategory });
};

export const approveDecisionApi = async (decisionId, { conditions } = {}) => {
  return await apiClient.post(`/api/decisions/${decisionId}/approve`, { conditions });
};

export const rejectDecisionApi = async (decisionId, { reason } = {}) => {
  return await apiClient.post(`/api/decisions/${decisionId}/reject`, { reason });
};

export const implementDecisionApi = async (decisionId, { executionNotes } = {}) => {
  return await apiClient.post(`/api/decisions/${decisionId}/implement`, { executionNotes });
};

export const getDecisionImpactApi = async (decisionId) => {
  return await apiClient.get(`/api/decisions/${decisionId}/impact`);
};

export const getDecisionSnapshotsApi = async (decisionId) => {
  return await apiClient.get(`/api/decisions/${decisionId}/snapshots`);
};

export const createDecisionSnapshotApi = async (decisionId, snapshotPayload = {}) => {
  return await apiClient.post(`/api/decisions/${decisionId}/snapshots`, snapshotPayload);
};

// --- Phase 38 Institutional Dashboard & Intelligence Cockpit APIs ---

export const getDashboardOverviewApi = async (workspaceId, params = {}) => {
  const query = new URLSearchParams();
  if (workspaceId) query.set('workspaceId', workspaceId);
  if (params.asOf) query.set('asOf', params.asOf);
  if (params.roleView) query.set('roleView', params.roleView);
  const qs = query.toString();
  return await apiClient.get(`/api/dashboard/overview${qs ? `?${qs}` : ''}`);
};

export const getDashboardPortfoliosApi = async (workspaceId, params = {}) => {
  const query = new URLSearchParams();
  if (workspaceId) query.set('workspaceId', workspaceId);
  if (params.asOf) query.set('asOf', params.asOf);
  const qs = query.toString();
  return await apiClient.get(`/api/dashboard/portfolios${qs ? `?${qs}` : ''}`);
};

export const getDashboardRiskApi = async (workspaceId, params = {}) => {
  const query = new URLSearchParams();
  if (workspaceId) query.set('workspaceId', workspaceId);
  if (params.asOf) query.set('asOf', params.asOf);
  const qs = query.toString();
  return await apiClient.get(`/api/dashboard/risk${qs ? `?${qs}` : ''}`);
};

export const getDashboardAttentionApi = async (workspaceId, params = {}) => {
  const query = new URLSearchParams();
  if (workspaceId) query.set('workspaceId', workspaceId);
  if (params.asOf) query.set('asOf', params.asOf);
  const qs = query.toString();
  return await apiClient.get(`/api/dashboard/attention${qs ? `?${qs}` : ''}`);
};

export const getDashboardDecisionsApi = async (workspaceId, params = {}) => {
  const query = new URLSearchParams();
  if (workspaceId) query.set('workspaceId', workspaceId);
  const qs = query.toString();
  return await apiClient.get(`/api/dashboard/decisions${qs ? `?${qs}` : ''}`);
};

export const getDashboardComplianceApi = async (workspaceId, params = {}) => {
  const query = new URLSearchParams();
  if (workspaceId) query.set('workspaceId', workspaceId);
  if (params.asOf) query.set('asOf', params.asOf);
  const qs = query.toString();
  return await apiClient.get(`/api/dashboard/compliance${qs ? `?${qs}` : ''}`);
};

export const getDashboardChangesApi = async (workspaceId, params = {}) => {
  const query = new URLSearchParams();
  if (workspaceId) query.set('workspaceId', workspaceId);
  if (params.asOf) query.set('asOf', params.asOf);
  const qs = query.toString();
  return await apiClient.get(`/api/dashboard/changes${qs ? `?${qs}` : ''}`);
};

// --- Phase 39 Institutional Alerts & Attention Center APIs ---

export const listAlertsApi = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.workspaceId) query.set('workspaceId', params.workspaceId);
  if (params.severity) query.set('severity', params.severity);
  if (params.status) query.set('status', params.status);
  if (params.scope) query.set('scope', params.scope);
  if (params.portfolioId) query.set('portfolioId', params.portfolioId);
  if (params.securityId) query.set('securityId', params.securityId);
  if (params.query) query.set('query', params.query);
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.sort) query.set('sort', params.sort);
  const qs = query.toString();
  return await apiClient.get(`/api/alerts${qs ? `?${qs}` : ''}`);
};

export const getAlertCountsApi = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.workspaceId) query.set('workspaceId', params.workspaceId);
  const qs = query.toString();
  return await apiClient.get(`/api/alerts/counts${qs ? `?${qs}` : ''}`);
};

export const getAlertByIdApi = async (alertId) => {
  return await apiClient.get(`/api/alerts/${alertId}`);
};

export const snoozeAlertApi = async (alertId, data = {}) => {
  return await apiClient.post(`/api/alerts/${alertId}/snooze`, data);
};

export const resolveAlertApi = async (alertId, data = {}) => {
  return await apiClient.post(`/api/alerts/${alertId}/resolve`, data);
};

export const reopenAlertApi = async (alertId, data = {}) => {
  return await apiClient.post(`/api/alerts/${alertId}/reopen`, data);
};

export const assignAlertApi = async (alertId, data = {}) => {
  return await apiClient.post(`/api/alerts/${alertId}/assign`, data);
};

export const escalateAlertApi = async (alertId, data = {}) => {
  return await apiClient.post(`/api/alerts/${alertId}/escalate`, data);
};

export const getAlertPreferencesApi = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.workspaceId) query.set('workspaceId', params.workspaceId);
  const qs = query.toString();
  return await apiClient.get(`/api/alerts/preferences${qs ? `?${qs}` : ''}`);
};

export const updateAlertPreferencesApi = async (preferences = {}) => {
  return await apiClient.put('/api/alerts/preferences', preferences);
};

// --- Phase 40 Reporting & Deliverables APIs ---

export const listReportTemplatesApi = async () => {
  return await apiClient.get('/api/reports/templates');
};

export const listReportsApi = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.reportType) query.set('reportType', params.reportType);
  if (params.status) query.set('status', params.status);
  if (params.portfolioId) query.set('portfolioId', params.portfolioId);
  if (params.search) query.set('search', params.search);
  if (params.limit) query.set('limit', params.limit);
  if (params.offset) query.set('offset', params.offset);
  const qs = query.toString();
  return await apiClient.get(`/api/reports${qs ? `?${qs}` : ''}`);
};

export const getReportsSummaryApi = async () => {
  return await apiClient.get('/api/reports/summary');
};

export const getReportApi = async (reportId) => {
  return await apiClient.get(`/api/reports/${reportId}`);
};

export const createReportDraftApi = async (data = {}) => {
  return await apiClient.post('/api/reports', data);
};

export const generateReportApi = async (reportId) => {
  return await apiClient.post(`/api/reports/${reportId}/generate`);
};

export const validateReportApi = async (reportId) => {
  return await apiClient.post(`/api/reports/${reportId}/validate`);
};

export const submitReportReviewApi = async (reportId) => {
  return await apiClient.post(`/api/reports/${reportId}/submit-review`);
};

export const approveReportApi = async (reportId, data = {}) => {
  return await apiClient.post(`/api/reports/${reportId}/approve`, data);
};

export const rejectReportApi = async (reportId, data = {}) => {
  return await apiClient.post(`/api/reports/${reportId}/reject`, data);
};

export const distributeReportApi = async (reportId, data = {}) => {
  return await apiClient.post(`/api/reports/${reportId}/distribute`, data);
};

export const supersedeReportApi = async (reportId, data = {}) => {
  return await apiClient.post(`/api/reports/${reportId}/supersede`, data);
};

export const verifyReportApi = async (reportId) => {
  return await apiClient.get(`/api/reports/${reportId}/verification`);
};

export const getReportAuditApi = async (reportId) => {
  return await apiClient.get(`/api/reports/${reportId}/audit`);
};

export { apiClient, ApiError, ApiErrorCode };
