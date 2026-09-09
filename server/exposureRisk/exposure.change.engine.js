import { deepFreeze, computeExposureHash, ExposureChangeType } from './exposure.types.js';

/**
 * Phase 30 — Deterministic Exposure Change & Snapshot Drift Engine
 */
export class ExposureChangeEngine {
  /**
   * Compare Two Temporal Exposure Snapshots ($T_1$ vs $T_2$)
   * @param {Object} params
   * @param {Object} params.snapshotBefore Exposure snapshot at T1
   * @param {Object} params.snapshotAfter Exposure snapshot at T2
   */
  static compareSnapshots({
    snapshotBefore = {},
    snapshotAfter = {}
  } = {}) {
    const changes = [];

    // 1. Gross & Net Exposure Changes
    const deltaGross = (snapshotAfter.grossExposure || 0) - (snapshotBefore.grossExposure || 0);
    const deltaNet = (snapshotAfter.netExposure || 0) - (snapshotBefore.netExposure || 0);

    if (Math.abs(deltaGross) > 0.01) {
      changes.push({
        changeId: `chg_gross_${Date.now()}`,
        changeType: deltaGross > 0 ? ExposureChangeType.EXPOSURE_INCREASE : ExposureChangeType.EXPOSURE_DECREASE,
        dimension: 'GROSS_EXPOSURE',
        beforeValue: Number((snapshotBefore.grossExposure || 0).toFixed(4)),
        afterValue: Number((snapshotAfter.grossExposure || 0).toFixed(4)),
        delta: Number(deltaGross.toFixed(4))
      });
    }

    // 2. Sector Exposure Changes & Rotations
    const beforeSectors = snapshotBefore.sectorExposures || {};
    const afterSectors = snapshotAfter.sectorExposures || {};
    const allSectors = new Set([...Object.keys(beforeSectors), ...Object.keys(afterSectors)]);

    for (const sec of allSectors) {
      const vBefore = beforeSectors[sec] || 0;
      const vAfter = afterSectors[sec] || 0;
      const diff = vAfter - vBefore;

      if (vBefore === 0 && vAfter > 0.01) {
        changes.push({
          changeId: `chg_sec_new_${sec}`,
          changeType: ExposureChangeType.NEW_EXPOSURE,
          dimension: `SECTOR:${sec}`,
          beforeValue: 0,
          afterValue: Number(vAfter.toFixed(4)),
          delta: Number(diff.toFixed(4))
        });
      } else if (vBefore > 0.01 && vAfter === 0) {
        changes.push({
          changeId: `chg_sec_rem_${sec}`,
          changeType: ExposureChangeType.REMOVED_EXPOSURE,
          dimension: `SECTOR:${sec}`,
          beforeValue: Number(vBefore.toFixed(4)),
          afterValue: 0,
          delta: Number(diff.toFixed(4))
        });
      } else if (Math.abs(diff) >= 0.05) {
        changes.push({
          changeId: `chg_sec_rot_${sec}`,
          changeType: ExposureChangeType.FACTOR_ROTATION,
          dimension: `SECTOR:${sec}`,
          beforeValue: Number(vBefore.toFixed(4)),
          afterValue: Number(vAfter.toFixed(4)),
          delta: Number(diff.toFixed(4))
        });
      }
    }

    return deepFreeze({
      changes,
      changeCount: changes.length,
      evaluatedAt: new Date().toISOString()
    });
  }
}
