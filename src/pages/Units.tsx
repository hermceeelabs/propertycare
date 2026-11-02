import React, { useState } from 'react';
import { Building2, Home, Search, Filter } from 'lucide-react';
import { DatabaseState } from '../services/supabase';
import { UnitStatus } from '../types/database';

interface UnitsProps {
  dbState: DatabaseState;
}

export const UnitsPage: React.FC<UnitsProps> = ({ dbState }) => {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [search, setSearch] = useState('');

  const statuses = ['All', 'Occupied', 'Vacant', 'Notice Given', 'Maintenance', 'Reserved'];

  const filteredUnits = dbState.units.filter(unit => {
    const matchesStatus = statusFilter === 'All' || unit.status === statusFilter;
    const matchesSearch = unit.unit_number.toLowerCase().includes(search.toLowerCase()) ||
                          unit.unit_type.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Units Inventory</h1>
          <p className="text-sm text-slate-500">Manage residential suite inventory, floor plans, rents, and occupancy statuses</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Filter unit number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 shadow-xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        {statuses.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === s
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {s} ({s === 'All' ? dbState.units.length : dbState.units.filter(u => u.status === s).length})
          </button>
        ))}
      </div>

      {/* Units Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                <th className="p-4">Unit #</th>
                <th className="p-4">Property</th>
                <th className="p-4">Layout</th>
                <th className="p-4">Bed / Bath</th>
                <th className="p-4">Monthly Rent</th>
                <th className="p-4">Current Tenant</th>
                <th className="p-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUnits.map(unit => {
                const property = dbState.properties.find(p => p.id === unit.property_id);
                const activeLease = dbState.leases.find(l => l.unit_id === unit.id && l.status !== 'Ended');
                const tenant = activeLease ? dbState.tenants.find(t => t.id === activeLease.tenant_id) : undefined;

                return (
                  <tr key={unit.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-extrabold text-slate-900">Unit {unit.unit_number}</td>
                    <td className="p-4 text-slate-700 font-medium">{property?.name} <span className="text-slate-400">({property?.city})</span></td>
                    <td className="p-4 text-slate-600">{unit.unit_type}</td>
                    <td className="p-4 text-slate-600">{unit.bedrooms} Bed / {unit.bathrooms} Bath</td>
                    <td className="p-4 font-bold text-slate-900">${unit.monthly_rent.toLocaleString()} CAD</td>
                    <td className="p-4 font-medium text-slate-800">
                      {tenant ? `${tenant.first_name} ${tenant.last_name}` : <span className="text-slate-400 italic">Unassigned</span>}
                    </td>
                    <td className="p-4 text-right">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        unit.status === 'Occupied' ? 'bg-emerald-100 text-emerald-800' :
                        unit.status === 'Vacant' ? 'bg-rose-100 text-rose-800' :
                        unit.status === 'Notice Given' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {unit.status}
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
