/**
 * Phase 18 — Test Suite 4: Hostile Red-Team Audit (154 Categories A to EX)
 */

import { strict as assert } from 'assert';
import { LiquidityStatus, LiquidityTier, ExecutionFeasibility, StressScenarioType, ImpactModelType, TradingSide, LiquidityDataStatus } from '../liquidity/liquidity.types.js';
import { LiquidityValidationEngine } from '../liquidity/liquidity.validation.engine.js';
import { LiquidityMetricsEngine } from '../liquidity/liquidity.metrics.engine.js';
import { LiquidityImpactEngine } from '../liquidity/liquidity.impact.engine.js';
import { LiquidityCostEngine } from '../liquidity/liquidity.cost.engine.js';
import { LiquidityHorizonEngine } from '../liquidity/liquidity.horizon.engine.js';
import { LiquidityCapacityEngine } from '../liquidity/liquidity.capacity.engine.js';
import { LiquidityStressEngine } from '../liquidity/liquidity.stress.engine.js';
import { LiquidityFeasibilityEngine } from '../liquidity/liquidity.feasibility.engine.js';
import { LiquidityRebalanceEngine } from '../liquidity/liquidity.rebalance.engine.js';
import { LiquidityConstraintEngine } from '../liquidity/liquidity.constraint.engine.js';
import { LiquidityEngine } from '../liquidity/liquidity.engine.js';
import { SealedLiquidityIntelligencePackage } from '../liquidity/liquidity.package.js';
import { liquidityRepository } from '../liquidity/liquidity.repository.js';
import { LiquidityCopilotTool } from '../liquidity/liquidity.tool.js';
import { LiquidityExplanationEngine } from '../liquidity/liquidity.explanation.engine.js';
import { LIQUIDITY_POLICY_V1, LIQUIDITY_POLICY_V2 } from '../liquidity/liquidity.config.js';

let totalAssertions = 0;
const executedCategories = new Set();

function recordHostile(catId, cond, msg) {
  assert(cond, `${catId}: ${msg}`);
  executedCategories.add(catId);
  totalAssertions++;
}

console.log('--- RUNNING PHASE 18 SUITE 4: 154 HOSTILE CATEGORIES (A TO EX) ---');

// --- Categories A to Z: Core Data & Mathematical Integrity (26) ---
recordHostile('A', LiquidityValidationEngine.validateAdv(null).status === LiquidityStatus.UNAVAILABLE, 'A: Missing ADV rejected');
recordHostile('B', LiquidityValidationEngine.validateAdv(0).status === LiquidityStatus.INVALID_ADV, 'B: Zero ADV rejected');
recordHostile('C', LiquidityValidationEngine.validateAdv(-500).status === LiquidityStatus.INVALID_ADV, 'C: Negative ADV rejected');
recordHostile('D', LiquidityValidationEngine.validateAdv(NaN).status === LiquidityStatus.INVALID_ADV, 'D: NaN ADV rejected');
recordHostile('E', LiquidityValidationEngine.validateAdv(Infinity).status === LiquidityStatus.INVALID_ADV, 'E: Infinity ADV rejected');
recordHostile('F', LiquidityValidationEngine.validatePrice(null).status === LiquidityStatus.UNAVAILABLE, 'F: Missing price rejected');
recordHostile('G', LiquidityValidationEngine.validatePrice(0).status === LiquidityStatus.INVALID_PRICE, 'G: Zero price rejected');
recordHostile('H', LiquidityValidationEngine.validatePrice(-100).status === LiquidityStatus.INVALID_PRICE, 'H: Negative price rejected');
recordHostile('I', LiquidityValidationEngine.validateQuote(null, 100).status === LiquidityStatus.UNAVAILABLE, 'I: Missing bid rejected');
recordHostile('J', LiquidityValidationEngine.validateQuote(100, null).status === LiquidityStatus.UNAVAILABLE, 'J: Missing ask rejected');
recordHostile('K', LiquidityValidationEngine.validateQuote(105, 100).status === LiquidityStatus.INVALID_QUOTE, 'K: Inverted quote rejected');
recordHostile('L', LiquidityValidationEngine.validateQuote(0, 100).status === LiquidityStatus.INVALID_QUOTE, 'L: Zero bid rejected');
recordHostile('M', LiquidityValidationEngine.validateQuote(100, 0).status === LiquidityStatus.INVALID_QUOTE, 'M: Zero ask rejected');
recordHostile('N', LiquidityValidationEngine.validateQuote(NaN, 100).status === LiquidityStatus.INVALID_QUOTE, 'N: NaN bid rejected');
recordHostile('O', LiquidityValidationEngine.validateQuote(100, Infinity).status === LiquidityStatus.INVALID_QUOTE, 'O: Infinity ask rejected');
recordHostile('P', LiquidityValidationEngine.validateOrder(null, null, 100).status === LiquidityStatus.INVALID_QUANTITY, 'P: Null order rejected');
recordHostile('Q', LiquidityValidationEngine.validateOrder(-10, null, 100).status === LiquidityStatus.INVALID_QUANTITY, 'Q: Negative quantity rejected');
recordHostile('R', LiquidityValidationEngine.validateOrder(null, -5000, 100).status === LiquidityStatus.INVALID_QUANTITY, 'R: Negative notional rejected');
recordHostile('S', LiquidityValidationEngine.validateOrder(NaN, null, 100).status === LiquidityStatus.INVALID_QUANTITY, 'S: NaN quantity rejected');
recordHostile('T', LiquidityMetricsEngine.calculateAdv([]).status === LiquidityStatus.UNAVAILABLE, 'T: Empty volume history rejected');
recordHostile('U', LiquidityMetricsEngine.calculateAdv(['bad', 'data']).status === LiquidityStatus.UNAVAILABLE, 'U: Non-numeric volume history rejected');
recordHostile('V', LiquidityMetricsEngine.calculateDollarAdv(null, 100).status === LiquidityStatus.UNAVAILABLE, 'V: Dollar ADV with null ADV rejected');
recordHostile('W', LiquidityMetricsEngine.calculateDollarAdv(1000, null).status === LiquidityStatus.UNAVAILABLE, 'W: Dollar ADV with null price rejected');
recordHostile('X', LiquidityMetricsEngine.calculateParticipation(-50, 1000).status === LiquidityStatus.INVALID_QUANTITY, 'X: Negative order participation rejected');
recordHostile('Y', LiquidityMetricsEngine.calculateParticipation(50, 0).status === LiquidityStatus.INVALID_ADV, 'Y: Zero ADV participation rejected');
recordHostile('Z', LiquidityMetricsEngine.determineLiquidityTier(null, 10) === LiquidityTier.UNKNOWN, 'Z: Null Dollar ADV returns UNKNOWN tier');

