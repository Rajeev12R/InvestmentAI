/**
 * Phase 16 — Institutional Exception & Waiver Engine
 * Manages human approval workflows, cryptographic hash binding,
 * expiration enforcement, and role-based authorization for policy waivers.
 */

import { ExceptionStatus, canonicalHash, deepFreeze, SeverityLevel } from './compliance.types.js';

export const ValidExceptionTransitions = Object.freeze({
  [ExceptionStatus.REQUESTED]: [ExceptionStatus.UNDER_REVIEW, ExceptionStatus.APPROVED, ExceptionStatus.REJECTED],
  [ExceptionStatus.UNDER_REVIEW]: [ExceptionStatus.APPROVED, ExceptionStatus.REJECTED],
  [ExceptionStatus.APPROVED]: [ExceptionStatus.ACTIVE, ExceptionStatus.EXPIRED, ExceptionStatus.CLOSED],
  [ExceptionStatus.ACTIVE]: [ExceptionStatus.EXPIRED, ExceptionStatus.CLOSED],
  [ExceptionStatus.EXPIRED]: [ExceptionStatus.CLOSED],
  [ExceptionStatus.CLOSED]: [],
  [ExceptionStatus.REJECTED]: [ExceptionStatus.CLOSED]
});

export class ExceptionEngine {
  /**
   * Requests a new Exception / Waiver.
   */
  static requestException({
    exceptionId,
    workspaceId,
    portfolioId,
    policyId,
    policyVersion = '1.0.0',
    ruleId,
    reason,
    scope = 'PORTFOLIO',
    requestedBy = 'ANALYST',
    effectiveFrom = new Date().toISOString(),
    expiresAt,
    metadata = {}
  }) {
    if (!workspaceId || !portfolioId || !ruleId || !reason || !expiresAt) {
      throw new Error('workspaceId, portfolioId, ruleId, reason, and expiresAt are required to request an exception');
    }

    const fromDate = new Date(effectiveFrom);
    const toDate = new Date(expiresAt);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new Error('Invalid dates provided for effectiveFrom or expiresAt');
    }

    if (fromDate >= toDate) {
      throw new Error('expiresAt must be strictly after effectiveFrom');
    }

    // Enforce max duration (e.g. 60 days)
    const durationDays = (toDate - fromDate) / (1000 * 60 * 60 * 24);
    if (durationDays > 60) {
      throw new Error(`Exception duration of ${durationDays.toFixed(1)} days exceeds maximum allowed 60 days`);
    }

    const id = exceptionId || `EXC-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const exceptionPayload = {
      exceptionId: id,
      workspaceId,
      portfolioId,
      policyId,
      policyVersion,
      ruleId,
      reason,
      scope,
      requestedBy,
      approvedBy: null,
      requestedAt: fromDate.toISOString(),
      approvedAt: null,
      effectiveFrom: fromDate.toISOString(),
      expiresAt: toDate.toISOString(),
      status: ExceptionStatus.REQUESTED,
      metadata
    };

    const exceptionHash = canonicalHash({
      exceptionId: exceptionPayload.exceptionId,
      workspaceId: exceptionPayload.workspaceId,
      portfolioId: exceptionPayload.portfolioId,
      ruleId: exceptionPayload.ruleId,
      reason: exceptionPayload.reason,
      effectiveFrom: exceptionPayload.effectiveFrom,
      expiresAt: exceptionPayload.expiresAt,
      status: exceptionPayload.status
    });

    return deepFreeze({
      ...exceptionPayload,
      exceptionHash
    });
  }

  /**
   * Approves an exception by an authorized human role.
   */
  static approveException(exception, {
    approvedBy,
    role,
    approvalTimestamp = new Date().toISOString(),
    notes = ''
  }) {
    if (!exception || !exception.exceptionId) {
      throw new Error('Valid exception is required for approval');
    }

    if (!approvedBy || !role) {
      throw new Error('approvedBy and role are required for exception approval');
    }

    // Role check: Only PORTFOLIO_MANAGER or ADMIN can approve
    if (role !== 'PORTFOLIO_MANAGER' && role !== 'ADMIN' && role !== 'OWNER') {
      throw new Error(`Role ${role} is not authorized to approve compliance exceptions`);
    }

    // Self-approval prohibition
    if (exception.requestedBy === approvedBy) {
      throw new Error('Self-approval of compliance exceptions is strictly prohibited by policy');
    }

    // Status check
    if (exception.status !== ExceptionStatus.REQUESTED && exception.status !== ExceptionStatus.UNDER_REVIEW) {
      throw new Error(`Cannot approve exception in status ${exception.status}`);
    }

    const approvedPayload = {
      ...exception,
      approvedBy,
      approvedAt: new Date(approvalTimestamp).toISOString(),
      status: ExceptionStatus.ACTIVE,
      approvalNotes: notes
    };

    const exceptionHash = canonicalHash({
      exceptionId: approvedPayload.exceptionId,
      workspaceId: approvedPayload.workspaceId,
      portfolioId: approvedPayload.portfolioId,
      ruleId: approvedPayload.ruleId,
      reason: approvedPayload.reason,
      effectiveFrom: approvedPayload.effectiveFrom,
      expiresAt: approvedPayload.expiresAt,
      approvedBy: approvedPayload.approvedBy,
      approvedAt: approvedPayload.approvedAt,
      status: approvedPayload.status
    });

    return deepFreeze({
      ...approvedPayload,
      exceptionHash
    });
  }

  /**
   * Verifies if an exception is currently active and satisfies a specific rule at timestamp T0.
   */
  static isExceptionValidAtTimestamp(exception, ruleId, asOf = new Date().toISOString()) {
    if (!exception || !exception.exceptionHash) return false;
    if (exception.ruleId !== ruleId) return false;
    if (exception.status !== ExceptionStatus.ACTIVE && exception.status !== ExceptionStatus.APPROVED) return false;
    if (!exception.approvedBy) return false;

    // Verify hash integrity (tamper detection)
    const expectedHash = canonicalHash({
      exceptionId: exception.exceptionId,
      workspaceId: exception.workspaceId,
      portfolioId: exception.portfolioId,
      ruleId: exception.ruleId,
      reason: exception.reason,
      effectiveFrom: exception.effectiveFrom,
      expiresAt: exception.expiresAt,
      approvedBy: exception.approvedBy,
      approvedAt: exception.approvedAt,
      status: exception.status
    });

    if (expectedHash !== exception.exceptionHash) {
      return false; // Tampered or corrupted
    }

    const targetTime = new Date(asOf).getTime();
    const fromTime = new Date(exception.effectiveFrom).getTime();
    const toTime = new Date(exception.expiresAt).getTime();

    if (isNaN(targetTime) || isNaN(fromTime) || isNaN(toTime)) return false;
    if (targetTime < fromTime || targetTime > toTime) return false;

    return true;
  }
}
