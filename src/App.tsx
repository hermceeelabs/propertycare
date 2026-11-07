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
import { TenantPortal } from './pages/portal/TenantPortal';
import { LandlordPortal } from './pages/portal/LandlordPortal';
import { LoginPage } from './pages/LoginPage';
import { AppContent } from './components/AppContent';
import { PermissionsProvider } from './context/PermissionsContext';

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

  // If session is checking
  if (authLoading) {
    return (
      <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center p-8 text-stone-400 gap-3">
        <div className="w-9 h-9 border-3 border-stone-700 border-t-emerald-400 rounded-full animate-spin" />
        <span className="text-xs font-semibold">Validating session...</span>
      </div>
    );
  }

  // Strict Authentication Gate: Zero dashboard or layout visibility until authenticated
  if (!authUser) {
    return (
      <CurrencyProvider>
        <LoginPage onSuccess={() => setShowAuthModal(false)} />
      </CurrencyProvider>
    );
  }

  return (
    <CurrencyProvider>
      <PermissionsProvider>
        <AppContent
          dbState={dbState}
          authUser={authUser}
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          selectedPropertyId={selectedPropertyId}
          setSelectedPropertyId={setSelectedPropertyId}
          selectedTenantId={selectedTenantId}
          setSelectedTenantId={setSelectedTenantId}
          setPreviewComm={setPreviewComm}
        />

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
      </PermissionsProvider>
    </CurrencyProvider>
  );
}
