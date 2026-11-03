import React, { useState } from 'react';
import { CreditCard, DollarSign, Play, AlertCircle, CheckCircle2, Search, Filter } from 'lucide-react';
import { DatabaseState } from '../services/supabase';
import { AutomationEngine, ExecutionResult } from '../services/automationEngine';
import { AutomationRunModal } from '../components/AutomationRunModal';

interface PaymentsProps {
  dbState: DatabaseState;
  onNavigateToCommunications?: () => void;
  onNavigateToLogs?: () => void;
}

export const PaymentsPage: React.FC<PaymentsProps> = ({
  dbState,
  onNavigateToCommunications,
  onNavigateToLogs
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [runResult, setRunResult] = useState<ExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const totalExpected = dbState.payments.reduce((acc, p) => acc + p.amount_due, 0);
  const totalCollected = dbState.payments.reduce((acc, p) => acc + p.amount_paid, 0);
  const totalOutstanding = totalExpected - totalCollected;
  const overdueCount = dbState.payments.filter(p => p.status === 'Overdue').length;

  const filteredPayments = dbState.payments.filter(p => {
    if (statusFilter === 'All') return true;
    return p.status === statusFilter;
  });

  const handleRunRentReminders = async () => {
    setIsRunning(true);
    const res = await AutomationEngine.runRentReminderAutomation();
    setRunResult(res);
    setIsRunning(false);
  };

  const handleRunOverdueCheck = async () => {
    setIsRunning(true);
    const res = await AutomationEngine.runOverduePaymentCheck();
    setRunResult(res);
    setIsRunning(false);
  };

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

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRunRentReminders}
            disabled={isRunning}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Run Rent Reminders
          </button>
          <button
            onClick={handleRunOverdueCheck}
            disabled={isRunning}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <AlertCircle className="w-3.5 h-3.5" /> Check Overdue Arrears (N4)
          </button>
        </div>
      </div>

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-cream-50 p-4 rounded-xl border border-cream-300 shadow-xs">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">Expected Rent</span>
          <span className="text-2xl font-extrabold text-stone-900">${totalExpected.toLocaleString()}</span>
        </div>
        <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-200 shadow-xs">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Total Collected</span>
          <span className="text-2xl font-extrabold text-emerald-700">${totalCollected.toLocaleString()}</span>
        </div>
        <div className="bg-rose-50/40 p-4 rounded-xl border border-rose-200 shadow-xs">
          <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">Outstanding Balance</span>
          <span className="text-2xl font-extrabold text-rose-700">${totalOutstanding.toLocaleString()}</span>
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
                    <td className="p-4 font-bold text-slate-900">${p.amount_due.toFixed(2)}</td>
                    <td className="p-4 text-emerald-600 font-bold">${p.amount_paid.toFixed(2)}</td>
                    <td className="p-4 font-bold text-rose-600">${balance.toFixed(2)}</td>
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

      <AutomationRunModal
        result={runResult}
        onClose={() => setRunResult(null)}
        onViewCommunications={onNavigateToCommunications}
        onViewLogs={onNavigateToLogs}
      />
    </div>
  );
};
