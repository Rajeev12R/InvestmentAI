/**
 * @file Badge.jsx
 * Institutional Status Badge for Financial & Operational States.
 */

import React from 'react';

const BADGE_VARIANTS = {
  // Institutional Risk & State Variants
  OK: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  SUCCESS: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  WARNING: 'bg-amber-50 text-amber-800 border-amber-200/80',
  BREACH: 'bg-rose-50 text-rose-700 border-rose-200/80',
  CRITICAL: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
  DANGER: 'bg-rose-50 text-rose-700 border-rose-200/80',
  INFO: 'bg-blue-50 text-blue-700 border-blue-200/80',
  NEUTRAL: 'bg-slate-100 text-slate-700 border-slate-200',
  STALE: 'bg-amber-50 text-amber-900 border-amber-300 border-dashed',
  UNAVAILABLE: 'bg-slate-100 text-slate-500 border-slate-300 border-dashed',
  PROVENANCE: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  T0: 'bg-purple-50 text-purple-700 border-purple-200 font-mono'
};

const SIZES = {
  xs: 'px-1.5 py-0.5 text-[10px]',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs'
};

export const Badge = ({
  children,
  variant = 'NEUTRAL',
  size = 'sm',
  icon: Icon,
  dot = false,
  className = ''
}) => {
  const normalizedVariant = (variant || 'NEUTRAL').toUpperCase();
  const variantClass = BADGE_VARIANTS[normalizedVariant] || BADGE_VARIANTS.NEUTRAL;
  const sizeClass = SIZES[size] || SIZES.sm;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-md border tracking-tight uppercase ${variantClass} ${sizeClass} ${className}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            normalizedVariant === 'OK' || normalizedVariant === 'SUCCESS'
              ? 'bg-emerald-500'
              : normalizedVariant === 'WARNING' || normalizedVariant === 'STALE'
              ? 'bg-amber-500'
              : normalizedVariant === 'BREACH' || normalizedVariant === 'CRITICAL' || normalizedVariant === 'DANGER'
              ? 'bg-rose-500 animate-pulse'
              : 'bg-blue-500'
          }`}
        />
      )}
      {Icon && <Icon className="h-3 w-3 shrink-0" />}
      <span>{children}</span>
    </span>
  );
};

export default Badge;
