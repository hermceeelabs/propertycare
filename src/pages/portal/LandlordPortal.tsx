import React, { useState } from 'react';
import { DatabaseState } from '../../services/supabase';
import { Building2, DollarSign, TrendingUp, Download, Printer, ShieldCheck, Wrench, CheckCircle2 } from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';

interface LandlordPortalProps {
  dbState: DatabaseState;
  landlordId?: string;
  onClosePreview?: () => void;
}

export const LandlordPortal: React.FC<LandlordPortalProps> = ({
  dbState,
  landlordId = dbState.landlords?.[0]?.id || 'landlord-1',
  onClosePreview
}) => {
  const { formatMoney } = useCurrency();
  const [selectedMonth, setSelectedMonth] = useState('October 2026');

  const landlord = (dbState.landlords || []).find(l => l.id === landlordId) || dbState.landlords?.[0] || {
    id: 'landlord-1',
    first_name: 'David',
    last_name: 'Adeyemi',
    company_name: 'Adeyemi Asset Holdings Ltd',
    management_fee_percentage: 10.0
  };

  // Find properties belonging to this landlord
  const ownedProperties = dbState.properties.filter(p => p.landlord_id === landlord.id);
  const propertyIds = ownedProperties.map(p => p.id);

  const ownedUnits = dbState.units.filter(u => propertyIds.includes(u.property_id));
  const occupiedUnits = ownedUnits.filter(u => u.status === 'Occupied');
  const occupancyRate = ownedUnits.length > 0 ? Math.round((occupiedUnits.length / ownedUnits.length) * 100) : 100;

  // Revenue calculation
  const grossMonthlyRent = occupiedUnits.reduce((acc, u) => acc + (u.monthly_rent || 0), 0);
  const mgmtFeePercent = landlord.management_fee_percentage || 10.0;
  const managementFee = Math.round((grossMonthlyRent * mgmtFeePercent) / 100);

  // Operating costs for these properties
  const propertyExpenses = (dbState.expenses || []).filter(e => propertyIds.includes(e.property_id));
  const totalRepairs = propertyExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

  const netRemittance = grossMonthlyRent - managementFee - totalRepairs;

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 font-sans">
      {/* Top Banner (Shows if opened in Preview Mode) */}
      {onClosePreview && (
        <div className="bg-stone-900 text-white px-4 py-2.5 flex items-center justify-between text-xs sticky top-0 z-50">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <strong>Manager Portal Preview:</strong> Viewing active investor portal as <em>{landlord.company_name || `${landlord.first_name} ${landlord.last_name}`}</em>
          </span>
          <button
            onClick={onClosePreview}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg font-bold text-[11px] transition-all"
          >
            Exit Portal Preview ✕
          </button>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-6 py-5 sticky top-0 z-40 shadow-xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-stone-900 text-white font-extrabold flex items-center justify-center shadow-md">
              <Building2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="font-extrabold text-base text-stone-900 tracking-tight">
                {landlord.company_name || `${landlord.first_name} ${landlord.last_name}`}
              </h1>
              <p className="text-xs text-stone-500">Property Owner & Asset Investment Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" /> Print Statement
            </button>
            <button
              onClick={() => alert('Downloading official monthly financial statement PDF...')}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" /> Download PDF
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Top Financial Yield Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Gross Rental Revenue</span>
            <div className="text-2xl font-black text-stone-900">{formatMoney(grossMonthlyRent)}</div>
            <span className="text-[11px] text-emerald-600 font-bold">100% Contracted Collections</span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Management Fee ({mgmtFeePercent}%)</span>
            <div className="text-2xl font-black text-stone-600">-{formatMoney(managementFee)}</div>
            <span className="text-[11px] text-stone-400">Retained for property oversight</span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Repairs & Maintenance</span>
            <div className="text-2xl font-black text-rose-600">-{formatMoney(totalRepairs)}</div>
            <span className="text-[11px] text-stone-400">{propertyExpenses.length} maintenance invoices</span>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-3xl shadow-xs space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">Net Remittance Due</span>
            <div className="text-2xl font-black text-emerald-800">{formatMoney(netRemittance)}</div>
            <span className="text-[11px] text-emerald-700 font-bold">Scheduled for direct bank transfer</span>
          </div>
        </div>

        {/* Owned Assets Grid */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-stone-900">Managed Real Estate Assets ({ownedProperties.length})</h2>
            <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
              Portfolio Occupancy: {occupancyRate}%
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ownedProperties.map(p => {
              const pUnits = dbState.units.filter(u => u.property_id === p.id);
              const pRent = pUnits.filter(u => u.status === 'Occupied').reduce((acc, u) => acc + (u.monthly_rent || 0), 0);
              return (
                <div key={p.id} className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-stone-900 text-sm">{p.name}</h3>
                      <p className="text-xs text-stone-500">{p.address}, {p.city}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-brand-100 text-brand-800 rounded font-bold text-[10px]">
                      {p.property_type}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-2 border-t border-stone-200/60">
                    <span className="text-stone-500">Units: <strong>{pUnits.length}</strong></span>
                    <span className="text-stone-900 font-bold">Monthly Yield: <strong>{formatMoney(pRent)}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Deductions & Invoices */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-stone-900">Recent Operating Deductions & Contractor Receipts</h2>
          {propertyExpenses.length === 0 ? (
            <p className="text-xs text-stone-500 py-4 text-center">No maintenance deductions recorded this cycle.</p>
          ) : (
            <div className="divide-y divide-stone-100">
              {propertyExpenses.map(e => (
                <div key={e.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <strong className="block text-stone-900">{e.category}</strong>
                    <span className="text-stone-400 text-[11px]">{e.description} • {e.date}</span>
                  </div>
                  <span className="font-bold text-rose-700">-{formatMoney(e.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
