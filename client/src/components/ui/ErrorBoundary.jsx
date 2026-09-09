/**
 * @file ErrorBoundary.jsx
 * Application & Component-Level React Error Boundary.
 */

import React, { Component } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Button from './Button.jsx';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('InvestmentAI ErrorBoundary caught an unhandled exception:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 sm:p-12">
          <div className="max-w-lg w-full bg-white rounded-2xl border border-rose-200 shadow-xl p-8 text-center">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight mb-2">
              Application Surface Exception
            </h2>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              The application encountered a render error while executing this analytical component.
              Underlying truth state and persistent audit records remain secure.
            </p>
            {this.state.error?.message && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-left mb-6 overflow-x-auto">
                <code className="text-[11px] font-mono text-rose-700 block">
                  {this.state.error.message}
                </code>
              </div>
            )}
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                icon={RefreshCw}
                onClick={this.handleReset}
              >
                Reload Component
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Home}
                onClick={() => {
                  this.handleReset();
                  window.location.href = '/app/overview';
                }}
              >
                Return to Overview
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
