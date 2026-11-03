import React, { useState } from 'react';
import {
  Building2, Home, Search, Filter, DollarSign,
  TrendingUp, Plus, Calendar, Sparkles, Clock, Globe
} from 'lucide-react';
import { DatabaseState } from '../services/supabase';
import { UnitStatus, RentalModel } from '../types/database';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { useCurrency } from '../context/CurrencyContext';

interface UnitsProps {
  dbState: DatabaseState;
}

export const UnitsPage: React.FC<UnitsProps> = ({ dbState }) => {
  const [modelFilter, setModelFilter] = useState<'All' | 'Long-Term' | 'Shortlet'>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<{ unitId: string; propertyId: string } | null>(null);

  const { formatMoney } = useCurrency();

  const statuses = ['All', 'Occupied', 'Vacant', 'Notice Given', 'Maintenance', 'Reserved'];

  const filteredUnits = dbState.units.filter(unit => {
    const isShortlet = unit.rental_model === 'Shortlet / STR';
    const matchesModel =
      modelFilter === 'All'
        ? true
        : modelFilter === 'Shortlet'
        ? isShortlet
        : !isShortlet;

    const matchesStatus = statusFilter === 'All' || unit.status === statusFilter;
    const matchesSearch =
      unit.unit_number.toLowerCase().includes(search.toLowerCase()) ||
      unit.unit_type.toLowerCase().includes(search.toLowerCase());

    return matchesModel && matchesStatus && matchesSearch;
  });

  // Financial aggregates
  const longTermUnits = dbState.units.filter(u => u.rental_model !== 'Shortlet / STR');
  const shortletUnits = dbState.units.filter(u => u.rental_model === 'Shortlet / STR');

  const totalLongTermRevenue = longTermUnits
    .filter(u => u.status === 'Occupied')
    .reduce((acc, u) => acc + u.monthly_rent, 0);

  // Shortlet revenue estimate based on nightly rate * 30 days * occupancy rate
  const totalShortletRevenue = shortletUnits.reduce((acc, u) => {
    const dailyRate = u.nightly_rate || (u.monthly_rent / 30);
    const occ = (u.current_occupancy_rate || 75) / 100;
    return acc + (dailyRate * 30 * occ);
  }, 0);

  const totalMonthlyGross = totalLongTermRevenue + totalShortletRevenue;

  const totalUnitExpenses = (dbState.expenses || [])
    .filter(e => e.scope === 'Unit')
    .reduce((acc, e) => acc + e.amount, 0);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header: Line 1 Title and Subtitle with visual divider */}
      <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-3">
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Suites & Shortlet Inventory</h1>
        <span className="hidden sm:inline text-cream-400 font-light">|</span>
        <p className="text-sm text-stone-600">
          Unified management for Long-Term residential leases and Shortlet / Airbnb vacation rentals
        </p>
      </div>

      {/* Visual Horizontal Separator */}
      <hr className="border-t border-cream-300" />

      {/* Controls Line: Filters & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-wrap bg-cream-50 p-4 rounded-2xl border border-cream-300 shadow-xs">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Inventory Model Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="unit-model-select" className="text-xs font-bold text-stone-600 uppercase tracking-wider">
              Type:
            </label>
            <select
              id="unit-model-select"
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value as any)}
              className="bg-white text-stone-800 text-xs font-semibold px-3 py-2 rounded-xl border border-cream-300 shadow-2xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden cursor-pointer"
            >
              <option value="All">All Units ({dbState.units.length})</option>
              <option value="Long-Term">Long-Term Leases ({longTermUnits.length})</option>
              <option value="Shortlet">Shortlets / STR ({shortletUnits.length})</option>
            </select>
          </div>

          {/* Occupancy Status Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="unit-status-select" className="text-xs font-bold text-stone-600 uppercase tracking-wider">
              Status:
            </label>
            <select
              id="unit-status-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white text-stone-800 text-xs font-semibold px-3 py-2 rounded-xl border border-cream-300 shadow-2xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden cursor-pointer"
            >
              {statuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Search unit # or layout..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3.5 py-2 bg-white border border-cream-300 rounded-xl text-xs text-stone-800 placeholder-stone-400 shadow-2xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
          />

          <button
            onClick={() => {
              setSelectedUnit(null);
              setIsAddExpenseOpen(true);
            }}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Record Suite Cost
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-cream-50 p-4 rounded-xl border border-cream-300 shadow-xs">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">Long-Term Inflow</span>
          <span className="text-xl font-extrabold text-stone-900">{formatMoney(totalLongTermRevenue)} / mo</span>
          <span className="text-[11px] text-stone-500 mt-0.5 block">{longTermUnits.filter(u => u.status === 'Occupied').length} active leases</span>
        </div>
        <div className="bg-purple-50/40 p-4 rounded-xl border border-purple-200 shadow-xs">
          <span className="text-xs font-bold text-purple-900 uppercase tracking-wider block">Shortlet Revenue (Est)</span>
          <span className="text-xl font-extrabold text-purple-800">{formatMoney(totalShortletRevenue)} / mo</span>
          <span className="text-[11px] text-purple-700 mt-0.5 block">Avg 80% occupancy yield</span>
        </div>
        <div className="bg-rose-50/40 p-4 rounded-xl border border-rose-200 shadow-xs">
          <span className="text-xs font-bold text-rose-900 uppercase tracking-wider block">Direct Suite Costs</span>
          <span className="text-xl font-extrabold text-rose-800">{formatMoney(totalUnitExpenses)}</span>
          <span className="text-[11px] text-rose-700 mt-0.5 block">Repairs & turnovers</span>
        </div>
        <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-200 shadow-xs">
          <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider block">Gross Suite Operating Yield</span>
          <span className="text-xl font-extrabold text-emerald-700">{formatMoney(totalMonthlyGross - totalUnitExpenses)}</span>
          <span className="text-[11px] text-emerald-700 mt-0.5 block">Blended net yield</span>
        </div>
      </div>

      {/* Units Table */}
      <div className="bg-cream-50 rounded-2xl border border-cream-300 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-cream-100/90 border-b border-cream-300 text-stone-600 uppercase tracking-wider font-bold">
                <th className="p-4">Suite / Unit #</th>
                <th className="p-4">Property</th>
                <th className="p-4">Rental Model</th>
                <th className="p-4">Rate Structure</th>
                <th className="p-4">Occupancy / Tenant</th>
                <th className="p-4">Direct Costs</th>
                <th className="p-4">Net Yield / Margin</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {filteredUnits.map(unit => {
                const property = dbState.properties.find(p => p.id === unit.property_id);
                const isShortlet = unit.rental_model === 'Shortlet / STR';

                // Tenant or guest details
                const activeLease = dbState.leases.find(l => l.unit_id === unit.id && l.status !== 'Ended');
                const tenant = activeLease ? dbState.tenants.find(t => t.id === activeLease.tenant_id) : undefined;
                const activeBooking = (dbState.shortlet_bookings || []).find(b => b.unit_id === unit.id && b.booking_status === 'Checked In');

                // Expenses
                const unitExpenses = (dbState.expenses || []).filter(e => e.unit_id === unit.id);
                const directCost = unitExpenses.reduce((acc, e) => acc + e.amount, 0);

                // Revenue calculation
                const monthlyIncome = isShortlet
                  ? (unit.nightly_rate || 180) * 30 * ((unit.current_occupancy_rate || 75) / 100)
                  : (unit.status === 'Occupied' ? unit.monthly_rent : 0);

                const netMargin = monthlyIncome - directCost;
                const marginPercent = monthlyIncome > 0
                  ? Math.round((netMargin / monthlyIncome) * 100)
                  : (directCost > 0 ? -100 : 0);

                return (
                  <tr key={unit.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-extrabold text-slate-900">
                      Unit {unit.unit_number}
                      <span className="block text-[11px] text-slate-400 font-normal">{unit.unit_type}</span>
                    </td>

                    <td className="p-4 text-slate-700 font-medium">
                      {property?.name}
                      <span className="text-slate-400 block text-[11px]">{property?.city}</span>
                    </td>

                    <td className="p-4">
                      {isShortlet ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1 w-fit">
                          <Sparkles className="w-3 h-3" /> Shortlet / STR
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1 w-fit">
                          <Building2 className="w-3 h-3" /> Long-Term
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      {isShortlet ? (
                        <div>
                          <span className="font-extrabold text-slate-900">{formatMoney(unit.nightly_rate || 180)} / night</span>
                          <span className="text-[11px] text-slate-400 block">+{formatMoney(unit.cleaning_fee || 75)} cleaning</span>
                        </div>
                      ) : (
                        <div>
                          <span className="font-bold text-slate-900">{formatMoney(unit.monthly_rent)} / mo</span>
                          <span className="text-[11px] text-slate-400 block">Monthly lease</span>
                        </div>
                      )}
                    </td>

                    <td className="p-4">
                      {isShortlet ? (
                        <div>
                          <span className="font-semibold text-purple-800 block">
                            {unit.current_occupancy_rate || 80}% Occupied
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {activeBooking ? `${activeBooking.guest_name} (${activeBooking.platform_source})` : 'Available for booking'}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="font-medium text-slate-800 block">
                            {tenant ? `${tenant.first_name} ${tenant.last_name}` : <span className="text-slate-400 italic">Unassigned</span>}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {activeLease ? `Lease to ${activeLease.end_date}` : 'Vacant suite'}
                          </span>
                        </div>
                      )}
                    </td>

                    <td className="p-4 text-rose-600 font-bold">
                      {formatMoney(directCost)}
                      <span className="block text-[10px] text-slate-400 font-normal">{unitExpenses.length} entries</span>
                    </td>

                    <td className="p-4">
                      <span className={`font-extrabold block ${netMargin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatMoney(netMargin)}
                      </span>
                      <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold mt-0.5 ${
                        marginPercent >= 60 ? 'bg-emerald-100 text-emerald-800' :
                        marginPercent > 0 ? 'bg-blue-100 text-blue-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {marginPercent}% margin
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
