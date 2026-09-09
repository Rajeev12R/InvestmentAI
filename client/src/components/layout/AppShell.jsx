/**
 * @file AppShell.jsx
 * Master Institutional SaaS Application Shell Layout.
 */

import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';
import Breadcrumbs from './Breadcrumbs.jsx';
import GlobalSearchModal from './GlobalSearchModal.jsx';
import Drawer from '../ui/Drawer.jsx';
import ErrorBoundary from '../ui/ErrorBoundary.jsx';
import AttentionCenter from '../Attention/AttentionCenter.jsx';

export const AppShell = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Global Keyboard Shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
      <div className="flex-1 flex w-full h-screen overflow-hidden">
        {/* Institutional Domain Sidebar */}
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Bar Navigation */}
          <TopBar
            onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
          />

          {/* Scrollable Worksurface */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-4">
              <Breadcrumbs />
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </div>
          </main>
        </div>
      </div>

      {/* Global Command Palette Modal (`Cmd+K`) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Slide-over Notifications & Attention Center Drawer */}
      <Drawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        title="Attention & Ingestion Intelligence"
        subtitle="Live feed of material changes, risk alerts, and pipeline events"
        width="max-w-2xl"
      >
        <AttentionCenter />
      </Drawer>
    </div>
  );
};

export default AppShell;
