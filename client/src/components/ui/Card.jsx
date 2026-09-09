/**
 * @file Card.jsx
 * Institutional Financial Card Container with Header, Actions, and Severity Accents.
 */

import React from 'react';

const SEVERITY_BORDERS = {
  default: 'border-slate-200',
  info: 'border-blue-300 border-l-4 border-l-blue-600',
  warning: 'border-amber-300 border-l-4 border-l-amber-500',
  danger: 'border-rose-300 border-l-4 border-l-rose-600',
  success: 'border-emerald-300 border-l-4 border-l-emerald-600'
};

export const Card = ({
  children,
  title,
  subtitle,
  icon: Icon,
  actions,
  badge,
  severity = 'default',
  className = '',
  footer,
  ...props
}) => {
  const borderClass = SEVERITY_BORDERS[severity] || SEVERITY_BORDERS.default;

  return (
    <div
      className={`bg-white rounded-xl border shadow-xs transition-shadow duration-150 flex flex-col ${borderClass} ${className}`}
      {...props}
    >
      {(title || subtitle || actions || badge || Icon) && (
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
              <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 shrink-0">
                <Icon className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {title && (
                  <h3 className="text-sm font-bold text-slate-900 truncate tracking-tight">
                    {title}
                  </h3>
                )}
                {badge && <div className="shrink-0">{badge}</div>}
              </div>
              {subtitle && (
                <p className="text-xs text-slate-500 truncate mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      <div className="p-5 flex-1">{children}</div>
      {footer && (
        <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 rounded-b-xl text-xs text-slate-600">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