// --- Categories AA to AZ: Impact, Cost, Horizon & Capacity (26) ---
recordHostile('AA', LiquidityImpactEngine.calculateMarketImpact(null, 1000000).status === LiquidityStatus.INVALID_QUANTITY, 'AA: Null notional impact rejected');
recordHostile('AB', LiquidityImpactEngine.calculateMarketImpact(100000, null).status === LiquidityStatus.UNAVAILABLE, 'AB: Null ADV impact rejected');
recordHostile('AC', LiquidityImpactEngine.calculateMarketImpact(-50000, 1000000).status === LiquidityStatus.INVALID_QUANTITY, 'AC: Negative notional impact rejected');
recordHostile('AD', LiquidityImpactEngine.calculateMarketImpact(50000, -1000000).status === LiquidityStatus.INVALID_ADV, 'AD: Negative ADV impact rejected');
recordHostile('AE', LiquidityImpactEngine.calculateMarketImpact(50000, 1000000, { coefficient: -0.10 }).status === LiquidityStatus.PASS, 'AE: Custom coefficient processed safely');
recordHostile('AF', LiquidityCostEngine.calculateTradingCost({ orderNotional: null, dollarAdv: 1000000 }).status === LiquidityStatus.INVALID_QUANTITY, 'AF: Null notional cost rejected');
recordHostile('AG', LiquidityCostEngine.calculateTradingCost({ orderNotional: 100000, dollarAdv: null }).status === LiquidityStatus.UNAVAILABLE, 'AG: Null ADV cost rejected');
recordHostile('AH', LiquidityCostEngine.calculateTradingCost({ orderNotional: -1000, dollarAdv: 1000000 }).status === LiquidityStatus.INVALID_QUANTITY, 'AH: Negative notional cost rejected');
recordHostile('AI', LiquidityHorizonEngine.calculateLiquidationHorizon({ orderQuantity: null, adv: 100000 }).status === LiquidityStatus.INVALID_QUANTITY, 'AI: Null qty horizon rejected');
recordHostile('AJ', LiquidityHorizonEngine.calculateLiquidationHorizon({ orderQuantity: 1000, adv: null }).status === LiquidityStatus.UNAVAILABLE, 'AJ: Null ADV horizon rejected');
recordHostile('AK', LiquidityHorizonEngine.calculateLiquidationHorizon({ orderQuantity: 1000, adv: 0 }).status === LiquidityStatus.INVALID_ADV, 'AK: Zero ADV horizon rejected');
recordHostile('AL', LiquidityHorizonEngine.calculateLiquidationHorizon({ orderQuantity: 1000, adv: 10000, maxParticipationRate: 0 }).status === LiquidityStatus.INVALID_INPUT, 'AL: Zero participation rate rejected');
recordHostile('AM', LiquidityHorizonEngine.calculateLiquidationHorizon({ orderQuantity: 1000, adv: 10000, maxParticipationRate: -0.10 }).status === LiquidityStatus.INVALID_INPUT, 'AM: Negative participation rate rejected');
recordHostile('AN', LiquidityHorizonEngine.calculateLiquidationHorizon({ orderQuantity: 1000, adv: 10000, maxParticipationRate: 1.5 }).status === LiquidityStatus.INVALID_INPUT, 'AN: >100% participation limit rejected');
recordHostile('AO', LiquidityCapacityEngine.calculatePositionCapacity(null).status === LiquidityStatus.UNAVAILABLE, 'AO: Null ADV position capacity rejected');
recordHostile('AP', LiquidityCapacityEngine.calculatePositionCapacity(0).status === LiquidityStatus.INVALID_ADV, 'AP: Zero ADV position capacity rejected');
recordHostile('AQ', LiquidityCapacityEngine.calculateStrategyCapacity([]).status === LiquidityStatus.INVALID_INPUT, 'AQ: Empty strategy positions rejected');
recordHostile('AR', LiquidityCapacityEngine.calculateStrategyCapacity([{ ticker: 'A', weight: 0.5, dollarAdv: null }]).status === LiquidityStatus.UNAVAILABLE, 'AR: Strategy position with null ADV rejected');
recordHostile('AS', LiquidityConstraintEngine.generatePositionConstraints({ dollarAdv: null, portfolioValue: 1000 }).status === LiquidityStatus.UNAVAILABLE, 'AS: Constraint generation with null ADV rejected');
recordHostile('AT', LiquidityConstraintEngine.generatePositionConstraints({ dollarAdv: 1000, portfolioValue: null }).status === LiquidityStatus.INVALID_INPUT, 'AT: Constraint generation with null portfolio rejected');
recordHostile('AU', LiquidityConstraintEngine.generatePositionConstraints({ dollarAdv: 1000, portfolioValue: 0 }).status === LiquidityStatus.INVALID_INPUT, 'AU: Constraint generation with zero portfolio rejected');
recordHostile('AV', LiquidityConstraintEngine.validatePositionSize({ proposedNotional: -100, dollarAdv: 1000, portfolioValue: 1000 }).status === LiquidityStatus.INVALID_INPUT, 'AV: Negative proposed notional rejected');
recordHostile('AW', LiquidityFeasibilityEngine.evaluateFeasibility({ ticker: 'A', orderQuantity: null, adv: 1000 }).status === LiquidityStatus.INVALID_QUANTITY, 'AW: Null qty feasibility rejected');
recordHostile('AX', LiquidityFeasibilityEngine.evaluateFeasibility({ ticker: 'A', orderQuantity: 100, adv: null }).status === LiquidityStatus.UNAVAILABLE, 'AX: Null ADV feasibility returns UNAVAILABLE');
recordHostile('AY', LiquidityFeasibilityEngine.evaluateFeasibility({ ticker: 'A', orderQuantity: 100, adv: 1000, bid: 105, ask: 100 }).status === LiquidityStatus.INVALID_QUOTE, 'AY: Inverted quote feasibility rejected');
recordHostile('AZ', LiquidityRebalanceEngine.evaluateRebalanceTrades({ portfolioValue: null, trades: [] }).status === LiquidityStatus.INVALID_INPUT, 'AZ: Null portfolio value rebalance rejected');

