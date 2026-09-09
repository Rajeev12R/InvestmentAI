/**
 * @file FinancialValue.jsx
 * Standardized Institutional Quantitative Value Formatter & Presenter.
 */

import React from 'react';
import { formatCurrency, formatPercent, formatRatio } from '../../utils/formatters.js';

export const FinancialValueType = Object.freeze({
  CURRENCY: 'CURRENCY',
  PERCENT: 'PERCENT',
  BPS: 'BPS',
  RATIO: 'RATIO',
  VOLATILITY: 'VOLATILITY',
  VAR: 'VAR',
  SHARPE: 'SHARPE',
  WEIGHT: 'WEIGHT',
  NUMBER: 'NUMBER',
  DATE: 'DATE'
});

export const FinancialValue = ({
  value,
  type = FinancialValueType.NUMBER,
  currency = 'USD',
  decimals = 2,
  showSign = false,
  highlightSign = false,
  className = '',
  unavailablePlaceholder = '—'
}) => {
  if (value === null || value === undefined || isNaN(Number(value)) && type !== FinancialValueType.DATE) {
    return <span className={`text-slate-400 font-mono ${className}`}>{unavailablePlaceholder}</span>;
  }

  const num = Number(value);
  let formatted = '';
  let colorClass = 'text-slate-900';

  if (highlightSign) {
    if (num > 0) colorClass = 'text-emerald-600 font-semibold';
    else if (num < 0) colorClass = 'text-rose-600 font-semibold';
    else colorClass = 'text-slate-600';
  }

  switch (type) {
    case FinancialValueType.CURRENCY:
      formatted = formatCurrency(num, currency);
      break;

    case FinancialValueType.PERCENT:
    case FinancialValueType.VOLATILITY:
      formatted = formatPercent(num);
      break;

    case FinancialValueType.BPS: {
      const bps = Math.round(num * 10000);
      formatted = `${bps >= 0 && showSign ? '+' : ''}${bps.toLocaleString()} bps`;
      break;
    }

    case FinancialValueType.RATIO:
    case FinancialValueType.SHARPE:
      formatted = `${num.toFixed(decimals)}x`;
      break;

    case FinancialValueType.WEIGHT: {
      const pct = (num * 100).toFixed(decimals);
      formatted = `${pct}%`;
      break;
    }

    case FinancialValueType.VAR:
      formatted = `${formatCurrency(num, currency)} (${(decimals ? (num).toFixed(decimals) : num)})`;
      break;

    case FinancialValueType.DATE:
      try {
        formatted = new Date(value).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: '2-digit'
        });
      } catch {
        formatted = String(value);
      }
      break;

    case FinancialValueType.NUMBER:
    default:
      formatted = num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
      if (showSign && num > 0) formatted = `+${formatted}`;
      break;
  }

  return (
    <span className={`font-mono text-xs tabular-nums ${colorClass} ${className}`}>
      {formatted}
    </span>
  );
};

export default FinancialValue;
