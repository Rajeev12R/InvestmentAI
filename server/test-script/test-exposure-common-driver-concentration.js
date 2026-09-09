import assert from 'assert';
import { ExposureCommonDriverEngine } from '../exposureRisk/exposure.common.driver.engine.js';
import { CommonDriverType } from '../exposureRisk/exposure.types.js';

let passed = 0;
function it(desc, fn) {
  try {
    fn();
    passed++;
  } catch (err) {
    console.error(`FAILED: ${desc}`);
    throw err;
  }
}

console.log('=== Suite 7: Common Driver & Hidden Concentration Engine ===');

it('Detect shared supply chain and customer common drivers across securities', () => {
  const holdings = [
    { symbol: 'NVDA', weight: 0.30, supplyChain: ['TSMC_FOUNDRY'], keyCustomers: ['MICROSOFT_CLOUD'] },
    { symbol: 'AMD', weight: 0.20, supplyChain: ['TSMC_FOUNDRY'], keyCustomers: ['MICROSOFT_CLOUD'] },
    { symbol: 'AAPL', weight: 0.25, supplyChain: ['TSMC_FOUNDRY', 'FOXCONN'] },
    { symbol: 'XOM', weight: 0.25, commodityDependencies: ['CRUDE_OIL'] }
  ];

  const res = ExposureCommonDriverEngine.identifyCommonDrivers({ holdings });
  assert(res.driverCount >= 2);
  const tsmcDriver = res.commonDrivers.find(d => d.name === 'TSMC_FOUNDRY');
  assert.notStrictEqual(tsmcDriver, undefined);
  assert.strictEqual(tsmcDriver.affectedSecurities.length, 3);
  assert.strictEqual(tsmcDriver.portfolioWeight, 0.75);
});

it('Detect hidden concentration when nominal HHI is low but common driver HHI is high', () => {
  // 10 securities each 10% weight => nominal security HHI = 10 * (0.10^2) = 0.10 (10 effective bets)
  const holdings = Array.from({ length: 10 }, (_, i) => ({
    symbol: `TECH_${i}`,
    weight: 0.10,
    sector: 'TECHNOLOGY',
    supplyChain: ['COMMON_BOTTLENECK_FAB']
  }));

  const drivers = ExposureCommonDriverEngine.identifyCommonDrivers({ holdings });
  const conc = ExposureCommonDriverEngine.evaluateHiddenConcentration({
    holdings,
    commonDrivers: drivers.commonDrivers
  });

  assert.strictEqual(conc.securityHHI, 0.10);
  assert.strictEqual(conc.commonDriverHHI, 1.00); // 100% of portfolio concentrated in 1 bottleneck!
  assert.strictEqual(conc.isHiddenConcentrationDetected, true);
});

console.log(`PASSED: ${passed} assertions passed.\n`);