// --- Categories BA to BZ: Stress, Portfolio, Normalization & Freshness (26) ---
recordHostile('BA', LiquidityStressEngine.evaluateStressScenario({ orderNotional: null, dollarAdv: 1000 }).status === LiquidityStatus.INVALID_QUANTITY, 'BA: Null notional stress rejected');
recordHostile('BB', LiquidityStressEngine.evaluateStressScenario({ orderNotional: 100, dollarAdv: null }).status === LiquidityStatus.UNAVAILABLE, 'BB: Null ADV stress rejected');
recordHostile('BC', LiquidityStressEngine.evaluateStressScenario({ orderNotional: 100, dollarAdv: 1000, customMultipliers: { advMultiplier: 0 } }).status === LiquidityStatus.INVALID_INPUT, 'BC: Zero stress multiplier rejected');
recordHostile('BD', LiquidityStressEngine.evaluateStressScenario({ orderNotional: 100, dollarAdv: 1000, customMultipliers: { advMultiplier: -0.5 } }).status === LiquidityStatus.INVALID_INPUT, 'BD: Negative stress multiplier rejected');
recordHostile('BE', LiquidityEngine.evaluateSecurityLiquidity(null).status === LiquidityStatus.INVALID_INPUT, 'BE: Null observation rejected');
recordHostile('BF', LiquidityEngine.evaluateSecurityLiquidity({ ticker: 'A', price: 100, adv: null }).status === LiquidityStatus.UNAVAILABLE, 'BF: Observation with null ADV rejected');
recordHostile('BG', LiquidityEngine.evaluateSecurityLiquidity({ ticker: 'A', price: null, adv: 1000 }).status === LiquidityStatus.UNAVAILABLE, 'BG: Observation with null price rejected');
recordHostile('BH', LiquidityEngine.evaluateSecurityLiquidity({ ticker: 'A', price: 100, adv: 1000, bid: 105, ask: 100 }).status === LiquidityStatus.INVALID_QUOTE, 'BH: Observation with inverted quote rejected');
recordHostile('BI', LiquidityEngine.evaluatePortfolioLiquidity(null).status === LiquidityStatus.INVALID_INPUT, 'BI: Null portfolio rejected');
recordHostile('BJ', LiquidityEngine.evaluatePortfolioLiquidity({ positions: [] }).status === LiquidityStatus.INVALID_INPUT, 'BJ: Empty portfolio positions rejected');
recordHostile('BK', LiquidityEngine.evaluatePortfolioLiquidity({ positions: [{ ticker: 'A', currency: 'EUR', price: 100, adv: 1000 }] }, {}).status === LiquidityStatus.FX_UNAVAILABLE, 'BK: Missing FX rate rejected');
recordHostile('BL', LiquidityValidationEngine.validateFreshness(null, '2025-01-01').status === LiquidityStatus.UNAVAILABLE, 'BL: Null observation timestamp rejected');
recordHostile('BM', LiquidityValidationEngine.validateFreshness('2025-01-05', '2025-01-01').status === LiquidityStatus.TEMPORAL_VIOLATION, 'BM: Look-ahead future observation rejected');
recordHostile('BN', LiquidityValidationEngine.validateFreshness('2024-01-01', '2025-01-01', 5).status === 'STALE', 'BN: Stale observation flagged as STALE');
recordHostile('BO', LiquidityMetricsEngine.calculateLiquidityScore(null, 10).status === LiquidityStatus.UNAVAILABLE, 'BO: Score calculation with null ADV rejected');
recordHostile('BP', LiquidityMetricsEngine.calculateLiquidityScore(0, 10).status === LiquidityStatus.UNAVAILABLE, 'BP: Score calculation with zero ADV rejected');
recordHostile('BQ', LiquidityRebalanceEngine.evaluateRebalanceTrades({ portfolioValue: 10000, trades: [] }).status === LiquidityStatus.INVALID_INPUT, 'BQ: Empty trades rebalance rejected');
recordHostile('BR', SealedLiquidityIntelligencePackage.sealPackage(null).status === LiquidityStatus.INVALID_INPUT, 'BR: Null package payload rejected');
recordHostile('BS', SealedLiquidityIntelligencePackage.verifyPackage(null) === false, 'BS: Null package verification fails');
recordHostile('BT', SealedLiquidityIntelligencePackage.verifyPackage({}) === false, 'BT: Empty package verification fails');
recordHostile('BU', SealedLiquidityIntelligencePackage.verifyPackage({ package: { a: 1 }, packageHash: 'bad_hash' }) === false, 'BU: Corrupted package hash fails');
recordHostile('BV', LiquidityCostEngine.calculateTradingCost({ orderNotional: 1000, dollarAdv: 10000, jurisdiction: 'UNKNOWN' }).status === LiquidityStatus.PASS, 'BV: Unknown jurisdiction handled gracefully');
recordHostile('BW', LiquidityHorizonEngine.calculateLiquidationHorizon({ orderQuantity: 1000, adv: 10000, dollarAdv: 100000, referencePrice: 100 }).status === LiquidityStatus.PASS, 'BW: Dual quantity and notional inputs resolved');
recordHostile('BX', LiquidityFeasibilityEngine.evaluateFeasibility({ ticker: 'A', orderNotional: 10000, dollarAdv: 1000000, referencePrice: 100 }).status === LiquidityStatus.PASS, 'BX: Feasibility from notional alone passes');
recordHostile('BY', LiquidityCapacityEngine.calculatePositionCapacity(1000000, { maxParticipationRate: 0.05 }).maxDailyTradeNotional === 50000, 'BY: Custom participation capacity respected');
recordHostile('BZ', LiquidityStressEngine.evaluateStressScenario({ orderNotional: 1000, dollarAdv: 10000, scenarioType: StressScenarioType.CUSTOM_STRESS, customMultipliers: { advMultiplier: 0.8, spreadMultiplier: 1.2, impactMultiplier: 1.1 } }).status === LiquidityStatus.PASS, 'BZ: Custom multipliers evaluated');

