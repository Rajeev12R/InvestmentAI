/**
 * @file Alert.jsx
 * Institutional Alert Callout Banner Component.
 */

import React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const ALERT_STYLES = {
  info: {
    container: 'bg-blue-50 border-blue-200 text-blue-900',
    icon: Info,
    iconColor: 'text-blue-600'
  },
  success: {
    container: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    icon: CheckCircle2,
    iconColor: 'text-emerald-600'
  },
  warning: {
    container: 'bg-amber-50 border-amber-200 text-amber-900',
    icon: AlertTriangle,
    iconColor: 'text-amber-600'
  },
  danger: {
    container: 'bg-rose-50 border-rose-200 text-rose-900',
    icon: AlertCircle,
    iconColor: 'text-rose-600'
  }
};

export const Alert = ({
  type = 'info',
  title,
  children,
  action,
  onClose,
  className = ''
}) => {
  const style = ALERT_STYLES[type] || ALERT_STYLES.info;
  const IconComponent = style.icon;

  return (
    <div
      className={`rounded-xl border p-4 flex items-start gap-3.5 shadow-2xs ${style.container} ${className}`}
      role="alert"
    >
      <IconComponent className={`h-5 w-5 shrink-0 mt-0.5 ${style.iconColor}`} />
      <div className="flex-1 min-w-0">
        {title && <h4 className="text-xs font-bold uppercase tracking-wider mb-1">{title}</h4>}
        <div className="text-xs font-medium leading-relaxed">{children}</div>
        {action && <div className="mt-2.5">{action}</div>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default Alert;
