import React, { useState } from 'react';
import { Building2, MapPin, Home, ArrowRight, ChevronRight, Filter, TrendingUp, DollarSign, Plus } from 'lucide-react';
import { DatabaseState } from '../services/supabase';
import { Property } from '../types/database';
import { AddExpenseModal } from '../components/AddExpenseModal';

interface PropertiesProps {
  dbState: DatabaseState;
  onSelectProperty: (propertyId: string) => void;
}

export const PropertiesPage: React.FC<PropertiesProps> = ({ dbState, onSelectProperty }) => {
  const [cityFilter, setCityFilter] = useState<string>('All');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | undefined>(undefined);

  const cities = ['All', 'Toronto', 'Mississauga', 'Hamilton', 'Ottawa'];

  const filteredProperties = cityFilter === 'All'
    ? dbState.properties
    : dbState.properties.filter(p => p.city.toLowerCase() === cityFilter.toLowerCase());

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Properties Portfolio & Financial Yield</h1>
          <p className="text-sm text-slate-500">Manage Canadian residential real estate assets, operational costs & profit margins</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedPropertyId(undefined);
              setIsAddExpenseOpen(true);
            }}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Record Property Expense
          </button>

          {/* City Filter Pills */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
            {cities.map(city => (
              <button
                key={city}
                onClick={() => setCityFilter(city)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  cityFilter === city
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Property Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {filteredProperties.map(property => {
          const propUnits = dbState.units.filter(u => u.property_id === property.id);
          const occupiedCount = propUnits.filter(u => u.status === 'Occupied').length;
          const occupancyRate = propUnits.length > 0 ? Math.round((occupiedCount / propUnits.length) * 100) : 92;

          const propMaintenance = dbState.maintenance_requests.filter(m => {
            const unit = dbState.units.find(u => u.id === m.unit_id);
            return unit?.property_id === property.id && m.status !== 'Completed';
          }).length;

          // Financial aggregates
          const propExpenses = (dbState.expenses || []).filter(e => e.property_id === property.id);
          const totalExpenses = propExpenses.reduce((acc, e) => acc + e.amount, 0);
          const monthlyRevenue = propUnits.filter(u => u.status === 'Occupied').reduce((acc, u) => acc + u.monthly_rent, 0);
          const netOperatingIncome = monthlyRevenue - totalExpenses;
          const margin = monthlyRevenue > 0 ? Math.round((netOperatingIncome / monthlyRevenue) * 100) : 0;

          return (
            <div
              key={property.id}
              onClick={() => onSelectProperty(property.id)}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all cursor-pointer p-6 space-y-5 group"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-brand-700 bg-brand-50 border border-brand-200/60 px-2 py-0.5 rounded uppercase">
                      {property.property_type}
                    </span>
                    <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded ${margin >= 50 ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                      {margin}% Profit Margin
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                    {property.name}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {property.address}, {property.city}, {property.province} {property.postal_code}
                  </p>
                </div>

                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  {property.status}
                </span>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-4 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center text-xs">
                <div>
                  <span className="text-slate-500 font-medium block">Occupancy</span>
                  <span className="text-sm font-extrabold text-slate-900">{occupancyRate}%</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Monthly Rent</span>
                  <span className="text-sm font-extrabold text-emerald-600">${monthlyRevenue.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Expenses</span>
                  <span className="text-sm font-extrabold text-rose-600">-${totalExpenses.toFixed(0)}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium block">Net NOI</span>
                  <span className="text-sm font-extrabold text-brand-700">${netOperatingIncome.toFixed(0)}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-slate-500 font-medium border-t border-slate-100">
                <span className="text-brand-600 font-semibold group-hover:underline flex items-center gap-1">
                  View Unit Economics & Expenses <ChevronRight className="w-3.5 h-3.5" />
                </span>
                <span className="text-[11px] text-slate-400">{propExpenses.length} expense entries</span>
              </div>
            </div>
          );
        })}
      </div>

      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        dbState={dbState}
        defaultPropertyId={selectedPropertyId}
      />
    </div>
  );
};
