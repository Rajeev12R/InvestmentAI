/**
 * @file StateView.jsx
 * Unified Presentation Component for Institutional Loading, Empty, Insufficient Data,
 * Error, Unauthorized, and Stale States.
 */

import React from 'react';
import { Loader2, AlertCircle, ShieldAlert, Database, Clock, RefreshCw, FolderSearch } from 'lucide-react';
import Button from './Button.jsx';

export const StateType = Object.freeze({
  LOADING: 'LOADING',
  EMPTY: 'EMPTY',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  ERROR: 'ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  STALE: 'STALE'
});

export const StateView = ({
  type = StateType.EMPTY,
  title,
  message,
  actionLabel,
  onAction,
  className = '',
  icon: CustomIcon
}) => {
  let defaultIcon = FolderSearch;
  let defaultTitle = 'No Records Found';
  let defaultMessage = 'There are no active records in the current workspace.';
  let iconColor = 'text-slate-400 bg-slate-100';

  switch (type) {
    case StateType.LOADING:
      defaultIcon = Loader2;
      defaultTitle = 'Retrieving Intelligence';
      defaultMessage = 'Contacting the Sovereign Truth Layer and quantitative engines...';
      iconColor = 'text-blue-600 bg-blue-50';
      break;

    case StateType.INSUFFICIENT_DATA:
      defaultIcon = Database;
      defaultTitle = 'Insufficient Data for Responsible Decision';
      defaultMessage = 'The analytical model requires additional point-in-time observations to calculate quantitative metrics safely without fabrication.';
      iconColor = 'text-amber-600 bg-amber-50';
      break;

    case StateType.UNAUTHORIZED:
      defaultIcon = ShieldAlert;
      defaultTitle = 'Access Restricted';
      defaultMessage = 'Your active user role does not hold the required permissions to view this workspace resource.';
      iconColor = 'text-rose-600 bg-rose-50';
      break;

    case StateType.ERROR:
      defaultIcon = AlertCircle;
      defaultTitle = 'Operational Pipeline Error';
      defaultMessage = 'An unexpected failure occurred while processing this investment surface.';
      iconColor = 'text-rose-600 bg-rose-50';
      break;

    case StateType.STALE:
      defaultIcon = Clock;
      defaultTitle = 'Stale Intelligence Boundary';
      defaultMessage = 'The displayed financial data exceeds the maximum freshness threshold and must be re-ingested.';
      iconColor = 'text-amber-600 bg-amber-50';
      break;

    case StateType.EMPTY:
    default:
      defaultIcon = FolderSearch;
      defaultTitle = 'No Data Available';
      defaultMessage = 'No matching assets, portfolios, or decisions were found in this scope.';
      iconColor = 'text-slate-400 bg-slate-100';
      break;
  }

  const IconToRender = CustomIcon || defaultIcon;
  const isSpinning = type === StateType.LOADING;

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 max-w-xl mx-auto my-6 ${className}`}
    >
      <div className={`p-4 rounded-2xl mb-4 ${iconColor}`}>
        <IconToRender className={`h-8 w-8 ${isSpinning ? 'animate-spin' : ''}`} />
      </div>
      <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-1.5">
        {title || defaultTitle}
      </h3>
      <p className="text-xs text-slate-500 leading-relaxed max-w-md mb-5">
        {message || defaultMessage}
      </p>
      {onAction && actionLabel && (
        <Button
          onClick={onAction}
          variant={type === StateType.ERROR ? 'danger' : 'primary'}
          size="sm"
          icon={type === StateType.ERROR || type === StateType.STALE ? RefreshCw : undefined}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default StateView;
