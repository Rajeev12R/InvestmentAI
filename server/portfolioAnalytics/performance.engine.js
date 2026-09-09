/**
 * Deterministic Institutional Portfolio Performance Engine — Phase 12
 * Calculates TWR, MWR/IRR, Annualized Returns, Volatility, Downside Vol, Sharpe, Sortino, Calmar.
 * Strictly separates TWR from MWR. Never silently drops cash flows.
 */

import { AnalyticsStatus, CashFlowType, PerformanceInterval, ReturnMetricType, validateCashFlow } from './portfolioAnalytics.types.js';

export class PerformanceEngine {
    constructor() {}

    /**
     * Calculates Time-Weighted Return (TWR) across sub-periods.
     * R_TWR = \prod_{i=1}^n (1 + R_i) - 1
     * where R_i = (V_{end, i} - CashFlow_i) / V_{start, i} - 1 (for start-of-period cash flows)
     * or exact sub-period valuation splits.
     */
    calculateTWR(subPeriods = []) {
        if (!Array.isArray(subPeriods) || subPeriods.length === 0) {
            return {
                status: AnalyticsStatus.UNAVAILABLE,
                error: 'NO_SUBPERIODS: Sub-period data required for TWR calculation',
                twr: null
            };
        }

        let compoundFactor = 1.0;
        const periodDetails = [];

        for (let i = 0; i < subPeriods.length; i++) {
            const p = subPeriods[i];
            const startVal = Number(p.startValue);
            const endVal = Number(p.endValue);
            const cashFlow = Number(p.cashFlow || 0); // external cash flow occurring at sub-period boundary

            if (isNaN(startVal) || startVal <= 0) {
                return {
                    status: AnalyticsStatus.CONFLICT,
                    error: `INVALID_START_VALUE: Sub-period ${i} has invalid start value: ${startVal}`,
                    twr: null
                };
            }

            if (isNaN(endVal) || endVal < 0) {
                return {
                    status: AnalyticsStatus.CONFLICT,
                    error: `INVALID_END_VALUE: Sub-period ${i} has invalid end value: ${endVal}`,
                    twr: null
                };
            }

            // Sub-period return eliminating cash flow impact:
            // If cash flow occurs at end: (endVal - cashFlow) / startVal - 1
            // If cash flow occurs at start: (endVal) / (startVal + cashFlow) - 1
            const timing = p.cashFlowTiming || 'END';
            let r_i;
            if (timing === 'START') {
                const adjustedBase = startVal + cashFlow;
                if (adjustedBase <= 0) {
                    return {
                        status: AnalyticsStatus.CONFLICT,
                        error: `INVALID_ADJUSTED_BASE: Start value + cash flow must be > 0 at period ${i}`,
                        twr: null
                    };
                }
                r_i = (endVal / adjustedBase) - 1.0;
            } else {
                r_i = ((endVal - cashFlow) / startVal) - 1.0;
            }

            compoundFactor *= (1.0 + r_i);
            periodDetails.push({
                periodIndex: i,
                startValue: startVal,
                endValue: endVal,
                cashFlow,
                subPeriodReturn: r_i
            });
        }

        const twr = compoundFactor - 1.0;
        return {
            status: AnalyticsStatus.PASS,
            metricType: ReturnMetricType.TIME_WEIGHTED_RETURN,
            twr,
            twrPercentage: twr * 100,
            subPeriodCount: subPeriods.length,
            periodDetails,
            formula: 'TWR = Product(1 + R_i) - 1'
        };
    }

