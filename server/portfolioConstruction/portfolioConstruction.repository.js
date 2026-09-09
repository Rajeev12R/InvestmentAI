import { ExecutionStatus } from "./portfolioConstruction.types.js";

/**
 * Thread-safe Storage Repository for Portfolio Construction Packages
 */
class PortfolioConstructionRepository {
  constructor() {
    this.packages = new Map(); // packageId -> package
    this.reviews = new Map();  // packageId -> reviewRecord
  }

  savePackage(pkg) {
    if (!pkg || !pkg.packageId || !pkg.workspaceId) {
      throw new Error("Cannot save invalid portfolio construction package");
    }
    this.packages.set(pkg.packageId, pkg);
    return pkg;
  }

  getPackageById(packageId, workspaceId) {
    const pkg = this.packages.get(packageId);
    if (!pkg) return null;
    if (workspaceId && pkg.workspaceId !== workspaceId) {
      return null; // IDOR isolation: deny cross-workspace access
    }
    return pkg;
  }

  listPackagesByPortfolio(portfolioId, workspaceId) {
    const results = [];
    for (const pkg of this.packages.values()) {
      if (pkg.portfolioId === portfolioId && (!workspaceId || pkg.workspaceId === workspaceId)) {
        results.push(pkg);
      }
    }
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  listPackagesByWorkspace(workspaceId) {
    const results = [];
    for (const pkg of this.packages.values()) {
      if (pkg.workspaceId === workspaceId) {
        results.push(pkg);
      }
    }
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  saveReview(reviewData) {
    const { packageId, workspaceId, reviewedBy, decision, notes } = reviewData;
    const pkg = this.getPackageById(packageId, workspaceId);
    if (!pkg) {
      throw new Error(`Package ${packageId} not found in workspace ${workspaceId}`);
    }

    const reviewRecord = {
      reviewId: `REV-${packageId}-${Date.now()}`,
      packageId,
      workspaceId,
      reviewedBy: reviewedBy || "AUTHORIZED_INVESTOR",
      decision: decision || "APPROVED",
      notes: notes || "",
      executionStatus: decision === "APPROVED" ? ExecutionStatus.HUMAN_APPROVED : ExecutionStatus.REVIEW_REQUIRED,
      reviewedAt: new Date().toISOString()
    };

    this.reviews.set(packageId, Object.freeze(reviewRecord));
    return reviewRecord;
  }

  getReviewByPackageId(packageId, workspaceId) {
    const pkg = this.getPackageById(packageId, workspaceId);
    if (!pkg) return null;
    return this.reviews.get(packageId) || null;
  }

  clear() {
    this.packages.clear();
    this.reviews.clear();
  }
}

export const portfolioConstructionRepository = new PortfolioConstructionRepository();
