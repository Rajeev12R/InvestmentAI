/**
 * @file TopBar.jsx
 * Master Top Navigation Bar with Multi-Tenant Organization & Workspace Switcher.
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useWorkspace } from '../../context/WorkspaceContext.jsx';
import {
  Search,
  Building2,
  Briefcase,
  Bell,
  User,
  LogOut,
  ChevronDown,
  Shield,
  Menu,
  Sparkles,
  ExternalLink,
  Settings,
  Users
} from 'lucide-react';
import Badge from '../ui/Badge.jsx';
import { Link } from 'react-router-dom';

export const TopBar = ({ onToggleSidebar, onOpenSearch, onOpenNotifications }) => {
  const { user, logout } = useAuth();
  const {
    activeOrgId,
    activeOrgMeta,
    organizations,
    activeWorkspaceId,
    activeWorkspaceMeta,
    workspaces,
    allWorkspaces,
    switchWorkspace,
    switchOrganization
  } = useWorkspace();

  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between z-20 gap-4">
      {/* Left: Sidebar Toggle & Multi-Tenant Switcher */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title="Toggle Navigation Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Multi-Tenant Organization & Workspace Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsWorkspaceMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 transition-colors cursor-pointer"
          >
            <Building2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
            <div className="flex items-center gap-1.5 truncate max-w-[220px]">
              <span className="text-slate-500 font-medium truncate max-w-[90px]">
                {activeOrgMeta?.name || 'Primary Capital'}
              </span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900 font-bold truncate max-w-[110px]">
                {activeWorkspaceMeta?.name || 'Primary Portfolio'}
              </span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          </button>

          {isWorkspaceMenuOpen && (
            <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
              {/* Organization Header */}
              {organizations && organizations.length > 1 && (
                <div className="px-3 pb-2 mb-2 border-b border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Select Organization
                  </div>
                  <div className="space-y-0.5">
                    {organizations.map((org) => (
                      <button
                        key={org.orgId}
                        onClick={() => {
                          switchOrganization(org.orgId);
                        }}
                        className={`w-full text-left px-2 py-1.5 text-xs rounded-md flex items-center justify-between transition-colors cursor-pointer ${
                          org.orgId === activeOrgId ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate">{org.name}</span>
                        {org.orgId === activeOrgId && <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Workspaces ({activeOrgMeta?.name || 'Current Org'})
              </div>
              <div className="max-h-48 overflow-y-auto">
                {(workspaces?.length > 0 ? workspaces : [{ workspaceId: 'default', name: 'Primary Institutional Portfolio' }]).map(
                  (ws) => (
                    <button
                      key={ws.workspaceId || ws.id}
                      onClick={() => {
                        switchWorkspace(ws.workspaceId || ws.id);
                        setIsWorkspaceMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                        (ws.workspaceId || ws.id) === activeWorkspaceId
                          ? 'bg-blue-50/70 text-blue-700 font-semibold'
                          : 'text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Briefcase className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{ws.name}</span>
                      </div>
                      {(ws.workspaceId || ws.id) === activeWorkspaceId && (
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                      )}
                    </button>
                  )
                )}
              </div>

              <div className="mt-2 pt-2 border-t border-slate-100 px-2">
                <Link
                  to="/app/admin/workspaces"
                  onClick={() => setIsWorkspaceMenuOpen(false)}
                  className="flex items-center gap-2 px-2 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>Manage Workspaces & Members</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center: Command Palette / Global Search Shortcut */}
      <div className="flex-1 max-w-md hidden md:block">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3.5 py-1.5 text-xs text-slate-400 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <span>Search companies, tickers, portfolios, theses...</span>
          </div>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white border border-slate-200 rounded text-slate-500 shadow-2xs">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Notifications, Quick Links, User Account */}
      <div className="flex items-center gap-2.5">
        <Link
          to="/"
          target="_blank"
          className="hidden lg:flex items-center gap-1 px-2.5 py-1 text-xs text-slate-500 hover:text-slate-900 rounded-lg transition-colors"
          title="Open Public Terminal"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span>Public View</span>
        </Link>

        {/* Notifications Trigger */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title="Attention & Alerts"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-blue-600 rounded-full ring-2 ring-white" />
        </button>

        {/* User Account Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {user?.name ? user.name.substring(0, 2).toUpperCase() : 'PM'}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-slate-900 leading-tight">
                {user?.name || 'Administrator'}
              </div>
              <div className="text-[10px] text-slate-500">
                {user?.email || 'admin@investmentai.local'}
              </div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{user?.name || 'Institutional PM'}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email || 'admin@investmentai.local'}</p>
                <div className="mt-1.5 flex gap-1.5">
                  <Badge variant="PROVENANCE" size="xs">
                    ROLE: {activeWorkspaceMeta?.role || 'OWNER'}
                  </Badge>
                </div>
              </div>

              <div className="py-1">
                <Link
                  to="/app/admin"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Settings className="h-3.5 w-3.5 text-slate-500" />
                  <span>Organization & Workspaces</span>
                </Link>
                <Link
                  to="/app/governance/security"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Shield className="h-3.5 w-3.5 text-slate-500" />
                  <span>Security & Keys</span>
                </Link>
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;

