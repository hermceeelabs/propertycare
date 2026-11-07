import React, { useState, useEffect } from 'react';
import { Search, Bell, ChevronRight, X, Building2, Users, FileText, Wrench, CreditCard, DollarSign, LogIn, LogOut, UserCheck } from 'lucide-react';
import { DatabaseState, supabase } from '../services/supabase';
import { NavTab } from './Sidebar';
import { useCurrency, CURRENCIES, CurrencyCode } from '../context/CurrencyContext';

interface HeaderProps {
  dbState: DatabaseState;
  onNavigate: (tab: NavTab) => void;
  pendingTasksCount: number;
  authUser?: any;
  onOpenAuthModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  dbState,
  onNavigate,
  pendingTasksCount,
  authUser,
  onOpenAuthModal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const { currentCurrency, setCurrency, currencyConfig } = useCurrency();

  // Search indexing
  const filteredProperties = searchQuery.trim()
    ? dbState.properties.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.city.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const filteredTenants = searchQuery.trim()
    ? dbState.tenants.filter(t => `${t.first_name} ${t.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) || t.email.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const filteredUnits = searchQuery.trim()
    ? dbState.units.filter(u => u.unit_number.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const filteredMaintenance = searchQuery.trim()
    ? dbState.maintenance_requests.filter(m => m.category.toLowerCase().includes(searchQuery.toLowerCase()) || m.description.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  return (
    <header className="bg-cream-50/90 border-b border-cream-200 h-16 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs backdrop-blur-xs">
      {/* Search trigger */}
      <div className="relative w-72 md:w-96">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Global search (tenants, properties, units, requests)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            className="w-full pl-9 pr-4 py-2 bg-white/90 hover:bg-white text-stone-800 rounded-xl text-xs border border-cream-300 focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all shadow-xs"
          />
        </div>

        {/* Global Search Dropdown Results */}
        {isSearchOpen && searchQuery.trim().length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 max-h-96 overflow-y-auto">
            {filteredProperties.length === 0 && filteredTenants.length === 0 && filteredUnits.length === 0 && filteredMaintenance.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No matching records found.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProperties.length > 0 && (
                  <div>
                    <div className="px-3 py-1 text-[11px] font-bold text-brand-700 uppercase bg-brand-50 rounded">Properties</div>
                    {filteredProperties.map(p => (
                      <button
                        key={p.id}
                        onClick={() => { onNavigate('properties'); setIsSearchOpen(false); }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded flex items-center justify-between text-xs text-slate-700"
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-medium">{p.name}</span>
                          <span className="text-slate-400">({p.city})</span>
                        </div>
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                      </button>
                    ))}
                  </div>
                )}

                {filteredTenants.length > 0 && (
                  <div>
                    <div className="px-3 py-1 text-[11px] font-bold text-emerald-700 uppercase bg-emerald-50 rounded">Tenants</div>
                    {filteredTenants.map(t => (
                      <button
                        key={t.id}
                        onClick={() => { onNavigate('tenants'); setIsSearchOpen(false); }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded flex items-center justify-between text-xs text-slate-700"
                      >
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-medium">{t.first_name} {t.last_name}</span>
                          <span className="text-slate-400">({t.email})</span>
                        </div>
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Action Icons & Badges */}
      <div className="flex items-center gap-3">
        {/* Multi-Currency Dropdown in Header */}
        <div className="flex items-center gap-1.5 bg-cream-100 hover:bg-cream-200/90 px-3 py-1.5 rounded-xl border border-cream-300 transition-colors shadow-xs">
          <span className="text-xs font-bold text-stone-600 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-600"></span>
            {currencyConfig.code}
          </span>
          <select
            value={currentCurrency}
            onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
            className="bg-transparent text-xs font-bold text-stone-800 cursor-pointer focus:outline-hidden"
            title="Switch Operational Currency"
          >
            {Object.values(CURRENCIES).map(c => (
              <option key={c.code} value={c.code}>
                {c.code} ({c.symbol.trim()})
              </option>
            ))}
          </select>
        </div>

        {/* Pending Task / Notice Alert */}
        <button
          onClick={() => setShowTasksModal(true)}
          className="relative p-2 text-stone-600 hover:text-stone-900 hover:bg-cream-200/60 rounded-xl transition-all"
          title="Notifications & Tasks"
        >
          <Bell className="w-5 h-5" />
          {pendingTasksCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-amber-500 text-stone-950 font-extrabold text-[10px] rounded-full flex items-center justify-center animate-bounce shadow-xs">
              {pendingTasksCount}
            </span>
          )}
        </button>

        {/* Authentication State (Only visible when authenticated) */}
        {authUser && (
          <div className="flex items-center gap-2 pl-2 border-l border-cream-300">
            {authUser.user_metadata?.avatar_url ? (
              <img
                src={authUser.user_metadata.avatar_url}
                alt={authUser.user_metadata.full_name || 'User'}
                className="w-7 h-7 rounded-full border border-cream-400"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-stone-900 text-white text-[11px] font-bold flex items-center justify-center">
                {(authUser.email?.[0] || 'U').toUpperCase()}
              </div>
            )}
            <div className="hidden sm:block text-left text-[11px] leading-tight">
              <span className="block font-bold text-stone-900 truncate max-w-[110px]">
                {authUser.user_metadata?.full_name || authUser.email?.split('@')[0]}
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Signed In
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 text-stone-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Pending Tasks Drawer Modal */}
      {showTasksModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-slate-900 text-sm">Manager Action Required ({dbState.tasks.filter(t => t.status === 'Pending').length})</h3>
              </div>
              <button onClick={() => setShowTasksModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {dbState.tasks.filter(t => t.status === 'Pending').length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No urgent tasks pending approval.
                </div>
              ) : (
                dbState.tasks.filter(t => t.status === 'Pending').map(t => (
                  <div key={t.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        t.priority === 'Urgent' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {t.priority} • {t.category}
                      </span>
                      <span className="text-[11px] text-slate-400">{t.due_date}</span>
                    </div>
                    <h4 className="font-semibold text-xs text-slate-900">{t.title}</h4>
                    <p className="text-xs text-slate-600">{t.description}</p>
                    <div className="pt-2 flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          onNavigate('notices');
                          setShowTasksModal(false);
                        }}
                        className="text-xs text-brand-600 font-semibold hover:underline flex items-center gap-1"
                      >
                        Open Workflow <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