    /**
     * Calculates Money-Weighted Return (MWR / IRR) using deterministic Newton-Raphson solver.
     * 0 = -V0 + \sum \frac{CF_t}{(1 + IRR)^{t / 365}} + \frac{V_T}{(1 + IRR)^{T / 365}}
     */
    calculateMWR({ initialValue, finalValue, startDate, endDate, cashFlows = [] }) {
        if (typeof initialValue !== 'number' || isNaN(initialValue) || initialValue <= 0) {
            return {
                status: AnalyticsStatus.CONFLICT,
                error: 'INVALID_INITIAL_VALUE: Initial value must be > 0',
                irr: null
            };
        }
        if (typeof finalValue !== 'number' || isNaN(finalValue) || finalValue < 0) {
            return {
                status: AnalyticsStatus.CONFLICT,
                error: 'INVALID_FINAL_VALUE: Final value must be >= 0',
                irr: null
            };
        }

        const t0 = new Date(startDate).getTime();
        const tEnd = new Date(endDate).getTime();
        if (isNaN(t0) || isNaN(tEnd) || tEnd <= t0) {
            return {
                status: AnalyticsStatus.CONFLICT,
                error: 'INVALID_DATE_RANGE: End date must be strictly after start date',
                irr: null
            };
        }

        const totalDays = (tEnd - t0) / (1000 * 60 * 60 * 24);

        // Validate all cash flows
        const validatedFlows = [];
        for (const cf of cashFlows) {
            try {
                validateCashFlow(cf);
            } catch (err) {
                return {
                    status: AnalyticsStatus.CONFLICT,
                    error: `CASH_FLOW_VALIDATION_FAILED: ${err.message}`,
                    irr: null
                };
            }
            const cfTime = new Date(cf.timestamp).getTime();
            if (cfTime < t0 || cfTime > tEnd) {
                return {
                    status: AnalyticsStatus.CONFLICT,
                    error: `CASH_FLOW_OUT_OF_BOUNDS: Cash flow ${cf.id} timestamp is outside calculation window`,
                    irr: null
                };
            }
            const dayOffset = (cfTime - t0) / (1000 * 60 * 60 * 24);
            // In standard investor IRR convention:
            // Outflows (injections of capital): negative sign (-V0, -Deposit)
            // Inflows (distributions/terminal): positive sign (+Withdrawal, +Dividend, +VT)
            let signedAmount;
            if (cf.type === CashFlowType.DEPOSIT) {
                signedAmount = -Math.abs(cf.amount);
            } else if (cf.type === CashFlowType.WITHDRAWAL || cf.type === CashFlowType.DIVIDEND) {
                signedAmount = Math.abs(cf.amount);
            } else if (cf.type === CashFlowType.FEE || cf.type === CashFlowType.TAX) {
                signedAmount = -Math.abs(cf.amount);
            } else {
                signedAmount = -cf.amount;
            }

            validatedFlows.push({
                amount: signedAmount,
                t: dayOffset / 365.0
            });
        }

        // All cash transactions vector: [-V0 at t=0, signed CF_i at t_i, +V_T at t_T]
        const allTransactions = [
            { amount: -initialValue, t: 0 },
            ...validatedFlows.map(f => ({ amount: f.amount, t: f.t })),
            { amount: finalValue, t: totalDays / 365.0 }
        ];

        // Solve for annual IRR using Newton-Raphson
        let rate = 0.10; // initial guess 10%
        const maxIter = 100;
        const tolerance = 1e-7;
        let converged = false;

        for (let iter = 0; iter < maxIter; iter++) {
            let npv = 0;
            let dnpv = 0;

            for (const tx of allTransactions) {
                const discount = Math.pow(1 + rate, tx.t);
                if (discount === 0 || isNaN(discount) || !isFinite(discount)) break;
                npv += tx.amount / discount;
                if (tx.t !== 0) {
                    dnpv -= (tx.t * tx.amount) / (discount * (1 + rate));
                }
            }

            if (Math.abs(npv) < tolerance) {
                converged = true;
                break;
            }

            if (dnpv === 0 || isNaN(dnpv) || !isFinite(dnpv)) {
                break;
            }

            const newRate = rate - (npv / dnpv);
            if (Math.abs(newRate - rate) < tolerance) {
                rate = newRate;
                converged = true;
                break;
            }
            rate = newRate;
            if (rate <= -0.9999) rate = -0.999; // bound to avoid singularity
        }

        if (!converged || isNaN(rate) || !isFinite(rate)) {
            return {
                status: AnalyticsStatus.CONFLICT,
                error: 'NON_CONVERGENT: Newton-Raphson did not converge within tolerance',
                classification: 'NON_CONVERGENT',
                irr: null
            };
        }

        return {
            status: AnalyticsStatus.PASS,
            metricType: ReturnMetricType.MONEY_WEIGHTED_RETURN,
            irr: rate,
            irrPercentage: rate * 100,
            cashFlowCount: validatedFlows.length,
            totalDays,
            formula: 'NPV = -V0 + Sum(CF_i / (1 + IRR)^t_i) + V_T / (1 + IRR)^T = 0'
        };
    }

