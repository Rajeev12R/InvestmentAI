import assert from 'assert';
import { ExposureChangeEngine } from '../exposureRisk/exposure.change.engine.js';
import { ExposureChangeType } from '../exposureRisk/exposure.types.js';

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

console.log('=== Suite 12: Exposure Change Intelligence & Snapshot Drift ===');

it('Detect new exposure, removed exposure and factor rotation between snapshots', () => {
  const snap1 = {
    grossExposure: 1.0,
    netExposure: 1.0,
    sectorExposures: { TECHNOLOGY: 0.40, UTILITIES: 0.15 }
  };

  const snap2 = {
    grossExposure: 1.2,
    netExposure: 1.0,
    sectorExposures: { TECHNOLOGY: 0.50, ENERGY: 0.20 } // UTILITIES removed, ENERGY new, TECH rotated
  };

  const res = ExposureChangeEngine.compareSnapshots({
    snapshotBefore: snap1,
    snapshotAfter: snap2
  });

  assert(res.changeCount >= 3);
  const newEnergy = res.changes.find(c => c.changeType === ExposureChangeType.NEW_EXPOSURE);
  assert.notStrictEqual(newEnergy, undefined);
  assert.strictEqual(newEnergy.dimension, 'SECTOR:ENERGY');

  const remUtil = res.changes.find(c => c.changeType === ExposureChangeType.REMOVED_EXPOSURE);
  assert.notStrictEqual(remUtil, undefined);
  assert.strictEqual(remUtil.dimension, 'SECTOR:UTILITIES');
});

console.log(`PASSED: ${passed} assertions passed.\n`);
