import React, { useState, useMemo } from 'react';
import { DatabaseState } from '../services/supabase';
import { useCurrency, CurrencyCode } from '../context/CurrencyContext';
import { DualCurrencyDisplay } from '../components/DualCurrencyDisplay';
import { TimeframeFilterBar } from '../components/TimeframeFilterBar';
import { ReportTimeFrame, SortOrder, getDateRangeForTimeFrame } from '../services/reportGrouping';

interface PaymentsProps {
  dbState: DatabaseState;
}

export const PaymentsPage: React.FC<PaymentsProps> = ({ dbState }) => {
  const [timeFrame, setTimeFrame] = useState<ReportTimeFrame>('all');
  const [dateRange, setDateRange] = useState(() => getDateRangeForTimeFrame('all'));
  const [selectedQuarter, setSelectedQuarter] = useState<1 | 2 | 3 | 4>(() => {
    return (Math.floor(new Date().getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
  });
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [propertyFilter, setPropertyFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const { formatMoney, convertToCAD } = useCurrency();

  // Helper to determine payment's native currency & convert to CAD base for portfolio aggregations
  const getPaymentInCad = (amount: number, leaseId?: string): number => {
    if (!amount) return 0;
    const lease = dbState.leases.find(l => l.id === leaseId);
    const unit = lease ? dbState.units.find(u => u.id === lease.unit_id) : undefined;
    const property = unit ? dbState.properties.find(p => p.id === unit.property_id) : undefined;
    const nativeCurr: CurrencyCode =
      property?.acquisition?.acquisition_currency ||
      (property?.city === 'Lagos' || property?.city === 'Abuja' ? 'NGN' : 'CAD');
    return convertToCAD(amount, nativeCurr);
  };

  // Payments filtered by timeframe & property (used for KPIs and status counts)
  const scopedPayments = useMemo(() => {
    return dbState.payments.filter(p => {
      const dateStr = p.payment_date || p.due_date || '';
      if (timeFrame !== 'all' && dateStr) {
        if (dateStr < dateRange.startDate || dateStr > dateRange.endDate) return false;
      }
      if (propertyFilter !== 'All') {
        const lease = dbState.leases.find(l => l.id === p.lease_id);
        const unit = lease ? dbState.units.find(u => u.id === lease.unit_id) : undefined;
        if (unit?.property_id !== propertyFilter) return false;
      }
      return true;
    });
  }, [dbState.payments, dbState.leases, dbState.units, timeFrame, dateRange, propertyFilter]);

  const totalExpected = scopedPayments.reduce((acc, p) => acc + getPaymentInCad(p.amount_due, p.lease_id), 0);
  const totalCollected = scopedPayments.reduce((acc, p) => acc + getPaymentInCad(p.amount_paid || 0, p.lease_id), 0);
  const totalOutstanding = Math.max(0, totalExpected - totalCollected);
  const overdueCount = scopedPayments.filter(p => p.status === 'Overdue' || p.status === 'Late').length;

  const filteredPayments = useMemo(() => {
    const list = scopedPayments.filter(p => {
      const tenant = dbState.tenants.find(t => t.id === p.tenant_id);
      const lease = dbState.leases.find(l => l.id === p.lease_id);
      const unit = lease ? dbState.units.find(u => u.id === lease.unit_id) : undefined;
      const property = unit ? dbState.properties.find(prop => prop.id === unit.property_id) : undefined;
      const searchTarget = `${tenant?.first_name || ''} ${tenant?.last_name || ''} ${property?.name || ''} ${unit?.unit_number || ''} ${p.id}`.toLowerCase();
      const matchesSearch = searchTarget.includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
      return matchesStatus && matchesSearch;
    });
    return [...list].sort((a, b) => {
      const da = a.payment_date || a.due_date || '';
      const db = b.payment_date || b.due_date || '';
      return sortOrder === 'desc' ? db.localeCompare(da) : da.localeCompare(db);
    });
  }, [scopedPayments, dbState.tenants, dbState.leases, dbState.units, dbState.properties, search, statusFilter, sortOrder]);

  const paymentStatuses = ['All', 'Paid', 'Pending', 'Partially Paid', 'Overdue'];

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

      {/* Controls Line: Filters & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-wrap bg-cream-50 p-4 rounded-2xl border border-cream-300 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Dropdown Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="payment-status-select" className="text-xs font-bold text-stone-600 uppercase tracking-wider">
              Status:
            </label>
            <select
              id="payment-status-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white text-stone-800 text-xs font-semibold px-3 py-2 rounded-xl border border-cream-300 shadow-2xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden cursor-pointer"
            >
              {paymentStatuses.map(s => (
                <option key={s} value={s}>
                  {s} ({s === 'All' ? scopedPayments.length : scopedPayments.filter(p => p.status === s).length})
                </option>
              ))}
            </select>
          </div>

          {/* Property Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="payment-property-select" className="text-xs font-bold text-stone-600 uppercase tracking-wider">
              Property:
            </label>
            <select
              id="payment-property-select"
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="bg-white text-stone-800 text-xs font-semibold px-3 py-2 rounded-xl border border-cream-300 shadow-2xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden cursor-pointer"
            >
              <option value="All">All Properties ({dbState.properties.length})</option>
              {dbState.properties.map(prop => (
                <option key={prop.id} value={prop.id}>{prop.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-500 font-semibold">
            Showing <strong>{filteredPayments.length}</strong> records
          </span>
          <input
            type="text"
            placeholder="Search tenant, property, unit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3.5 py-2 bg-white border border-cream-300 rounded-xl text-xs text-stone-800 placeholder-stone-400 shadow-2xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden w-64"
          />
        </div>
      </div>

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-cream-50 p-4 rounded-xl border border-cream-300 shadow-xs min-w-0 overflow-hidden">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block truncate">Expected Rent</span>
          <span className="text-xl sm:text-2xl font-extrabold text-stone-900 truncate block" title={formatMoney(totalExpected)}>
            {formatMoney(totalExpected)}
          </span>
        </div>
        <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-200 shadow-xs min-w-0 overflow-hidden">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block truncate">Total Collected</span>
          <span className="text-xl sm:text-2xl font-extrabold text-emerald-700 truncate block" title={formatMoney(totalCollected)}>
            {formatMoney(totalCollected)}
          </span>
        </div>
        <div className="bg-rose-50/40 p-4 rounded-xl border border-rose-200 shadow-xs min-w-0 overflow-hidden">
          <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block truncate">Outstanding Balance</span>
          <span className="text-xl sm:text-2xl font-extrabold text-rose-700 truncate block" title={formatMoney(totalOutstanding)}>
            {formatMoney(totalOutstanding)}
          </span>
        </div>
        <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-200 shadow-xs min-w-0 overflow-hidden">
          <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block truncate">Overdue Accounts</span>
          <span className="text-xl sm:text-2xl font-extrabold text-amber-800 truncate block">
            {overdueCount} Records
          </span>
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
                <th className="p-4">Due / Paid Date</th>
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
                const nativeCurr: CurrencyCode =
                  property?.acquisition?.acquisition_currency ||
                  (property?.city === 'Lagos' || property?.city === 'Abuja' ? 'NGN' : 'CAD');

                const balance = Math.max(0, (p.amount_due || 0) - (p.amount_paid || 0));

                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-bold text-slate-900">
                      {tenant ? `${tenant.first_name} ${tenant.last_name}` : p.tenant_snapshot?.tenant_name || 'Resident'}
                    </td>
                    <td className="p-4 text-slate-700 font-medium">
                      {property?.name || p.tenant_snapshot?.property_name || 'Property'} (Unit {unit?.unit_number || p.tenant_snapshot?.unit_number || '—'})
                    </td>
                    <td className="p-4 text-slate-600 font-medium">
                      <span className="block">{p.due_date}</span>
                      {p.payment_date && (
                        <span className="text-[10px] text-emerald-700 font-semibold">Paid: {p.payment_date}</span>
                      )}
                    </td>
                    <td className="p-4 font-bold text-slate-900">
                      <DualCurrencyDisplay
                        amount={p.amount_due}
                        nativeCurrency={nativeCurr}
                        primaryClassName="font-bold text-slate-900"
                        secondaryClassName="text-[10px] text-stone-400 block"
                      />
                    </td>
                    <td className="p-4 text-emerald-600 font-bold">
                      <DualCurrencyDisplay
                        amount={p.amount_paid}
                        nativeCurrency={nativeCurr}
                        primaryClassName="font-bold text-emerald-600"
                        secondaryClassName="text-[10px] text-stone-400 block"
                      />
                    </td>
                    <td className="p-4 font-bold text-rose-600">
                      <DualCurrencyDisplay
                        amount={balance}
                        nativeCurrency={nativeCurr}
                        primaryClassName="font-bold text-rose-600"
                        secondaryClassName="text-[10px] text-stone-400 block"
                      />
                    </td>
                    <td className="p-4 text-right">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        p.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                        p.status === 'Overdue' ? 'bg-rose-100 text-rose-800' :
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
