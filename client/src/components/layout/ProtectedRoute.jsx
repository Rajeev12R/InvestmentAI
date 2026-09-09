/**
 * @file ProtectedRoute.jsx
 * Institutional Client-Side Route Guard for Protected SaaS Surfaces.
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import StateView, { StateType } from '../ui/StateView.jsx';

export const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <StateView
          type={StateType.LOADING}
          title="Verifying Institutional Session"
          message="Validating cryptographic tokens and workspace authorization with the Sovereign Truth Layer..."
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
