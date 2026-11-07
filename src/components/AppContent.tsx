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
import { ReportsPage } from '../pages/Reports';
import { SettingsPage } from '../pages/Settings';
import { TenantPortal } from '../pages/portal/TenantPortal';
import { LandlordPortal } from '../pages/portal/LandlordPortal';
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
  const { authResult, profile, isOwner } = usePermissions();

  const handleNavigate = (tab: NavTab) => {
    setCurrentTab(tab);
    if (tab !== 'properties') setSelectedPropertyId(null);
    if (tab !== 'tenants') setSelectedTenantId(null);
  };

  const pendingTasksCount = dbState.tasks.filter(t => t.status === 'Pending').length;

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
            <PaymentsPage dbState={dbState} />
          )}

          {currentTab === 'maintenance' && (
            <MaintenancePage dbState={dbState} />
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
        </main>
      </div>
    </div>
  );
};