    /**
     * Calculates statistical risk metrics: Volatility, Downside Vol, Sharpe, Sortino, Calmar, Max Drawdown
     */
    calculateRiskAdjustedMetrics({ periodicReturns = [], riskFreeRate = 0.04, periodsPerYear = 252 }) {
        if (!Array.isArray(periodicReturns) || periodicReturns.length < 2) {
            return {
                status: AnalyticsStatus.UNAVAILABLE,
                error: 'INSUFFICIENT_DATA: At least 2 periodic return points required',
                metrics: null
            };
        }

        const n = periodicReturns.length;
        const meanReturn = periodicReturns.reduce((acc, r) => acc + r, 0) / n;
        const annualizedMean = meanReturn * periodsPerYear;

        // Sample Variance & Volatility
        const variance = periodicReturns.reduce((acc, r) => acc + Math.pow(r - meanReturn, 2), 0) / (n - 1);
        const periodicVol = Math.sqrt(variance);
        const annualizedVol = periodicVol * Math.sqrt(periodsPerYear);

        // Downside Volatility (semi-deviation below Rf / period)
        const periodicRf = riskFreeRate / periodsPerYear;
        const negativeDeviations = periodicReturns
            .map(r => r - periodicRf)
            .filter(d => d < 0);
        
        const downsideVariance = negativeDeviations.length > 0
            ? negativeDeviations.reduce((acc, d) => acc + Math.pow(d, 2), 0) / n
            : 0;
        const annualizedDownsideVol = Math.sqrt(downsideVariance) * Math.sqrt(periodsPerYear);

        // Maximum Drawdown series
        let peak = 1.0;
        let runningVal = 1.0;
        let maxDrawdown = 0.0;
        for (const r of periodicReturns) {
            runningVal *= (1.0 + r);
            if (runningVal > peak) {
                peak = runningVal;
            }
            const dd = (peak - runningVal) / peak;
            if (dd > maxDrawdown) {
                maxDrawdown = dd;
            }
        }

        // Sharpe Ratio
        const excessReturn = annualizedMean - riskFreeRate;
        const sharpeRatio = annualizedVol > 0 ? excessReturn / annualizedVol : 0;

        // Sortino Ratio
        const sortinoRatio = annualizedDownsideVol > 0 ? excessReturn / annualizedDownsideVol : 0;

        // Calmar Ratio
        const calmarRatio = maxDrawdown > 0 ? annualizedMean / maxDrawdown : 0;

        return {
            status: AnalyticsStatus.PASS,
            metrics: {
                annualizedReturn: annualizedMean,
                annualizedVolatility: annualizedVol,
                annualizedDownsideVolatility: annualizedDownsideVol,
                maxDrawdown,
                sharpeRatio,
                sortinoRatio,
                calmarRatio,
                riskFreeRate,
                periodsEvaluated: n,
                periodsPerYear
            },
            formulas: {
                volatility: 'StdDev(R_i) * sqrt(252)',
                downsideVol: 'sqrt(Sum(min(0, R_i - Rf_daily)^2) / N) * sqrt(252)',
                sharpe: '(AnnualizedReturn - Rf) / AnnualizedVol',
                sortino: '(AnnualizedReturn - Rf) / AnnualizedDownsideVol',
                calmar: 'AnnualizedReturn / MaxDrawdown'
            }
        };
    }
}

export const performanceEngine = new PerformanceEngine();
