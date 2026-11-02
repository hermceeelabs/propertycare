import React, { useState } from 'react';
import { Building2, Home, Search, Filter, DollarSign, TrendingUp, Plus } from 'lucide-react';
import { DatabaseState } from '../services/supabase';
import { UnitStatus } from '../types/database';
import { AddExpenseModal } from '../components/AddExpenseModal';

interface UnitsProps {
  dbState: DatabaseState;
}

export const UnitsPage: React.FC<UnitsProps> = ({ dbState }) => {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<{ unitId: string; propertyId: string } | null>(null);

  const statuses = ['All', 'Occupied', 'Vacant', 'Notice Given', 'Maintenance', 'Reserved'];

  const filteredUnits = dbState.units.filter(unit => {
    const matchesStatus = statusFilter === 'All' || unit.status === statusFilter;
    const matchesSearch = unit.unit_number.toLowerCase().includes(search.toLowerCase()) ||
                          unit.unit_type.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalMonthlyGross = dbState.units
    .filter(u => u.status === 'Occupied')
    .reduce((acc, u) => acc + u.monthly_rent, 0);

  const totalUnitExpenses = (dbState.expenses || [])
    .filter(e => e.scope === 'Unit')
    .reduce((acc, e) => acc + e.amount, 0);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Units Inventory & Unit Economics</h1>
          <p className="text-sm text-slate-500">Track suite floor plans, rents, tenant leases, individual unit expenses & profit margins</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedUnit(null);
              setIsAddExpenseOpen(true);
            }}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Record Unit Expense
          </button>

          <input
            type="text"
            placeholder="Filter unit number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 shadow-xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* KPI Cards for Unit Financials */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Occupied Unit Revenue</span>
          <span className="text-2xl font-extrabold text-slate-900">${totalMonthlyGross.toLocaleString()} CAD / mo</span>
          <span className="text-[11px] text-slate-400 mt-1 block">From {dbState.units.filter(u => u.status === 'Occupied').length} occupied suites</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/40 shadow-xs">
          <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">Direct Unit Expenses Logged</span>
          <span className="text-2xl font-extrabold text-rose-700">${totalUnitExpenses.toFixed(2)} CAD</span>
          <span className="text-[11px] text-rose-600 mt-1 block">Across repairs, appliances & turn costs</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-xs">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Gross Unit Operating Profit</span>
          <span className="text-2xl font-extrabold text-emerald-600">${(totalMonthlyGross - totalUnitExpenses).toLocaleString(undefined, { minimumFractionDigits: 2 })} CAD</span>
          <span className="text-[11px] text-emerald-700 mt-1 block">Before centralized portfolio overhead</span>
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

      {/* Units Table with Profit Margins */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                <th className="p-4">Unit #</th>
                <th className="p-4">Property</th>
                <th className="p-4">Layout</th>
                <th className="p-4">Monthly Rent</th>
                <th className="p-4">Unit Expenses</th>
                <th className="p-4">Net Yield</th>
                <th className="p-4">Margin</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUnits.map(unit => {
                const property = dbState.properties.find(p => p.id === unit.property_id);
                const activeLease = dbState.leases.find(l => l.unit_id === unit.id && l.status !== 'Ended');
                const tenant = activeLease ? dbState.tenants.find(t => t.id === activeLease.tenant_id) : undefined;

                // Unit direct expenses
                const unitExpenses = (dbState.expenses || []).filter(e => e.unit_id === unit.id);
                const directCost = unitExpenses.reduce((acc, e) => acc + e.amount, 0);
                const monthlyIncome = unit.status === 'Occupied' ? unit.monthly_rent : 0;
                const netMargin = monthlyIncome - directCost;
                const marginPercent = monthlyIncome > 0
                  ? Math.round((netMargin / monthlyIncome) * 100)
                  : (directCost > 0 ? -100 : 0);

                return (
                  <tr key={unit.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-extrabold text-slate-900">
                      Unit {unit.unit_number}
                      <span className="block text-[11px] text-slate-400 font-normal">
                        {tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Vacant'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-700 font-medium">{property?.name} <span className="text-slate-400">({property?.city})</span></td>
                    <td className="p-4 text-slate-600">{unit.bedrooms} Bed / {unit.bathrooms} Bath</td>
                    <td className="p-4 font-bold text-slate-900">${unit.monthly_rent.toLocaleString()} CAD</td>
                    <td className="p-4 text-rose-600 font-bold">
                      ${directCost.toFixed(2)} CAD
                      <span className="block text-[10px] text-slate-400 font-normal">{unitExpenses.length} entries</span>
                    </td>
                    <td className="p-4 font-extrabold">
                      <span className={netMargin >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                        ${netMargin.toFixed(2)} CAD
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                        marginPercent >= 60 ? 'bg-emerald-100 text-emerald-800' :
                        marginPercent > 0 ? 'bg-blue-100 text-blue-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {marginPercent}%
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        unit.status === 'Occupied' ? 'bg-emerald-100 text-emerald-800' :
                        unit.status === 'Vacant' ? 'bg-rose-100 text-rose-800' :
                        unit.status === 'Notice Given' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {unit.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedUnit({ unitId: unit.id, propertyId: unit.property_id });
                          setIsAddExpenseOpen(true);
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition-colors inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Log Cost
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        dbState={dbState}
        defaultPropertyId={selectedUnit?.propertyId}
        defaultUnitId={selectedUnit?.unitId}
      />
    </div>
  );
};
