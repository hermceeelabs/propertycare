import React from 'react';
import { usePermissions } from '../context/PermissionsContext';
import { supabase } from '../services/supabase';
import { Sidebar, NavTab } from './Sidebar';
import { Header } from './Header';
import { Dashboard } from '../pages/Dashboard';
import { PropertiesPage } from '../pages/Properties';
import { PropertyDetailPage } from '../pages/PropertyDetail';
import { LandlordsPage } from '../pages/Landlords';
import { UnitsPage } from '../pages/Units';
import { TenantsPage } from '../pages/Tenants';
import { TenantDetailPage } from '../pages/TenantDetail';
import { LeasesPage } from '../pages/Leases';
import { PaymentsPage } from '../pages/Payments';
import { MaintenancePage } from '../pages/Maintenance';
import { VendorsPage } from '../pages/Vendors';
import { BillsPage } from '../pages/Bills';
import { NoticesPage } from '../pages/Notices';
import { CommunicationsPage } from '../pages/Communications';
import { AutomationsPage } from '../pages/Automations';
import { AutomationLogsPage } from '../pages/AutomationLogs';
import { FinancialsHub } from '../pages/FinancialsHub';
import { OperationsHub } from '../pages/OperationsHub';
import { LegalCommsHub } from '../pages/LegalCommsHub';
import { AutomationsHub } from '../pages/AutomationsHub';
import { ReportsPage } from '../pages/Reports';
import { SettingsPage } from '../pages/Settings';
import { TenantPortal } from '../pages/portal/TenantPortal';
import { LandlordPortal } from '../pages/portal/LandlordPortal';
import { ContractorPortal } from '../pages/portal/ContractorPortal';
import { DatabaseState } from '../services/supabase';
import { Communication } from '../types/database';
import { ShieldAlert, LogOut, Lock } from 'lucide-react';

interface AppContentProps {
  dbState: DatabaseState;
  authUser: any;
  currentTab: NavTab;
  setCurrentTab: (tab: NavTab) => void;
  selectedPropertyId: string | null;
  setSelectedPropertyId: (id: string | null) => void;
  selectedTenantId: string | null;
  setSelectedTenantId: (id: string | null) => void;
  setPreviewComm: (comm: Communication | null) => void;
}

