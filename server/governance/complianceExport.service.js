/**
 * @file complianceExport.service.js
 * Compliance-Ready Institutional Export Service for Phase 9.
 */

import crypto from 'crypto';
import { auditRepository } from './audit.repository.js';
import { operationsRepository } from '../operations/operations.repository.js';
import { workspaceStorage } from '../storage/workspace.storage.js';

export class ComplianceExportService {
  /**
   * Generates a compliance export bundle for a workspace.
   * @param {string} workspaceId
   * @param {string} exportType - 'AUDIT_TRAIL' | 'DECISION_HISTORY' | 'SNAPSHOT_HISTORY' | 'FULL_WORKSPACE'
   * @returns {Object} Structured compliance bundle with metadata and export checksum
   */
  generateExport({ workspaceId, exportType = 'FULL_WORKSPACE', actorId = 'SYSTEM' }) {
    if (!workspaceId) throw new Error('workspaceId is required for compliance export');

    const generatedAt = new Date().toISOString();
    let payload = {};

    if (exportType === 'AUDIT_TRAIL' || exportType === 'FULL_WORKSPACE') {
      payload.auditTrail = auditRepository.listEvents({ workspaceId, limit: 1000 });
      payload.auditChainVerification = auditRepository.verifyChainIntegrity();
    }

    if (exportType === 'DECISION_HISTORY' || exportType === 'FULL_WORKSPACE') {
      payload.decisionReviews = operationsRepository.getState(workspaceId).reviews || [];
    }

    if (exportType === 'SNAPSHOT_HISTORY' || exportType === 'FULL_WORKSPACE') {
      const state = workspaceStorage.getWorkspace(workspaceId);
      payload.snapshots = state?.snapshots || [];
      payload.watchlist = state?.watchlist || [];
      payload.portfolio = state?.portfolio || null;
    }

    const rawExport = JSON.stringify({
      exportType,
      workspaceId,
      generatedAt,
      actorId,
      payload
    });

    const exportChecksum = crypto.createHash('sha256').update(rawExport).digest('hex');

    // Append an audit log of this export
    auditRepository.appendEvent({
      workspaceId,
      actorId,
      actorType: 'USER',
      action: 'compliance.export_generated',
      resourceType: 'COMPLIANCE_EXPORT',
      resourceId: `EXP-${exportChecksum.slice(0, 16)}`,
      result: 'SUCCESS',
      metadata: { exportType, checksum: exportChecksum }
    });

    return {
      exportId: `EXP-${exportChecksum.slice(0, 16)}`,
      workspaceId,
      exportType,
      generatedAt,
      actorId,
      checksum: exportChecksum,
      complianceStandard: 'COMPLIANCE_READY_AUDIT_TRAIL_V1',
      data: payload
    };
  }
}

export const complianceExportService = new ComplianceExportService();
