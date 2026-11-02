import React, { useState } from 'react';
import { ArrowLeft, Building2, MapPin, Home, Users, FileText, CreditCard, Wrench, Receipt, History, TrendingUp, Plus, Trash2 } from 'lucide-react';
import { DatabaseState, store } from '../services/supabase';
import { AddExpenseModal } from '../components/AddExpenseModal';

interface PropertyDetailProps {
  propertyId: string;
  dbState: DatabaseState;
  onBack: () => void;
}

export const PropertyDetailPage: React.FC<PropertyDetailProps> = ({
  propertyId,
  dbState,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'financials' | 'units' | 'tenants' | 'leases' | 'payments' | 'maintenance' | 'bills' | 'activity'>('financials');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [selectedUnitForExpense, setSelectedUnitForExpense] = useState<string | undefined>(undefined);

  const property = dbState.properties.find(p => p.id === propertyId);
  if (!property) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Property not found.</p>
        <button onClick={onBack} className="mt-4 text-brand-600 font-bold hover:underline">Return to Properties</button>
      </div>
    );
  }

  const units = dbState.units.filter(u => u.property_id === propertyId);
  const unitIds = new Set(units.map(u => u.id));

  const leases = dbState.leases.filter(l => unitIds.has(l.unit_id));
  const tenantIds = new Set(leases.map(l => l.tenant_id));
  const tenants = dbState.tenants.filter(t => tenantIds.has(t.id));

  const payments = dbState.payments.filter(p => tenantIds.has(p.tenant_id));
  const maintenance = dbState.maintenance_requests.filter(m => unitIds.has(m.unit_id));
  const bills = dbState.bills.filter(b => b.property_id === propertyId);
  const expenses = (dbState.expenses || []).filter(e => e.property_id === propertyId);

  // Financial Calculations for entire property
  const grossMonthlyRentPotential = units.reduce((acc, u) => acc + u.monthly_rent, 0);
  const occupiedUnits = units.filter(u => u.status === 'Occupied');
  const actualMonthlyRent = occupiedUnits.reduce((acc, u) => acc + u.monthly_rent, 0);
  const totalPropertyExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const propertyNetOperatingIncome = actualMonthlyRent - totalPropertyExpenses;
  const propertyProfitMargin = actualMonthlyRent > 0
    ? Math.round((propertyNetOperatingIncome / actualMonthlyRent) * 100)
    : 0;

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Properties
        </button>

        <button
          onClick={() => {
            setSelectedUnitForExpense(undefined);
            setIsAddExpenseOpen(true);
          }}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Record New Expense
        </button>
      </div>

      {/* Property Title Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-brand-50 text-brand-700 px-2.5 py-0.5 rounded border border-brand-200">
              {property.property_type}
            </span>
            <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
              {property.status}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">{property.name}</h1>
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-slate-400" />
            {property.address}, {property.city}, {property.province} {property.postal_code}
          </p>
        </div>

        <div className="flex items-center gap-6 text-center border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-6">
          <div>
            <span className="text-xs text-slate-500 block font-medium">Units</span>
            <span className="text-xl font-extrabold text-slate-900">{units.length}</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block font-medium">Occupancy</span>
            <span className="text-xl font-extrabold text-emerald-600">
              {units.length > 0 ? Math.round((occupiedUnits.length / units.length) * 100) : 0}%
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block font-medium">Monthly Revenue</span>
            <span className="text-xl font-extrabold text-slate-900">
              ${actualMonthlyRent.toLocaleString()} CAD
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block font-medium">Net Profit Margin</span>
            <span className={`text-xl font-extrabold ${propertyProfitMargin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {propertyProfitMargin}%
            </span>
          </div>
        </div>
      </div>

      {/* Detail Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-px">
        {[
          { id: 'financials', label: 'Unit Economics & Profit', icon: TrendingUp },
          { id: 'overview', label: 'Overview', icon: Building2 },
          { id: 'units', label: `Units (${units.length})`, icon: Home },
          { id: 'tenants', label: `Tenants (${tenants.length})`, icon: Users },
          { id: 'leases', label: `Leases (${leases.length})`, icon: FileText },
          { id: 'payments', label: `Payments (${payments.length})`, icon: CreditCard },
          { id: 'maintenance', label: `Maintenance (${maintenance.length})`, icon: Wrench },
          { id: 'bills', label: `Expenses & Bills (${expenses.length})`, icon: Receipt },
          { id: 'activity', label: 'Activity Log', icon: History }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all shrink-0 ${
                isActive
                  ? 'border-brand-600 text-brand-600 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        {/* FINANCIALS & UNIT ECONOMICS TAB */}
        {activeTab === 'financials' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Unit-by-Unit Financial Performance & Profit Margins</h3>
                <p className="text-xs text-slate-500">Track monthly income against unit-allocated expenses and common property costs</p>
              </div>

              <button
                onClick={() => {
                  setSelectedUnitForExpense(undefined);
                  setIsAddExpenseOpen(true);
                }}
                className="px-3.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Log Expense
              </button>
            </div>

            {/* Property Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-medium block">Total Monthly Inflow</span>
                <span className="text-xl font-extrabold text-slate-900">${actualMonthlyRent.toLocaleString()} CAD</span>
                <span className="text-[11px] text-slate-400 block mt-1">From {occupiedUnits.length} active leases</span>
              </div>

              <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-200">
                <span className="text-xs text-rose-800 font-medium block">Total Operating Outflow</span>
                <span className="text-xl font-extrabold text-rose-700">${totalPropertyExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })} CAD</span>
                <span className="text-[11px] text-rose-600 block mt-1">
                  {expenses.filter(e => e.scope === 'Unit').length} unit + {expenses.filter(e => e.scope === 'Property').length} building expenses
                </span>
              </div>

              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200">
                <span className="text-xs text-emerald-800 font-medium block">Net Operating Income (NOI)</span>
                <span className={`text-xl font-extrabold ${propertyNetOperatingIncome >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  ${propertyNetOperatingIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })} CAD
                </span>
                <span className="text-[11px] text-emerald-700 block mt-1">Net property monthly yield</span>
              </div>

              <div className="p-4 bg-brand-50/50 rounded-xl border border-brand-200">
                <span className="text-xs text-brand-800 font-medium block">Overall Profit Margin</span>
                <span className={`text-xl font-extrabold ${propertyProfitMargin >= 0 ? 'text-brand-700' : 'text-rose-600'}`}>
                  {propertyProfitMargin}%
                </span>
                <span className="text-[11px] text-brand-600 block mt-1">Return on monthly gross</span>
              </div>
            </div>

            {/* Per-Unit Economics Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="p-3.5">Unit #</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Monthly Income</th>
                    <th className="p-3.5">Direct Unit Expenses</th>
                    <th className="p-3.5">Shared Building Cost</th>
                    <th className="p-3.5">Net Profit / Yield</th>
                    <th className="p-3.5">Profit Margin</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {units.map(unit => {
                    const unitDirectExpenses = expenses.filter(e => e.unit_id === unit.id);
                    const unitDirectTotal = unitDirectExpenses.reduce((acc, e) => acc + e.amount, 0);

                    // Property-wide shared costs distributed proportionally across units
                    const propertyWideExpenses = expenses.filter(e => e.scope === 'Property');
                    const sharedPropertyCostPerUnit = units.length > 0
                      ? propertyWideExpenses.reduce((acc, e) => acc + e.amount, 0) / units.length
                      : 0;

                    const totalCostForUnit = unitDirectTotal + sharedPropertyCostPerUnit;
                    const unitIncome = unit.status === 'Occupied' ? unit.monthly_rent : 0;
                    const unitProfit = unitIncome - totalCostForUnit;
                    const unitMargin = unitIncome > 0
                      ? Math.round((unitProfit / unitIncome) * 100)
                      : (totalCostForUnit > 0 ? -100 : 0);

                    return (
                      <tr key={unit.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-extrabold text-slate-900">
                          Unit {unit.unit_number}
                          <span className="block text-[11px] font-normal text-slate-500">{unit.unit_type}</span>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            unit.status === 'Occupied' ? 'bg-emerald-100 text-emerald-800' :
                            unit.status === 'Vacant' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {unit.status}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">
                          ${unitIncome.toLocaleString()} CAD
                        </td>
                        <td className="p-3.5 text-rose-600 font-semibold">
                          ${unitDirectTotal.toFixed(2)} CAD
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {unitDirectExpenses.length} logged
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-500">
                          ${sharedPropertyCostPerUnit.toFixed(2)} CAD
                          <span className="block text-[10px] text-slate-400">allocated</span>
                        </td>
                        <td className="p-3.5 font-extrabold">
                          <span className={unitProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                            ${unitProfit.toFixed(2)} CAD
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-extrabold ${
                            unitMargin >= 50 ? 'bg-emerald-100 text-emerald-800' :
                            unitMargin > 0 ? 'bg-blue-100 text-blue-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {unitMargin}%
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => {
                              setSelectedUnitForExpense(unit.id);
                              setIsAddExpenseOpen(true);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded-lg transition-colors inline-flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Add Expense
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* List of Recent Expenses for this property */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-xs">Logged Expenses for {property.name}</h4>
                <span className="text-xs text-slate-500 font-medium">{expenses.length} Total Records</span>
              </div>

              {expenses.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                  No expenses logged for this property yet. Click "Record New Expense" above.
                </div>
              ) : (
                <div className="space-y-2">
                  {expenses.map(exp => {
                    const unit = exp.unit_id ? units.find(u => u.id === exp.unit_id) : undefined;
                    return (
                      <div key={exp.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                              {exp.scope === 'Unit' ? `Unit ${unit?.unit_number || 'Unit'}` : 'Building-Wide'}
                            </span>
                            <span className="text-[10px] font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                              {exp.category}
                            </span>
                            <span className="text-xs text-slate-400">{exp.date}</span>
                          </div>
                          <p className="text-xs font-semibold text-slate-800">{exp.description}</p>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="font-extrabold text-sm text-rose-600">-${exp.amount.toFixed(2)} CAD</span>
                          <button
                            onClick={() => store.deleteExpense(exp.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-200 transition-colors"
                            title="Delete Expense"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h3 className="font-bold text-slate-900 text-sm">Asset Management Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-semibold block">Primary City</span>
                <span className="text-base font-extrabold text-slate-900">{property.city}, Ontario</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-semibold block">Property Class</span>
                <span className="text-base font-extrabold text-slate-900">{property.property_type}</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-semibold block">Created Date</span>
                <span className="text-base font-extrabold text-slate-900">{property.created_at.split('T')[0]}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'units' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold">
                  <th className="pb-3">Unit Number</th>
                  <th className="pb-3">Layout / Type</th>
                  <th className="pb-3">Bed / Bath</th>
                  <th className="pb-3">Monthly Rent</th>
                  <th className="pb-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {units.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-3 font-bold text-slate-900">Unit {u.unit_number}</td>
                    <td className="py-3 text-slate-600">{u.unit_type}</td>
                    <td className="py-3 text-slate-600">{u.bedrooms} Bed / {u.bathrooms} Bath</td>
                    <td className="py-3 font-semibold text-slate-900">${u.monthly_rent.toLocaleString()} CAD</td>
                    <td className="py-3 text-right">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        u.status === 'Occupied' ? 'bg-emerald-100 text-emerald-800' :
                        u.status === 'Vacant' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'tenants' && (
          <div className="space-y-3">
            {tenants.map(t => (
              <div key={t.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-900">{t.first_name} {t.last_name}</h4>
                  <p className="text-xs text-slate-500">{t.email} • {t.phone}</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'leases' && (
          <div className="space-y-3">
            {leases.map(l => (
              <div key={l.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Lease #{l.id}</h4>
                  <p className="text-xs text-slate-500">{l.start_date} to {l.end_date}</p>
                </div>
                <span className="font-extrabold text-sm text-slate-900">${l.monthly_rent.toLocaleString()} CAD / mo</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-3">
            {payments.map(p => (
              <div key={p.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Payment Due: {p.due_date}</h4>
                  <p className="text-xs text-slate-500">Paid: ${p.amount_paid} CAD / Due: ${p.amount_due} CAD</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  p.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="space-y-3">
            {maintenance.map(m => (
              <div key={m.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-700 px-2 py-0.5 rounded">
                    {m.category} • {m.priority}
                  </span>
                  <p className="text-xs font-semibold text-slate-900 mt-1">{m.description}</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  {m.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'bills' && (
          <div className="space-y-3">
            {bills.map(b => (
              <div key={b.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Invoice #{b.bill_number}</h4>
                  <p className="text-xs text-slate-500">{b.description} (Due: {b.due_date})</p>
                </div>
                <span className="font-extrabold text-sm text-slate-900">${b.amount.toFixed(2)} CAD</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="text-xs text-slate-500 space-y-2">
            <p>• Property created in Northstar Database on {property.created_at.split('T')[0]}</p>
            <p>• Portfolio audit check completed on {property.updated_at.split('T')[0]}</p>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        dbState={dbState}
        defaultPropertyId={propertyId}
        defaultUnitId={selectedUnitForExpense}
      />
    </div>
  );
};
