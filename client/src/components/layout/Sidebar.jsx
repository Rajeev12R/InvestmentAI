/**
 * @file Sidebar.jsx
 * Collapsible Domain Sidebar Navigation for InvestmentAI.
 */

import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  BookOpen,
  PieChart,
  Activity,
  ShieldCheck,
  Bot,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Sliders,
  Layers,
  FileCheck,
  Key,
  Users,
  Lock,
  GitBranch,
  Network,
  Sparkles,
  BarChart3,
  FileText,
  Building2,
  Bell
} from 'lucide-react';

export const Sidebar = ({ isCollapsed, onToggle }) => {
  const location = useLocation();

  const [expandedSections, setExpandedSections] = useState({
    research: true,
    portfolios: true,
    decisions: true,
    governance: false,
    admin: true
  });

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const navItemClass = ({ isActive }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
      isActive
        ? 'bg-blue-600 text-white font-semibold shadow-xs'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`;

  return (
    <aside
      className={`bg-white border-r border-slate-200 flex flex-col transition-all duration-200 select-none z-30 shrink-0 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 border-b border-slate-200 flex items-center px-4 justify-between bg-slate-50/50">
        <NavLink to="/app/overview" className="flex items-center gap-2.5 min-w-0">
          <div className="bg-blue-600 p-1.5 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-600/20 shrink-0">
            <TrendingUp className="h-4 w-4" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <span className="font-extrabold tracking-tight text-base text-slate-900">
                Investment<span className="text-blue-600">AI</span>
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Institutional SaaS
              </span>
            </div>
          )}
        </NavLink>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {/* Overview & Attention */}
        <div className="space-y-0.5">
          <NavLink to="/app/overview" className={navItemClass}>
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>Cockpit Overview</span>}
          </NavLink>
          <NavLink to="/app/attention" className={navItemClass}>
            <Bell className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>Attention Center</span>}
          </NavLink>
          <NavLink to="/app/reports" className={navItemClass}>
            <FileText className="h-4 w-4 shrink-0 text-blue-600" />
            {!isCollapsed && <span>Institutional Reports</span>}
          </NavLink>
        </div>

        {/* Research Domain */}
        <div className="space-y-1">
          {!isCollapsed && (
            <button
              onClick={() => toggleSection('research')}
              className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-700 transition-colors"
            >
              <span>Research</span>
              {expandedSections.research ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          )}
          {(isCollapsed || expandedSections.research) && (
            <div className="space-y-0.5">
              <NavLink to="/app/research" className={navItemClass}>
                <BookOpen className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>Research Hub</span>}
              </NavLink>
              <NavLink to="/app/research/evidence" className={navItemClass}>
                <FileText className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>Evidence & Truth</span>}
              </NavLink>
              <NavLink to="/app/research/signals" className={navItemClass}>
                <Sparkles className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>Signal Intelligence</span>}
              </NavLink>
              <NavLink to="/app/research/macro" className={navItemClass}>
                <Activity className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>Macro & Scenarios</span>}
              </NavLink>
              <NavLink to="/app/research/graph" className={navItemClass}>
                <Network className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>Knowledge Graph</span>}
              </NavLink>
            </div>
          )}
        </div>

        {/* Portfolios & Quantitative Domain */}
        <div className="space-y-1">
          {!isCollapsed && (
            <button
              onClick={() => toggleSection('portfolios')}
              className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-700 transition-colors"
            >
              <span>Portfolios & Risk</span>
              {expandedSections.portfolios ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          )}
          {(isCollapsed || expandedSections.portfolios) && (
            <div className="space-y-0.5">
              <NavLink to="/app/portfolios" className={navItemClass}>
                <PieChart className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>Portfolios Overview</span>}
              </NavLink>
              <NavLink to="/app/portfolios/risk" className={navItemClass}>
                <BarChart3 className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>Risk & Forecasts</span>}
              </NavLink>
              <NavLink to="/app/portfolios/optimization" className={navItemClass}>
                <Sliders className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>Optimization (P33)</span>}
              </NavLink>
            </div>
          )}
        </div>

        {/* Decisions & Operations */}
        <div className="space-y-1">
          {!isCollapsed && (
            <button
              onClick={() => toggleSection('decisions')}
              className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-700 transition-colors"
            >
              <span>Decisions & Ops</span>
              {expandedSections.decisions ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          )}
          {(isCollapsed || expandedSections.decisions) && (
            <div className="space-y-0.5">
              <NavLink to="/app/decisions" className={navItemClass}>
                <FileCheck className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>Decision Center</span>}
              </NavLink>
              <NavLink to="/app/decisions/drift" className={navItemClass}>
                <GitBranch className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>Thesis & Drift</span>}
              </NavLink>
            </div>
          )}
        </div>

        {/* Governance & Admin */}
        <div className="space-y-1">
          {!isCollapsed && (
            <button
              onClick={() => toggleSection('governance')}
              className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-700 transition-colors"
            >
              <span>Governance & Security</span>
              {expandedSections.governance ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          )}
          {(isCollapsed || expandedSections.governance) && (
            <div className="space-y-0.5">
              <NavLink to="/app/governance/compliance" className={navItemClass}>
                <ShieldCheck className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>Compliance & Limits</span>}
              </NavLink>
              <NavLink to="/app/governance/audit" className={navItemClass}>
                <Layers className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>Immutable Audit</span>}
              </NavLink>
              <NavLink to="/app/governance/members" className={navItemClass}>
                <Users className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>Workspace Members</span>}
              </NavLink>
              <NavLink to="/app/governance/keys" className={navItemClass}>
                <Key className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>API Keys</span>}
              </NavLink>
              <NavLink to="/app/governance/security" className={navItemClass}>
                <Lock className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>Security Controls</span>}
              </NavLink>
            </div>
          )}
        </div>

        {/* Administration & Multi-Tenancy (Phase 35) */}
        <div className="space-y-1">
          {!isCollapsed && (
            <button
              onClick={() => toggleSection('admin')}
              className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-700 transition-colors"
            >
              <span>Administration (P35)</span>
              {expandedSections.admin ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          )}
          {(isCollapsed || expandedSections.admin) && (
            <div className="space-y-0.5">
              <NavLink to="/app/admin" end className={navItemClass}>
                <Building2 className="h-4 w-4 shrink-0 text-blue-600" />
                {!isCollapsed && <span>Tenancy Overview</span>}
              </NavLink>
              <NavLink to="/app/admin/organizations" className={navItemClass}>
                <Building2 className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>Organization Settings</span>}
              </NavLink>
              <NavLink to="/app/admin/workspaces" className={navItemClass}>
                <Sliders className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>Workspaces Control</span>}
              </NavLink>
              <NavLink to="/app/admin/members" className={navItemClass}>
                <Users className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>Members & Roles</span>}
              </NavLink>
              <NavLink to="/app/admin/roles" className={navItemClass}>
                <ShieldCheck className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span>RBAC & Permissions</span>}
              </NavLink>
            </div>
          )}
        </div>

        {/* Copilot Workspace */}
        <div className="pt-2 border-t border-slate-100">
          <NavLink to="/app/copilot" className={navItemClass}>
            <Bot className="h-4 w-4 shrink-0 text-indigo-600" />
            {!isCollapsed && <span className="font-semibold text-indigo-900">AI Copilot</span>}
          </NavLink>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
