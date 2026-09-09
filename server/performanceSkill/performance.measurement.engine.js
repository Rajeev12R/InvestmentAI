import { deepFreeze, computePerformanceHash } from './performance.types.js';

/**
 * Phase 29 — Deterministic Performance Measurement Engine
 * Calculates TWR, MWR (IRR), Sharpe, Sortino, Calmar, MaxDD, Information Ratio, Tracking Error, Batting Average, Capture Ratios.
 */
export class PerformanceMeasurementEngine {
  /**
   * Compute Time-Weighted Return (TWR) from an array of periodic returns
   * @param {number[]} periodicReturns 
   */
  static computeTWR(periodicReturns = []) {
    if (!Array.isArray(periodicReturns) || periodicReturns.length === 0) return 0;
    let compounded = 1.0;
    for (const r of periodicReturns) {
      if (typeof r !== 'number' || isNaN(r)) continue;
      compounded *= (1.0 + r);
    }
    return compounded - 1.0;
  }

  /**
   * Compute Money-Weighted Return (IRR / MWR) using Newton-Raphson approximation
   * @param {Array<{date: string|number, amount: number}>} cashFlows - [initial, flow1, flow2, ..., final_val]
   */
  static computeMWR(cashFlows = [], maxIter = 100, tol = 1e-7) {
    if (!Array.isArray(cashFlows) || cashFlows.length < 2) return 0;
    
    // Normalize dates to period fractions (t in [0, 1, 2, ...])
    let rate = 0.1; // initial guess
    for (let iter = 0; iter < maxIter; iter++) {
      let npv = 0.0;
      let dNpv = 0.0;
      for (let t = 0; t < cashFlows.length; t++) {
        const cf = cashFlows[t].amount;
        const discount = Math.pow(1.0 + rate, t);
        if (discount === 0 || isNaN(discount)) break;
        npv += cf / discount;
        dNpv -= (t * cf) / (discount * (1.0 + rate));
      }
      if (Math.abs(npv) < tol) return rate;
      if (Math.abs(dNpv) < 1e-12) break;
      const newRate = rate - npv / dNpv;
      if (isNaN(newRate) || !isFinite(newRate)) break;
      rate = newRate;
    }
    return isFinite(rate) ? rate : 0;
  }

  /**
   * Compute Max Drawdown and drawdown series
   * @param {number[]} returns 
   */
  static computeMaxDrawdown(returns = []) {
    if (!Array.isArray(returns) || returns.length === 0) {
      return { maxDrawdown: 0, peakIndex: 0, troughIndex: 0, drawdowns: [] };
    }
    let peak = 1.0;
    let current = 1.0;
    let maxDd = 0.0;
    let peakIdx = 0;
    let troughIdx = 0;
    let currentPeakIdx = 0;
    const drawdowns = [];

    for (let i = 0; i < returns.length; i++) {
      const r = typeof returns[i] === 'number' && !isNaN(returns[i]) ? returns[i] : 0;
      current *= (1.0 + r);
      if (current > peak) {
        peak = current;
        currentPeakIdx = i;
      }
      const dd = (peak - current) / (peak > 0 ? peak : 1);
      drawdowns.push(dd);
      if (dd > maxDd) {
        maxDd = dd;
        peakIdx = currentPeakIdx;
        troughIdx = i;
      }
    }
    return {
      maxDrawdown: maxDd,
      peakIndex: peakIdx,
      troughIndex: troughIdx,
      drawdowns
    };
  }

