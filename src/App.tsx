import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { EmailPreviewModal } from './components/EmailPreviewModal';
import { AuthModal } from './components/AuthModal';
import { CurrencyProvider } from './context/CurrencyContext';

import { store, DatabaseState } from './services/supabase';
import { Communication } from './types/database';

import { Dashboard } from './pages/Dashboard';
import { PropertiesPage } from './pages/Properties';
import { PropertyDetailPage } from './pages/PropertyDetail';
import { UnitsPage } from './pages/Units';
import { TenantsPage } from './pages/Tenants';
import { TenantDetailPage } from './pages/TenantDetail';
import { LeasesPage } from './pages/Leases';
import { PaymentsPage } from './pages/Payments';
import { MaintenancePage } from './pages/Maintenance';
import { VendorsPage } from './pages/Vendors';
import { BillsPage } from './pages/Bills';
import { NoticesPage } from './pages/Notices';
import { CommunicationsPage } from './pages/Communications';
import { AutomationsPage } from './pages/Automations';
import { AutomationLogsPage } from './pages/AutomationLogs';
import { ReportsPage } from './pages/Reports';
import { SettingsPage } from './pages/Settings';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  const [previewComm, setPreviewComm] = useState<Communication | null>(null);
  const [dbState, setDbState] = useState<DatabaseState>(store.getState());
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setDbState({ ...store.getState() });
    });
    return () => unsubscribe();
  }, []);

  const pendingTasksCount = dbState.tasks.filter(t => t.status === 'Pending').length;

  const handleNavigate = (tab: NavTab) => {
    setCurrentTab(tab);
    if (tab !== 'properties') setSelectedPropertyId(null);
    if (tab !== 'tenants') setSelectedTenantId(null);
  };

  const handleSelectProperty = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
  };

  const handleSelectTenant = (tenantId: string) => {
    setSelectedTenantId(tenantId);
  };

  const handlePreviewEmailById = (commId: string) => {
    const comm = dbState.communications.find(c => c.id === commId);
    if (comm) setPreviewComm(comm);
  };

  return (
    <CurrencyProvider>
      <div className="flex h-screen bg-cream-100 text-stone-900 font-sans antialiased overflow-hidden">
        {/* Persistent Desktop Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onTabChange={handleNavigate}
          pendingTasksCount={pendingTasksCount}
        />

        {/* Main Workspace Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header
            dbState={dbState}
            onNavigate={handleNavigate}
            pendingTasksCount={pendingTasksCount}
            onOpenAuthModal={() => setShowAuthModal(true)}
          />

          <main className="flex-1 overflow-y-auto bg-cream-100">
            {currentTab === 'dashboard' && (
              <Dashboard
                dbState={dbState}
                onNavigate={handleNavigate}
              />
            )}

            {currentTab === 'properties' && (
              selectedPropertyId ? (
                <PropertyDetailPage
                  propertyId={selectedPropertyId}
                  dbState={dbState}
                  onBack={() => setSelectedPropertyId(null)}
                />
              ) : (
                <PropertiesPage
                  dbState={dbState}
                  onSelectProperty={handleSelectProperty}
                />
              )
            )}

            {currentTab === 'units' && (
              <UnitsPage dbState={dbState} />
            )}

            {currentTab === 'tenants' && (
              selectedTenantId ? (
                <TenantDetailPage
                  tenantId={selectedTenantId}
                  dbState={dbState}
                  onBack={() => setSelectedTenantId(null)}
                  onPreviewEmail={handlePreviewEmailById}
                />
              ) : (
                <TenantsPage
                  dbState={dbState}
                  onSelectTenant={handleSelectTenant}
                />
              )
            )}

            {currentTab === 'leases' && (
              <LeasesPage
                dbState={dbState}
                onNavigateToCommunications={() => handleNavigate('communications')}
                onNavigateToLogs={() => handleNavigate('logs')}
              />
            )}

            {currentTab === 'payments' && (
              <PaymentsPage
                dbState={dbState}
                onNavigateToCommunications={() => handleNavigate('communications')}
                onNavigateToLogs={() => handleNavigate('logs')}
              />
            )}

            {currentTab === 'maintenance' && (
              <MaintenancePage
                dbState={dbState}
                onNavigateToCommunications={() => handleNavigate('communications')}
                onNavigateToLogs={() => handleNavigate('logs')}
              />
            )}

            {currentTab === 'vendors' && (
              <VendorsPage dbState={dbState} />
            )}

            {currentTab === 'bills' && (
              <BillsPage
                dbState={dbState}
                onNavigateToLogs={() => handleNavigate('logs')}
              />
            )}

            {currentTab === 'notices' && (
              <NoticesPage
                dbState={dbState}
                onNavigateToLogs={() => handleNavigate('logs')}
                onNavigateToCommunications={() => handleNavigate('communications')}
              />
            )}

            {currentTab === 'communications' && (
              <CommunicationsPage
                dbState={dbState}
                onPreviewEmail={setPreviewComm}
              />
            )}

            {currentTab === 'automations' && (
              <AutomationsPage
                dbState={dbState}
                onNavigateToLogs={() => handleNavigate('logs')}
              />
            )}

            {currentTab === 'logs' && (
              <AutomationLogsPage dbState={dbState} />
            )}

            {currentTab === 'reports' && (
              <ReportsPage dbState={dbState} />
            )}

            {currentTab === 'settings' && (
              <SettingsPage dbState={dbState} />
            )}
          </main>
        </div>

        {/* Global Rendered HTML Email Preview Modal */}
        {previewComm && (
          <EmailPreviewModal
            communication={previewComm}
            onClose={() => setPreviewComm(null)}
          />
        )}

        {/* Supabase Google Authentication Modal */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </div>
    </CurrencyProvider>
  );
}