// --- Categories CA to CZ: Adversarial Security, Tenancy & Execution Boundary (26) ---
recordHostile('CA', liquidityRepository.getObservation('NONEXISTENT_WS', 'AAPL') === null, 'CA: Nonexistent workspace returns null');
recordHostile('CB', liquidityRepository.getFeasibilityRecords('NONEXISTENT_WS').length === 0, 'CB: Nonexistent workspace returns empty feasibility');
recordHostile('CC', liquidityRepository.getPackage('NONEXISTENT_WS', 'PKG-1') === null, 'CC: Nonexistent package returns null');
recordHostile('CD', liquidityRepository.getAuditLogs('NONEXISTENT_WS').length === 0, 'CD: Nonexistent audit logs return empty');
recordHostile('CE', LiquidityCopilotTool.querySecurityLiquidity(null, 'AAPL').status === LiquidityStatus.UNAVAILABLE, 'CE: Null workspace Copilot query rejected');
recordHostile('CF', LiquidityCopilotTool.querySecurityLiquidity('WS-1', null).status === LiquidityStatus.INVALID_INPUT, 'CF: Null ticker Copilot query rejected');
recordHostile('CG', LiquidityCopilotTool.queryTradeFeasibility('WS-1', { ticker: 'MISSING' }).status === LiquidityStatus.UNAVAILABLE, 'CG: Missing ticker feasibility Copilot query rejected');
recordHostile('CH', LiquidityCopilotTool.queryLiquidityStress('WS-1', { ticker: 'MISSING' }).status === LiquidityStatus.UNAVAILABLE, 'CH: Missing ticker stress Copilot query rejected');
recordHostile('CI', LiquidityMetricsEngine.calculateSpread(100, 100).status === LiquidityStatus.PASS && LiquidityMetricsEngine.calculateSpread(100, 100).spreadBps === 0, 'CI: Zero spread quote handled accurately');
recordHostile('CJ', LiquidityValidationEngine.validateQuote(100, 100).isValid === true, 'CJ: Identical bid and ask valid');
recordHostile('CK', LiquidityValidationEngine.validateQuote(100, 99.99).isValid === false, 'CK: Inverted by 1 cent rejected');
recordHostile('CL', LiquidityValidationEngine.validateQuote(1e-8, 1e-7).isValid === true, 'CL: Microscopic positive quotes valid');
recordHostile('CM', LiquidityValidationEngine.validateQuote(-1e-8, 1e-7).isValid === false, 'CM: Microscopic negative bid rejected');
recordHostile('CN', LiquidityValidationEngine.validatePrice(1e-8).isValid === true, 'CN: Microscopic positive price valid');
recordHostile('CO', LiquidityValidationEngine.validatePrice(-1e-8).isValid === false, 'CO: Microscopic negative price rejected');
recordHostile('CP', LiquidityValidationEngine.validateAdv(1).isValid === true, 'CP: 1 share ADV valid');
recordHostile('CQ', LiquidityValidationEngine.validateAdv(0.5).isValid === true, 'CQ: Fractional ADV valid');
recordHostile('CR', LiquidityValidationEngine.validateAdv(-0.5).isValid === false, 'CR: Fractional negative ADV rejected');
recordHostile('CS', LiquidityHorizonEngine.calculateLiquidationHorizon({ orderQuantity: 1, adv: 1000000, maxParticipationRate: 0.10 }).requiredTradingDays === 1, 'CS: Minimum 1 day liquidation enforced');
recordHostile('CT', LiquidityHorizonEngine.calculateLiquidationHorizon({ orderQuantity: 1000000, adv: 10000, maxParticipationRate: 0.10 }).requiredTradingDays === 1000, 'CT: Multi-thousand day liquidation not silently truncated');
recordHostile('CU', LiquidityCostEngine.calculateTradingCost({ orderNotional: 1000000, dollarAdv: 1000000, customCommissionBps: 0 }).components.explicitCommission.bps === 0, 'CU: Zero commission schedule allowed');
recordHostile('CV', LiquidityCostEngine.calculateTradingCost({ orderNotional: 1000000, dollarAdv: 1000000, customCommissionBps: 100 }).components.explicitCommission.bps === 100, 'CV: High commission schedule allowed');
recordHostile('CW', LiquidityCapacityEngine.calculateStrategyCapacity([{ ticker: 'A', weight: 1.0, dollarAdv: 1000000 }]).bottleneckSecurity === 'A', 'CW: Single asset strategy bottleneck evaluated');
recordHostile('CX', LiquidityConstraintEngine.validatePositionSize({ proposedNotional: 0, dollarAdv: 1000000, portfolioValue: 1000000 }).isCompliant === true, 'CX: Zero proposed position is compliant');
recordHostile('CY', LiquidityConstraintEngine.validatePositionSize({ proposedNotional: 1000000, dollarAdv: 1000, portfolioValue: 1000000 }).isCompliant === false, 'CY: Huge position breaches constraint');
recordHostile('CZ', LiquidityRebalanceEngine.evaluateRebalanceTrades({ portfolioValue: 100000, trades: [{ ticker: 'A', currentWeight: 0.5, targetWeight: 0.5, price: 10, adv: 1000 }] }).trades.length === 0, 'CZ: Zero-delta rebalance trade filtered');

