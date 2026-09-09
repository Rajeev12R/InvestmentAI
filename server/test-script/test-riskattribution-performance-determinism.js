/**
 * server/test-script/test-riskattribution-performance-determinism.js
 * 
 * Phase 32: High-Dimensional Scalability (10, 100, 500, 1000 Assets) & Deterministic Replay
 */

import { RiskAttributionEngine } from '../riskAttribution/riskAttribution.engine.js';
import { RiskAttributionCertificationGenerator } from '../riskAttribution/golden/riskAttribution.certification.generator.js';

let passed = 0;
function assert(cond, msg) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
  passed++;
}

console.log('--- Phase 32 Performance Scalability & Deterministic Replay ---');

// Helper to generate N-asset portfolio and factor-structured positive-definite covariance matrix
function generatePortfolio(N) {
  const symbols = [];
  const weights = [];
  const equalWeight = 1.0 / N;
  for (let i = 0; i < N; i++) {
    symbols.push(`SYM_${i}`);
    weights.push(equalWeight);
  }

  // Generate valid diagonal dominant covariance matrix
  const cov = [];
  for (let i = 0; i < N; i++) {
    cov[i] = [];
    for (let j = 0; j < N; j++) {
      if (i === j) {
        cov[i][j] = 0.04 + ((i % 10) * 0.002);
      } else {
        cov[i][j] = 0.01;
      }
    }
  }

  return { symbols, weights, cov };
}

// 1. Benchmark 10 Assets
const p10 = generatePortfolio(10);
const start10 = performance.now();
const attr10 = RiskAttributionEngine.runComprehensiveAttribution({
  symbols: p10.symbols,
  weights: p10.weights,
  covarianceMatrix: p10.cov
});
const dur10 = performance.now() - start10;
assert(attr10.reconciliation.isReconciled === true, '10-asset attribution reconciles');
assert(dur10 < 100, `10-asset latency (${dur10.toFixed(2)}ms) < 100ms`);

// 2. Benchmark 100 Assets
const p100 = generatePortfolio(100);
const start100 = performance.now();
const attr100 = RiskAttributionEngine.runComprehensiveAttribution({
  symbols: p100.symbols,
  weights: p100.weights,
  covarianceMatrix: p100.cov
});
const dur100 = performance.now() - start100;
assert(attr100.reconciliation.isReconciled === true, '100-asset attribution reconciles');
assert(dur100 < 500, `100-asset latency (${dur100.toFixed(2)}ms) < 500ms`);

// 3. Benchmark 500 Assets
const p500 = generatePortfolio(500);
const start500 = performance.now();
const attr500 = RiskAttributionEngine.runComprehensiveAttribution({
  symbols: p500.symbols,
  weights: p500.weights,
  covarianceMatrix: p500.cov
});
const dur500 = performance.now() - start500;
assert(attr500.reconciliation.isReconciled === true, '500-asset attribution reconciles');
assert(dur500 < 2000, `500-asset latency (${dur500.toFixed(2)}ms) < 2000ms`);

// 4. Benchmark 1000 Assets
const p1000 = generatePortfolio(1000);
const start1000 = performance.now();
const attr1000 = RiskAttributionEngine.runComprehensiveAttribution({
  symbols: p1000.symbols,
  weights: p1000.weights,
  covarianceMatrix: p1000.cov
});
const dur1000 = performance.now() - start1000;
assert(attr1000.reconciliation.isReconciled === true, '1000-asset attribution reconciles');
assert(dur1000 < 6000, `1000-asset latency (${dur1000.toFixed(2)}ms) < 6000ms`);

console.log(`[PERFORMANCE] 10 Assets: ${dur10.toFixed(2)}ms | 100 Assets: ${dur100.toFixed(2)}ms | 500 Assets: ${dur500.toFixed(2)}ms | 1000 Assets: ${dur1000.toFixed(2)}ms`);

// 5. Deterministic Replay (100 Iterations)
const baseCert = RiskAttributionCertificationGenerator.generateCertification();
const baseJSON = JSON.stringify(baseCert.records);

for (let r = 0; r < 100; r++) {
  const replayCert = RiskAttributionCertificationGenerator.generateCertification();
  assert(replayCert.passedCount === 20 && replayCert.failedCount === 0, `Replay ${r}: 20/20 passed`);
  assert(JSON.stringify(replayCert.records) === baseJSON, `Replay ${r}: Bit-for-bit identical records`);
}

console.log('Deterministic Replay: 100/100 Iterations Bit-for-Bit Verified');
console.log(`PASSED: ${passed}`);
