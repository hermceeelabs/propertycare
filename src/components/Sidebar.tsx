import React from 'react';
import {
  LayoutDashboard, Building2, Users, FileText, CreditCard,
  Wrench, Truck, Receipt, Bell, Mail,
  Zap, BarChart3, Settings, ShieldAlert, Sparkles, Home
} from 'lucide-react';
import { useCurrency, CURRENCIES, CurrencyCode } from '../context/CurrencyContext';

export type NavTab =
  | 'dashboard'
  | 'properties'
  | 'units'
  | 'tenants'
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
  pendingTasksCount
}) => {
  const { currentCurrency, setCurrency } = useCurrency();

  const navSections: NavSection[] = [
    {
      title: 'Core Portfolio',
      items: [
        { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
        { id: 'properties', label: 'Properties & Assets', icon: Building2 },
        { id: 'units', label: 'Suites & Shortlets', icon: Home, badge: 'STR' },
        { id: 'tenants', label: 'Tenants & Screening', icon: Users }
      ]
    },
    {
      title: 'Financials & Operations',
      items: [
        { id: 'payments', label: 'Rent & Collections', icon: CreditCard },
        { id: 'bills', label: 'Expenses & Invoices', icon: Receipt },
        { id: 'leases', label: 'Lease Agreements', icon: FileText },
        { id: 'maintenance', label: 'Maintenance & Repairs', icon: Wrench },
        { id: 'vendors', label: 'Trade Contractors', icon: Truck }
      ]
    },
    {
      title: 'Automation & Compliance',
      items: [
        { id: 'notices', label: 'Ontario Notices (N1/N4)', icon: Bell },
        { id: 'communications', label: 'Tenant Communications', icon: Mail },
        { id: 'automations', label: 'Automations Center', icon: Zap },
        { id: 'reports', label: 'Yield & Break-Even Reports', icon: BarChart3 },
        { id: 'logs', label: 'Audit Trail', icon: ShieldAlert }
      ]
    },
    {
      title: 'System',
      items: [
        { id: 'settings', label: 'Preferences & Sync', icon: Settings }
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

      {/* Currency Selector Pill */}
      <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-xs">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Currency</span>
        <select
          value={currentCurrency}
          onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
          className="bg-slate-900 text-white font-bold text-xs px-2.5 py-1 rounded-md border border-slate-700 focus:outline-hidden focus:ring-1 focus:ring-brand-500 cursor-pointer"
        >
          {Object.values(CURRENCIES).map(curr => (
            <option key={curr.code} value={curr.code}>
              {curr.code} ({curr.symbol.trim()})
            </option>
          ))}
        </select>
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

      {/* Footer Demo Indicator */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between bg-slate-950/40">
        <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Live Demo Mode
        </span>
        <span className="text-[10px] text-slate-400">v2.1</span>
      </div>
    </aside>
  );
};
