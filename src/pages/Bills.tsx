import React, { useState, useMemo } from 'react';
import { Receipt, Plus, Eye, Paperclip, FileText } from 'lucide-react';
import { DatabaseState } from '../services/supabase';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { useCurrency, CurrencyCode } from '../context/CurrencyContext';
import { DualCurrencyDisplay } from '../components/DualCurrencyDisplay';
import { TimeframeFilterBar } from '../components/TimeframeFilterBar';
import { ReportTimeFrame, SortOrder, getDateRangeForTimeFrame } from '../services/reportGrouping';
import { PortalMediaModal, PortalMediaItem } from '../components/PortalMediaModal';

interface BillsProps {
  dbState: DatabaseState;
  onNavigateToLogs?: () => void;
}

export const BillsPage: React.FC<BillsProps> = ({ dbState }) => {
  const [ledgerMode, setLedgerMode] = useState<'expenses' | 'bills'>('expenses');
  const [timeFrame, setTimeFrame] = useState<ReportTimeFrame>('all');
  const [dateRange, setDateRange] = useState(() => getDateRangeForTimeFrame('all'));
  const [selectedQuarter, setSelectedQuarter] = useState<1 | 2 | 3 | 4>(() => {
    return (Math.floor(new Date().getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
  });
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [propertyFilter, setPropertyFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [activeMediaItem, setActiveMediaItem] = useState<PortalMediaItem | null>(null);
  const { formatMoney, convertToCAD, CURRENCIES: _c } = useCurrency() as any;

  const getPropertyCad = (amount: number, propertyId?: string): number => {
    if (!amount) return 0;
    const property = dbState.properties.find(p => p.id === propertyId);
    const nativeCurr: CurrencyCode =
      property?.acquisition?.acquisition_currency ||
      (property?.city === 'Lagos' || property?.city === 'Abuja' ? 'NGN' : 'CAD');
    return convertToCAD(amount, nativeCurr);
  };

  // Filtered Expenses
  const scopedExpenses = useMemo(() => {
    return (dbState.expenses || []).filter(e => {
      if (timeFrame !== 'all' && e.date) {
        if (e.date < dateRange.startDate || e.date > dateRange.endDate) return false;
      }
      if (propertyFilter !== 'All' && e.property_id !== propertyFilter) return false;
      if (statusFilter !== 'All' && e.payment_status !== statusFilter) return false;
      if (search.trim()) {
        const prop = dbState.properties.find(p => p.id === e.property_id);
        const vendor = dbState.vendors.find(v => v.id === e.vendor_id);
        const text = `${e.description} ${e.category} ${e.invoice_number || ''} ${prop?.name || ''} ${vendor?.company || ''}`.toLowerCase();
        if (!text.includes(search.toLowerCase())) return false;
      }
      return true;
    }).sort((a, b) => sortOrder === 'desc' ? (b.date || '').localeCompare(a.date || '') : (a.date || '').localeCompare(b.date || ''));
  }, [dbState.expenses, dbState.properties, dbState.vendors, timeFrame, dateRange, propertyFilter, statusFilter, search, sortOrder]);

  // Filtered Bills
  const scopedBills = useMemo(() => {
    return (dbState.bills || []).filter(b => {
      if (timeFrame !== 'all' && b.due_date) {
        if (b.due_date < dateRange.startDate || b.due_date > dateRange.endDate) return false;
      }
      if (propertyFilter !== 'All' && b.property_id !== propertyFilter) return false;
      if (statusFilter !== 'All' && b.status !== statusFilter) return false;
      if (search.trim()) {
        const prop = dbState.properties.find(p => p.id === b.property_id);
        const vendor = dbState.vendors.find(v => v.id === b.vendor_id);
        const text = `${b.bill_number} ${b.description} ${prop?.name || ''} ${vendor?.company || ''}`.toLowerCase();
        if (!text.includes(search.toLowerCase())) return false;
      }
      return true;
    }).sort((a, b) => sortOrder === 'desc' ? (b.due_date || '').localeCompare(a.due_date || '') : (a.due_date || '').localeCompare(b.due_date || ''));
  }, [dbState.bills, dbState.properties, dbState.vendors, timeFrame, dateRange, propertyFilter, statusFilter, search, sortOrder]);

  const totalBillsAmountCad = scopedBills.reduce((acc, b) => acc + getPropertyCad(b.amount, b.property_id), 0);
  const paidBillsCad = scopedBills.filter(b => b.status === 'Paid').reduce((acc, b) => acc + getPropertyCad(b.amount, b.property_id), 0);
  const pendingBillsCad = Math.max(0, totalBillsAmountCad - paidBillsCad);

  const totalOperatingExpensesCad = scopedExpenses.reduce((acc, e) => acc + getPropertyCad(e.amount, e.property_id), 0);

  const statusOptions = ledgerMode === 'expenses'
    ? ['All', 'Paid', 'Pending']
    : ['All', 'Due Soon', 'Pending', 'Overdue', 'Paid'];

  return (
    <div className="space-y-6">
      {/* Unified Timeframe Filter Bar */}
      <TimeframeFilterBar
        timeFrame={timeFrame}
        onTimeFrameChange={setTimeFrame}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        selectedQuarter={selectedQuarter}
        onQuarterChange={setSelectedQuarter}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
      />

      {/* Controls Line: Ledger Mode, Filters & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-wrap bg-cream-50 p-4 rounded-2xl border border-cream-300 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Ledger Switcher */}
          <div className="flex items-center bg-white p-1 rounded-xl border border-cream-200">
            <button
              onClick={() => { setLedgerMode('expenses'); setStatusFilter('All'); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                ledgerMode === 'expenses' ? 'bg-slate-900 text-white shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Operating Expenses ({scopedExpenses.length})
            </button>
            <button
              onClick={() => { setLedgerMode('bills'); setStatusFilter('All'); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                ledgerMode === 'bills' ? 'bg-slate-900 text-white shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Vendor Bills & Invoices ({scopedBills.length})
            </button>
          </div>

          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className="bg-white text-stone-800 text-xs font-semibold px-3 py-2 rounded-xl border border-cream-300 shadow-2xs cursor-pointer"
          >
            <option value="All">All Properties ({dbState.properties.length})</option>
            {dbState.properties.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white text-stone-800 text-xs font-semibold px-3 py-2 rounded-xl border border-cream-300 shadow-2xs cursor-pointer"
          >
            {statusOptions.map(s => (
              <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Search description, invoice, property..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3.5 py-2 bg-white border border-cream-300 rounded-xl text-xs text-stone-800 placeholder-stone-400 shadow-2xs w-56"
          />
          <button
            onClick={() => setIsAddExpenseOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Record Operating Expense
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-rose-50/40 p-4 rounded-xl border border-rose-200 shadow-xs">
          <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">Logged Operating Expenses</span>
          <span className="text-2xl font-extrabold text-rose-700">{formatMoney(totalOperatingExpensesCad)}</span>
          <span className="text-[11px] text-rose-600 block mt-0.5">{scopedExpenses.length} expense entries</span>
        </div>
        <div className="bg-cream-50 p-4 rounded-xl border border-cream-300 shadow-xs">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">Total Vendor Bills</span>
          <span className="text-2xl font-extrabold text-stone-900">{formatMoney(totalBillsAmountCad)}</span>
          <span className="text-[11px] text-stone-500 block mt-0.5">{scopedBills.length} vendor invoices</span>
        </div>
        <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-200 shadow-xs">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Bills Paid</span>
          <span className="text-2xl font-extrabold text-emerald-700">{formatMoney(paidBillsCad)}</span>
        </div>
        <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-200 shadow-xs">
          <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block">Pending Accounts Payable</span>
          <span className="text-2xl font-extrabold text-amber-800">{formatMoney(pendingBillsCad)}</span>
        </div>
      </div>

      {/* OPERATING EXPENSES TABLE */}
      {ledgerMode === 'expenses' && (
        <div className="bg-cream-50 rounded-2xl border border-cream-300 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-cream-100/90 border-b border-cream-300 text-stone-600 uppercase tracking-wider font-bold">
                  <th className="p-4">Date & Invoice</th>
                  <th className="p-4">Target Asset / Unit</th>
                  <th className="p-4">Category & Vendor</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Proofs</th>
                  <th className="p-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scopedExpenses.map(exp => {
                  const property = dbState.properties.find(p => p.id === exp.property_id);
                  const unit = exp.unit_id ? dbState.units.find(u => u.id === exp.unit_id) : undefined;
                  const vendor = exp.vendor_id ? dbState.vendors.find(v => v.id === exp.vendor_id) : undefined;
                  const nativeCurr: CurrencyCode =
                    property?.acquisition?.acquisition_currency ||
                    (property?.city === 'Lagos' || property?.city === 'Abuja' ? 'NGN' : 'CAD');

                  return (
                    <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <span className="font-bold text-slate-900 block">{exp.date}</span>
                        <span className="text-[10px] font-mono text-slate-500">{exp.invoice_number || exp.id.slice(0, 10)}</span>
                      </td>
                      <td className="p-4 text-slate-700">
                        <span className="font-semibold block">{property?.name || 'Portfolio'}</span>
                        {unit ? (
                          <span className="text-[11px] font-bold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200 inline-block mt-0.5">
                            Unit {unit.unit_number}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Whole Building</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-slate-800 block">{exp.category}</span>
                        <span className="text-[11px] text-slate-500">{vendor?.company || vendor?.name || 'Direct Vendor'}</span>
                      </td>
                      <td className="p-4 text-slate-600 max-w-xs">{exp.description}</td>
                      <td className="p-4 font-extrabold text-rose-700">
                        <DualCurrencyDisplay
                          amount={exp.amount}
                          nativeCurrency={nativeCurr}
                          primaryClassName="font-extrabold text-rose-700"
                          secondaryClassName="text-[10px] text-stone-400 block"
                        />
                      </td>
                      <td className="p-4">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveMediaItem({
                              type: 'document',
                              url: exp.receipt_url || `/documents/expenses/${exp.id}.pdf`,
                              title: exp.proofs?.[0]?.file_name || `Expense_Voucher_${exp.invoice_number || exp.id}.pdf`,
                              propertyName: property?.name,
                              unitNumber: unit?.unit_number,
                              vendorOrAuditor: vendor?.company || vendor?.name || 'PropertyFlow Operations',
                              date: exp.date,
                              status: exp.payment_status,
                              referenceId: exp.invoice_number || exp.id.toUpperCase(),
                              caption: exp.description
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg text-[11px] font-bold text-stone-700 cursor-pointer"
                        >
                          <Paperclip className="w-3 h-3 text-brand-600" />
                          {(exp.proofs?.length || 1)} Doc
                        </button>
                      </td>
                      <td className="p-4 text-right">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          exp.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {exp.payment_status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VENDOR BILLS TABLE */}
      {ledgerMode === 'bills' && (
        <div className="bg-cream-50 rounded-2xl border border-cream-300 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-cream-100/90 border-b border-cream-300 text-stone-600 uppercase tracking-wider font-bold">
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
                {scopedBills.map(bill => {
                  const vendor = dbState.vendors.find(v => v.id === bill.vendor_id);
                  const property = dbState.properties.find(p => p.id === bill.property_id);
                  const unit = bill.unit_id ? dbState.units.find(u => u.id === bill.unit_id) : undefined;
                  const nativeCurr: CurrencyCode =
                    property?.acquisition?.acquisition_currency ||
                    (property?.city === 'Lagos' || property?.city === 'Abuja' ? 'NGN' : 'CAD');

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
                      <td className="p-4 font-extrabold text-slate-900">
                        <DualCurrencyDisplay
                          amount={bill.amount}
                          nativeCurrency={nativeCurr}
                          primaryClassName="font-extrabold text-slate-900"
                          secondaryClassName="text-[10px] text-stone-400 block"
                        />
                      </td>
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
      )}

      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        dbState={dbState}
      />

      <PortalMediaModal
        item={activeMediaItem}
        onClose={() => setActiveMediaItem(null)}
      />
    </div>
  );
};
