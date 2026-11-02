import React from 'react';
import {
  LayoutDashboard, Building2, Users, FileText, CreditCard,
  Wrench, ShieldCheck, Truck, Receipt, Bell, Mail,
  Zap, BarChart3, Settings, ShieldAlert
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'properties'
  | 'units'
  | 'tenants'
  | 'screening'
  | 'leases'
  | 'payments'
  | 'maintenance'
  | 'vendors'
  | 'bills'
  | 'notices'
  | 'communications'
  | 'automations'
  | 'logs'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  pendingTasksCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  pendingTasksCount
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'properties', label: 'Properties', icon: Building2 },
    { id: 'units', label: 'Units', icon: Building2 },
    { id: 'tenants', label: 'Tenants', icon: Users },
    { id: 'screening', label: 'Tenant Screening', icon: ShieldCheck, badge: 'Workflow' },
    { id: 'leases', label: 'Leases', icon: FileText },
    { id: 'payments', label: 'Rent & Payments', icon: CreditCard },
    { id: 'maintenance', label: 'Maintenance', icon: Wrench },
    { id: 'vendors', label: 'Vendors', icon: Truck },
    { id: 'bills', label: 'Bills', icon: Receipt },
    { id: 'notices', label: 'Notices (N1/N4)', icon: Bell },
    { id: 'communications', label: 'Communications', icon: Mail },
    { id: 'automations', label: 'Automations', icon: Zap },
    { id: 'logs', label: 'Audit Logs', icon: ShieldAlert },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0 border-r border-slate-800 shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold shadow-md shadow-brand-900/50">
          PF
        </div>
        <div>
          <h1 className="font-bold text-white tracking-wide text-base leading-tight">PropertyFlow</h1>
          <p className="text-xs text-slate-400 font-medium">Northstar Management</p>
        </div>
      </div>

      {/* Demo Tag */}
      <div className="px-5 py-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          DEMO MODE
        </span>
        <span className="text-slate-400 text-[11px]">CAD ($)</span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id as NavTab)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm font-semibold'
                  : 'hover:bg-slate-800/70 text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>

              {item.id === 'notices' && pendingTasksCount > 0 && (
                <span className="bg-amber-500 text-slate-950 text-xs font-bold px-2 py-0.5 rounded-full">
                  {pendingTasksCount}
                </span>
              )}

              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                  isActive ? 'bg-brand-700 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-brand-400 border border-slate-700">
          PM
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">Property Manager</p>
          <p className="text-[11px] text-slate-400 truncate">manager@northstarpm.ca</p>
        </div>
      </div>
    </aside>
  );
};
