import React, { useState, useMemo } from 'react';
import { DatabaseState } from '../services/supabase';
import {
  Calendar, Clock, Download, Printer, Filter, CheckCircle2,
  FileText, Wrench, ShieldCheck, Bell, CreditCard, ChevronDown,
  ChevronRight, AlertCircle, Eye, Paperclip, Video, Mic, Image,
  ExternalLink, Building2, CalendarRange, Sparkles
} from 'lucide-react';
import { useCurrency, CurrencyCode } from '../context/CurrencyContext';
import {
  Tenant, Lease, Unit, Property, Payment, MaintenanceRequest,
  Notice, PropertyInspection
} from '../types/database';
import { DualCurrencyDisplay } from './DualCurrencyDisplay';
import {
  ReportTimeFrame, getDateRangeForTimeFrame, formatMonthName,
  formatDayTitle, getQuarterInfo, DEFAULT_ANCHOR_DATE
} from '../services/reportGrouping';

interface TenantReportViewProps {
  dbState: DatabaseState;
  tenant: Tenant;
  lease?: Lease;
  unit?: Unit;
  property?: Property;
  onOpenReceipt?: (payment: Payment) => void;
  onOpenMedia?: (media: { type: 'image' | 'video' | 'audio'; url: string; title: string }) => void;
}

