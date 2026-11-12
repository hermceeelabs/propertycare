import React, { useState, useEffect } from 'react';
import { Wrench, Truck } from 'lucide-react';
import { DatabaseState } from '../services/supabase';
import { MaintenancePage } from './Maintenance';
import { VendorsPage } from './Vendors';

interface OperationsHubProps {
  dbState: DatabaseState;
  initialTab?: 'tickets' | 'vendors';
}

export const OperationsHub: React.FC<OperationsHubProps> = ({
  dbState,
  initialTab = 'tickets'
}) => {
  const [activeTab, setActiveTab] = useState<'tickets' | 'vendors'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Strict Single-Line Title & Subtitle at Top of Page */}
      <div className="flex items-baseline gap-2 sm:gap-3 overflow-hidden">
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight whitespace-nowrap shrink-0">
          {activeTab === 'tickets' ? 'Maintenance & Work Orders' : 'Contractor & Vendor Directory'}
        </h1>
        <span className="text-cream-400 font-light shrink-0">|</span>
        <p className="text-sm text-stone-600 truncate">
          {activeTab === 'tickets'
            ? 'Review resident repair tickets, inspect photographic evidence & dispatch trade contractors'
            : 'Approved trade contractors, service areas & maintenance dispatch records'}
        </p>
      </div>

      {/* Single Horizontal Separator */}
      <hr className="border-t border-slate-800/80" />

      {/* Hub Tab Switcher (Below Separator) */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-900/5 p-1 rounded-2xl w-fit border border-slate-200">
        <button
          onClick={() => setActiveTab('tickets')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'tickets'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Wrench className="w-4 h-4" /> Maintenance Tickets ({dbState.maintenance_requests.length})
        </button>
        <button
          onClick={() => setActiveTab('vendors')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'vendors'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Truck className="w-4 h-4" /> Registered Contractors ({dbState.vendors.length})
        </button>
      </div>

      {/* Tab View Render */}
      <div>
        {activeTab === 'tickets' && <MaintenancePage dbState={dbState} />}
        {activeTab === 'vendors' && <VendorsPage dbState={dbState} />}
      </div>
    </div>
  );
};
