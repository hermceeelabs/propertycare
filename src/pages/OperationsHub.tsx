import React, { useState, useEffect } from 'react';
import { Wrench, Truck, ClipboardCheck } from 'lucide-react';
import { DatabaseState } from '../services/supabase';
import { MaintenancePage } from './Maintenance';
import { VendorsPage } from './Vendors';
import { InspectionsPage } from './Inspections';

interface OperationsHubProps {
  dbState: DatabaseState;
  initialTab?: 'tickets' | 'inspections' | 'vendors';
}

export const OperationsHub: React.FC<OperationsHubProps> = ({
  dbState,
  initialTab = 'tickets'
}) => {
  const [activeTab, setActiveTab] = useState<'tickets' | 'inspections' | 'vendors'>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="space-y-4">
      {/* Hub Tab Switcher Header */}
      <div className="px-8 pt-6 pb-0 max-w-7xl mx-auto space-y-4">
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
            onClick={() => setActiveTab('inspections')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'inspections'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" /> Inspection Timetable & Audits ({(dbState.inspections || []).length})
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

        {/* Decorative Divider */}
        <hr className="border-t border-slate-800/80" />
      </div>

      {/* Tab View Render */}
      <div>
        {activeTab === 'tickets' && <MaintenancePage dbState={dbState} />}
        {activeTab === 'inspections' && <InspectionsPage dbState={dbState} />}
        {activeTab === 'vendors' && <VendorsPage dbState={dbState} />}
      </div>
    </div>
  );
};
