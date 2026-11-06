import React, { useState } from 'react';
import { CreditCard, DollarSign, Search, Filter } from 'lucide-react';
import { DatabaseState } from '../services/supabase';
import { useCurrency } from '../context/CurrencyContext';

interface PaymentsProps {
  dbState: DatabaseState;
}

export const PaymentsPage: React.FC<PaymentsProps> = ({ dbState }) => {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const { formatMoney } = useCurrency();

  const totalExpected = dbState.payments.reduce((acc, p) => acc + p.amount_due, 0);
  const totalCollected = dbState.payments.reduce((acc, p) => acc + p.amount_paid, 0);
  const totalOutstanding = totalExpected - totalCollected;
  const overdueCount = dbState.payments.filter(p => p.status === 'Overdue').length;

  const filteredPayments = dbState.payments.filter(p => {
    const tenant = dbState.tenants.find(t => t.id === p.tenant_id);
    const tenantName = tenant ? `${tenant.first_name} ${tenant.last_name}`.toLowerCase() : '';
    const matchesSearch = tenantName.includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchesStatus && matchesSearch;
  });

  const paymentStatuses = ['All', 'Paid', 'Pending', 'Partially Paid', 'Overdue'];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header: Line 1 Title and Subtitle with visual divider */}
      <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-3">
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Rent & Financial Ledger</h1>
        <span className="hidden sm:inline text-cream-400 font-light">|</span>
        <p className="text-sm text-stone-600">Track monthly rent collections, outstanding balances & overdue escalations</p>
      </div>

      {/* Visual Horizontal Separator */}
      <hr className="border-t border-cream-300" />

      {/* Controls Line: Filters & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-wrap bg-cream-50 p-4 rounded-2xl border border-cream-300 shadow-xs">
        {/* Status Dropdown Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="payment-status-select" className="text-xs font-bold text-stone-600 uppercase tracking-wider">
            Payment Status:
          </label>
          <select
            id="payment-status-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white text-stone-800 text-xs font-semibold px-3 py-2 rounded-xl border border-cream-300 shadow-2xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden cursor-pointer"
          >
            {paymentStatuses.map(s => (
              <option key={s} value={s}>
                {s} ({s === 'All' ? dbState.payments.length : dbState.payments.filter(p => p.status === s).length})
              </option>
            ))}
          </select>
        </div>

        <input
          type="text"
          placeholder="Search tenant..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3.5 py-2 bg-white border border-cream-300 rounded-xl text-xs text-stone-800 placeholder-stone-400 shadow-2xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden w-64"
        />
      </div>

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-cream-50 p-4 rounded-xl border border-cream-300 shadow-xs">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">Expected Rent</span>
          <span className="text-2xl font-extrabold text-stone-900">{formatMoney(totalExpected)}</span>
        </div>
        <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-200 shadow-xs">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Total Collected</span>
          <span className="text-2xl font-extrabold text-emerald-700">{formatMoney(totalCollected)}</span>
        </div>
        <div className="bg-rose-50/40 p-4 rounded-xl border border-rose-200 shadow-xs">
          <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">Outstanding Balance</span>
          <span className="text-2xl font-extrabold text-rose-700">{formatMoney(totalOutstanding)}</span>
        </div>
        <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-200 shadow-xs">
          <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block">Overdue Accounts</span>
          <span className="text-2xl font-extrabold text-amber-800">{overdueCount} Tenants</span>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-cream-50 rounded-2xl border border-cream-300 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-cream-100/90 border-b border-cream-300 text-stone-600 uppercase tracking-wider font-bold">
                <th className="p-4">Tenant</th>
                <th className="p-4">Property & Unit</th>
                <th className="p-4">Due Date</th>
                <th className="p-4">Amount Due</th>
                <th className="p-4">Amount Paid</th>
                <th className="p-4">Balance</th>
                <th className="p-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.map(p => {
                const tenant = dbState.tenants.find(t => t.id === p.tenant_id);
                const lease = dbState.leases.find(l => l.id === p.lease_id);
                const unit = lease ? dbState.units.find(u => u.id === lease.unit_id) : undefined;
                const property = unit ? dbState.properties.find(prop => prop.id === unit.property_id) : undefined;

                const balance = p.amount_due - p.amount_paid;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-bold text-slate-900">{tenant?.first_name} {tenant?.last_name}</td>
                    <td className="p-4 text-slate-700 font-medium">{property?.name} (Unit {unit?.unit_number})</td>
                    <td className="p-4 text-slate-600 font-medium">{p.due_date}</td>
                    <td className="p-4 font-bold text-slate-900">{formatMoney(p.amount_due)}</td>
                    <td className="p-4 text-emerald-600 font-bold">{formatMoney(p.amount_paid)}</td>
                    <td className="p-4 font-bold text-rose-600">{formatMoney(balance)}</td>
                    <td className="p-4 text-right">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        p.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                        p.status === 'Overdue' ? 'bg-rose-100 text-rose-800 animate-pulse' :
                        p.status === 'Partially Paid' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {p.status}
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
