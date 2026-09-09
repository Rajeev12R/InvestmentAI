/**
 * @file AuthContext.jsx
 * Multi-User Institutional Authentication Context for Phase 34.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginApi, registerApi, logoutApi, getSessionApi, getUserWorkspacesApi, getOrganizationsApi } from '../utils/api.js';
import { setAuthToken } from '../services/apiClient.js';

const AuthContext = createContext(null);

export const AuthStatus = Object.freeze({
  IDLE: 'IDLE',
  AUTHENTICATING: 'AUTHENTICATING',
  AUTHENTICATED: 'AUTHENTICATED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  ERROR: 'ERROR'
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('investmentai_auth_token') || null;
    } catch {
      return null;
    }
  });
  const [userOrganizations, setUserOrganizations] = useState([]);
  const [userWorkspaces, setUserWorkspaces] = useState([]);
  const [authStatus, setAuthStatus] = useState(AuthStatus.IDLE);
  const [error, setError] = useState(null);

  // Sync token to API Client and localStorage
  const applyToken = useCallback((newToken) => {
    setToken(newToken);
    setAuthToken(newToken);
    try {
      if (newToken) {
        localStorage.setItem('investmentai_auth_token', newToken);
      } else {
        localStorage.removeItem('investmentai_auth_token');
      }
    } catch (e) {
      console.error('Failed to sync auth token in localStorage:', e);
    }
  }, []);

  const refreshOrganizations = useCallback(async () => {
    try {
      const orgRes = await getOrganizationsApi();
      if (orgRes && orgRes.data) {
        setUserOrganizations(orgRes.data);
      }
    } catch (orgErr) {
      console.warn('Failed to load user organizations:', orgErr);
    }
  }, []);

  const refreshWorkspaces = useCallback(async () => {
    try {
      const wsData = await getUserWorkspacesApi();
      if (wsData && wsData.workspaces) {
        setUserWorkspaces(wsData.workspaces);
      }
    } catch (wsErr) {
      console.warn('Failed to load user workspaces:', wsErr);
    }
  }, []);

  // Validate existing session on application boot
  const validateSession = useCallback(async (tokenToVerify) => {
    if (!tokenToVerify) {
      setUser(null);
      setSession(null);
      setUserOrganizations([]);
      setUserWorkspaces([]);
      setAuthStatus(AuthStatus.UNAUTHENTICATED);
      return;
    }

    setAuthStatus(AuthStatus.AUTHENTICATING);
    try {
      setAuthToken(tokenToVerify);
      const sessionData = await getSessionApi();
      if (sessionData && sessionData.user) {
        setUser(sessionData.user);
        setSession(sessionData.session);
        setAuthStatus(AuthStatus.AUTHENTICATED);
        setError(null);

        // Fetch user's authorized organizations and workspaces
        await Promise.all([
          refreshOrganizations(),
          refreshWorkspaces()
        ]);
      } else {
        throw new Error('Invalid session response');
      }
    } catch (err) {
      console.warn('Session verification failed, logging out:', err.message);
      applyToken(null);
      setUser(null);
      setSession(null);
      setUserOrganizations([]);
      setUserWorkspaces([]);
      setAuthStatus(AuthStatus.UNAUTHENTICATED);
      setError(null);
    }
  }, [applyToken, refreshOrganizations, refreshWorkspaces]);

  useEffect(() => {
    const initialToken = localStorage.getItem('investmentai_auth_token');
    if (initialToken) {
      validateSession(initialToken);
    } else {
      setAuthStatus(AuthStatus.UNAUTHENTICATED);
    }
  }, [validateSession]);

  const login = async ({ email, password, workspaceId = 'default' }) => {
    setAuthStatus(AuthStatus.AUTHENTICATING);
    setError(null);
    try {
      const response = await loginApi({ email, password, workspaceId });
      const receivedToken = response?.token || response?.session?.token;
      if (response && receivedToken) {
        applyToken(receivedToken);
        setUser(response.user);
        setSession(response.session);
        if (response.organizations) setUserOrganizations(response.organizations);
        if (response.workspaces) setUserWorkspaces(response.workspaces);
        setAuthStatus(AuthStatus.AUTHENTICATED);

        await Promise.all([
          refreshOrganizations(),
          refreshWorkspaces()
        ]);

        return { success: true, user: response.user, session: response.session };
      } else {
        throw new Error('Login failed: Invalid server response');
      }
    } catch (err) {
      const msg = err.message || 'Invalid email or password';
      setError(msg);
      setAuthStatus(AuthStatus.ERROR);
      throw err;
    }
  };

  const register = async ({ email, password, name }) => {
    setAuthStatus(AuthStatus.AUTHENTICATING);
    setError(null);
    try {
      await registerApi({ email, password, name });
      return await login({ email, password });
    } catch (err) {
      const msg = err.message || 'Registration failed';
      setError(msg);
      setAuthStatus(AuthStatus.ERROR);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch (err) {
      console.warn('Logout API warning:', err.message);
    } finally {
      applyToken(null);
      setUser(null);
      setSession(null);
      setUserOrganizations([]);
      setUserWorkspaces([]);
      setAuthStatus(AuthStatus.UNAUTHENTICATED);
      setError(null);
    }
  };

  const value = {
    user,
    session,
    token,
    userOrganizations,
    userWorkspaces,
    authStatus,
    error,
    isAuthenticated: authStatus === AuthStatus.AUTHENTICATED && !!user,
    isLoading: authStatus === AuthStatus.AUTHENTICATING || authStatus === AuthStatus.IDLE,
    login,
    register,
    logout,
    refreshOrganizations,
    refreshWorkspaces,
    validateSession
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

