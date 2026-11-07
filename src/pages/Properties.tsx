import React, { useState } from 'react';
import { Building2, MapPin, Home, ArrowRight, ChevronRight, Filter, TrendingUp, DollarSign, Plus, Landmark, Clock, UserPlus } from 'lucide-react';
import { DatabaseState } from '../services/supabase';
import { Property } from '../types/database';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { AddPropertyModal } from '../components/AddPropertyModal';
import { OnboardLandlordModal } from '../components/OnboardLandlordModal';
import { useCurrency } from '../context/CurrencyContext';

interface PropertiesProps {
  dbState: DatabaseState;
  onSelectProperty: (propertyId: string) => void;
}

export const PropertiesPage: React.FC<PropertiesProps> = ({ dbState, onSelectProperty }) => {
  const [cityFilter, setCityFilter] = useState<string>('All');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddPropertyOpen, setIsAddPropertyOpen] = useState(false);
  const [isOnboardLandlordOpen, setIsOnboardLandlordOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | undefined>(undefined);
  const { formatMoney } = useCurrency();

  const availableCities = ['All', ...Array.from(new Set(dbState.properties.map(p => p.city)))];

  const filteredProperties = cityFilter === 'All'
    ? dbState.properties
    : dbState.properties.filter(p => p.city.toLowerCase() === cityFilter.toLowerCase());

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header: Line 1 Title and Subtitle with visual divider */}
      <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-3">
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Properties Portfolio & Asset Yield</h1>
        <span className="hidden sm:inline text-cream-400 font-light">|</span>
        <p className="text-sm text-stone-600">
          Manage real estate assets, acquisition structures (outright vs lease) & break-even horizons
        </p>
      </div>

      {/* Visual Horizontal Separator */}
      <hr className="border-t border-slate-800/80" />

      {/* Controls Line: Filters & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-wrap bg-cream-50 p-4 rounded-2xl border border-cream-300 shadow-xs">
        {/* City Filter Dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="property-city-select" className="text-xs font-bold text-stone-600 uppercase tracking-wider">
            City:
          </label>
          <select
            id="property-city-select"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="bg-white text-stone-800 text-xs font-semibold px-3 py-2 rounded-xl border border-cream-300 shadow-2xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden cursor-pointer"
          >
            {availableCities.map(c => (
              <option key={c} value={c}>{c === 'All' ? 'All Cities' : c}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsOnboardLandlordOpen(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> Onboard Landlord Client
          </button>

          <button
            onClick={() => setIsAddPropertyOpen(true)}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Property
          </button>

          <button
            onClick={() => {
              setSelectedPropertyId(undefined);
              setIsAddExpenseOpen(true);
            }}
            className="px-4 py-2 bg-cream-200/90 hover:bg-cream-300 text-stone-800 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 border border-cream-300 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-stone-600" /> Record Expense
          </button>
        </div>
      </div>

      {/* Property Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {filteredProperties.map(property => {
          const propUnits = dbState.units.filter(u => u.property_id === property.id);
          const occupiedCount = propUnits.filter(u => u.status === 'Occupied').length;
          const occupancyRate = propUnits.length > 0 ? Math.round((occupiedCount / propUnits.length) * 100) : 0;

          const propMaintenance = dbState.maintenance_requests.filter(m => {
            const unit = dbState.units.find(u => u.id === m.unit_id);
            return unit?.property_id === property.id && m.status !== 'Completed';
          }).length;

          // Financial aggregates
          const propExpenses = (dbState.expenses || []).filter(e => e.property_id === property.id);
          const totalExpenses = propExpenses.reduce((acc, e) => acc + e.amount, 0);
          const monthlyRevenue = propUnits.filter(u => u.status === 'Occupied').reduce((acc, u) => acc + u.monthly_rent, 0);
          
          const masterLeaseMonthly = property.acquisition?.acquisition_type === 'Long-Term Lease'
            ? (property.acquisition.monthly_lease_cost || 0)
            : 0;

          const netOperatingIncome = monthlyRevenue - totalExpenses - masterLeaseMonthly;
          const margin = monthlyRevenue > 0 ? Math.round((netOperatingIncome / monthlyRevenue) * 100) : 0;

          // Break-Even Metrics
          const acq = property.acquisition;
          const initialOutlay = acq?.down_payment_or_deposit || 0;
          const annualNet = netOperatingIncome * 12;
          const breakEvenYears = annualNet > 0 && initialOutlay > 0 ? (initialOutlay / annualNet).toFixed(1) : null;

          return (
            <div
              key={property.id}
              onClick={() => onSelectProperty(property.id)}
              className="bg-cream-50 rounded-2xl border border-cream-300 shadow-xs hover:shadow-md hover:border-cream-400 transition-all cursor-pointer p-6 space-y-5 group"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-brand-700 bg-brand-50 border border-brand-200/60 px-2 py-0.5 rounded uppercase">
                      {property.property_type}
                    </span>
                    {acq && (
                      <span className="text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded flex items-center gap-1">
                        {acq.acquisition_type === 'Outright Purchase' ? <Landmark className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {acq.acquisition_type}
                      </span>
                    )}
                    <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded ${margin >= 50 ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                      {margin}% Margin
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
              <div className="grid grid-cols-4 gap-2 p-3 bg-cream-100/70 rounded-xl border border-cream-200 text-center text-xs">
                <div>
                  <span className="text-stone-500 font-medium block">Occupancy</span>
                  <span className="text-sm font-extrabold text-stone-900">{occupancyRate}%</span>
                </div>
                <div>
                  <span className="text-stone-500 font-medium block">Monthly Rent</span>
                  <span className="text-sm font-extrabold text-emerald-600">{formatMoney(monthlyRevenue, { maximumFractionDigits: 0 })}</span>
                </div>
                <div>
                  <span className="text-stone-500 font-medium block">Net NOI / Mo</span>
                  <span className="text-sm font-extrabold text-brand-700">{formatMoney(netOperatingIncome, { maximumFractionDigits: 0 })}</span>
                </div>
                <div>
                  <span className="text-stone-500 font-medium block">Break-Even</span>
                  <span className="text-sm font-extrabold text-amber-700">
                    {breakEvenYears ? `${breakEvenYears} Yrs` : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-stone-500 font-medium border-t border-cream-200">
                <span className="text-brand-600 font-semibold group-hover:underline flex items-center gap-1">
                  View Amortization & Unit Economics <ChevronRight className="w-3.5 h-3.5" />
                </span>
                <span className="text-[11px] text-stone-400">
                  {acq ? `Initial Cash: ${formatMoney(acq.down_payment_or_deposit, { maximumFractionDigits: 0 })}` : ''}
                </span>
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

      <AddPropertyModal
        isOpen={isAddPropertyOpen}
        onClose={() => setIsAddPropertyOpen(false)}
        dbState={dbState}
        onCreated={(id) => onSelectProperty(id)}
      />

      <OnboardLandlordModal
        isOpen={isOnboardLandlordOpen}
        onClose={() => setIsOnboardLandlordOpen(false)}
        properties={dbState.properties}
        onLandlordAdded={(newLandlord) => {
          // Alert or feedback
        }}
      />
    </div>
  );
};
