import React, { useState } from 'react';
import {
  Calendar, Clock, DollarSign, TrendingUp, Sparkles, Building2, Wrench,
  ShieldCheck, FileText, Bell, ChevronLeft, ChevronRight, CheckCircle2,
  AlertCircle, Download, Printer, User, Filter, ArrowUpRight, ArrowDownRight,
  ClipboardCheck, Eye, Search, Landmark, ArrowDownWideNarrow, ArrowUpNarrowWide
} from 'lucide-react';
import { DatabaseState, supabase } from '../services/supabase';
import { useCurrency, CurrencyCode } from '../context/CurrencyContext';
import { StaffReportView } from '../components/StaffReportView';
import { UserProfile } from '../types/database';
import { SortOrder } from '../services/reportGrouping';

interface ReportsProps {
  dbState: DatabaseState;
}

export const ReportsPage: React.FC<ReportsProps> = ({ dbState }) => {
  const { formatMoney, convertToCAD, currencyConfig } = useCurrency();
  const [reportView, setReportView] = useState<'daily' | 'landlords' | 'staff' | 'capital'>('daily');
  const [selectedDate, setSelectedDate] = useState('2026-08-20');
  const [landlordFilter, setLandlordFilter] = useState('All');
  const [dailyDateSortOrder, setDailyDateSortOrder] = useState<SortOrder>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [staffProfiles, setStaffProfiles] = useState<UserProfile[]>([]);

  // Fetch staff list for the Staff Performance tab
  React.useEffect(() => {
    supabase
      .from('staffs')
      .select('*')
      .then(({ data }) => {
        if (data) setStaffProfiles(data as UserProfile[]);
      });
  }, []);

  // 1. Gather all unique event dates across the system
  const allRecordedDates = React.useMemo(() => {
    const raw = Array.from(new Set([
      ...dbState.payments.map(p => p.payment_date).filter(Boolean),
      ...dbState.shortlet_bookings.map(b => b.check_in).filter(Boolean),
      ...dbState.shortlet_bookings.map(b => b.check_out).filter(Boolean),
      ...dbState.expenses.map(e => e.date).filter(Boolean),
      ...dbState.maintenance_requests.map(m => m.created_at?.slice(0, 10)).filter(Boolean),
      ...dbState.notices.map(n => n.created_at?.slice(0, 10)).filter(Boolean),
      ...dbState.communications.map(c => c.sent_at?.slice(0, 10)).filter(Boolean),
      ...(dbState.inspections || []).map(i => i.scheduled_date).filter(Boolean),
    ])).sort();
    return dailyDateSortOrder === 'desc' ? raw.reverse() : raw;
  }, [dbState, dailyDateSortOrder]);

  const activeDate = selectedDate || allRecordedDates[0] || '2026-08-20';

  // 2. Filter daily activity feed for selectedDate
  const dayPayments = dbState.payments.filter(p => p.payment_date === activeDate);
  const dayCheckIns = dbState.shortlet_bookings.filter(b => b.check_in === activeDate);
  const dayCheckOuts = dbState.shortlet_bookings.filter(b => b.check_out === activeDate);
  const dayExpenses = dbState.expenses.filter(e => e.date === activeDate);
  const dayMaintenance = dbState.maintenance_requests.filter(m => m.created_at?.startsWith(activeDate));
  const dayNotices = dbState.notices.filter(n => n.created_at?.startsWith(activeDate));
  const dayComms = dbState.communications.filter(c => c.sent_at?.startsWith(activeDate));
  const dayInspections = (dbState.inspections || []).filter(i => i.scheduled_date === activeDate);

  // Financial aggregates for the selected day (normalized to base CAD then converted)
  const dayInflowCad = dayPayments.reduce((acc, p) => {
    const lease = dbState.leases.find(l => l.id === p.lease_id);
    const unit = lease ? dbState.units.find(u => u.id === lease.unit_id) : undefined;
    const prop = unit ? dbState.properties.find(pr => pr.id === unit.property_id) : undefined;
    const curr: CurrencyCode = prop?.acquisition?.acquisition_currency || (prop?.city === 'Lagos' || prop?.city === 'Abuja' ? 'NGN' : 'CAD');
    return acc + convertToCAD(p.amount_paid || 0, curr);
  }, 0);

  const dayShortletCad = dayCheckIns.reduce((acc, b) => {
    const unit = dbState.units.find(u => u.id === b.unit_id);
    const prop = unit ? dbState.properties.find(pr => pr.id === unit.property_id) : undefined;
    const curr: CurrencyCode = prop?.acquisition?.acquisition_currency || (prop?.city === 'Lagos' || prop?.city === 'Abuja' ? 'NGN' : 'CAD');
    return acc + convertToCAD(b.total_payout || 0, curr);
  }, 0);

  const dayOutflowCad = dayExpenses.reduce((acc, e) => {
    const prop = dbState.properties.find(pr => pr.id === e.property_id);
    const curr: CurrencyCode = prop?.acquisition?.acquisition_currency || (prop?.city === 'Lagos' || prop?.city === 'Abuja' ? 'NGN' : 'CAD');
    return acc + convertToCAD(e.amount || 0, curr);
  }, 0);

  const totalDayRevenueCad = dayInflowCad + dayShortletCad;
  const netDayCashFlowCad = totalDayRevenueCad - dayOutflowCad;

  // 3. Landlord-specific reporting data
  const landlordReports = (dbState.landlords || []).map(landlord => {
    const ownedProps = dbState.properties.filter(p => p.landlord_id === landlord.id);
    const propIds = ownedProps.map(p => p.id);
    const ownedUnits = dbState.units.filter(u => propIds.includes(u.property_id));
    const occupiedUnits = ownedUnits.filter(u => u.status === 'Occupied');
    const occupancyRate = ownedUnits.length > 0 ? Math.round((occupiedUnits.length / ownedUnits.length) * 100) : 100;

    const grossRent = occupiedUnits.reduce((acc, u) => acc + (u.monthly_rent || 0), 0);
    const mgmtFee = occupiedUnits.reduce((acc, u) => {
      const prop = ownedProps.find(p => p.id === u.property_id);
      const feePct = u.management_fee_percentage ?? prop?.landlord_contract?.management_fee_percentage ?? 10;
      return acc + Math.round(((u.monthly_rent || 0) * feePct) / 100);
    }, 0);
    const expenses = (dbState.expenses || []).filter(e => propIds.includes(e.property_id));
    const repairCosts = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    const netRemittance = Math.max(0, grossRent - mgmtFee - repairCosts);

    const activeTickets = dbState.maintenance_requests.filter(m => {
      const u = dbState.units.find(unit => unit.id === m.unit_id);
      return (u && propIds.includes(u.property_id)) || (m.property_id && propIds.includes(m.property_id));
    });

    const audits = (dbState.inspections || []).filter(i => propIds.includes(i.property_id));

    return {
      landlord,
      ownedProps,
      ownedUnits,
      occupiedCount: occupiedUnits.length,
      occupancyRate,
      grossRent,
      mgmtFee,
      repairCosts,
      netRemittance,
      expenses,
      activeTickets,
      audits
    };
  }).filter(r => landlordFilter === 'All' || r.landlord.id === landlordFilter);

  // Capital break-even matrix calculation
  const propertyProfitData = dbState.properties.map(p => {
    const pUnits = dbState.units.filter(u => u.property_id === p.id);
    const revenue = pUnits.filter(u => u.status === 'Occupied').reduce((acc, u) => acc + u.monthly_rent, 0);
    const pExpenses = (dbState.expenses || []).filter(e => e.property_id === p.id);
    const operatingExpense = pExpenses.reduce((acc, e) => acc + e.amount, 0);
    const masterLeaseMonthly = p.acquisition?.acquisition_type === 'Long-Term Lease'
      ? (p.acquisition.monthly_lease_cost || 0)
      : 0;
    const totalCost = operatingExpense + masterLeaseMonthly;
    const netProfit = revenue - totalCost;
    const initialOutlay = p.acquisition?.down_payment_or_deposit || 0;
    const annualNet = netProfit * 12;
    const breakEvenYears = annualNet > 0 && initialOutlay > 0 ? (initialOutlay / annualNet) : 0;

    return {
      name: p.name.split(' ')[0],
      fullName: p.name,
      acquisitionType: p.acquisition?.acquisition_type || 'Outright Purchase',
      initialEquity: initialOutlay,
      Revenue: revenue,
      Expenses: Math.round(totalCost),
      Profit: Math.round(netProfit),
      breakEvenYears: parseFloat(breakEvenYears.toFixed(1))
    };
  });

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header Banner: Strict Single Line Title & Description */}
      <div className="flex items-baseline gap-2 sm:gap-3 overflow-hidden">
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight whitespace-nowrap shrink-0">
          Executive Intelligence & Daily Audit Reports
        </h1>
        <span className="text-cream-400 font-light shrink-0">|</span>
        <p className="text-sm text-stone-600 truncate">
          Automated daily operational journal, landlord remittances & asset break-even
        </p>
      </div>

      {/* Decorative Divider */}
      <hr className="border-t border-slate-800/80 print:hidden" />

      {/* View Switcher Tabs Bar */}
      <div className="flex items-center justify-between gap-4 print:hidden">
        <div className="flex items-center bg-cream-100 p-1 rounded-2xl border border-cream-300">
          <button
            onClick={() => setReportView('daily')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              reportView === 'daily'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Company Daily Journal
          </button>
          <button
            onClick={() => setReportView('landlords')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              reportView === 'landlords'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" /> Landlord Statements
          </button>
          <button
            onClick={() => setReportView('staff')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              reportView === 'staff'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
            }`}
          >
            <User className="w-3.5 h-3.5" /> Staff Operations Journal
          </button>
          <button
            onClick={() => setReportView('capital')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              reportView === 'capital'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Capital Matrix
          </button>
        </div>
      </div>

      {/* Demarcation Divider */}
      <hr className="border-t border-slate-800/80" />

      {/* ============================================================== */}
      {/* VIEW 1: COMPANY AUTOMATED DAILY OPERATIONAL JOURNAL             */}
      {/* ============================================================== */}
      {reportView === 'daily' && (
        <div className="space-y-6">
          {/* Date Selector Bar */}
          <div className="bg-cream-50 p-4 rounded-2xl border border-cream-300 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-brand-600" />
              <div>
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">Journal Audit Date:</span>
                <span className="text-sm font-extrabold text-stone-900">
                  {new Date(activeDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
            </div>

            {/* Quick Date Navigator & Sort Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-stone-600">Select Date:</span>
              <select
                value={activeDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 bg-white border border-cream-300 rounded-xl text-xs font-bold text-stone-800 shadow-2xs focus:ring-2 focus:ring-brand-500 cursor-pointer"
              >
                {allRecordedDates.slice(0, 15).map(dateStr => (
                  <option key={dateStr} value={dateStr}>
                    {dateStr} ({new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-cream-300 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setDailyDateSortOrder('desc')}
                  title="Sort Newest Dates First"
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    dailyDateSortOrder === 'desc'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                  }`}
                >
                  <ArrowDownWideNarrow className="w-3.5 h-3.5" />
                  <span>Desc</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDailyDateSortOrder('asc')}
                  title="Sort Oldest Dates First"
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    dailyDateSortOrder === 'asc'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                  }`}
                >
                  <ArrowUpNarrowWide className="w-3.5 h-3.5" />
                  <span>Asc</span>
                </button>
              </div>
            </div>
          </div>

          {/* Daily Financial Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">
                <span>Total Daily Collections</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-xl font-extrabold text-emerald-600 block">{formatMoney(totalDayRevenueCad)}</span>
              <p className="text-[11px] text-slate-400 mt-1">
                {dayPayments.length} Rent Pmt{dayPayments.length !== 1 ? 's' : ''} • {dayCheckIns.length} Shortlet Booking{dayCheckIns.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">
                <span>Daily Disbursements / Costs</span>
                <ArrowDownRight className="w-4 h-4 text-rose-600" />
              </div>
              <span className="text-xl font-extrabold text-rose-600 block">-{formatMoney(dayOutflowCad)}</span>
              <p className="text-[11px] text-slate-400 mt-1">{dayExpenses.length} Expense item{dayExpenses.length !== 1 ? 's' : ''} logged</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">
                <span>Net Daily Cash Inflow</span>
                <DollarSign className="w-4 h-4 text-brand-600" />
              </div>
              <span className={`text-xl font-extrabold block ${netDayCashFlowCad >= 0 ? 'text-brand-700' : 'text-rose-700'}`}>
                {formatMoney(netDayCashFlowCad)}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">Operating margin yield</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">
                <span>Field Operations Logged</span>
                <ClipboardCheck className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-xl font-extrabold text-slate-900 block">
                {dayInspections.length + dayMaintenance.length + dayNotices.length} Events
              </span>
              <p className="text-[11px] text-slate-400 mt-1">
                {dayInspections.length} Audit{dayInspections.length !== 1 ? 's' : ''} • {dayMaintenance.length} Ticket{dayMaintenance.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Timeline Feed: Detailed Chronological Journal for the Day */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Chronological Event Stream for {activeDate}</h2>
                <p className="text-xs text-slate-500">Auto-aggregated transactions, guest arrivals, physical inspections, and formal legal notices</p>
              </div>
              <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold text-xs rounded-full">
                {dayPayments.length + dayCheckIns.length + dayCheckOuts.length + dayExpenses.length + dayMaintenance.length + dayNotices.length + dayComms.length + dayInspections.length} Total Records
              </span>
            </div>

            <div className="space-y-4">
              {/* 1. Shortlet Check-Ins / Bookings */}
              {dayCheckIns.map(b => {
                const unit = dbState.units.find(u => u.id === b.unit_id);
                const prop = unit ? dbState.properties.find(p => p.id === unit.property_id) : undefined;
                return (
                  <div key={b.id} className="p-4 rounded-xl bg-purple-50/60 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-200 text-purple-800 rounded-xl mt-0.5">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-purple-900 uppercase">Shortlet Guest Arrival</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-200 text-purple-900 font-extrabold">{b.platform_source}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">{b.booking_status}</span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm mt-0.5">
                          {b.guest_name} — Suite {unit?.unit_number} ({prop?.name})
                        </h4>
                        <p className="text-xs text-slate-500">
                          {b.nights_count} Nights (Check-out: {b.check_out}) • Guest Tel: {b.guest_phone}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-sm text-purple-900 block">+{currencyConfig.symbol}{b.total_payout.toLocaleString()}</span>
                      <span className="text-[11px] text-purple-700">Nightly: {currencyConfig.symbol}{b.nightly_rate} + {currencyConfig.symbol}{b.cleaning_fee} cln</span>
                    </div>
                  </div>
                );
              })}

              {/* 2. Rent Payments Received */}
              {dayPayments.map(p => {
                const tenant = dbState.tenants.find(t => t.id === p.tenant_id);
                const lease = dbState.leases.find(l => l.id === p.lease_id);
                const unit = lease ? dbState.units.find(u => u.id === lease.unit_id) : undefined;
                const prop = unit ? dbState.properties.find(pr => pr.id === unit.property_id) : undefined;
                const nativeCurr: CurrencyCode = prop?.acquisition?.acquisition_currency || (prop?.city === 'Lagos' || prop?.city === 'Abuja' ? 'NGN' : 'CAD');
                return (
                  <div key={p.id} className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-emerald-200 text-emerald-800 rounded-xl mt-0.5">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-900 uppercase">Rent Payment Collected</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold">{p.status}</span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm mt-0.5">
                          {tenant?.first_name} {tenant?.last_name} — {prop?.name} (Unit {unit?.unit_number})
                        </h4>
                        <p className="text-xs text-slate-500">Due Date: {p.due_date} • Payment Date: {p.payment_date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-sm text-emerald-700 block">
                        +{formatMoney(convertToCAD(p.amount_paid, nativeCurr))}
                      </span>
                      <span className="text-[11px] text-slate-400">Total Due: {formatMoney(convertToCAD(p.amount_due, nativeCurr))}</span>
                    </div>
                  </div>
                );
              })}

              {/* 3. Physical Property Audits & Inspections */}
              {dayInspections.map(i => {
                const prop = dbState.properties.find(p => p.id === i.property_id);
                const unit = i.unit_id ? dbState.units.find(u => u.id === i.unit_id) : undefined;
                return (
                  <div key={i.id} className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-200 text-blue-800 rounded-xl mt-0.5">
                        <ClipboardCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-blue-900 uppercase">Field Inspection Conducted</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-200 text-blue-900 font-bold">{i.status}</span>
                          {i.overall_condition && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold">
                              Condition: {i.overall_condition}
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm mt-0.5">
                          {i.title} ({prop?.name} {unit ? `• Unit ${unit.unit_number}` : ''})
                        </h4>
                        <p className="text-xs text-slate-600 mt-0.5">{i.general_remarks}</p>
                        <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                          <span>Team Lead: <strong>{i.team_lead_name}</strong></span>
                          <span>•</span>
                          <span>Crew: {i.assigned_attendees.map(a => a.staff_name).join(', ')}</span>
                          {i.attachments && i.attachments.length > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-blue-700 font-semibold">{i.attachments.length} Media Attachment(s)</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {i.incurred_cost && i.incurred_cost > 0 ? (
                      <div className="text-right">
                        <span className="font-bold text-xs text-rose-700 block">Cost Incurred:</span>
                        <span className="font-extrabold text-sm text-rose-700">-{formatMoney(i.incurred_cost)}</span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                        Clean Pass
                      </span>
                    )}
                  </div>
                );
              })}

              {/* 4. Expenses & Operational Outlays */}
              {dayExpenses.map(e => {
                const prop = dbState.properties.find(p => p.id === e.property_id);
                const unit = e.unit_id ? dbState.units.find(u => u.id === e.unit_id) : undefined;
                return (
                  <div key={e.id} className="p-4 rounded-xl bg-rose-50/50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-rose-200 text-rose-800 rounded-xl mt-0.5">
                        <ArrowDownRight className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-rose-900 uppercase">Operational Expense Disbursed</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 font-bold">{e.category}</span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm mt-0.5">
                          {e.description} ({prop?.name} {unit ? `• Unit ${unit.unit_number}` : ''})
                        </h4>
                        <p className="text-xs text-slate-400">Payment Status: {e.payment_status} • Scope: {e.scope}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-sm text-rose-600 block">-{formatMoney(e.amount)}</span>
                    </div>
                  </div>
                );
              })}

              {/* 5. Maintenance Requests Logged */}
              {dayMaintenance.map(m => {
                const tenant = dbState.tenants.find(t => t.id === m.tenant_id);
                const unit = dbState.units.find(u => u.id === m.unit_id);
                const prop = unit ? dbState.properties.find(p => p.id === unit.property_id) : undefined;
                return (
                  <div key={m.id} className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-200 text-amber-800 rounded-xl mt-0.5">
                        <Wrench className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-amber-900 uppercase">Maintenance Ticket Created</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold">{m.status}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">Priority: {m.priority}</span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm mt-0.5">
                          {m.category}: {m.description}
                        </h4>
                        <p className="text-xs text-slate-500">
                          Tenant: {tenant?.first_name} {tenant?.last_name} • Unit {unit?.unit_number} ({prop?.name})
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-500">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                );
              })}

              {/* 6. Formal Notices Dispatched */}
              {dayNotices.map(n => {
                const tenant = dbState.tenants.find(t => t.id === n.tenant_id);
                return (
                  <div key={n.id} className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-stone-200 text-stone-700 rounded-xl mt-0.5">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-800 uppercase">Official Tenant Notice Issued</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-100 text-brand-800 font-bold">{n.notice_type}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-200 text-stone-700 font-bold">{n.status}</span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm mt-0.5">
                          Recipient: {tenant?.first_name} {tenant?.last_name}
                        </h4>
                        <p className="text-xs text-slate-600 line-clamp-1">{n.content}</p>
                      </div>
                    </div>
                    {n.amount && n.amount > 0 && (
                      <span className="font-extrabold text-xs text-slate-900">Notice Value: {formatMoney(n.amount)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW 2: DEDICATED LANDLORD REMITTANCE STATEMENTS                */}
      {/* ============================================================== */}
      {reportView === 'landlords' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-cream-50 p-4 rounded-2xl border border-cream-300">
            <div>
              <h2 className="text-base font-bold text-stone-900">Landlord Portfolio Statements & Net Remittance</h2>
              <p className="text-xs text-stone-500">Gross revenue minus management commissions and approved contractor repair bills</p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-stone-700">Filter Landlord:</label>
              <select
                value={landlordFilter}
                onChange={(e) => setLandlordFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-cream-300 rounded-xl text-xs font-bold text-stone-800 shadow-2xs"
              >
                <option value="All">All Landlords ({dbState.landlords?.length || 0})</option>
                {(dbState.landlords || []).map(l => (
                  <option key={l.id} value={l.id}>{l.company_name || `${l.first_name} ${l.last_name}`}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-6">
            {landlordReports.map(({ landlord, ownedProps, occupiedCount, ownedUnits, occupancyRate, grossRent, mgmtFee, repairCosts, netRemittance, expenses, audits }) => (
              <div key={landlord.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">{landlord.company_name || `${landlord.first_name} ${landlord.last_name}`}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold">Active Mandate</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Disbursement Account: <strong>{landlord.bank_name || 'TD Bank'} ({landlord.bank_account_number || '•••• 8910'})</strong> • Payout: {landlord.remittance_frequency || 'Monthly'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Net Payout to Landlord</span>
                    <span className="text-2xl font-black text-emerald-700">{formatMoney(netRemittance)}</span>
                  </div>
                </div>

                {/* 4 Financial Tiles */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-[11px] font-bold text-stone-500 uppercase block">Gross Rent Collected</span>
                    <span className="text-base font-extrabold text-stone-900">{formatMoney(grossRent)}</span>
                  </div>
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-[11px] font-bold text-stone-500 uppercase block">Firm Commission (Per Suite)</span>
                    <span className="text-base font-extrabold text-stone-600">-{formatMoney(mgmtFee)}</span>
                  </div>
                  <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-200">
                    <span className="text-[11px] font-bold text-rose-700 uppercase block">Repair Deductions</span>
                    <span className="text-base font-extrabold text-rose-700">-{formatMoney(repairCosts)}</span>
                  </div>
                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                    <span className="text-[11px] font-bold text-emerald-800 uppercase block">Portfolio Occupancy</span>
                    <span className="text-base font-extrabold text-emerald-800">{occupancyRate}% ({occupiedCount}/{ownedUnits.length} Units)</span>
                  </div>
                </div>

                {/* Associated Properties & Audits */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <span className="text-xs font-bold text-slate-700 uppercase block">Managed Properties ({ownedProps.length})</span>
                    {ownedProps.map(p => (
                      <div key={p.id} className="text-xs flex justify-between items-center py-1 border-b border-slate-200/60 last:border-0">
                        <span className="font-semibold text-slate-800">{p.name} ({p.city})</span>
                        <span className="text-slate-500">{p.units_count || 12} Total Units</span>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <span className="text-xs font-bold text-slate-700 uppercase block">Recent Field Audits ({audits.length})</span>
                    {audits.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No field audits logged for these assets yet.</p>
                    ) : (
                      audits.map(a => (
                        <div key={a.id} className="text-xs flex justify-between items-center py-1 border-b border-slate-200/60 last:border-0">
                          <div>
                            <strong className="block text-slate-800">{a.title}</strong>
                            <span className="text-[10px] text-slate-500">Date: {a.scheduled_date} • Lead: {a.team_lead_name}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">{a.status}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW 3: STAFF OPERATIONS JOURNAL & PERFORMANCE REPORT           */}
      {/* ============================================================== */}
      {reportView === 'staff' && (
        <StaffReportView dbState={dbState} staffProfiles={staffProfiles} />
      )}

      {/* ============================================================== */}
      {/* VIEW 4: CAPITAL BREAK-EVEN & ACQUISITION MATRIX                */}
      {/* ============================================================== */}
      {reportView === 'capital' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Landmark className="w-4 h-4 text-purple-600" /> Asset Acquisition Structure & Capital Break-Even Matrix
              </h3>
              <span className="text-xs text-slate-400">Comparing Outright Purchases vs Institutional Master Leases</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              {propertyProfitData.map((p, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 text-sm">{p.fullName}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                      {p.acquisitionType}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs pt-1 border-t border-slate-200/80">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Initial Outlay:</span>
                      <strong className="text-slate-900">{formatMoney(p.initialEquity, { maximumFractionDigits: 0 })}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Monthly Net NOI:</span>
                      <strong className="text-emerald-600">{formatMoney(p.Profit, { maximumFractionDigits: 0 })}</strong>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200/40">
                      <span className="text-slate-500 font-bold">Estimated Break-Even:</span>
                      <span className="px-2 py-0.5 rounded font-black text-xs bg-amber-100 text-amber-800">
                        {p.breakEvenYears > 0 ? `${p.breakEvenYears} Yrs` : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