  /**
   * Compute standard deviation
   * @param {number[]} values 
   */
  static computeStdDev(values = []) {
    if (!Array.isArray(values) || values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
    return Math.sqrt(Math.max(0, variance));
  }

  /**
   * Compute downside deviation relative to target/minimum acceptable return (MAR)
   * @param {number[]} returns 
   * @param {number} target 
   */
  static computeDownsideDeviation(returns = [], target = 0) {
    if (!Array.isArray(returns) || returns.length === 0) return 0;
    const underperformances = returns.map(r => Math.min(0, r - target));
    const sumSquares = underperformances.reduce((sum, diff) => sum + Math.pow(diff, 2), 0);
    return Math.sqrt(sumSquares / returns.length);
  }

  /**
   * Compute Full Risk-Adjusted Metric Suite
   * @param {Object} params
   * @param {number[]} params.portfolioReturns
   * @param {number[]} params.benchmarkReturns
   * @param {number} params.riskFreeRate Annual risk-free rate (e.g. 0.04)
   * @param {number} params.periodsPerYear Periods per year (default 252 for daily, 12 for monthly)
   */
  static measureRiskAdjustedMetrics({
    riskPerfId = `risk-perf-${Date.now()}`,
    portfolioReturns = [],
    benchmarkReturns = [],
    riskFreeRate = 0.0,
    periodsPerYear = 252
  } = {}) {
    if (!Array.isArray(portfolioReturns) || portfolioReturns.length === 0) {
      throw new Error('portfolioReturns array is required');
    }

    const n = portfolioReturns.length;
    const r_f_periodic = riskFreeRate / periodsPerYear;
    
    // Mean periodic returns
    const meanP = portfolioReturns.reduce((a, b) => a + b, 0) / n;
    const annReturnP = Math.pow(1 + meanP, periodsPerYear) - 1;
    const stdDevP = this.computeStdDev(portfolioReturns);
    const annVolP = stdDevP * Math.sqrt(periodsPerYear);

    // Sharpe Ratio
    const sharpeRatio = annVolP > 0 ? (annReturnP - riskFreeRate) / annVolP : 0;

    // Downside Dev & Sortino
    const downsideDev = this.computeDownsideDeviation(portfolioReturns, r_f_periodic);
    const annDownsideDev = downsideDev * Math.sqrt(periodsPerYear);
    const sortinoRatio = annDownsideDev > 0 ? (annReturnP - riskFreeRate) / annDownsideDev : 0;

    // Drawdown & Calmar
    const { maxDrawdown, peakIndex, troughIndex, drawdowns } = this.computeMaxDrawdown(portfolioReturns);
    const calmarRatio = maxDrawdown > 0 ? annReturnP / maxDrawdown : 0;

    // Benchmark comparison metrics if benchmark returns available
    let annReturnB = 0;
    let annVolB = 0;
    let trackingError = 0;
    let informationRatio = 0;
    let battingAverage = 0;
    let winLossRatio = 0;
    let upsideCapture = 0;
    let downsideCapture = 0;
    let captureRatio = 0;

    if (Array.isArray(benchmarkReturns) && benchmarkReturns.length === n) {
      const meanB = benchmarkReturns.reduce((a, b) => a + b, 0) / n;
      annReturnB = Math.pow(1 + meanB, periodsPerYear) - 1;
      const stdDevB = this.computeStdDev(benchmarkReturns);
      annVolB = stdDevB * Math.sqrt(periodsPerYear);

      const activeReturns = portfolioReturns.map((rp, idx) => rp - benchmarkReturns[idx]);
      const activeStdDev = this.computeStdDev(activeReturns);
      trackingError = activeStdDev * Math.sqrt(periodsPerYear);
      const annActiveReturn = annReturnP - annReturnB;
      informationRatio = trackingError > 0 ? annActiveReturn / trackingError : 0;

      // Batting average (% outperforming periods)
      const outperforming = activeReturns.filter(r => r > 0).length;
      battingAverage = outperforming / n;

      // Win / Loss Ratio
      const wins = activeReturns.filter(r => r > 0);
      const losses = activeReturns.filter(r => r < 0);
      const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
      const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length) : 0;
      winLossRatio = avgLoss > 0 ? avgWin / avgLoss : (avgWin > 0 ? 999 : 0);

      // Upside & Downside Capture
      const upBenchmarkReturns = [];
      const upPortfolioReturns = [];
      const downBenchmarkReturns = [];
      const downPortfolioReturns = [];

      for (let i = 0; i < n; i++) {
        if (benchmarkReturns[i] > 0) {
          upBenchmarkReturns.push(benchmarkReturns[i]);
          upPortfolioReturns.push(portfolioReturns[i]);
        } else if (benchmarkReturns[i] < 0) {
          downBenchmarkReturns.push(benchmarkReturns[i]);
          downPortfolioReturns.push(portfolioReturns[i]);
        }
      }

      const upMeanB = upBenchmarkReturns.length > 0 ? upBenchmarkReturns.reduce((a, b) => a + b, 0) / upBenchmarkReturns.length : 0;
      const upMeanP = upPortfolioReturns.length > 0 ? upPortfolioReturns.reduce((a, b) => a + b, 0) / upPortfolioReturns.length : 0;
      upsideCapture = upMeanB !== 0 ? (upMeanP / upMeanB) * 100 : 100;

      const downMeanB = downBenchmarkReturns.length > 0 ? downBenchmarkReturns.reduce((a, b) => a + b, 0) / downBenchmarkReturns.length : 0;
      const downMeanP = downPortfolioReturns.length > 0 ? downPortfolioReturns.reduce((a, b) => a + b, 0) / downPortfolioReturns.length : 0;
      downsideCapture = downMeanB !== 0 ? (downMeanP / downMeanB) * 100 : 100;

      captureRatio = downsideCapture > 0 ? upsideCapture / downsideCapture : 0;
    }

    const result = {
      riskPerfId,
      sampleSize: n,
      periodsPerYear,
      annualizedReturn: Number(annReturnP.toFixed(6)),
      annualizedVolatility: Number(annVolP.toFixed(6)),
      sharpeRatio: Number(sharpeRatio.toFixed(4)),
      sortinoRatio: Number(sortinoRatio.toFixed(4)),
      maxDrawdown: Number(maxDrawdown.toFixed(6)),
      calmarRatio: Number(calmarRatio.toFixed(4)),
      trackingError: Number(trackingError.toFixed(6)),
      informationRatio: Number(informationRatio.toFixed(4)),
      battingAverage: Number(battingAverage.toFixed(4)),
      winLossRatio: Number(winLossRatio.toFixed(4)),
      upsideCapture: Number(upsideCapture.toFixed(2)),
      downsideCapture: Number(downsideCapture.toFixed(2)),
      captureRatio: Number(captureRatio.toFixed(4)),
      calculatedAt: new Date().toISOString()
    };

    result.hash = computePerformanceHash(result);
    return deepFreeze(result);
  }
}
