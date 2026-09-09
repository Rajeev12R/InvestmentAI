/**
 * @file App.jsx
 * Master Routing and Context Provider Tree for InvestmentAI SaaS.
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { WorkspaceProvider } from './context/WorkspaceContext.jsx';

// Shell & Layout Components
import AppShell from './components/layout/AppShell.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import TickerBar from './components/TickerBar.jsx';
import Navbar from './components/Navbar.jsx';

// Public & Legacy Pages
import LandingPage from './components/LandingPage.jsx';
import DashboardPage from './components/DashboardPage.jsx';
import ComparePage from './components/ComparePage.jsx';
import WatchlistPage from './components/WatchlistPage.jsx';
import WorkspaceDashboard from './components/Workspace/WorkspaceDashboard.jsx';

// SaaS Product Pages
import LoginPage from './components/auth/LoginPage.jsx';
import OverviewDashboard from './components/dashboard/OverviewDashboard.jsx';
import ResearchSynthesisDashboard from './components/ResearchSynthesis/ResearchSynthesisDashboard.jsx';
import AttentionCenter from './components/Attention/AttentionCenter.jsx';
import SignalIntelligenceDashboard from './components/SignalIntelligence/SignalIntelligenceDashboard.jsx';
import MacroDashboard from './components/Macro/MacroDashboard.jsx';
import KnowledgeGraphDashboard from './components/KnowledgeGraph/KnowledgeGraphDashboard.jsx';
import PortfolioOverview from './components/PortfolioIntelligence/PortfolioOverview.jsx';
import ExposureRiskDashboard from './components/ExposureRisk/ExposureRiskDashboard.jsx';
import PortfolioConstructionPanel from './components/PortfolioConstruction/PortfolioConstructionPanel.jsx';
import DecisionReviewQueue from './components/Operations/DecisionReviewQueue.jsx';
import ProcessIntelligencePanel from './components/Process/ProcessIntelligencePanel.jsx';
import SecurityDashboardView from './components/governance/SecurityDashboardView.jsx';
import AuditLogView from './components/governance/AuditLogView.jsx';
import WorkspaceMembersView from './components/governance/WorkspaceMembersView.jsx';
import ApiKeyManagementView from './components/governance/ApiKeyManagementView.jsx';
import CopilotPanel from './components/Copilot/CopilotPanel.jsx';

// Phase 35 Multi-Tenant Administration Pages
import AdminDashboard from './components/admin/AdminDashboard.jsx';
import OrganizationSettingsPage from './components/admin/OrganizationSettingsPage.jsx';
import WorkspacesAdminPage from './components/admin/WorkspacesAdminPage.jsx';
import MembersAdminPage from './components/admin/MembersAdminPage.jsx';
import RolesPermissionsPage from './components/admin/RolesPermissionsPage.jsx';

// Phase 36 Institutional Portfolio Operating System Pages
import PortfolioListPage from './components/portfolio/PortfolioListPage.jsx';
import PortfolioDashboard from './components/portfolio/PortfolioDashboard.jsx';

// Phase 37 Investment Decision Workbench Pages
import DecisionListPage from './components/decision/DecisionListPage.jsx';
import DecisionWorkbenchPage from './components/decision/DecisionWorkbenchPage.jsx';

// Phase 39 Institutional Alerts & Attention Center Pages
import AttentionCenterPage from './components/Attention/AttentionCenterPage.jsx';

// Phase 40 Institutional Reporting & Deliverables Pages
import ReportLibraryPage from './components/Reporting/ReportLibraryPage.jsx';

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <WorkspaceProvider>
          <Routes>
            {/* Public Authentication Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Public / Legacy Direct Access Routes */}
            <Route
              path="/"
              element={
                <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
                  <TickerBar />
                  <Navbar />
                  <main className="flex-1 flex flex-col">
                    <LandingPage />
                  </main>
                </div>
              }
            />
            <Route
              path="/company/:ticker"
              element={
                <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
                  <TickerBar />
                  <Navbar />
                  <main className="flex-1 flex flex-col">
                    <DashboardPage />
                  </main>
                </div>
              }
            />
            <Route
              path="/compare"
              element={
                <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
                  <TickerBar />
                  <Navbar />
                  <main className="flex-1 flex flex-col">
                    <ComparePage />
                  </main>
                </div>
              }
            />
            <Route
              path="/watchlist"
              element={
                <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
                  <TickerBar />
                  <Navbar />
                  <main className="flex-1 flex flex-col">
                    <WatchlistPage />
                  </main>
                </div>
              }
            />
            <Route
              path="/workspace"
              element={
                <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
                  <TickerBar />
                  <Navbar />
                  <main className="flex-1 flex flex-col">
                    <WorkspaceDashboard />
                  </main>
                </div>
              }
            />

            {/* Authenticated Institutional SaaS Application Routes */}
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/app/overview" replace />} />
              <Route path="overview" element={<OverviewDashboard />} />
              <Route path="attention" element={<AttentionCenterPage />} />
              <Route path="alerts" element={<AttentionCenterPage />} />

              {/* Research Domain */}
              <Route path="research" element={<ResearchSynthesisDashboard />} />
              <Route path="research/company/:ticker" element={<DashboardPage />} />
              <Route path="research/evidence" element={<AttentionCenter />} />
              <Route path="research/signals" element={<SignalIntelligenceDashboard />} />
              <Route path="research/macro" element={<MacroDashboard />} />
              <Route path="research/graph" element={<KnowledgeGraphDashboard />} />

              {/* Portfolios Domain (Phase 36 Institutional Portfolio Operating System) */}
              <Route path="portfolios" element={<PortfolioListPage />} />
              <Route path="portfolios/:portfolioId" element={<PortfolioDashboard />} />
              <Route path="portfolios/:portfolioId/:tab" element={<PortfolioDashboard />} />
              <Route path="portfolios/risk" element={<ExposureRiskDashboard />} />
              <Route path="portfolios/optimization" element={<PortfolioConstructionPanel />} />

              {/* Decisions & Operations Domain (Phase 37 Investment Decision Workbench) */}
              <Route path="decisions" element={<DecisionListPage />} />
              <Route path="decisions/:decisionId" element={<DecisionWorkbenchPage />} />
              <Route path="decisions/queue" element={<DecisionReviewQueue />} />
              <Route path="decisions/drift" element={<WorkspaceDashboard />} />
              <Route path="decisions/process" element={<ProcessIntelligencePanel />} />

              {/* Governance & Security Domain */}
              <Route path="governance/compliance" element={<SecurityDashboardView />} />
              <Route path="governance/audit" element={<AuditLogView />} />
              <Route path="governance/members" element={<WorkspaceMembersView />} />
              <Route path="governance/keys" element={<ApiKeyManagementView />} />
              <Route path="governance/security" element={<SecurityDashboardView />} />

              {/* Administration & Multi-Tenancy (Phase 35) */}
              <Route path="admin" element={<AdminDashboard />} />
              <Route path="admin/organizations" element={<OrganizationSettingsPage />} />
              <Route path="admin/workspaces" element={<WorkspacesAdminPage />} />
              <Route path="admin/members" element={<MembersAdminPage />} />
              <Route path="admin/roles" element={<RolesPermissionsPage />} />

              {/* Copilot Assistant */}
              <Route path="copilot" element={<CopilotPanel />} />

              {/* Reporting & Deliverables (Phase 40) */}
              <Route path="reports" element={<ReportLibraryPage />} />
              <Route path="reports/:reportId" element={<ReportLibraryPage />} />
            </Route>

            {/* Fallback Catch-all */}
            <Route path="*" element={<Navigate to="/app/overview" replace />} />
          </Routes>
        </WorkspaceProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;