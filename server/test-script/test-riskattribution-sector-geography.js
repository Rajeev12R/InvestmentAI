/**
 * server/test-script/test-riskattribution-sector-geography.js
 * 
 * Phase 32 — Suite 6: Sector, Geography & Sleeve Aggregation Hierarchy
 */

import { RiskAttributionEngine } from '../riskAttribution/riskAttribution.engine.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- SUITE 6: Sector, Geography & Sleeve Aggregation Hierarchy ---');

const symbols = ['AAPL', 'MSFT', 'JPM', 'GS', 'XOM', 'CVX', 'BABA', 'TSM'];
const weights = [0.20, 0.15, 0.15, 0.10, 0.10, 0.10, 0.10, 0.10];

const sectors = {
  AAPL: 'Technology',
  MSFT: 'Technology',
  JPM: 'Financials',
  GS: 'Financials',
  XOM: 'Energy',
  CVX: 'Energy',
  BABA: 'Consumer Discretionary',
  TSM: 'Technology'
};

const geographies = {
  AAPL: 'North America',
  MSFT: 'North America',
  JPM: 'North America',
  GS: 'North America',
  XOM: 'North America',
  CVX: 'North America',
  BABA: 'Asia Pacific',
  TSM: 'Asia Pacific'
};

const sleeves = {
  AAPL: 'Core Growth',
  MSFT: 'Core Growth',
  JPM: 'Value Income',
  GS: 'Value Income',
  XOM: 'Value Income',
  CVX: 'Value Income',
  BABA: 'Tactical Emerging',
  TSM: 'Tactical Emerging'
};

// Covariance matrix 8x8
const cov = [];
for (let i = 0; i < 8; i++) {
  cov[i] = [];
  for (let j = 0; j < 8; j++) {
    if (i === j) {
      cov[i][j] = 0.04 + (i * 0.005);
    } else {
      cov[i][j] = 0.015 + (Math.min(i, j) * 0.002);
    }
  }
}

const attr = RiskAttributionEngine.runComprehensiveAttribution({
  symbols,
  weights,
  covarianceMatrix: cov,
  sectors,
  geographies,
  sleeves,
  periodsPerYear: 252
});

const portVol = attr.portfolioMetrics.portfolioVolatility;
const portVar = attr.portfolioMetrics.portfolioVariance;

// 1. Sector Aggregation Reconciles to Total Portfolio Risk
const sectorCRC = attr.sectors.sumComponentRisk;
const sectorPRC = attr.sectors.sumPercentageRisk;
const sectorVar = attr.sectors.sumVarianceContribution;

assert(Math.abs(sectorCRC - portVol) < 1e-6, 'sum(Sector CRC) == Portfolio Volatility');
assert(Math.abs(sectorPRC - 1.0) < 1e-5, 'sum(Sector PRC) == 100%');
assert(Math.abs(sectorVar - portVar) < 1e-5, 'sum(Sector VarianceContribution) == Portfolio Variance');

// 2. Geography Aggregation Reconciles to Total Portfolio Risk
const geoCRC = attr.geographies.sumComponentRisk;
const geoPRC = attr.geographies.sumPercentageRisk;
const geoVar = attr.geographies.sumVarianceContribution;

assert(Math.abs(geoCRC - portVol) < 1e-6, 'sum(Geography CRC) == Portfolio Volatility');
assert(Math.abs(geoPRC - 1.0) < 1e-5, 'sum(Geography PRC) == 100%');
assert(Math.abs(geoVar - portVar) < 1e-5, 'sum(Geography VarianceContribution) == Portfolio Variance');

// 3. Sleeve Aggregation Reconciles to Total Portfolio Risk
const sleeveCRC = attr.sleeves.sumComponentRisk;
const sleevePRC = attr.sleeves.sumPercentageRisk;

assert(Math.abs(sleeveCRC - portVol) < 1e-6, 'sum(Sleeve CRC) == Portfolio Volatility');
assert(Math.abs(sleevePRC - 1.0) < 1e-5, 'sum(Sleeve PRC) == 100%');

// 4. Verify Canonical Group Content (No double counting or missing positions)
const techSec = attr.sectors.groups.find(g => g.name === 'Technology');
assert(techSec !== null, 'Technology sector exists');
assert(techSec.positions.includes('AAPL') && techSec.positions.includes('MSFT') && techSec.positions.includes('TSM'), 'Technology contains AAPL, MSFT, TSM');
assert(techSec.positionCount === 3, 'Technology has exactly 3 positions');

const expectedTechCRC = attr.positions.filter(p => sectors[p.symbol] === 'Technology').reduce((s, p) => s + p.componentRiskContribution, 0);
assert(Math.abs(techSec.componentRiskContribution - expectedTechCRC) < 1e-12, 'Sector CRC is exact sum of position CRCs');

console.log(`PASSED: ${passed}`);
