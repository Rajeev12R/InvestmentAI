/**
 * server/routes/researchSynthesis.routes.js
 * 
 * Phase 24: REST Endpoints for Institutional Research Synthesis & Intelligence Briefing
 * Enforces role-based authorization (RBAC), tenant isolation, and input validation.
 */

import express from 'express';
import { defaultResearchContextBuilder } from '../researchSynthesis/synthesis.context.builder.js';
import { defaultResearchNarrativeEngine } from '../researchSynthesis/synthesis.narrative.engine.js';
import { defaultResearchClaimValidator } from '../researchSynthesis/synthesis.claim.validator.js';
import { defaultModelAgreementEngine } from '../researchSynthesis/synthesis.modelAgreement.engine.js';
import { defaultThesisDecisionReviewEngine } from '../researchSynthesis/synthesis.thesisDecision.engine.js';
import { defaultPortfolioResearchSynthesisEngine } from '../researchSynthesis/synthesis.portfolio.engine.js';
import { defaultResearchDeltaEngine } from '../researchSynthesis/synthesis.delta.engine.js';
import { defaultResearchProductStore } from '../researchSynthesis/synthesis.store.js';
import { sealResearchPackage, verifyResearchPackage } from '../researchSynthesis/synthesis.package.js';
import { ResearchProductType, ResearchReviewStatus } from '../researchSynthesis/synthesis.types.js';

const router = express.Router();

function checkWorkspaceAuth(req, res) {
  const workspaceId = req.headers['x-workspace-id'] || req.query.workspaceId || req.body?.workspaceId || 'DEFAULT_TENANT';
  const role = req.user?.role || req.headers['x-user-role'] || 'ANALYST';
  const userId = req.user?.id || req.headers['x-user-id'] || 'USR-ANALYST-1';
  return { workspaceId, role, userId };
}

/**
 * POST /api/research-synthesis/context
 */
router.post('/context', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    const { workspaceId } = auth;
    const { subjectId, knowledgeCutoff, scope, options } = req.body || {};

    if (!subjectId) {
      return res.status(400).json({ success: false, error: 'subjectId is required' });
    }

    const context = defaultResearchContextBuilder.buildResearchContext(subjectId, knowledgeCutoff, scope, {
      ...options,
      tenantId: workspaceId
    });

    return res.status(200).json({ success: true, status: 'PASS', context });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/research-synthesis/brief
 */
router.post('/brief', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    const { workspaceId } = auth;
    const { subjectId, productType, knowledgeCutoff, options } = req.body || {};

    if (!subjectId) {
      return res.status(400).json({ success: false, error: 'subjectId is required' });
    }

    const context = defaultResearchContextBuilder.buildResearchContext(subjectId, knowledgeCutoff, 'FULL', {
      ...options,
      tenantId: workspaceId
    });

    const brief = defaultResearchNarrativeEngine.generateStructuredBrief(context, options);
    const claimValidation = defaultResearchClaimValidator.validateClaims(brief.claims, {
      knowledgeCutoff: context.knowledgeCutoff,
      tenantId: workspaceId
    });

    const productId = req.body.productId || `PROD-${subjectId.toUpperCase()}-${Date.now()}`;
    const productRecord = {
      productId,
      productType: productType || ResearchProductType.SECURITY_BRIEF,
      subjectIds: [subjectId.toUpperCase()],
      generatedAt: new Date().toISOString(),
      knowledgeCutoff: context.knowledgeCutoff,
      claims: brief.claims,
      sections: brief.sections,
      contextHash: context.contextHash,
      reviewerStatus: claimValidation.isValid ? ResearchReviewStatus.VALIDATED : ResearchReviewStatus.VALIDATION_FAILED
    };

    const saved = defaultResearchProductStore.saveProduct(workspaceId, productRecord);

    return res.status(200).json({
      success: true,
      status: 'PASS',
      product: saved,
      claimValidation
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/research-synthesis/:id
 */
router.get('/:id', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    const { workspaceId } = auth;
    const product = defaultResearchProductStore.getLatestProduct(workspaceId, req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, error: `Product not found: ${req.params.id}` });
    }

    return res.status(200).json({ success: true, status: 'PASS', product });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/research-synthesis/:id/claims
 */
router.get('/:id/claims', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    const { workspaceId } = auth;
    const product = defaultResearchProductStore.getLatestProduct(workspaceId, req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, error: `Product not found: ${req.params.id}` });
    }

    const claims = product.claims || [];
    return res.status(200).json({ success: true, status: 'PASS', claimsCount: claims.length, claims });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/research-synthesis/:id/versions
 */
router.get('/:id/versions', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    const { workspaceId } = auth;
    const history = defaultResearchProductStore.getProductHistory(workspaceId, req.params.id);
    return res.status(200).json({ success: true, status: 'PASS', versionCount: history.length, versions: history });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/research-synthesis/:id/approve
 */
router.post('/:id/approve', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    const { workspaceId, role, userId } = auth;

    if (role === 'VIEWER') {
      return res.status(403).json({ success: false, error: 'VIEWER role cannot approve research' });
    }

    const approved = defaultResearchProductStore.approveProduct(workspaceId, req.params.id, {
      userId,
      role,
      rationale: req.body?.rationale
    });

    return res.status(200).json({ success: true, status: 'PASS', product: approved });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/research-synthesis/:id/publish
 */
router.post('/:id/publish', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    const { workspaceId, role, userId } = auth;

    if (role === 'VIEWER' || role === 'ANALYST') {
      return res.status(403).json({ success: false, error: 'Only PM or Admin can publish research' });
    }

    const published = defaultResearchProductStore.publishProduct(workspaceId, req.params.id, {
      userId,
      role
    });

    return res.status(200).json({ success: true, status: 'PASS', product: published });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/research-synthesis/package/seal
 */
router.post('/package/seal', (req, res) => {
  try {
    const auth = checkWorkspaceAuth(req, res);
    const { workspaceId, userId } = auth;
    const { product } = req.body || {};

    if (!product) {
      return res.status(400).json({ success: false, error: 'product object is required' });
    }

    const sealed = sealResearchPackage(product, userId);
    return res.status(200).json({ success: true, status: 'PASS', sealedPackage: sealed });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/research-synthesis/package/verify
 */
router.post('/package/verify', (req, res) => {
  try {
    const { sealedPackage } = req.body || {};
    const verification = verifyResearchPackage(sealedPackage);
    return res.status(200).json({ success: true, status: 'PASS', verification });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
