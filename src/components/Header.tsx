import React, { useState } from 'react';
import { Search, Bell, Shield, ChevronRight, X, Building2, Users, FileText, Wrench, CreditCard } from 'lucide-react';
import { DatabaseState } from '../services/supabase';
import { NavTab } from './Sidebar';

interface HeaderProps {
  dbState: DatabaseState;
  onNavigate: (tab: NavTab) => void;
  pendingTasksCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  dbState,
  onNavigate,
  pendingTasksCount
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);

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

  const totalResults = filteredProperties.length + filteredTenants.length + filteredUnits.length + filteredMaintenance.length;

  return (
    <header className="bg-white border-b border-slate-200 h-16 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Search trigger */}
      <div className="relative w-72 md:w-96">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Global search (tenants, properties, units, requests)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            className="w-full pl-9 pr-4 py-2 bg-slate-100/80 hover:bg-slate-100 text-slate-800 rounded-lg text-sm border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
          />
        </div>

        {/* Global Search Dropdown Results */}
        {isSearchOpen && searchQuery.trim().length > 0 && (
          <div className="absolute top-12 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto p-2">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 mb-1">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Search Results ({totalResults})</span>
              <button onClick={() => setIsSearchOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {totalResults === 0 ? (
              <p className="p-4 text-center text-xs text-slate-500">No matching entities found for "{searchQuery}"</p>
            ) : (
              <div className="space-y-2">
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

                {filteredMaintenance.length > 0 && (
                  <div>
                    <div className="px-3 py-1 text-[11px] font-bold text-amber-700 uppercase bg-amber-50 rounded">Maintenance</div>
                    {filteredMaintenance.map(m => (
                      <button
                        key={m.id}
                        onClick={() => { onNavigate('maintenance'); setIsSearchOpen(false); }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded flex items-center justify-between text-xs text-slate-700"
                      >
                        <div className="flex items-center gap-2">
                          <Wrench className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-medium">{m.category}:</span>
                          <span className="text-slate-500 truncate max-w-xs">{m.description}</span>
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
      <div className="flex items-center gap-4">
        {/* Pending Task / Notice Alert */}
        <button
          onClick={() => setShowTasksModal(true)}
          className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
          title="Notifications & Tasks"
        >
          <Bell className="w-5 h-5" />
          {pendingTasksCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-amber-500 text-slate-950 font-extrabold text-[10px] rounded-full flex items-center justify-center animate-bounce">
              {pendingTasksCount}
            </span>
          )}
        </button>

        {/* Demo Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full border border-slate-200 text-xs text-slate-700">
          <Shield className="w-3.5 h-3.5 text-brand-600" />
          <span className="font-medium">Northstar Operations</span>
        </div>
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
                        {t.priority} • {t.task_type}
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
