import express from 'express';
import {
  createWorkspaceController,
  getWorkspaceController,
  getAllWorkspacesController,
  addWatchlistController,
  removeWatchlistController,
  createSnapshotController,
  getSnapshotsController,
  getTimelineController,
  getChangesController,
  askChangeQuestionController,
  getAlertsController,
  acknowledgeAlertController,
  updateWorkspaceSettingsController,
  archiveWorkspaceController,
  listWorkspaceMembersController,
  addWorkspaceMemberController,
  updateWorkspaceMemberRoleController,
  removeWorkspaceMemberController
} from '../controllers/workspaceController.js';
import { requireAuth, requirePermission } from '../auth/auth.middleware.js';
import { Permission } from '../auth/auth.types.js';

const router = express.Router();

router.get('/', getAllWorkspacesController);
router.post('/', createWorkspaceController);
router.get('/:workspaceId', getWorkspaceController);
router.patch('/:workspaceId', requireAuth, requirePermission(Permission.WORKSPACE_UPDATE), updateWorkspaceSettingsController);
router.post('/:workspaceId/archive', requireAuth, requirePermission(Permission.WORKSPACE_ARCHIVE), archiveWorkspaceController);

// Workspace Membership Management
router.get('/:workspaceId/members', requireAuth, requirePermission(Permission.WORKSPACE_MEMBERS_READ), listWorkspaceMembersController);
router.post('/:workspaceId/members', requireAuth, requirePermission(Permission.WORKSPACE_MEMBERS_INVITE), addWorkspaceMemberController);
router.patch('/:workspaceId/members/:userId', requireAuth, requirePermission(Permission.WORKSPACE_ROLES_UPDATE), updateWorkspaceMemberRoleController);
router.delete('/:workspaceId/members/:userId', requireAuth, requirePermission(Permission.WORKSPACE_MEMBERS_REMOVE), removeWorkspaceMemberController);

router.post('/:workspaceId/watchlist', addWatchlistController);
router.delete('/:workspaceId/watchlist/:ticker', removeWatchlistController);

router.post('/:workspaceId/snapshot/:ticker', createSnapshotController);
router.get('/:workspaceId/snapshots/:ticker', getSnapshotsController);
router.get('/:workspaceId/timeline/:ticker', getTimelineController);

router.get('/:workspaceId/changes/:ticker', getChangesController);
router.get('/:workspaceId/changes/:ticker/latest', getChangesController);
router.post('/:workspaceId/changes/:ticker/question', askChangeQuestionController);

router.get('/:workspaceId/alerts', getAlertsController);
router.post('/:workspaceId/alerts/:alertId/ack', acknowledgeAlertController);

export default router;