export const AppContent: React.FC<AppContentProps> = ({
  dbState,
  authUser,
  currentTab,
  setCurrentTab,
  selectedPropertyId,
  setSelectedPropertyId,
  selectedTenantId,
  setSelectedTenantId,
  setPreviewComm
}) => {
  const { authResult, profile, isOwner, isVerifying, switchStakeholderRole } = usePermissions();
  const mainScrollRef = React.useRef<HTMLElement>(null);

  const handleNavigate = (tab: NavTab) => {
    setCurrentTab(tab);
    if (tab !== 'properties') setSelectedPropertyId(null);
    if (tab !== 'tenants') setSelectedTenantId(null);
    // Scroll to top of page when changing tabs
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Scroll to top whenever tab or selected property/tenant changes
  React.useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentTab, selectedPropertyId, selectedTenantId]);

  const pendingTasksCount = dbState.tasks.filter(t => t.status === 'Pending').length;

  // 0. VERIFYING SPINNER (Clean, branded loading state without technical directory text)
  if (isVerifying || !authResult) {
    return (
      <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center p-8 text-stone-300 gap-4">
        <div className="w-10 h-10 border-3 border-stone-700 border-t-brand-500 rounded-full animate-spin" />
        <div className="text-center space-y-1">
          <p className="text-sm font-bold text-white tracking-wide">Loading PropertyFlow...</p>
          <p className="text-xs text-stone-500">Preparing your personalized dashboard workspace</p>
        </div>
      </div>
    );
  }

  // 1. REJECTION SCREEN IF USER IS NOT REGISTERED IN ANY DIRECTORY OR IS SUSPENDED
  if (authResult && !authResult.authorized) {
    return (
      <div className="min-h-screen bg-stone-900 flex flex-col justify-center items-center p-6 text-center">
        <div className="max-w-md w-full bg-stone-950 border border-stone-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center border border-rose-500/20">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Access Denied</h2>
            <p className="text-xs text-stone-400 leading-relaxed">
              {authResult.rejectionReason}
            </p>
          </div>

          <div className="p-3.5 bg-stone-900 rounded-2xl border border-stone-800 text-left text-xs space-y-1">
            <span className="text-[10px] text-stone-500 block uppercase font-bold">Authenticated Identity</span>
            <span className="font-bold text-stone-200 block truncate">{authUser.email}</span>
            <span className="text-[11px] text-rose-400">Account Status: {authResult.status || 'Unregistered'}</span>
          </div>

          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full py-3 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Sign Out & Switch Account
          </button>
        </div>
      </div>
    );
  }

  // 2. AUTOMATIC ROUTING FOR TENANTS (Direct to Tenant Portal)
  if (authResult?.stakeholderType === 'tenant') {
    return (
      <TenantPortal
        dbState={dbState}
        tenantId={authResult.profileData?.id}
      />
    );
  }

  // 3. AUTOMATIC ROUTING FOR LANDLORDS (Direct to Landlord Portal)
  if (authResult?.stakeholderType === 'landlord') {
    return (
      <LandlordPortal
        dbState={dbState}
        landlordId={authResult.profileData?.id}
      />
    );
  }

  // 4. AUTOMATIC ROUTING FOR CONTRACTORS / TRADES (Direct to Contractor Portal)
  if (authResult?.stakeholderType === 'contractor') {
    return (
      <ContractorPortal
        dbState={dbState}
        vendorId={authResult.profileData?.id}
      />
    );
  }

  // 4. MAIN OPERATIONAL WORKSPACE (For Staff & Owner Accounts)
  return (
    <div className="flex h-screen bg-cream-100 text-stone-900 font-sans antialiased overflow-hidden">
      {/* Persistent Desktop Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={handleNavigate}
        pendingTasksCount={pendingTasksCount}
        authUser={authUser}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          dbState={dbState}
          onNavigate={handleNavigate}
          pendingTasksCount={pendingTasksCount}
          authUser={authUser}
        />

        <main ref={mainScrollRef} className="flex-1 overflow-y-auto bg-cream-100">
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
                onSelectProperty={setSelectedPropertyId}
              />
            )
          )}

          {currentTab === 'landlords' && (
            <LandlordsPage
              dbState={dbState}
              onSelectProperty={(pId) => {
                setSelectedPropertyId(pId);
                setCurrentTab('properties');
              }}
            />
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
                onPreviewEmail={(id) => {
                  const comm = dbState.communications.find(c => c.id === id);
                  if (comm) setPreviewComm(comm);
                }}
              />
            ) : (
              <TenantsPage
                dbState={dbState}
                onSelectTenant={setSelectedTenantId}
              />
            )
          )}

          {currentTab === 'leases' && (
            <LeasesPage dbState={dbState} />
          )}

          {currentTab === 'payments' && (
            <FinancialsHub dbState={dbState} initialTab="payments" />
          )}

          {currentTab === 'bills' && (
            <FinancialsHub dbState={dbState} initialTab="bills" />
          )}

          {currentTab === 'reports' && (
            <ReportsPage dbState={dbState} />
          )}

          {currentTab === 'maintenance' && (
            <OperationsHub dbState={dbState} initialTab="tickets" />
          )}

          {currentTab === 'vendors' && (
            <OperationsHub dbState={dbState} initialTab="vendors" />
          )}

          {currentTab === 'notices' && (
            <LegalCommsHub
              dbState={dbState}
              initialTab="notices"
              onPreviewEmail={(id) => {
                const comm = dbState.communications.find(c => c.id === id);
                if (comm) setPreviewComm(comm);
              }}
            />
          )}

          {currentTab === 'communications' && (
            <LegalCommsHub
              dbState={dbState}
              initialTab="communications"
              onPreviewEmail={(id) => {
                const comm = dbState.communications.find(c => c.id === id);
                if (comm) setPreviewComm(comm);
              }}
            />
          )}

          {currentTab === 'automations' && (
            <AutomationsHub dbState={dbState} initialTab="rules" />
          )}

          {currentTab === 'logs' && (
            <AutomationsHub dbState={dbState} initialTab="logs" />
          )}

          {currentTab === 'settings' && (
            <SettingsPage dbState={dbState} />
          )}

          {currentTab === 'portal-tenant' && (
            <TenantPortal
              dbState={dbState}
              onClosePreview={() => setCurrentTab('dashboard')}
            />
          )}

          {currentTab === 'portal-landlord' && (
            <LandlordPortal
              dbState={dbState}
              onClosePreview={() => setCurrentTab('dashboard')}
            />
          )}

          {currentTab === 'portal-contractor' && (
            <ContractorPortal
              dbState={dbState}
              onClosePreview={() => setCurrentTab('dashboard')}
            />
          )}
        </main>
      </div>
    </div>
  );
};
