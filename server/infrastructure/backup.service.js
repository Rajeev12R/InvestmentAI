/**
 * @file backup.service.js
 * Backup, Disaster Recovery & Restore Service for Phase 9 Institutional Infrastructure.
 */

import crypto from 'crypto';
import { workspaceStorage } from '../storage/workspace.storage.js';
import { operationsRepository } from '../operations/operations.repository.js';
import { auditRepository } from '../governance/audit.repository.js';

export class BackupService {
  constructor() {
    this.backups = new Map(); // backupId -> Backup
    this.targetRPO = '15_MINUTES';
    this.targetRTO = '5_MINUTES';
  }

  createBackup({ workspaceId, actorId = 'SYSTEM' }) {
    if (!workspaceId) throw new Error('workspaceId is required for backup');

    const backupId = `BKP-${crypto.randomUUID()}`;
    const createdAt = new Date().toISOString();

    const state = workspaceStorage.getWorkspace(workspaceId);
    const reviews = operationsRepository.getState(workspaceId).reviews || [];
    const auditEvents = auditRepository.listEvents({ workspaceId, limit: 500 });

    const payload = {
      workspaceId,
      state,
      reviews,
      auditEvents
    };

    const payloadJson = JSON.stringify(payload);
    const checksum = crypto.createHash('sha256').update(payloadJson).digest('hex');

    const backup = {
      backupId,
      workspaceId,
      createdAt,
      actorId,
      checksum,
      sizeBytes: Buffer.byteLength(payloadJson),
      status: 'AVAILABLE',
      targetRPO: this.targetRPO,
      targetRTO: this.targetRTO,
      payload
    };

    this.backups.set(backupId, backup);

    auditRepository.appendEvent({
      workspaceId,
      actorId,
      actorType: 'USER',
      action: 'backup.created',
      resourceType: 'BACKUP',
      resourceId: backupId,
      result: 'SUCCESS',
      metadata: { backupId, checksum }
    });

    return {
      backupId: backup.backupId,
      workspaceId: backup.workspaceId,
      createdAt: backup.createdAt,
      checksum: backup.checksum,
      sizeBytes: backup.sizeBytes,
      status: backup.status
    };
  }

  verifyBackupIntegrity(backupId) {
    const backup = this.backups.get(backupId);
    if (!backup) return { isValid: false, reason: 'Backup not found' };

    const payloadJson = JSON.stringify(backup.payload);
    const calculatedChecksum = crypto.createHash('sha256').update(payloadJson).digest('hex');

    if (calculatedChecksum !== backup.checksum) {
      return { isValid: false, reason: 'Checksum mismatch (backup corruption detected)' };
    }
    return { isValid: true, backupId, checksum: backup.checksum };
  }

  restoreBackup({ backupId, targetWorkspaceId = null, actorId = 'SYSTEM' }) {
    const backup = this.backups.get(backupId);
    if (!backup) throw new Error(`Backup ${backupId} not found`);

    const integrity = this.verifyBackupIntegrity(backupId);
    if (!integrity.isValid) {
      throw new Error(`Cannot restore corrupted backup: ${integrity.reason}`);
    }

    const effectiveWorkspaceId = targetWorkspaceId || backup.workspaceId;

    // Restore workspace state
    if (backup.payload.state) {
      workspaceStorage.workspaces.set(effectiveWorkspaceId, {
        ...backup.payload.state,
        workspaceId: effectiveWorkspaceId
      });
    }

    auditRepository.appendEvent({
      workspaceId: effectiveWorkspaceId,
      actorId,
      actorType: 'USER',
      action: 'backup.restored',
      resourceType: 'BACKUP',
      resourceId: backupId,
      result: 'SUCCESS',
      metadata: { backupId, sourceWorkspaceId: backup.workspaceId, targetWorkspaceId: effectiveWorkspaceId }
    });

    return {
      success: true,
      restoredWorkspaceId: effectiveWorkspaceId,
      restoredAt: new Date().toISOString()
    };
  }

  listBackups(workspaceId) {
    const list = [];
    for (const b of this.backups.values()) {
      if (!workspaceId || b.workspaceId === workspaceId) {
        list.push({
          backupId: b.backupId,
          workspaceId: b.workspaceId,
          createdAt: b.createdAt,
          checksum: b.checksum,
          sizeBytes: b.sizeBytes,
          status: b.status
        });
      }
    }
    return list;
  }
}

export const backupService = new BackupService();
