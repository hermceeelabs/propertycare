import React, { useState } from 'react';
import { Users, Mail, Phone, MapPin, ChevronRight, FileText, CreditCard, Wrench } from 'lucide-react';
import { DatabaseState } from '../services/supabase';

interface TenantsProps {
  dbState: DatabaseState;
  onSelectTenant: (tenantId: string) => void;
}

export const TenantsPage: React.FC<TenantsProps> = ({ dbState, onSelectTenant }) => {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [search, setSearch] = useState('');

  const filteredTenants = dbState.tenants.filter(tenant => {
    const matchesStatus = statusFilter === 'All' || tenant.status === statusFilter;
    const name = `${tenant.first_name} ${tenant.last_name}`.toLowerCase();
    const matchesSearch = name.includes(search.toLowerCase()) || tenant.email.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tenants Directory</h1>
          <p className="text-sm text-slate-500">Centralized tenant profiles, leases, communications & ledger history</p>
        </div>

        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 shadow-xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        {['All', 'Active', 'Notice Given', 'Applicant', 'Former'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === status
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {status} ({status === 'All' ? dbState.tenants.length : dbState.tenants.filter(t => t.status === status).length})
          </button>
        ))}
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                <th className="p-4">Tenant</th>
                <th className="p-4">Property & Unit</th>
                <th className="p-4">Lease Term</th>
                <th className="p-4">Monthly Rent</th>
                <th className="p-4">Payment Status</th>
                <th className="p-4">Open Maintenance</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTenants.map(tenant => {
                const activeLease = dbState.leases.find(l => l.tenant_id === tenant.id && l.status !== 'Ended');
                const unit = activeLease ? dbState.units.find(u => u.id === activeLease.unit_id) : undefined;
                const property = unit ? dbState.properties.find(p => p.id === unit.property_id) : undefined;

                const latestPayment = dbState.payments.find(p => p.tenant_id === tenant.id);
                const openMaintCount = dbState.maintenance_requests.filter(m => m.tenant_id === tenant.id && m.status !== 'Completed').length;

                return (
                  <tr
                    key={tenant.id}
                    onClick={() => onSelectTenant(tenant.id)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="p-4">
                      <div className="font-extrabold text-slate-900">{tenant.first_name} {tenant.last_name}</div>
                      <div className="text-[11px] text-slate-400">{tenant.email} • {tenant.phone}</div>
                    </td>
                    <td className="p-4 text-slate-700 font-medium">
                      {property ? `${property.name} (Unit ${unit?.unit_number})` : <span className="text-slate-400 italic">No Active Unit</span>}
                    </td>
                    <td className="p-4 text-slate-600">
                      {activeLease ? `${activeLease.start_date} to ${activeLease.end_date}` : '—'}
                    </td>
                    <td className="p-4 font-bold text-slate-900">
                      {activeLease ? `$${activeLease.monthly_rent.toLocaleString()} CAD` : '—'}
                    </td>
                    <td className="p-4">
                      {latestPayment ? (
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          latestPayment.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                          latestPayment.status === 'Overdue' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {latestPayment.status}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">Current</span>
                      )}
                    </td>
                    <td className="p-4">
                      {openMaintCount > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                          {openMaintCount} Open Request{openMaintCount > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">0 Open</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button className="text-brand-600 font-bold hover:underline inline-flex items-center gap-1">
                        Profile <ChevronRight className="w-3.5 h-3.5" />
                      </button>
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