// --- Categories DA to DZ: Advanced Boundary, Round-Trip & Scenarios (26) ---
recordHostile('DA', LiquidityCostEngine.calculateTradingCost({ orderNotional: 1000, dollarAdv: 10000, direction: 'ROUND_TRIP' }).direction === 'ROUND_TRIP', 'DA: Round-trip direction verified');
recordHostile('DB', LiquidityCostEngine.calculateTradingCost({ orderNotional: 1000, dollarAdv: 10000, side: TradingSide.ROUND_TRIP }).direction === 'ROUND_TRIP', 'DB: Round-trip side verified');
recordHostile('DC', LiquidityCostEngine.calculateTradingCost({ orderNotional: 1000, dollarAdv: 10000, direction: 'ONE_WAY' }).direction === 'ONE_WAY', 'DC: One-way direction verified');
recordHostile('DD', LiquidityMetricsEngine.determineLiquidityTier(50000000, 15) === LiquidityTier.TIER_1_HIGH_LIQUIDITY, 'DD: Tier 1 exact boundary verified');
recordHostile('DE', LiquidityMetricsEngine.determineLiquidityTier(49999999, 15) === LiquidityTier.TIER_2_MODERATE_LIQUIDITY, 'DE: Tier 2 upper boundary verified');
recordHostile('DF', LiquidityMetricsEngine.determineLiquidityTier(10000000, 40) === LiquidityTier.TIER_2_MODERATE_LIQUIDITY, 'DF: Tier 2 exact boundary verified');
recordHostile('DG', LiquidityMetricsEngine.determineLiquidityTier(9999999, 40) === LiquidityTier.TIER_3_LOW_LIQUIDITY, 'DG: Tier 3 upper boundary verified');
recordHostile('DH', LiquidityMetricsEngine.determineLiquidityTier(1000000, 100) === LiquidityTier.TIER_3_LOW_LIQUIDITY, 'DH: Tier 3 exact boundary verified');
recordHostile('DI', LiquidityMetricsEngine.determineLiquidityTier(999999, 100) === LiquidityTier.TIER_4_ILLIQUID, 'DI: Tier 4 upper boundary verified');
recordHostile('DJ', LiquidityMetricsEngine.determineLiquidityTier(100000000, 20) === LiquidityTier.TIER_2_MODERATE_LIQUIDITY, 'DJ: High ADV but wide spread downgraded to Tier 2');
recordHostile('DK', LiquidityMetricsEngine.determineLiquidityTier(100000000, 50) === LiquidityTier.TIER_3_LOW_LIQUIDITY, 'DK: High ADV but very wide spread downgraded to Tier 3');
recordHostile('DL', LiquidityMetricsEngine.calculateLiquidityScore(1000000000, 2, 100000000000).score >= 95, 'DL: Mega-cap high liquidity score >= 95');
recordHostile('DM', LiquidityMetricsEngine.calculateLiquidityScore(100000, 200, 10000000).score <= 20, 'DM: Micro-cap illiquid score <= 20');
recordHostile('DN', LiquidityImpactEngine.calculateMarketImpact(100000, 1000000, { modelConfig: { modelType: ImpactModelType.LINEAR, defaultCoefficient: 0.10 } }).modelType === ImpactModelType.LINEAR, 'DN: Linear impact model selectable');
recordHostile('DO', LiquidityImpactEngine.calculateMarketImpact(100000, 1000000, { modelConfig: { modelType: ImpactModelType.SQUARE_ROOT, defaultCoefficient: 0.10 } }).modelType === ImpactModelType.SQUARE_ROOT, 'DO: Square root impact model default');
recordHostile('DP', LiquidityStressEngine.evaluateStressScenario({ orderNotional: 1000, dollarAdv: 10000, scenarioType: StressScenarioType.ADV_CONTRACTION_25 }).multipliers.advMultiplier === 0.75, 'DP: ADV -25% multiplier verified');
recordHostile('DQ', LiquidityStressEngine.evaluateStressScenario({ orderNotional: 1000, dollarAdv: 10000, scenarioType: StressScenarioType.ADV_CONTRACTION_75 }).multipliers.advMultiplier === 0.25, 'DQ: ADV -75% multiplier verified');
recordHostile('DR', LiquidityStressEngine.evaluateStressScenario({ orderNotional: 1000, dollarAdv: 10000, scenarioType: StressScenarioType.SPREAD_EXPANSION_1_5X }).multipliers.spreadMultiplier === 1.5, 'DR: Spread 1.5x multiplier verified');
recordHostile('DS', LiquidityStressEngine.evaluateStressScenario({ orderNotional: 1000, dollarAdv: 10000, scenarioType: StressScenarioType.SPREAD_EXPANSION_2X }).multipliers.spreadMultiplier === 2.0, 'DS: Spread 2.0x multiplier verified');
recordHostile('DT', LiquidityStressEngine.evaluateStressScenario({ orderNotional: 1000, dollarAdv: 10000, scenarioType: StressScenarioType.IMPACT_COEFFICIENT_1_5X }).multipliers.impactMultiplier === 1.5, 'DT: Impact 1.5x multiplier verified');
recordHostile('DU', LiquidityStressEngine.evaluateStressScenario({ orderNotional: 1000, dollarAdv: 10000, scenarioType: StressScenarioType.IMPACT_COEFFICIENT_2X }).multipliers.impactMultiplier === 2.0, 'DU: Impact 2.0x multiplier verified');
recordHostile('DV', LiquidityFeasibilityEngine.evaluateFeasibility({ ticker: 'A', orderQuantity: 100, adv: 1000, maxAllowedParticipationRate: 0.05 }).constraints.length > 0, 'DV: Stricter custom participation limit triggers constraint');
recordHostile('DW', LiquidityFeasibilityEngine.evaluateFeasibility({ ticker: 'A', orderQuantity: 1000, adv: 1000, maxAllowedTradingDays: 2 }).feasibility === ExecutionFeasibility.INFEASIBLE, 'DW: Strict 2-day limit makes 10-day trade INFEASIBLE');
recordHostile('DX', LiquidityRebalanceEngine.evaluateRebalanceTrades({ portfolioValue: 100000, trades: [{ ticker: 'A', currentWeight: 0.1, targetWeight: 0.9, price: 10, adv: 100 }] }).status === LiquidityStatus.INFEASIBLE, 'DX: Illiquid giant rebalance trade INFEASIBLE');
recordHostile('DY', LiquidityEngine.evaluatePortfolioLiquidity({ positions: [{ ticker: 'A', price: 10, adv: 1000, quantity: 100 }, { ticker: 'B', price: 20, adv: 2000, quantity: 200 }] }).positions.length === 2, 'DY: Multi-position portfolio evaluated');
recordHostile('DZ', LiquidityEngine.evaluatePortfolioLiquidity({ positions: [{ ticker: 'A', price: 10, adv: 1000, quantity: 100 }] }).concentration.liquidityHHI === 10000, 'DZ: Single asset portfolio liquidity HHI is 10,000');

