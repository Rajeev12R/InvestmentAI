/**
 * @file apiClient.js
 * Centralized Institutional API Client with Context Scoping, Retries, and Error Normalization.
 */

import axios from 'axios';
import { normalizeApiError, ApiErrorCode, ApiError } from './errorTypes.js';

export const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) {
      return import.meta.env.VITE_LOCAL_API_URL || 'http://localhost:3000';
    }
  }
  return import.meta.env.VITE_API_URL || 'https://investmentai-kfg5.onrender.com';
};

const apiClientInstance = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Dynamic session & workspace injectors
let currentAuthToken = null;
let currentWorkspaceId = 'default';

export const setAuthToken = (token) => {
  currentAuthToken = token;
};

export const setWorkspaceContext = (workspaceId) => {
  currentWorkspaceId = workspaceId || 'default';
};

// Request Interceptor: Attach Auth Token and Workspace Header
apiClientInstance.interceptors.request.use(
  (config) => {
    // If not explicitly set in memory, try reading from localStorage for initial boot
    const token = currentAuthToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('investmentai_auth_token') : null);
    const workspaceId = currentWorkspaceId || (typeof localStorage !== 'undefined' ? localStorage.getItem('investmentai_active_workspace') : 'default');

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    if (workspaceId) {
      config.headers['x-workspace-id'] = workspaceId;
    }

    config.headers['x-client-timestamp'] = new Date().toISOString();
    return config;
  },
  (error) => Promise.reject(normalizeApiError(error))
);

// Response Interceptor: Error normalization
apiClientInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const normalized = normalizeApiError(error);
    return Promise.reject(normalized);
  }
);

/**
 * High-level typed/safe API request executor
 */
export async function apiRequest({
  method = 'GET',
  url,
  data = null,
  params = null,
  headers = {},
  timeout = null,
  retries = 0
}) {
  const isSafeRead = method.toUpperCase() === 'GET';
  let attempts = 0;
  const maxAttempts = isSafeRead ? Math.max(1, retries + 1) : 1; // NEVER retry mutations

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const response = await apiClientInstance.request({
        method,
        url,
        data,
        params,
        headers,
        ...(timeout ? { timeout } : {})
      });
      return response.data;
    } catch (err) {
      if (attempts >= maxAttempts || !isSafeRead) {
        throw err;
      }
      // Exponential backoff for safe idempotent reads
      const delay = Math.min(1000 * Math.pow(2, attempts - 1), 4000);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
}

export const apiClient = {
  get: (url, config = {}) => apiRequest({ method: 'GET', url, ...config }),
  post: (url, data, config = {}) => apiRequest({ method: 'POST', url, data, ...config }),
  put: (url, data, config = {}) => apiRequest({ method: 'PUT', url, data, ...config }),
  patch: (url, data, config = {}) => apiRequest({ method: 'PATCH', url, data, ...config }),
  delete: (url, config = {}) => apiRequest({ method: 'DELETE', url, ...config }),
  raw: apiClientInstance
};

export { ApiErrorCode, ApiError, normalizeApiError };
export default apiClient;
