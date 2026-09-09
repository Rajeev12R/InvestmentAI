/**
 * @file LoginPage.jsx
 * Institutional Multi-User Login Screen with RBAC Quick-Fill Presets for Phase 34.
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { TrendingUp, Lock, Mail, Shield, AlertCircle, ArrowRight } from 'lucide-react';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Card from '../ui/Card.jsx';
import Badge from '../ui/Badge.jsx';

const INSTITUTIONAL_PRESETS = [
  {
    role: 'Root Admin',
    email: 'admin@investmentai.local',
    password: 'Admin123!Secure',
    badge: 'OWNER'
  },
  {
    role: 'Portfolio Manager',
    email: 'pm@investmentai.local',
    password: 'Admin123!Secure',
    badge: 'PM'
  },
  {
    role: 'Risk Officer',
    email: 'risk@investmentai.local',
    password: 'Admin123!Secure',
    badge: 'RISK'
  },
  {
    role: 'Compliance Officer',
    email: 'compliance@investmentai.local',
    password: 'Admin123!Secure',
    badge: 'COMPLIANCE'
  }
];

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, isLoading } = useAuth();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('admin@investmentai.local');
  const [password, setPassword] = useState('Admin123!Secure');
  const [name, setName] = useState('Institutional Admin');
  const [error, setError] = useState(null);

  const from = location.state?.from?.pathname || '/app/overview';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      if (isRegisterMode) {
        await register({ email, password, name });
      } else {
        await login({ email, password, workspaceId: 'default' });
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    }
  };

  const handleQuickFill = (preset) => {
    setEmail(preset.email);
    setPassword(preset.password);
    setName(preset.role);
    setIsRegisterMode(false);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-blue-600 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex p-3 rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-600/30 mb-4">
          <TrendingUp className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">
          Investment<span className="text-blue-500">AI</span>
        </h1>
        <p className="mt-1 text-xs text-slate-400 font-medium uppercase tracking-wider">
          Institutional Investment Intelligence & Decision SaaS
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white text-slate-900 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-200">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">
              {isRegisterMode ? 'Create Institutional Account' : 'Sign in to Platform'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isRegisterMode
                ? 'Register your organization with sovereign RBAC governance.'
                : 'Enter your credentials to access authorized workspaces.'}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegisterMode && (
              <Input
                label="Full Name / Designation"
                type="text"
                placeholder="e.g. Lead Portfolio Manager"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            )}

            <Input
              label="Institutional Email"
              type="email"
              icon={Mail}
              placeholder="name@organization.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              icon={Lock}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                isLoading={isLoading}
              >
                {isRegisterMode ? 'Register & Enter Workspace' : 'Authorize & Enter Workspace'}
              </Button>
            </div>
          </form>

          {/* Quick-Fill Presets for Testing & Demo */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>Demo Institutional Roles</span>
              <Shield className="h-3.5 w-3.5" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {INSTITUTIONAL_PRESETS.map((preset) => (
                <button
                  key={preset.role}
                  type="button"
                  onClick={() => handleQuickFill(preset)}
                  className="px-2.5 py-2 text-left bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 rounded-lg transition-all text-xs cursor-pointer"
                >
                  <div className="font-bold text-slate-800 text-[11px] truncate">{preset.role}</div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">{preset.badge}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode((prev) => !prev);
                setError(null);
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer"
            >
              {isRegisterMode
                ? 'Already have credentials? Sign In'
                : 'Need to provision a new workspace? Register'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
