/**
 * @file Button.jsx
 * Institutional Button Primitive with Variants, Sizes, and Loading States.
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs border border-blue-700/30 focus-visible:ring-blue-500',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300/80 focus-visible:ring-slate-400',
  outline: 'bg-transparent hover:bg-slate-100 text-slate-700 border border-slate-300 focus-visible:ring-slate-400',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs border border-rose-700/30 focus-visible:ring-rose-500',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-transparent focus-visible:ring-slate-400',
  link: 'bg-transparent text-blue-600 hover:text-blue-800 underline-offset-4 hover:underline p-0 h-auto border-none focus-visible:ring-blue-400'
};

const SIZES = {
  xs: 'px-2 py-1 text-xs gap-1 rounded-md',
  sm: 'px-2.5 py-1.5 text-xs gap-1.5 rounded-md font-medium',
  md: 'px-3.5 py-2 text-sm gap-2 rounded-lg font-medium',
  lg: 'px-4 py-2.5 text-base gap-2.5 rounded-lg font-semibold'
};

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon: Icon,
  className = '',
  type = 'button',
  onClick,
  ...props
}) => {
  const variantClass = VARIANTS[variant] || VARIANTS.primary;
  const sizeClass = SIZES[size] || SIZES.md;

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`inline-flex items-center justify-center transition-all duration-150 select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
      ) : Icon ? (
        <Icon className="h-4 w-4 shrink-0" />
      ) : null}
      <span>{children}</span>
    </button>
  );
};

export default Button;