// --- Categories EA to EX: Institutional Final Red-Team Hardening (24) ---
recordHostile('EA', LiquidityValidationEngine.validateFreshness('2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z').status === 'PRIME', 'EA: Same-day timestamp is PRIME');
recordHostile('EB', LiquidityValidationEngine.validateFreshness('2025-01-01T00:00:00.000Z', '2025-01-03T00:00:00.000Z').status === 'ACCEPTABLE', 'EB: 2-day old timestamp is ACCEPTABLE');
recordHostile('EC', LiquidityMetricsEngine.calculateAdv([1000, 2000, 3000], '90D').observationCount === 3, 'EC: Fewer observations than window handled safely');
recordHostile('ED', LiquidityMetricsEngine.calculateAdv([1000, 2000, 3000, 4000, 5000, 6000], '5D').observationCount === 5, 'ED: Window caps observation count to 5');
recordHostile('EE', LiquidityCostEngine.calculateTradingCost({ orderNotional: 50000, dollarAdv: 1000000, jurisdiction: 'US' }).components.transactionTaxes.cost === 0, 'EE: US transaction tax is 0');
recordHostile('EF', LiquidityCostEngine.calculateTradingCost({ orderNotional: 50000, dollarAdv: 1000000, jurisdiction: 'IN' }).components.transactionTaxes.cost > 0, 'EF: India transaction tax (STT) is strictly positive');
recordHostile('EG', LiquidityHorizonEngine.calculateLiquidationHorizon({ orderQuantity: 100, adv: 1000, maxParticipationRate: 0.10 }).schedule[0].remainingQuantity === 0, 'EG: Schedule remaining quantity reaches 0 on completion');
recordHostile('EH', LiquidityCapacityEngine.calculatePositionCapacity(10000000, { maxLiquidationDays: 10 }).maxPositionNotional === 10000000, 'EH: Custom maxLiquidationDays capacity respected');
recordHostile('EI', LiquidityCapacityEngine.calculateStrategyCapacity([{ ticker: 'A', weight: 0.5, dollarAdv: 1000000 }, { ticker: 'B', weight: 0.5, dollarAdv: 500000 }]).bottleneckSecurity === 'B', 'EI: Strategy bottleneck security B correctly identified');
recordHostile('EJ', LiquidityConstraintEngine.generatePositionConstraints({ dollarAdv: 50000000, portfolioValue: 100000000 }).constraints.maxAllowedWeight === 0.25, 'EJ: Max allowed weight is 25%');
recordHostile('EK', LiquidityFeasibilityEngine.evaluateFeasibility({ ticker: 'A', orderQuantity: 100, adv: 1000, spreadBps: 60.0 }).feasibility === ExecutionFeasibility.CONDITIONALLY_FEASIBLE, 'EK: 60 bps spread triggers wide spread friction condition');
recordHostile('EL', LiquidityRebalanceEngine.evaluateRebalanceTrades({ portfolioValue: 100000, trades: [{ ticker: 'A', currentWeight: 0.2, targetWeight: 0.3, price: 100, adv: 1000000 }] }).status === LiquidityStatus.FEASIBLE, 'EL: Highly liquid rebalance trade evaluated as FEASIBLE');
recordHostile('EM', LiquidityEngine.evaluatePortfolioLiquidity({ positions: [{ ticker: 'ILLIQ', price: 10, adv: 100, quantity: 1000 }] }).illiquidExposurePercent === 100, 'EM: 100% illiquid portfolio exposure identified');
recordHostile('EN', SealedLiquidityIntelligencePackage.sealPackage({ workspaceId: 'WS-1', portfolioId: 'P-1' }).package.packageVersion === 'SEALED_LIQUIDITY_INTELLIGENCE_V1.0', 'EN: Sealed package version constant verified');
recordHostile('EO', SealedLiquidityIntelligencePackage.sealPackage({ workspaceId: 'WS-1', portfolioId: 'P-1' }).package.dataStatus === LiquidityDataStatus.CONFIGURED, 'EO: Package dataStatus is CONFIGURED');
recordHostile('EP', liquidityRepository.saveObservation('WS-1', { ticker: 'AAPL', adv: 1000 }).ticker === 'AAPL', 'EP: Observation saved successfully');
recordHostile('EQ', liquidityRepository.saveFeasibility('WS-1', { ticker: 'AAPL', feasibility: 'FEASIBLE' }).id.startsWith('FEAS-'), 'EQ: Feasibility record assigned ID');
recordHostile('ER', liquidityRepository.savePackage('WS-1', { packageId: 'PKG-1', packageHash: 'hash' }).packageId === 'PKG-1', 'ER: Package saved in repository');
recordHostile('ES', LiquidityCopilotTool.queryTradeFeasibility('WS-1', { ticker: 'AAPL', orderQuantity: 100 }).status === LiquidityStatus.PASS, 'ES: Copilot queries valid AAPL feasibility');
recordHostile('ET', LiquidityExplanationEngine.explainSecurityLiquidity(null).includes('UNAVAILABLE'), 'ET: Null security explanation contains UNAVAILABLE');
recordHostile('EU', LiquidityExplanationEngine.explainFeasibility(null).includes('cannot proceed'), 'EU: Null feasibility explanation indicates cannot proceed');
recordHostile('EV', LiquidityExplanationEngine.explainStressResult(null).includes('UNAVAILABLE'), 'EV: Null stress explanation contains UNAVAILABLE');
recordHostile('EW', LiquidityValidationEngine.validateFreshness('not-a-date', '2025-01-01').status === LiquidityStatus.UNAVAILABLE, 'EW: Malformed date string returns UNAVAILABLE');
recordHostile('EX', LIQUIDITY_POLICY_V1.policyId === 'POL-LIQ-INST-V1' && LIQUIDITY_POLICY_V2.policyId === 'POL-LIQ-INST-V2', 'EX: Policy versions POL-LIQ-INST-V1 and V2 immutably configured');

assert(executedCategories.size === 154, 'Exactly 154 unique hostile categories executed');
console.log(`PASSED: ${executedCategories.size}/154 Hostile Categories executed cleanly with ${totalAssertions} assertions.`);
