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

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rent & Financial Ledger</h1>
          <p className="text-sm text-slate-500">Track monthly rent collections, outstanding balances & overdue escalations</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunRentReminders}
            disabled={isRunning}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Run Rent Reminders
          </button>
          <button
            onClick={handleRunOverdueCheck}
            disabled={isRunning}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <AlertCircle className="w-3.5 h-3.5" /> Check Overdue Arrears (N4)
          </button>
        </div>
      </div>

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Expected Rent</span>
          <span className="text-2xl font-extrabold text-slate-900">${totalExpected.toLocaleString()} CAD</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-xs">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">Total Collected</span>
          <span className="text-2xl font-extrabold text-emerald-600">${totalCollected.toLocaleString()} CAD</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/40 shadow-xs">
          <span className="text-xs font-bold text-rose-700 uppercase tracking-wider block">Outstanding Balance</span>
          <span className="text-2xl font-extrabold text-rose-600">${totalOutstanding.toLocaleString()} CAD</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/40 shadow-xs">
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">Overdue Accounts</span>
          <span className="text-2xl font-extrabold text-amber-700">{overdueCount} Tenants</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        {['All', 'Paid', 'Pending', 'Partially Paid', 'Overdue'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === status
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {status} ({status === 'All' ? dbState.payments.length : dbState.payments.filter(p => p.status === status).length})
          </button>
        ))}
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
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
