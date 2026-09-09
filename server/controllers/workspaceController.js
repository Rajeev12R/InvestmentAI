import { workspaceRepository } from '../workspace/workspace.repository.js';
import { workspaceEngine } from '../workspace/workspace.engine.js';
import { executeChangeAnalysis } from '../change/change.engine.js';
import { executeChangeResearch } from '../research/changeResearch.engine.js';
import { runInvestmentPipeline } from '../graph/investmentGraph.js';

export async function createWorkspaceController(req, res) {
  try {
    const { name, description } = req.body || {};
    const ws = workspaceRepository.createWorkspace({ name, description });
    return res.json({ success: true, data: ws });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getWorkspaceController(req, res) {
  try {
    const { workspaceId } = req.params;
    const ws = workspaceEngine.getOrCreateWorkspace(workspaceId);
    return res.json({ success: true, data: ws });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getAllWorkspacesController(req, res) {
  try {
    const list = workspaceRepository.getAllWorkspaces();
    return res.json({ success: true, data: list });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function addWatchlistController(req, res) {
  try {
    const { workspaceId } = req.params;
    const { ticker, tags } = req.body || {};
    if (!ticker) {
      return res.status(400).json({ success: false, error: 'Ticker is required' });
    }
    const ws = workspaceEngine.addWatchlistTicker(workspaceId, ticker, tags);
    return res.json({ success: true, data: ws });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function removeWatchlistController(req, res) {
  try {
    const { workspaceId, ticker } = req.params;
    const ws = workspaceEngine.removeWatchlistTicker(workspaceId, ticker);
    return res.json({ success: true, data: ws });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function createSnapshotController(req, res) {
  try {
    const { workspaceId, ticker } = req.params;
    let truthPackage = req.body?.truthPackage;

    // If truthPackage was not supplied, run graph pipeline to generate it live
    if (!truthPackage) {
      const graphResult = await runInvestmentPipeline(ticker);
      truthPackage = graphResult?.truthPackage;
    }

    if (!truthPackage) {
      return res.status(400).json({ success: false, error: 'Failed to obtain verified Truth Package for snapshot creation.' });
    }

    const result = workspaceEngine.ingestTruthPackage(workspaceId, truthPackage);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getSnapshotsController(req, res) {
  try {
    const { workspaceId, ticker } = req.params;
    const history = workspaceRepository.getSnapshotHistory(workspaceId, ticker);
    return res.json({ success: true, data: history });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getTimelineController(req, res) {
  try {
    const { workspaceId, ticker } = req.params;
    const events = workspaceRepository.getTimeline(workspaceId, ticker);
    return res.json({ success: true, data: events });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getChangesController(req, res) {
  try {
    const { workspaceId, ticker } = req.params;
    const previous = workspaceRepository.getPreviousSnapshot(workspaceId, ticker);
    const current = workspaceRepository.getLatestSnapshot(workspaceId, ticker);

    if (!current) {
      return res.status(404).json({ success: false, error: `No snapshots found for ticker ${ticker}` });
    }

    const report = executeChangeAnalysis({
      previousSnapshot: previous,
      currentSnapshot: current
    });

    return res.json({ success: true, data: report });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function askChangeQuestionController(req, res) {
  try {
    const { workspaceId, ticker } = req.params;
    const { question } = req.body || {};

    const previous = workspaceRepository.getPreviousSnapshot(workspaceId, ticker);
    const current = workspaceRepository.getLatestSnapshot(workspaceId, ticker);

    if (!current) {
      return res.status(404).json({ success: false, error: `No snapshots found for ticker ${ticker}` });
    }

    const changePackage = executeChangeAnalysis({
      previousSnapshot: previous,
      currentSnapshot: current
    });

    const aiAnswer = await executeChangeResearch({
      changePackage,
      researchQuestion: question
    });

    return res.json({ success: true, data: aiAnswer });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function getAlertsController(req, res) {
  try {
    const { workspaceId } = req.params;
    const filter = {
      ticker: req.query.ticker,
      unacknowledgedOnly: req.query.unack === 'true',
      severity: req.query.severity
    };
    const alerts = workspaceRepository.getAlerts(workspaceId, filter);
    return res.json({ success: true, data: alerts });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function acknowledgeAlertController(req, res) {
  try {
    const { workspaceId, alertId } = req.params;
    const acked = workspaceRepository.acknowledgeAlert(workspaceId, alertId);
    return res.json({ success: true, data: acked });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// =========================================================================
// Phase 35: Workspace Membership & Lifecycle Controllers
// =========================================================================
import { authRepository } from '../auth/auth.repository.js';
import { auditRepository } from '../governance/audit.repository.js';
import { Role, WorkspaceStatus } from '../auth/auth.types.js';

export async function updateWorkspaceSettingsController(req, res) {
  try {
    const { workspaceId } = req.params;
    const { name, description, status, settings } = req.body || {};
    const updated = authRepository.updateWorkspace(workspaceId, { name, description, status, settings });

    auditRepository.appendEvent({
      workspaceId,
      orgId: updated.orgId,
      actorId: req.auth?.user?.userId || 'SYSTEM',
      actorType: 'USER',
      action: 'workspace.update',
      resourceType: 'WORKSPACE',
      resourceId: workspaceId,
      result: 'SUCCESS',
      metadata: { name, description, status }
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message, code: 'VALIDATION_ERROR' });
  }
}

export async function archiveWorkspaceController(req, res) {
  try {
    const { workspaceId } = req.params;
    const archived = authRepository.archiveWorkspace(workspaceId);

    auditRepository.appendEvent({
      workspaceId,
      orgId: archived.orgId,
      actorId: req.auth?.user?.userId || 'SYSTEM',
      actorType: 'USER',
      action: 'workspace.archive',
      resourceType: 'WORKSPACE',
      resourceId: workspaceId,
      result: 'SUCCESS'
    });

    return res.json({ success: true, data: archived, message: `Workspace ${workspaceId} archived` });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message, code: 'ARCHIVE_ERROR' });
  }
}

export async function listWorkspaceMembersController(req, res) {
  try {
    const { workspaceId } = req.params;
    const members = authRepository.listWorkspaceMembers(workspaceId);
    return res.json({ success: true, data: members });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' });
  }
}

export async function addWorkspaceMemberController(req, res) {
  try {
    const { workspaceId } = req.params;
    const { email, userId, role = Role.ANALYST } = req.body || {};

    let targetUserId = userId;
    if (!targetUserId && email) {
      const u = authRepository.getUserWithCredentialsByEmail(email);
      if (!u) {
        return res.status(404).json({ success: false, error: `User with email ${email} not found`, code: 'USER_NOT_FOUND' });
      }
      targetUserId = u.userId;
    }

    if (!targetUserId) {
      return res.status(400).json({ success: false, error: 'Target userId or email is required', code: 'INVALID_INPUT' });
    }

    const membership = authRepository.addWorkspaceMember({
      workspaceId,
      userId: targetUserId,
      role,
      inviterId: req.auth?.user?.userId || null
    });

    auditRepository.appendEvent({
      workspaceId,
      orgId: membership.orgId,
      actorId: req.auth?.user?.userId || 'SYSTEM',
      actorType: 'USER',
      action: 'workspace.member_add',
      resourceType: 'MEMBERSHIP',
      resourceId: membership.membershipId,
      result: 'SUCCESS',
      metadata: { targetUserId, role }
    });

    return res.status(201).json({ success: true, data: membership });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message, code: 'MEMBERSHIP_ERROR' });
  }
}

export async function updateWorkspaceMemberRoleController(req, res) {
  try {
    const { workspaceId, userId } = req.params;
    const { role } = req.body || {};

    if (!role || !Object.values(Role).includes(role)) {
      return res.status(400).json({ success: false, error: 'Valid Workspace Role is required', code: 'INVALID_ROLE' });
    }

    const updated = authRepository.updateMemberRole({ workspaceId, userId, role });

    auditRepository.appendEvent({
      workspaceId,
      actorId: req.auth?.user?.userId || 'SYSTEM',
      actorType: 'USER',
      action: 'workspace.member_role_update',
      resourceType: 'MEMBERSHIP',
      resourceId: updated.membershipId,
      result: 'SUCCESS',
      metadata: { targetUserId: userId, newRole: role }
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message, code: 'MEMBERSHIP_ERROR' });
  }
}

export async function removeWorkspaceMemberController(req, res) {
  try {
    const { workspaceId, userId } = req.params;

    const ws = authRepository.getWorkspaceById(workspaceId);
    if (ws && ws.ownerId === userId) {
      return res.status(400).json({ success: false, error: 'Cannot remove workspace owner', code: 'CANNOT_REMOVE_OWNER' });
    }

    const ok = authRepository.removeWorkspaceMember({ workspaceId, userId });
    if (!ok) {
      return res.status(404).json({ success: false, error: 'Membership not found', code: 'NOT_FOUND' });
    }

    auditRepository.appendEvent({
      workspaceId,
      actorId: req.auth?.user?.userId || 'SYSTEM',
      actorType: 'USER',
      action: 'workspace.member_remove',
      resourceType: 'MEMBERSHIP',
      resourceId: `MBR-${workspaceId}-${userId}`,
      result: 'SUCCESS',
      metadata: { targetUserId: userId }
    });

    return res.json({ success: true, message: `Member ${userId} removed from workspace ${workspaceId}` });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message, code: 'MEMBERSHIP_ERROR' });
  }
}

