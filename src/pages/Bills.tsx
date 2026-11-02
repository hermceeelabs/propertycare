import React, { useState } from 'react';
import { Receipt, DollarSign, Play, AlertCircle, CheckCircle2, Plus, Building2, Home } from 'lucide-react';
import { DatabaseState } from '../services/supabase';
import { AutomationEngine, ExecutionResult } from '../services/automationEngine';
import { AutomationRunModal } from '../components/AutomationRunModal';
import { AddExpenseModal } from '../components/AddExpenseModal';

interface BillsProps {
  dbState: DatabaseState;
  onNavigateToLogs?: () => void;
}

export const BillsPage: React.FC<BillsProps> = ({ dbState, onNavigateToLogs }) => {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [runResult, setRunResult] = useState<ExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  const filteredBills = dbState.bills.filter(b => {
    if (statusFilter === 'All') return true;
    return b.status === statusFilter;
  });

  const totalBillsAmount = dbState.bills.reduce((acc, b) => acc + b.amount, 0);
  const paidAmount = dbState.bills.filter(b => b.status === 'Paid').reduce((acc, b) => acc + b.amount, 0);
  const pendingAmount = totalBillsAmount - paidAmount;

  const totalOperatingExpenses = (dbState.expenses || []).reduce((acc, e) => acc + e.amount, 0);

  const handleRunBillReminders = async () => {
    setIsRunning(true);
    const res = await AutomationEngine.runBillReminderAutomation();
    setRunResult(res);
    setIsRunning(false);
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Operating Expenses & Vendor Invoices</h1>
          <p className="text-sm text-slate-500">Track property operating expenditure, contractor bills, unit-specific repairs & automated payment alerts</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddExpenseOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Record Operating Expense
          </button>

          <button
            onClick={handleRunBillReminders}
            disabled={isRunning}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Run Bill Due Date Check
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Billed Invoices</span>
          <span className="text-2xl font-extrabold text-slate-900">${totalBillsAmount.toFixed(2)} CAD</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/40 shadow-xs">
          <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">Total Logged Expenses</span>
          <span className="text-2xl font-extrabold text-rose-700">${totalOperatingExpenses.toFixed(2)} CAD</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-xs">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">Invoices Paid</span>
          <span className="text-2xl font-extrabold text-emerald-600">${paidAmount.toFixed(2)} CAD</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/40 shadow-xs">
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">Pending Accounts Payable</span>
          <span className="text-2xl font-extrabold text-amber-700">${pendingAmount.toFixed(2)} CAD</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        {['All', 'Due Soon', 'Pending', 'Overdue', 'Paid'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === s
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {s} ({s === 'All' ? dbState.bills.length : dbState.bills.filter(b => b.status === s).length})
          </button>
        ))}
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                <th className="p-4">Invoice #</th>
                <th className="p-4">Vendor</th>
                <th className="p-4">Target Asset</th>
                <th className="p-4">Description</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Due Date</th>
                <th className="p-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBills.map(bill => {
                const vendor = dbState.vendors.find(v => v.id === bill.vendor_id);
                const property = dbState.properties.find(p => p.id === bill.property_id);
                const unit = bill.unit_id ? dbState.units.find(u => u.id === bill.unit_id) : undefined;

                return (
                  <tr key={bill.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-extrabold text-slate-900">{bill.bill_number}</td>
                    <td className="p-4">
                      <span className="font-bold text-slate-800 block">{vendor?.name || 'External Contractor'}</span>
                      <span className="text-[11px] text-slate-400">{vendor?.category}</span>
                    </td>
                    <td className="p-4 text-slate-700">
                      <span className="font-semibold block">{property?.name}</span>
                      {unit ? (
                        <span className="text-[11px] font-bold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200 inline-block mt-0.5">
                          Unit {unit.unit_number}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Whole Building</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-600 max-w-xs">{bill.description}</td>
                    <td className="p-4 font-extrabold text-slate-900">${bill.amount.toFixed(2)} CAD</td>
                    <td className="p-4 font-medium text-slate-700">{bill.due_date}</td>
                    <td className="p-4 text-right">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        bill.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                        bill.status === 'Due Soon' ? 'bg-blue-100 text-blue-800' :
                        bill.status === 'Overdue' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {bill.status}
                      </span>
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
      />

      {/* Execution Feedback Modal */}
      {runResult && (
        <AutomationRunModal
          result={runResult}
          onClose={() => setRunResult(null)}
          onViewLogs={onNavigateToLogs}
        />
      )}
    </div>
  );
};
