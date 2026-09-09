/**
 * server/researchSynthesis/synthesis.store.js
 * 
 * Phase 24: Revision-Aware Research Product Store & Human Review State Machine
 * Manages research product immutability, versioning, human approval gating, and publication lifecycle.
 */

import { ResearchReviewStatus, canonicalSha256, deepFreeze } from './synthesis.types.js';
import { validateResearchProduct } from './synthesis.schema.js';

export class ResearchProductStore {
  constructor() {
    // Map<tenantId, Map<productId, Array<ResearchProductVersion>>>
    this.productsByTenant = new Map();
  }

  _getTenantStore(tenantId) {
    if (!tenantId || typeof tenantId !== 'string') {
      throw new Error('Valid tenantId string is required');
    }
    if (!this.productsByTenant.has(tenantId)) {
      this.productsByTenant.set(tenantId, new Map());
    }
    return this.productsByTenant.get(tenantId);
  }

  /**
   * Saves a new research product or new version
   */
  saveProduct(tenantId, productData) {
    const prodObj = {
      ...productData,
      tenantId,
      version: productData.version || 1,
      reviewerStatus: productData.reviewerStatus || ResearchReviewStatus.DRAFT,
      createdAt: productData.createdAt || new Date().toISOString()
    };

    const validation = validateResearchProduct(prodObj);
    if (!validation.isValid) {
      throw new Error(`Invalid ResearchProduct: ${validation.errors.join(', ')}`);
    }

    const tenantStore = this._getTenantStore(tenantId);
    if (!tenantStore.has(prodObj.productId)) {
      tenantStore.set(prodObj.productId, []);
    }

    const history = tenantStore.get(prodObj.productId);
    const versionNumber = history.length + 1;

    const record = {
      ...prodObj,
      version: versionNumber,
      productHash: canonicalSha256({
        productId: prodObj.productId,
        productType: prodObj.productType,
        subjectIds: prodObj.subjectIds,
        tenantId,
        knowledgeCutoff: prodObj.knowledgeCutoff,
        version: versionNumber,
        claims: prodObj.claims || []
      })
    };

    const frozen = deepFreeze(record);
    history.push(frozen);
    return frozen;
  }

  /**
   * Retrieves the latest version of a research product
   */
  getLatestProduct(tenantId, productId) {
    const tenantStore = this._getTenantStore(tenantId);
    const history = tenantStore.get(productId);
    if (!history || history.length === 0) return null;
    return history[history.length - 1];
  }

  /**
   * Retrieves a specific version of a research product
   */
  getProductVersion(tenantId, productId, versionNumber) {
    const tenantStore = this._getTenantStore(tenantId);
    const history = tenantStore.get(productId);
    if (!history) return null;
    return history.find(p => p.version === versionNumber) || null;
  }

  /**
   * Retrieves all historical versions of a product
   */
  getProductHistory(tenantId, productId) {
    const tenantStore = this._getTenantStore(tenantId);
    return tenantStore.get(productId) || [];
  }

  /**
   * Executes human approval transition
   */
  approveProduct(tenantId, productId, approver = {}) {
    const latest = this.getLatestProduct(tenantId, productId);
    if (!latest) {
      throw new Error(`Product ${productId} not found`);
    }

    // Role check: AI cannot approve research
    if (approver.isAI === true || approver.role === 'AI_AGENT') {
      throw new Error('AI agents are strictly forbidden from approving research products. Human approval required.');
    }

    const allowedRoles = ['ANALYST', 'PORTFOLIO_MANAGER', 'INVESTMENT_COMMITTEE', 'COMPLIANCE_OFFICER', 'ADMIN'];
    if (approver.role && !allowedRoles.includes(approver.role)) {
      throw new Error(`Unauthorized approver role: ${approver.role}`);
    }

    const updatedProduct = {
      ...latest,
      reviewerStatus: ResearchReviewStatus.HUMAN_APPROVED,
      approvedBy: approver.userId || 'HUMAN_APPROVER',
      approvedAt: new Date().toISOString(),
      approvalRationale: approver.rationale || 'Verified evidence grounding and methodology'
    };

    return this.saveProduct(tenantId, updatedProduct);
  }

  /**
   * Executes publication transition
   */
  publishProduct(tenantId, productId, publisher = {}) {
    const latest = this.getLatestProduct(tenantId, productId);
    if (!latest) {
      throw new Error(`Product ${productId} not found`);
    }

    if (latest.reviewerStatus !== ResearchReviewStatus.HUMAN_APPROVED) {
      throw new Error(`Cannot publish product with status ${latest.reviewerStatus}. Must be HUMAN_APPROVED first.`);
    }

    const publishedProduct = {
      ...latest,
      reviewerStatus: ResearchReviewStatus.PUBLISHED,
      publishedBy: publisher.userId || 'PUBLISHER',
      publishedAt: new Date().toISOString()
    };

    return this.saveProduct(tenantId, publishedProduct);
  }
}

export const defaultResearchProductStore = new ResearchProductStore();
export function createResearchStore() {
  return new ResearchProductStore();
}
