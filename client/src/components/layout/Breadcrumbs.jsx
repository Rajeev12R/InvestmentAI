/**
 * @file Breadcrumbs.jsx
 * Context-Aware Institutional Breadcrumbs Component.
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const ROUTE_LABELS = {
  app: 'InvestmentAI',
  overview: 'Cockpit Overview',
  research: 'Research Hub',
  evidence: 'Evidence & Truth',
  signals: 'Signal Intelligence',
  macro: 'Macro & Scenarios',
  graph: 'Knowledge Graph',
  company: 'Company Dossier',
  portfolios: 'Portfolios',
  risk: 'Risk & Forecasts',
  optimization: 'Portfolio Optimization',
  decisions: 'Decision Center',
  drift: 'Thesis & Drift',
  process: 'Process Intelligence',
  governance: 'Governance',
  compliance: 'Compliance Limits',
  audit: 'Audit Trail',
  members: 'Workspace Members',
  keys: 'API Keys',
  security: 'Security Controls',
  copilot: 'AI Copilot'
};

export const Breadcrumbs = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  if (pathnames.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-4" aria-label="Breadcrumb">
      <Link
        to="/app/overview"
        className="flex items-center gap-1 hover:text-slate-900 transition-colors text-slate-500 font-medium"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const label = ROUTE_LABELS[value.toLowerCase()] || value.toUpperCase();

        return (
          <React.Fragment key={to}>
            <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
            {isLast ? (
              <span className="font-semibold text-slate-900 truncate max-w-xs">{label}</span>
            ) : (
              <Link to={to} className="hover:text-slate-900 transition-colors truncate max-w-xs">
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