export const TenantReportView: React.FC<TenantReportViewProps> = ({
  dbState,
  tenant,
  lease,
  unit,
  property,
  onOpenReceipt,
  onOpenMedia
}) => {
  const { currentCurrency, currencyConfig } = useCurrency();

  // Selected time frame filter (default: month for rich breakdown)
  const [timeFrame, setTimeFrame] = useState<ReportTimeFrame>('month');
  const [dateRange, setDateRange] = useState(() => getDateRangeForTimeFrame('month'));
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Payments' | 'Maintenance' | 'Inspections' | 'Notices'>('All');

  // Handle switching time frames
  const handleTimeFrameChange = (newTf: ReportTimeFrame) => {
    setTimeFrame(newTf);
    if (newTf !== 'custom') {
      setDateRange(getDateRangeForTimeFrame(newTf));
    }
  };

  const nativeCurr: CurrencyCode =
    property?.acquisition?.acquisition_currency ||
    (property?.city === 'Lagos' || property?.city === 'Abuja' ? 'NGN' : 'CAD');

  // 1. Gather all filtered records for this tenant within date range
  const tenantPayments = useMemo(() => {
    return (dbState.payments || []).filter(p => {
      if (p.tenant_id !== tenant.id) return false;
      const date = p.payment_date;
      if (!date) return false;
      return date >= dateRange.startDate && date <= dateRange.endDate;
    });
  }, [dbState.payments, tenant.id, dateRange]);

  const tenantRequests = useMemo(() => {
    return (dbState.maintenance_requests || []).filter(m => {
      if (m.tenant_id !== tenant.id) return false;
      const date = (m.created_at || '').slice(0, 10) || m.reported_date;
      if (!date) return false;
      return date >= dateRange.startDate && date <= dateRange.endDate;
    });
  }, [dbState.maintenance_requests, tenant.id, dateRange]);

  const unitInspections = useMemo(() => {
    return (dbState.inspections || []).filter(i => {
      if (unit && i.unit_id && i.unit_id !== unit.id) return false;
      if (property && i.property_id !== property.id) return false;
      const date = i.scheduled_date;
      if (!date) return false;
      return date >= dateRange.startDate && date <= dateRange.endDate;
    });
  }, [dbState.inspections, unit, property, dateRange]);

  const propertyNotices = useMemo(() => {
    return (dbState.notices || []).filter(n => {
      if (n.property_id && property && n.property_id !== property.id) return false;
      const date = (n.created_at || '').slice(0, 10);
      if (!date) return false;
      return date >= dateRange.startDate && date <= dateRange.endDate;
    });
  }, [dbState.notices, property, dateRange]);

  // Aggregate metrics
  const totalRentPaid = tenantPayments
    .filter(p => p.status === 'Paid')
    .reduce((sum, p) => sum + (p.amount || p.amount_paid || 0), 0);

  // Group events by month (YYYY-MM)
  const allMonths = useMemo(() => {
    const monthSet = new Set<string>();

    tenantPayments.forEach(p => { if (p.payment_date) monthSet.add(p.payment_date.slice(0, 7)); });
    tenantRequests.forEach(m => {
      const d = (m.created_at || '').slice(0, 7) || (m.reported_date || '').slice(0, 7);
      if (d) monthSet.add(d);
    });
    unitInspections.forEach(i => { if (i.scheduled_date) monthSet.add(i.scheduled_date.slice(0, 7)); });
    propertyNotices.forEach(n => {
      const d = (n.created_at || '').slice(0, 7);
      if (d) monthSet.add(d);
    });

    // Also include months in dateRange if within span
    if (monthSet.size === 0 && dateRange.startDate) {
      monthSet.add(dateRange.startDate.slice(0, 7));
    }

    return Array.from(monthSet).sort().reverse();
  }, [tenantPayments, tenantRequests, unitInspections, propertyNotices, dateRange]);

  // Group events by day for week / daily view
  const allDays = useMemo(() => {
    const daySet = new Set<string>();
    tenantPayments.forEach(p => { if (p.payment_date) daySet.add(p.payment_date); });
    tenantRequests.forEach(m => {
      const d = (m.created_at || '').slice(0, 10) || m.reported_date;
      if (d) daySet.add(d);
    });
    unitInspections.forEach(i => { if (i.scheduled_date) daySet.add(i.scheduled_date); });
    propertyNotices.forEach(n => {
      const d = (n.created_at || '').slice(0, 10);
      if (d) daySet.add(d);
    });

    if (daySet.size === 0 && dateRange.startDate) {
      daySet.add(dateRange.startDate);
    }

    return Array.from(daySet).sort().reverse();
  }, [tenantPayments, tenantRequests, unitInspections, propertyNotices, dateRange]);

  // Quarters for yearly view
  const quarters = useMemo(() => {
    const year = parseInt((dateRange.startDate || DEFAULT_ANCHOR_DATE).slice(0, 4), 10) || 2026;
    return [
      getQuarterInfo(year, 1),
      getQuarterInfo(year, 2),
      getQuarterInfo(year, 3),
      getQuarterInfo(year, 4)
    ];
  }, [dateRange]);

  // Render a specific month section's detailed content
  const renderMonthSectionContent = (monthStr: string) => {
    const monthPayments = tenantPayments.filter(p => p.payment_date?.startsWith(monthStr));
    const monthRequests = tenantRequests.filter(m => (m.created_at || '').startsWith(monthStr) || (m.reported_date || '').startsWith(monthStr));
    const monthInspections = unitInspections.filter(i => (i.scheduled_date || '').startsWith(monthStr));
    const monthNotices = propertyNotices.filter(n => (n.created_at || '').startsWith(monthStr));

    const hasAnyItems = monthPayments.length > 0 || monthRequests.length > 0 || monthInspections.length > 0 || monthNotices.length > 0;

    return (
      <div className="space-y-6 pt-2">
        {/* SUBSECTION 1: RENT & FINANCIAL LEDGER */}
        {(categoryFilter === 'All' || categoryFilter === 'Payments') && (
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-brand-50 text-brand-700 rounded-lg">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    Rent Ledger & Payments
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Cryptographically logged rent, utilities, and deposit disbursements
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full">
                {monthPayments.length} Record{monthPayments.length !== 1 ? 's' : ''}
              </span>
            </div>

            {monthPayments.length === 0 ? (
              <div className="py-4 text-center text-xs text-stone-400">
                No rent disbursements logged for this month.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-stone-100 text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                      <th className="py-2 px-2">Date</th>
                      <th className="py-2 px-2">Reference</th>
                      <th className="py-2 px-2">Type</th>
                      <th className="py-2 px-2">Method</th>
                      <th className="py-2 px-2 text-right">Amount</th>
                      <th className="py-2 px-2 text-center">Status</th>
                      <th className="py-2 px-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-700">
                    {monthPayments.map(p => (
                      <tr key={p.id} className="hover:bg-cream-50/60 transition-colors">
                        <td className="py-2.5 px-2 font-mono">{p.payment_date}</td>
                        <td className="py-2.5 px-2 font-mono font-bold text-stone-900">{p.id}</td>
                        <td className="py-2.5 px-2 font-medium">{p.payment_type || 'Monthly Rent'}</td>
                        <td className="py-2.5 px-2">
                          <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded text-[10px]">
                            {p.payment_method || 'Bank Wire'}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold text-stone-900">
                          <DualCurrencyDisplay
                            amount={p.amount || p.amount_paid || 0}
                            sourceCurrency={p.currency || nativeCurr}
                            amountClassName="font-bold font-mono"
                          />
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'
                          }`}>
                            {p.status || 'Paid'}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          {onOpenReceipt && (
                            <button
                              onClick={() => onOpenReceipt(p)}
                              className="px-2 py-1 bg-cream-100 hover:bg-cream-200 text-stone-800 rounded border border-cream-300 text-[10px] font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3 text-brand-600" />
                              Receipt
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SUBSECTION 2: FIELD INSPECTIONS & PREMISES AUDITS */}
        {(categoryFilter === 'All' || categoryFilter === 'Inspections') && (
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    Unit Audits & Safety Inspections
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Official move-in, routine health & safety, and HVAC condition sign-offs
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full">
                {monthInspections.length} Audit{monthInspections.length !== 1 ? 's' : ''}
              </span>
            </div>

            {monthInspections.length === 0 ? (
              <div className="py-4 text-center text-xs text-stone-400">
                No physical unit audits scheduled or recorded for this month.
              </div>
            ) : (
              <div className="space-y-3">
                {monthInspections.map(insp => (
                  <div key={insp.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-stone-900">{insp.title}</span>
                        <span className="text-[10px] font-mono text-stone-500">#{insp.id}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          insp.overall_condition === 'Excellent' || insp.overall_condition === 'Good'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          Condition: {insp.overall_condition}
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-500 font-medium">
                        Audited on: <strong>{insp.scheduled_date}</strong> {insp.scheduled_time && `at ${insp.scheduled_time}`}
                      </span>
                    </div>

                    {insp.general_remarks && (
                      <p className="text-xs text-stone-600 bg-white p-2.5 rounded-lg border border-stone-200/60">
                        {insp.general_remarks}
                      </p>
                    )}

                    {insp.findings && insp.findings.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                        {insp.findings.map((f, idx) => (
                          <div key={idx} className="p-2 bg-white rounded border border-stone-200/60 text-[11px]">
                            <div className="font-bold text-stone-800">{f.area}</div>
                            <div className="text-stone-500 text-[10px]">{f.remarks}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {insp.attachments && insp.attachments.length > 0 && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[10px] uppercase font-bold text-stone-400">Audit Media:</span>
                        {insp.attachments.map(att => (
                          <button
                            key={att.id}
                            onClick={() => onOpenMedia && onOpenMedia({
                              type: att.file_type === 'video' ? 'video' : att.file_type === 'audio' ? 'audio' : 'image',
                              url: att.file_url,
                              title: att.file_name
                            })}
                            className="px-2 py-0.5 bg-white hover:bg-stone-100 border border-stone-200 rounded text-[10px] font-medium text-stone-700 flex items-center gap-1 cursor-pointer"
                          >
                            <Paperclip className="w-3 h-3 text-brand-600" />
                            {att.file_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUBSECTION 3: MAINTENANCE & REPAIR TICKETS */}
        {(categoryFilter === 'All' || categoryFilter === 'Maintenance') && (
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    Maintenance & Service Dispatches
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Logged repair tickets, voicenotes, diagnostics & contractor attendance
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full">
                {monthRequests.length} Ticket{monthRequests.length !== 1 ? 's' : ''}
              </span>
            </div>

            {monthRequests.length === 0 ? (
              <div className="py-4 text-center text-xs text-stone-400">
                No maintenance tickets logged for this residence in this month.
              </div>
            ) : (
              <div className="space-y-3">
                {monthRequests.map(req => (
                  <div key={req.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-stone-900">#{req.id}</span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-stone-200 text-stone-800">
                          {req.category}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          req.priority === 'Urgent'
                            ? 'bg-rose-100 text-rose-800'
                            : req.priority === 'High'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-stone-200 text-stone-700'
                        }`}>
                          {req.priority}
                        </span>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        req.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : req.status === 'In Progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-stone-200 text-stone-700'
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    <p className="text-xs text-stone-700 font-medium">
                      {req.description}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-200/60 text-[11px] text-stone-400">
                      <span>Reported on: {req.reported_date || req.created_at?.slice(0, 10)}</span>
                      {req.attachments && req.attachments.length > 0 && (
                        <div className="flex items-center gap-2">
                          {req.attachments.map(att => (
                            <span key={att.id} className="inline-flex items-center gap-1 text-brand-700 font-semibold">
                              <Paperclip className="w-3 h-3" /> {att.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUBSECTION 4: BUILDING CIRCULARS & NOTICES */}
        {(categoryFilter === 'All' || categoryFilter === 'Notices') && (
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    Official Notices & Bulletins
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Building circulars, service interruptions, and statutory notifications
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full">
                {monthNotices.length} Notice{monthNotices.length !== 1 ? 's' : ''}
              </span>
            </div>

            {monthNotices.length === 0 ? (
              <div className="py-4 text-center text-xs text-stone-400">
                No official bulletins issued during this month.
              </div>
            ) : (
              <div className="space-y-3">
                {monthNotices.map(notice => (
                  <div key={notice.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-stone-900">{notice.title}</span>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {(notice.created_at || '').slice(0, 10)}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600">
                      {notice.body || (notice as any).message || 'Notice delivered to resident suite.'}
                    </p>
                    <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 pt-1">
                      <CheckCircle2 className="w-3 h-3" /> Officially Delivered
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!hasAnyItems && (
          <div className="p-6 text-center text-xs text-stone-400 bg-white rounded-xl border border-stone-200">
            No events or transactions recorded under any category for {formatMonthName(monthStr)}.
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          CONTROL & FILTER BAR
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
        {/* Top Filter Row: Time Frame Tabs */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
              Reporting Time-Frame Filter:
            </span>
            <div className="flex flex-wrap items-center bg-cream-100 p-1 rounded-xl border border-cream-300 gap-1">
              {[
                { id: 'day' as ReportTimeFrame, label: 'Single Day' },
                { id: 'week' as ReportTimeFrame, label: 'Weekly (Day-by-Day)' },
                { id: 'month' as ReportTimeFrame, label: 'Monthly' },
                { id: 'multi_month' as ReportTimeFrame, label: 'Multi-Month (Quarter)' },
                { id: 'year' as ReportTimeFrame, label: 'Yearly (Quarterly)' },
              ].map(tf => (
                <button
                  key={tf.id}
                  onClick={() => handleTimeFrameChange(tf.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    timeFrame === tf.id
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter & Print Actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200">
              <Filter className="w-3.5 h-3.5 text-stone-500" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-stone-800 cursor-pointer focus:outline-hidden"
              >
                <option value="All">All Categories</option>
                <option value="Payments">Rent & Ledger Only</option>
                <option value="Maintenance">Maintenance & Repairs</option>
                <option value="Inspections">Safety & Inspections</option>
                <option value="Notices">Notices & Bulletins</option>
              </select>
            </div>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Report
            </button>
          </div>
        </div>

        {/* Date Span Description Bar */}
        <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-brand-600" />
            <span>Active Range: <strong>{dateRange.startDate}</strong> through <strong>{dateRange.endDate}</strong></span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-semibold text-stone-600">
            <span>Rent Paid: <strong className="text-stone-900 font-mono">{currencyConfig.symbol}{totalRentPaid.toLocaleString()}</strong></span>
            <span>·</span>
            <span>Repairs Logged: <strong className="text-stone-900">{tenantRequests.length}</strong></span>
            <span>·</span>
            <span>Audits: <strong className="text-stone-900">{unitInspections.length}</strong></span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          VIEW MODE 1: WEEKLY (Each Day as Main Section)
          ========================================================================= */}
      {timeFrame === 'week' && (
        <div className="space-y-6">
          <div className="p-4 bg-cream-50 rounded-2xl border border-cream-300">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-600" />
              Weekly Operational Timeline (Day-by-Day Main Sections)
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Structured sequence of residency events, rent clearances, and repair dispatches by calendar day
            </p>
          </div>

          {allDays.map(dayStr => {
            const dayPayments = tenantPayments.filter(p => p.payment_date === dayStr);
            const dayRequests = tenantRequests.filter(m => (m.created_at || '').startsWith(dayStr) || m.reported_date === dayStr);
            const dayInspections = unitInspections.filter(i => i.scheduled_date === dayStr);
            const dayNotices = propertyNotices.filter(n => (n.created_at || '').startsWith(dayStr));

            const hasDayActivity = dayPayments.length > 0 || dayRequests.length > 0 || dayInspections.length > 0 || dayNotices.length > 0;

            return (
              <div key={dayStr} className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
                {/* Day Main Section Header */}
                <div className="bg-stone-900 text-white px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    <h3 className="font-bold text-sm tracking-wide">
                      {formatDayTitle(dayStr)}
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-stone-300">
                    {hasDayActivity ? 'Activity Recorded' : 'No Direct Actions'}
                  </span>
                </div>

                <div className="p-5 space-y-4">
                  {dayPayments.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                        Rent & Payments:
                      </span>
                      {dayPayments.map(p => (
                        <div key={p.id} className="p-3 bg-cream-50 rounded-xl border border-cream-200 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-stone-900">{p.payment_type || 'Rent'}</span>
                            <span className="text-stone-500 ml-2 font-mono">#{p.id}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <DualCurrencyDisplay
                              amount={p.amount || p.amount_paid || 0}
                              sourceCurrency={p.currency || nativeCurr}
                              amountClassName="font-bold font-mono text-stone-900"
                            />
                            <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                              {p.status || 'Paid'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {dayRequests.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                        Maintenance Dispatches:
                      </span>
                      {dayRequests.map(r => (
                        <div key={r.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-stone-900">{r.category}</span>
                            <p className="text-stone-600 text-[11px] mt-0.5">{r.description}</p>
                          </div>
                          <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded text-[10px]">
                            {r.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {dayInspections.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                        Safety Inspections:
                      </span>
                      {dayInspections.map(i => (
                        <div key={i.id} className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/80 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-stone-900">{i.title}</span>
                            <span className="text-stone-500 text-[11px] ml-2">Condition: {i.overall_condition}</span>
                          </div>
                          <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded text-[10px]">
                            {i.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {!hasDayActivity && (
                    <p className="text-xs text-stone-400 italic">No scheduled dispatches or transactions recorded on this date.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          VIEW MODE 2: MONTHLY & MULTI-MONTH (Each Month as Main Section)
          ========================================================================= */}
      {(timeFrame === 'month' || timeFrame === 'multi_month' || timeFrame === 'custom') && (
        <div className="space-y-8">
          {allMonths.map(monthStr => {
            return (
              <div key={monthStr} className="bg-cream-50/80 rounded-2xl border border-cream-300 p-6 shadow-xs space-y-4">
                {/* Prominent Month Main Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-cream-300/80 gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      {monthStr.slice(5, 7)}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-stone-900 tracking-tight">
                        {formatMonthName(monthStr)}
                      </h2>
                      <span className="text-[11px] text-stone-500">
                        Monthly Tenancy Ledger & Operational Dispatches
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-stone-400 bg-white px-2.5 py-1 rounded-lg border border-cream-300">
                      Primary Section: Monthly Cycle
                    </span>
                  </div>
                </div>

                {/* Subsections under this Month */}
                {renderMonthSectionContent(monthStr)}
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          VIEW MODE 3: YEARLY (Quarterly Main Sections -> Monthly -> Subsections)
          ========================================================================= */}
      {timeFrame === 'year' && (
        <div className="space-y-10">
          {quarters.map(q => {
            return (
              <div key={q.id} className="bg-cream-100 rounded-3xl border-2 border-stone-800/10 p-6 shadow-sm space-y-6">
                {/* Quarter Header */}
                <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-brand-400" />
                    <div>
                      <h2 className="text-base font-bold tracking-wide">{q.label}</h2>
                      <p className="text-xs text-stone-400">Quarterly Executive Tenancy Audit</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-stone-300 bg-slate-800 px-3 py-1 rounded-lg">
                    3 Calendar Months
                  </span>
                </div>

                {/* Months under this Quarter */}
                <div className="space-y-6">
                  {q.months.map(mStr => (
                    <div key={mStr} className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4">
                      <div className="flex items-center gap-2.5 pb-2 border-b border-stone-100">
                        <span className="w-2 h-2 rounded-full bg-brand-600"></span>
                        <h3 className="font-bold text-sm text-stone-900">
                          {formatMonthName(mStr)}
                        </h3>
                      </div>
                      {renderMonthSectionContent(mStr)}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          VIEW MODE 4: SINGLE DAY
          ========================================================================= */}
      {timeFrame === 'day' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Daily Operational Statement: {formatDayTitle(dateRange.startDate)}
              </h3>
              <p className="text-xs text-stone-500">
                Chronological activity ledger for the selected 24-hour cycle
              </p>
            </div>
          </div>
          {renderMonthSectionContent(dateRange.startDate.slice(0, 7))}
        </div>
      )}
    </div>
  );
};
