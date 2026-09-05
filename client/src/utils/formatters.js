/**
 * Financial & Currency Formatting Utilities
 * Supports Indian Rupee (₹ Crores, ₹ Lakhs) and Global USD ($B, $M).
 */

export const formatCurrency = (value, currency = 'USD') => {
  if (value === null || value === undefined || isNaN(Number(value))) return 'N/A';
  
  const numValue = Number(value);
  const absVal = Math.abs(numValue);
  const isINR = (currency || '').toUpperCase() === 'INR';
  const symbol = isINR ? '₹' : '$';

  if (isINR) {
    // Indian Crore (1 Cr = 10,000,000) & Lakh (1 Lakh = 100,000)
    if (absVal >= 1e7) {
      return `${symbol}${(numValue / 1e7).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
    } else if (absVal >= 1e5) {
      return `${symbol}${(numValue / 1e5).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Lakh`;
    } else {
      return `${symbol}${numValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    }
  } else {
    // Western Trillion, Billion, Million
    if (absVal >= 1e12) {
      return `${symbol}${(numValue / 1e12).toFixed(2)}T`;
    } else if (absVal >= 1e9) {
      return `${symbol}${(numValue / 1e9).toFixed(2)}B`;
    } else if (absVal >= 1e6) {
      return `${symbol}${(numValue / 1e6).toFixed(2)}M`;
    } else {
      return `${symbol}${numValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
    }
  }
};

export const formatPercent = (value) => {
  if (value === null || value === undefined || isNaN(Number(value))) return 'N/A';
  let percentVal = Number(value);
  if (Math.abs(percentVal) < 1 && percentVal !== 0) {
    percentVal = percentVal * 100;
  }
  return `${percentVal >= 0 ? '+' : ''}${percentVal.toFixed(2)}%`;
};

export const formatRatio = (value) => {
  if (value === null || value === undefined || isNaN(Number(value))) return 'N/A';
  return `${Number(value).toFixed(2)}x`;
};

export const GLOSSARY = {
  peRatio: {
    title: 'P/E Ratio (Price to Earnings)',
    simple: 'How many dollars/rupees you pay for every $1/₹1 of company profit.',
    benchmark: 'Under 25x is often attractive, >40x indicates high growth expectations.'
  },
  operatingMargin: {
    title: 'Operating Profit Margin',
    simple: 'The percentage of revenue left after paying production and operational expenses.',
    benchmark: 'Above 15% is strong, >25% indicates a powerful competitive moat.'
  },
  netProfitMargin: {
    title: 'Net Profit Margin',
    simple: 'The final percentage of revenue that turns into pure bottom-line profit after taxes.',
    benchmark: 'Above 10% is healthy across most industries.'
  },
  freeCashFlow: {
    title: 'Free Cash Flow (FCF)',
    simple: 'Real surplus cash generated after paying all operating bills and capital expenditures.',
    benchmark: 'Positive, growing FCF enables dividend payouts and prevents bankruptcy.'
  },
  roe: {
    title: 'ROE (Return on Equity)',
    simple: 'How efficiently management turns shareholder invested capital into new profits.',
    benchmark: 'Above 15% is considered high-quality capital efficiency.'
  },
  currentRatio: {
    title: 'Current Ratio (Liquidity)',
    simple: 'Whether the company has enough short-term cash/assets to pay its 1-year bills.',
    benchmark: 'Above 1.3x is healthy. Below 1.0x indicates potential cash pressure.'
  },
  quickRatio: {
    title: 'Quick Ratio (Acid Test)',
    simple: 'Immediate liquidity excluding unsold inventory. Can it pay urgent debts immediately?',
    benchmark: 'Above 1.0x is safe and defensive.'
  },
  beta: {
    title: 'Stock Beta (Volatility)',
    simple: 'Measures how wildly this stock swings compared to the broader stock market.',
    benchmark: '1.0 moves with index. >1.3 is high volatility. <0.8 is defensive.'
  },
  dcf: {
    title: 'DCF Intrinsic Fair Value',
    simple: 'What all future 5-year cash flows of this company are worth in today\'s money.',
    benchmark: 'If Market Price is below Fair Value, the stock is undervalued.'
  },
  debtToCash: {
    title: 'Debt-to-Cash Multiple',
    simple: 'Compares total borrowed bank debt directly against cash in the company\'s bank.',
    benchmark: 'Under 1.0x means the company can pay off ALL debt with cash on hand.'
  }
};
