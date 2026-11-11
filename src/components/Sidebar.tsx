import React from 'react';
import {
  LayoutDashboard, Building2, Users, FileText, CreditCard,
  Wrench, Truck, Receipt, Bell, Mail,
  Zap, BarChart3, Settings, ShieldAlert, Sparkles, Home, LogIn, LogOut, UserCheck, Eye, Landmark
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { usePermissions } from '../context/PermissionsContext';

export type NavTab =
  | 'dashboard'
  | 'properties'
  | 'landlords'
  | 'units'
  | 'tenants'
  | 'leases'
  | 'payments'
  | 'bills'
  | 'reports'
  | 'maintenance'
  | 'vendors'
  | 'notices'
  | 'communications'
  | 'automations'
  | 'logs'
  | 'settings'
  | 'portal-tenant'
  | 'portal-landlord'
  | 'portal-contractor';

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  pendingTasksCount: number;
  authUser?: any;
  onOpenAuthModal?: () => void;
  onOpenTenantPreview?: () => void;
  onOpenLandlordPreview?: () => void;
}

interface NavSection {
  title: string;
  items: {
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  pendingTasksCount,
  authUser,
  onOpenAuthModal,
  onOpenTenantPreview,
  onOpenLandlordPreview
}) => {
  const { can, isOwner } = usePermissions();

  const handleSignOut = async () => {
    localStorage.removeItem('propertyflow_active_tab');
    localStorage.removeItem('propertyflow_landlord_tab');
    await supabase.auth.signOut();
  };

  const navSections: NavSection[] = [
    {
      title: 'Core Portfolio',
      items: [
        { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
        ...(can('can_edit_properties') ? [
          { id: 'properties' as NavTab, label: 'Properties & Assets', icon: Building2 },
          { id: 'landlords' as NavTab, label: 'Landlord Clients', icon: Landmark }
        ] : []),
        { id: 'units', label: 'Suites & Units', icon: Home },
        { id: 'tenants', label: 'Tenants & Screening', icon: Users }
      ]
    },
    {
      title: 'Operations Hubs',
      items: [
        ...(can('can_view_financials') ? [
          { id: 'payments' as NavTab, label: 'Financial Operations Hub', icon: CreditCard },
          { id: 'reports' as NavTab, label: 'Reports & Audits', icon: FileText }
        ] : []),
        ...(can('can_dispatch_maintenance') ? [
          { id: 'maintenance' as NavTab, label: 'Work Orders & Field Hub', icon: Wrench }
        ] : []),
        ...(can('can_issue_notices') ? [
          { id: 'notices' as NavTab, label: 'Legal Notices & Comms Hub', icon: Bell }
        ] : []),
        ...(can('can_trigger_automations') ? [
          { id: 'automations' as NavTab, label: 'Automations & Audit Hub', icon: Zap }
        ] : [])
      ]
    },
    {
      title: 'System',
      items: [
        { id: 'settings', label: 'Preferences & Team Access', icon: Settings }
      ]
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0 border-r border-slate-800 shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold shadow-md shadow-brand-900/50">
            PF
          </div>
          <div>
            <h1 className="font-bold text-white tracking-wide text-base leading-tight">PropertyFlow</h1>
            <p className="text-xs text-slate-400 font-medium">Ops & Shortlet Platform</p>
          </div>
        </div>
      </div>

      {/* Grouped Classified Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-5">
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              {section.title}
            </span>

            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-xs font-bold'
                      : 'hover:bg-slate-800/70 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {item.badge && (
                      <span className="bg-purple-900/60 text-purple-300 border border-purple-700 text-[9px] font-bold px-1.5 py-0.2 rounded">
                        {item.badge}
                      </span>
                    )}
                    {item.id === 'notices' && pendingTasksCount > 0 && (
                      <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                        {pendingTasksCount}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User Profile / Authentication Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        {authUser ? (
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-slate-850/80 border border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0">
              {authUser.user_metadata?.avatar_url ? (
                <img
                  src={authUser.user_metadata.avatar_url}
                  alt={authUser.user_metadata.full_name || 'User'}
                  className="w-8 h-8 rounded-full border border-slate-700 object-cover shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-slate-950 text-xs font-black flex items-center justify-center shrink-0">
                  {(authUser.email?.[0] || 'U').toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <span className="block text-xs font-bold text-white truncate">
                  {authUser.user_metadata?.full_name || authUser.email?.split('@')[0]}
                </span>
                <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Verified Access
                </span>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md transition-all"
          >
            <LogIn className="w-4 h-4" /> Sign In to Access
          </button>
        )}
      </div>
    </aside>
  );
};
