/**
 * @file GlobalSearchModal.jsx
 * Keyboard-Accessible Command Palette (`Cmd+K`) for Institutional Navigation.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Building2, PieChart, ShieldCheck, ArrowRight, X } from 'lucide-react';

const QUICK_ACTIONS = [
  { id: '1', title: 'NVDA — NVIDIA Corporation', type: 'COMPANY', url: '/app/research/company/NVDA' },
  { id: '2', title: 'AAPL — Apple Inc.', type: 'COMPANY', url: '/app/research/company/AAPL' },
  { id: '3', title: 'MSFT — Microsoft Corporation', type: 'COMPANY', url: '/app/research/company/MSFT' },
  { id: '4', title: 'RELIANCE — Reliance Industries', type: 'COMPANY', url: '/app/research/company/RELIANCE' },
  { id: '5', title: 'TCS — Tata Consultancy Services', type: 'COMPANY', url: '/app/research/company/TCS' },
  { id: '6', title: 'Portfolio Optimization (Phase 33 Solvers)', type: 'PORTFOLIO', url: '/app/portfolios/optimization' },
  { id: '7', title: 'Risk Attribution & Explainability', type: 'PORTFOLIO', url: '/app/portfolios/risk' },
  { id: '8', title: 'Institutional Compliance Limits', type: 'GOVERNANCE', url: '/app/governance/compliance' },
  { id: '9', title: 'Immutable Audit Trail', type: 'GOVERNANCE', url: '/app/governance/audit' },
  { id: '10', title: 'Institutional AI Copilot', type: 'COPILOT', url: '/app/copilot' }
];

export const GlobalSearchModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = QUICK_ACTIONS.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.type.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          navigate(filtered[selectedIndex].url);
          onClose();
        } else if (query.trim()) {
          // Fallback: search ticker directly
          navigate(`/app/research/company/${query.trim().toUpperCase()}`);
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, navigate, onClose, query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 gap-3">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command, ticker, or domain area..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No results found. Press <kbd className="px-1 py-0.5 bg-slate-100 rounded text-slate-600">Enter</kbd> to analyze ticker &quot;{query.toUpperCase()}&quot;.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    navigate(item.url);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors cursor-pointer text-xs ${
                    isSelected ? 'bg-blue-50/80 text-blue-900 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.type === 'COMPANY' ? (
                      <Building2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    ) : item.type === 'PORTFOLIO' ? (
                      <PieChart className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    ) : (
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    )}
                    <span className="truncate">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                      {item.type}
                    </span>
                    {isSelected && <ArrowRight className="h-3.5 w-3.5 text-blue-600" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Keyboard Footer */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Navigate with ↑ and ↓</span>
          <span>Select with ↵</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearchModal;
