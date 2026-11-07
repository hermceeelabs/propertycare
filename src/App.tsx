import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { EmailPreviewModal } from './components/EmailPreviewModal';
import { AuthModal } from './components/AuthModal';
import { CurrencyProvider } from './context/CurrencyContext';

import { store, DatabaseState, supabase } from './services/supabase';
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
  const [authUser, setAuthUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUser(session?.user || null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user || null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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
          authUser={authUser}
          onOpenAuthModal={() => setShowAuthModal(true)}
        />

        {/* Main Workspace Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header
            dbState={dbState}
            onNavigate={handleNavigate}
            pendingTasksCount={pendingTasksCount}
            authUser={authUser}
            onOpenAuthModal={() => setShowAuthModal(true)}
          />

          <main className="flex-1 overflow-y-auto bg-cream-100">
            {authLoading ? (
              <div className="h-full flex items-center justify-center p-8">
                <div className="flex flex-col items-center gap-3 text-stone-500">
                  <div className="w-8 h-8 border-3 border-stone-300 border-t-brand-600 rounded-full animate-spin" />
                  <span className="text-xs font-semibold">Validating session...</span>
                </div>
              </div>
            ) : !authUser ? (
              <div className="h-full flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-cream-50 border border-cream-300 rounded-3xl p-8 shadow-xl text-center space-y-6">
                  <div className="w-14 h-14 rounded-2xl bg-stone-900 text-white mx-auto flex items-center justify-center shadow-md">
                    <span className="text-xl font-black text-emerald-400">PF</span>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">Authentication Required</h2>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      You must be signed in with an authorized corporate account to view active portfolio data, tenancy records, financial ledgers, or run automations.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="w-full py-3.5 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    Sign In with Google
                  </button>
                  <p className="text-[10px] text-stone-400">
                    Protected by Supabase Auth with Google OAuth & Row-Level Security
                  </p>
                </div>
              </div>
            ) : (
              <>
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
                        </>
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
