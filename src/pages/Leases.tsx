import React, { useState } from 'react';
import { FileText, Calendar, CheckCircle2, ChevronRight } from 'lucide-react';
import { DatabaseState } from '../services/supabase';
import { useCurrency } from '../context/CurrencyContext';

interface LeasesProps {
  dbState: DatabaseState;
}

export const LeasesPage: React.FC<LeasesProps> = ({ dbState }) => {
  const [activeTab, setActiveTab] = useState<string>('All');
  const { formatMoney } = useCurrency();

  const filteredLeases = dbState.leases.filter(lease => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Expiring Soon') return lease.status === 'Expiring Soon';
    if (activeTab === 'Renewal Pending') return lease.renewal_status === 'Pending Review' || lease.renewal_status === 'Renewal Offered';
    if (activeTab === 'Ended') return lease.status === 'Ended';
    return true;
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header: Line 1 Title and Subtitle with visual divider */}
      <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-3">
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Lease Management & Renewals</h1>
        <span className="hidden sm:inline text-cream-400 font-light">|</span>
        <p className="text-sm text-stone-600">Track 90/60/30-day expiration triggers, renewal notices & tasks</p>
      </div>

      {/* Visual Horizontal Separator */}
      <hr className="border-t border-slate-800/80" />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-cream-200 pb-3">
        {['All', 'Expiring Soon', 'Renewal Pending', 'Ended'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {tab} ({tab === 'All' ? dbState.leases.length : dbState.leases.filter(l => tab === 'Expiring Soon' ? l.status === 'Expiring Soon' : l.status === tab).length})
          </button>
        ))}
      </div>

      {/* Leases Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                <th className="p-4">Tenant</th>
                <th className="p-4">Property & Unit</th>
                <th className="p-4">Start Date</th>
                <th className="p-4">Expiration Date</th>
                <th className="p-4">Monthly Rent</th>
                <th className="p-4">Renewal Status</th>
                <th className="p-4 text-right">Lease Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeases.map(lease => {
                const tenant = dbState.tenants.find(t => t.id === lease.tenant_id);
                const unit = dbState.units.find(u => u.id === lease.unit_id);
                const property = unit ? dbState.properties.find(p => p.id === unit.property_id) : undefined;

                return (
                  <tr key={lease.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{tenant?.first_name} {tenant?.last_name}</td>
                    <td className="p-4 text-slate-700 font-medium">{property?.name} (Unit {unit?.unit_number})</td>
                    <td className="p-4 text-slate-600">{lease.start_date}</td>
                    <td className="p-4 font-bold text-slate-900">{lease.end_date}</td>
                    <td className="p-4 font-bold text-slate-900">{formatMoney(lease.monthly_rent)}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                        {lease.renewal_status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        lease.status === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                        lease.status === 'Expiring Soon' ? 'bg-amber-100 text-amber-800 animate-pulse' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {lease.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
