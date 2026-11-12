import React, { useState, useMemo } from 'react';
import {
  Calendar, DollarSign, TrendingUp, Sparkles, Building2, Wrench,
  ShieldCheck, FileText, Bell, Printer, User, Landmark,
  ChevronDown, ChevronRight, ClipboardCheck, Eye, Search, Layers,
  Home, Receipt, Camera
} from 'lucide-react';
import { DatabaseState, supabase } from '../services/supabase';
import { useCurrency, CurrencyCode } from '../context/CurrencyContext';
import { StaffReportView } from '../components/StaffReportView';
import { LandlordReportView } from '../components/LandlordReportView';
import { TimeframeFilterBar } from '../components/TimeframeFilterBar';
import { PortalMediaModal, PortalMediaItem } from '../components/PortalMediaModal';
import { UserProfile } from '../types/database';
import {
  ReportTimeFrame,
  SortOrder,
  DateRange,
  DEFAULT_ANCHOR_DATE,
  getDateRangeForTimeFrame,
  formatMonthName,
  formatDayTitle,
  getQuarterInfo
} from '../services/reportGrouping';

interface ReportsProps {
  dbState: DatabaseState;
}

type CategoryFilter = 'all' | 'revenue' | 'expenses' | 'maintenance' | 'inspections' | 'notices';

export const ReportsPage: React.FC<ReportsProps> = ({ dbState }) => {
  const { formatMoney, convertToCAD } = useCurrency();
  const [reportView, setReportView] = useState<'ledger' | 'landlords' | 'staff' | 'capital'>('ledger');
  const [staffProfiles, setStaffProfiles] = useState<UserProfile[]>([]);

  // Ledger State
  const [timeFrame, setTimeFrame] = useState<ReportTimeFrame>('month');
  const [selectedQuarter, setSelectedQuarter] = useState<1 | 2 | 3 | 4>(4);
  const [dateRange, setDateRange] = useState<DateRange>(() =>
    getDateRangeForTimeFrame('month', DEFAULT_ANCHOR_DATE)
  );
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMediaModal, setActiveMediaModal] = useState<PortalMediaItem | null>(null);

  // Expand/collapse state for hierarchical groups
  const [expandedQuarters, setExpandedQuarters] = useState<Record<string, boolean>>({ Q4: true, Q3: true, Q2: true, Q1: true });
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  // Landlord Statement selector
  const [selectedLandlordId, setSelectedLandlordId] = useState<string>(
    dbState.landlords?.[0]?.id || ''
  );

  // Fetch staff list for the Staff Performance tab
  React.useEffect(() => {
    supabase
      .from('staffs')
      .select('*')
      .then(({ data }) => {
        if (data) setStaffProfiles(data as UserProfile[]);
      });
  }, []);

  // Helper: Resolve native currency for a property
  const getPropCurrency = (propId?: string): CurrencyCode => {
    const prop = dbState.properties.find(p => p.id === propId);
    if (prop?.acquisition?.acquisition_currency) return prop.acquisition.acquisition_currency;
    return prop?.city === 'Lagos' || prop?.city === 'Abuja' ? 'NGN' : 'CAD';
  };

  // Helper: Resolve property ID for a payment
  const getPaymentPropertyId = (leaseId: string): string | undefined => {
    const lease = dbState.leases.find(l => l.id === leaseId);
    const unit = lease ? dbState.units.find(u => u.id === lease.unit_id) : undefined;
    return unit?.property_id;
  };

  // Helper: Resolve property ID for a unit
  const getUnitPropertyId = (unitId?: string): string | undefined => {
    if (!unitId) return undefined;
    return dbState.units.find(u => u.id === unitId)?.property_id;
  };

  // Helper: Effective management fee % for a unit
  const getEffectiveFeePercent = (unitId?: string, propId?: string): number => {
    const unit = unitId ? dbState.units.find(u => u.id === unitId) : undefined;
    const prop = propId ? dbState.properties.find(p => p.id === propId) : undefined;
    return unit?.management_fee_percentage ?? prop?.landlord_contract?.management_fee_percentage ?? 10;
  };

  // Helper: Check if a date string (YYYY-MM-DD or ISO) falls within active dateRange
  const isInRange = (dateStr?: string): boolean => {
    if (!dateStr) return false;
    const d = dateStr.slice(0, 10);
    return d >= dateRange.startDate && d <= dateRange.endDate;
  };

  // All-Time Portfolio Totals (CAD normalized)
  const allTimeStats = useMemo(() => {
    let rentCad = 0;
    let shortletCad = 0;
    let feeCad = 0;
    let expenseCad = 0;

    dbState.payments.forEach(p => {
      const lease = dbState.leases.find(l => l.id === p.lease_id);
      const unit = lease ? dbState.units.find(u => u.id === lease.unit_id) : undefined;
      const propId = unit?.property_id;
      const curr = getPropCurrency(propId);
      const val = convertToCAD(p.amount_paid || 0, curr);
      rentCad += val;
      feeCad += (val * getEffectiveFeePercent(unit?.id, propId)) / 100;
    });

    dbState.shortlet_bookings.forEach(b => {
      const propId = getUnitPropertyId(b.unit_id);
      const curr = getPropCurrency(propId);
      const val = convertToCAD(b.total_payout || 0, curr);
      shortletCad += val;
      feeCad += (val * getEffectiveFeePercent(b.unit_id, propId)) / 100;
    });

    dbState.expenses.forEach(e => {
      const curr = getPropCurrency(e.property_id);
      expenseCad += convertToCAD(e.amount || 0, curr);
    });

    return {
      rentCad,
      shortletCad,
      feeCad,
      expenseCad,
      netCashFlowCad: rentCad + shortletCad - expenseCad
    };
  }, [dbState, convertToCAD]);

  // Filtered records for the active timeframe, property, category & search
  const filteredRecords = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const matchesProp = (propId?: string) =>
      selectedPropertyFilter === 'all' || propId === selectedPropertyFilter;

    const payments = (categoryFilter === 'all' || categoryFilter === 'revenue')
      ? dbState.payments.filter(p => {
          if (!isInRange(p.payment_date)) return false;
          const lease = dbState.leases.find(l => l.id === p.lease_id);
          const unit = lease ? dbState.units.find(u => u.id === lease.unit_id) : undefined;
          const propId = unit?.property_id;
          if (!matchesProp(propId)) return false;
          if (!q) return true;
          const tenant = lease ? dbState.tenants.find(t => t.id === lease.tenant_id) : undefined;
          const prop = dbState.properties.find(pr => pr.id === propId);
          return `${tenant?.first_name} ${tenant?.last_name} ${unit?.unit_number} ${prop?.name} ${p.payment_method}`.toLowerCase().includes(q);
        })
      : [];

    const shortlets = (categoryFilter === 'all' || categoryFilter === 'revenue')
      ? dbState.shortlet_bookings.filter(b => {
          if (!isInRange(b.check_in)) return false;
          const propId = getUnitPropertyId(b.unit_id);
          if (!matchesProp(propId)) return false;
          if (!q) return true;
          const unit = dbState.units.find(u => u.id === b.unit_id);
          const prop = dbState.properties.find(pr => pr.id === propId);
          return `${b.guest_name} ${b.platform_source} ${unit?.unit_number} ${prop?.name}`.toLowerCase().includes(q);
        })
      : [];

    const expenses = (categoryFilter === 'all' || categoryFilter === 'expenses')
      ? dbState.expenses.filter(e => {
          if (!isInRange(e.date)) return false;
          if (!matchesProp(e.property_id)) return false;
          if (!q) return true;
          const prop = dbState.properties.find(pr => pr.id === e.property_id);
          const vendor = dbState.vendors?.find(v => v.id === e.vendor_id);
          return `${e.category} ${e.description} ${vendor?.company || vendor?.name || ''} ${e.invoice_number || ''} ${prop?.name}`.toLowerCase().includes(q);
        })
      : [];

    const maintenance = (categoryFilter === 'all' || categoryFilter === 'maintenance')
      ? dbState.maintenance_requests.filter(m => {
          if (!isInRange(m.created_at)) return false;
          const propId = m.property_id || getUnitPropertyId(m.unit_id);
          if (!matchesProp(propId)) return false;
          if (!q) return true;
          const prop = dbState.properties.find(pr => pr.id === propId);
          return `${m.category} ${m.description} ${m.priority} ${prop?.name}`.toLowerCase().includes(q);
        })
      : [];

    const inspections = (categoryFilter === 'all' || categoryFilter === 'inspections')
      ? (dbState.inspections || []).filter(i => {
          if (!isInRange(i.scheduled_date)) return false;
          if (!matchesProp(i.property_id)) return false;
          if (!q) return true;
          const prop = dbState.properties.find(pr => pr.id === i.property_id);
          return `${i.title} ${i.team_lead_name} ${i.status} ${prop?.name}`.toLowerCase().includes(q);
        })
      : [];

    const notices = (categoryFilter === 'all' || categoryFilter === 'notices')
      ? dbState.notices.filter(n => {
          if (!isInRange(n.created_at)) return false;
          const lease = dbState.leases.find(l => l.tenant_id === n.tenant_id);
          const unit = lease ? dbState.units.find(u => u.id === lease.unit_id) : undefined;
          const propId = unit?.property_id;
          if (selectedPropertyFilter !== 'all' && !matchesProp(propId)) return false;
          if (!q) return true;
          const tenant = dbState.tenants.find(t => t.id === n.tenant_id);
          return `${n.notice_type} ${n.content} ${tenant?.first_name} ${tenant?.last_name}`.toLowerCase().includes(q);
        })
      : [];

    return { payments, shortlets, expenses, maintenance, inspections, notices };
  }, [dbState, dateRange, selectedPropertyFilter, categoryFilter, searchTerm]);

  // Period KPI Totals (CAD normalized)
  const periodStats = useMemo(() => {
    let rentCad = 0;
    let shortletCad = 0;
    let feeCad = 0;
    let expenseCad = 0;

    filteredRecords.payments.forEach(p => {
      const lease = dbState.leases.find(l => l.id === p.lease_id);
      const unit = lease ? dbState.units.find(u => u.id === lease.unit_id) : undefined;
      const propId = unit?.property_id;
      const val = convertToCAD(p.amount_paid || 0, getPropCurrency(propId));
      rentCad += val;
      feeCad += (val * getEffectiveFeePercent(unit?.id, propId)) / 100;
    });

    filteredRecords.shortlets.forEach(b => {
      const propId = getUnitPropertyId(b.unit_id);
      const val = convertToCAD(b.total_payout || 0, getPropCurrency(propId));
      shortletCad += val;
      feeCad += (val * getEffectiveFeePercent(b.unit_id, propId)) / 100;
    });

    filteredRecords.expenses.forEach(e => {
      expenseCad += convertToCAD(e.amount || 0, getPropCurrency(e.property_id));
    });

    return {
      rentCad,
      shortletCad,
      feeCad,
      expenseCad,
      netCashFlowCad: rentCad + shortletCad - expenseCad
    };
  }, [filteredRecords, dbState, convertToCAD]);

  // Unique sorted days present in filteredRecords
  const allDays = useMemo(() => {
    const daySet = new Set<string>();
    filteredRecords.payments.forEach(p => p.payment_date && daySet.add(p.payment_date.slice(0, 10)));
    filteredRecords.shortlets.forEach(b => b.check_in && daySet.add(b.check_in.slice(0, 10)));
    filteredRecords.expenses.forEach(e => e.date && daySet.add(e.date.slice(0, 10)));
    filteredRecords.maintenance.forEach(m => m.created_at && daySet.add(m.created_at.slice(0, 10)));
    filteredRecords.inspections.forEach(i => i.scheduled_date && daySet.add(i.scheduled_date.slice(0, 10)));
    filteredRecords.notices.forEach(n => n.created_at && daySet.add(n.created_at.slice(0, 10)));
    const arr = Array.from(daySet).sort();
    return sortOrder === 'desc' ? arr.reverse() : arr;
  }, [filteredRecords, sortOrder]);

  // Unique sorted months present in allDays
  const allMonths = useMemo(() => {
    const monthSet = new Set<string>(allDays.map(d => d.slice(0, 7)));
    const arr = Array.from(monthSet).sort();
    return sortOrder === 'desc' ? arr.reverse() : arr;
  }, [allDays, sortOrder]);

  // Quarters list for Full Year view
  const quarters = useMemo(() => {
    const qs: (1 | 2 | 3 | 4)[] = sortOrder === 'desc' ? [4, 3, 2, 1] : [1, 2, 3, 4];
    return qs.map(q => {
      const info = getQuarterInfo(2026, q);
      const monthsInQ = allMonths.filter(m => info.months.includes(m));
      return { q, info, months: monthsInQ };
    }).filter(item => item.months.length > 0);
  }, [allMonths, sortOrder]);

  // Compute financials for a set of dates
  const computeRangeTotals = (dates: string[]) => {
    const dateSet = new Set(dates);
    let rentCad = 0;
    let shortletCad = 0;
    let expenseCad = 0;
    let count = 0;

    filteredRecords.payments.forEach(p => {
      if (dateSet.has(p.payment_date?.slice(0, 10))) {
        const propId = getPaymentPropertyId(p.lease_id);
        rentCad += convertToCAD(p.amount_paid || 0, getPropCurrency(propId));
        count++;
      }
    });
    filteredRecords.shortlets.forEach(b => {
      if (dateSet.has(b.check_in?.slice(0, 10))) {
        const propId = getUnitPropertyId(b.unit_id);
        shortletCad += convertToCAD(b.total_payout || 0, getPropCurrency(propId));
        count++;
      }
    });
    filteredRecords.expenses.forEach(e => {
      if (dateSet.has(e.date?.slice(0, 10))) {
        expenseCad += convertToCAD(e.amount || 0, getPropCurrency(e.property_id));
        count++;
      }
    });
    filteredRecords.maintenance.forEach(m => {
      if (dateSet.has(m.created_at?.slice(0, 10))) count++;
    });
    filteredRecords.inspections.forEach(i => {
      if (dateSet.has(i.scheduled_date?.slice(0, 10))) count++;
    });
    filteredRecords.notices.forEach(n => {
      if (dateSet.has(n.created_at?.slice(0, 10))) count++;
    });

    return { rentCad, shortletCad, expenseCad, netCad: rentCad + shortletCad - expenseCad, count };
  };

  // Render Property -> Unit hierarchical breakdown for a single day
  const renderDayBreakdown = (day: string) => {
    const dPayments = filteredRecords.payments.filter(p => p.payment_date?.slice(0, 10) === day);
    const dShortlets = filteredRecords.shortlets.filter(b => b.check_in?.slice(0, 10) === day);
    const dExpenses = filteredRecords.expenses.filter(e => e.date?.slice(0, 10) === day);
    const dMaint = filteredRecords.maintenance.filter(m => m.created_at?.slice(0, 10) === day);
    const dInsp = filteredRecords.inspections.filter(i => i.scheduled_date?.slice(0, 10) === day);
    const dNotices = filteredRecords.notices.filter(n => n.created_at?.slice(0, 10) === day);

    // Group by property
    const propIdsSet = new Set<string>();
    dPayments.forEach(p => { const pid = getPaymentPropertyId(p.lease_id); if (pid) propIdsSet.add(pid); });
    dShortlets.forEach(b => { const pid = getUnitPropertyId(b.unit_id); if (pid) propIdsSet.add(pid); });
    dExpenses.forEach(e => e.property_id && propIdsSet.add(e.property_id));
    dMaint.forEach(m => { const pid = m.property_id || getUnitPropertyId(m.unit_id); if (pid) propIdsSet.add(pid); });
    dInsp.forEach(i => i.property_id && propIdsSet.add(i.property_id));

    const activeProps = dbState.properties.filter(p => propIdsSet.has(p.id));

    return (
      <div className="space-y-4 pt-3 border-t border-slate-100">
        {activeProps.map(prop => {
          const curr = getPropCurrency(prop.id);
          const propUnits = dbState.units.filter(u => u.property_id === prop.id);
          const propPayments = dPayments.filter(p => getPaymentPropertyId(p.lease_id) === prop.id);
          const propShortlets = dShortlets.filter(b => getUnitPropertyId(b.unit_id) === prop.id);
          const propExpenses = dExpenses.filter(e => e.property_id === prop.id);
          const propMaint = dMaint.filter(m => (m.property_id || getUnitPropertyId(m.unit_id)) === prop.id);
          const propInsp = dInsp.filter(i => i.property_id === prop.id);

          const propRentNative = propPayments.reduce((s, p) => s + (p.amount_paid || 0), 0);
          const propShortletNative = propShortlets.reduce((s, b) => s + (b.total_payout || 0), 0);
          const propExpNative = propExpenses.reduce((s, e) => s + (e.amount || 0), 0);

          // Units with activity on this day
          const activeUnits = propUnits.filter(u =>
            propPayments.some(p => dbState.leases.find(l => l.id === p.lease_id)?.unit_id === u.id) ||
            propShortlets.some(b => b.unit_id === u.id) ||
            propExpenses.some(e => e.unit_id === u.id) ||
            propMaint.some(m => m.unit_id === u.id)
          );

          const generalExpenses = propExpenses.filter(e => !e.unit_id);
          const generalMaint = propMaint.filter(m => !m.unit_id);

          return (
            <div key={prop.id} className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4 space-y-3">
              {/* Property Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200/70">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-brand-700" />
                  <span className="font-bold text-slate-900 text-sm">{prop.name}</span>
                  <span className="text-xs text-slate-500">• {prop.city}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">{curr}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
                  {(propRentNative > 0 || propShortletNative > 0) && (
                    <span className="text-emerald-700">
                      +{formatMoney(convertToCAD(propRentNative + propShortletNative, curr))}
                    </span>
                  )}
                  {propExpNative > 0 && (
                    <span className="text-rose-700">
                      -{formatMoney(convertToCAD(propExpNative, curr))}
                    </span>
                  )}
                </div>
              </div>

              {/* Unit-level rows */}
              {activeUnits.map(unit => {
                const uPayments = propPayments.filter(p => dbState.leases.find(l => l.id === p.lease_id)?.unit_id === unit.id);
                const uShortlets = propShortlets.filter(b => b.unit_id === unit.id);
                const uExpenses = propExpenses.filter(e => e.unit_id === unit.id);
                const uMaint = propMaint.filter(m => m.unit_id === unit.id);
                const feePct = getEffectiveFeePercent(unit.id, prop.id);

                return (
                  <div key={unit.id} className="bg-white rounded-xl border border-slate-200/70 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Home className="w-3.5 h-3.5 text-slate-500" />
                        <span className="font-bold text-slate-800 text-xs">Unit {unit.unit_number}</span>
                        <span className="text-[10px] text-slate-400">Mgmt Fee: {feePct}%</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pl-5">
                      {uPayments.map(p => {
                        const lease = dbState.leases.find(l => l.id === p.lease_id);
                        const tenant = lease ? dbState.tenants.find(t => t.id === lease.tenant_id) : undefined;
                        return (
                          <div key={p.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">RENT</span>
                              <span className="font-semibold text-slate-800">{tenant?.first_name} {tenant?.last_name}</span>
                              <span className="text-slate-400">({p.payment_method})</span>
                            </div>
                            <span className="font-extrabold text-emerald-700">+{formatMoney(convertToCAD(p.amount_paid || 0, curr))}</span>
                          </div>
                        );
                      })}

                      {uShortlets.map(b => (
                        <div key={b.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-[10px]">SHORTLET</span>
                            <span className="font-semibold text-slate-800">{b.guest_name}</span>
                            <span className="text-slate-400">({b.platform_source} • {b.nights_count} nights)</span>
                          </div>
                          <span className="font-extrabold text-purple-700">+{formatMoney(convertToCAD(b.total_payout || 0, curr))}</span>
                        </div>
                      ))}

                      {uExpenses.map(e => {
                        const vendor = dbState.vendors?.find(v => v.id === e.vendor_id);
                        return (
                          <div key={e.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">EXPENSE</span>
                              <span className="font-semibold text-slate-800">{e.category}: {e.description}</span>
                              {vendor && <span className="text-slate-400">• {vendor.company || vendor.name}</span>}
                              {e.receipt_url && (
                                <button
                                  onClick={() => setActiveMediaModal({
                                    type: 'document',
                                    url: e.receipt_url!,
                                    title: `${e.category} Receipt`,
                                    caption: e.description,
                                    propertyName: prop.name,
                                    unitNumber: unit.unit_number,
                                    vendorOrAuditor: vendor?.company || vendor?.name,
                                    date: e.date,
                                    amountFormatted: formatMoney(convertToCAD(e.amount || 0, curr)),
                                    status: e.payment_status
                                  })}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-700 hover:underline"
                                >
                                  <Eye className="w-3 h-3" /> Proof
                                </button>
                              )}
                            </div>
                            <span className="font-extrabold text-rose-700">-{formatMoney(convertToCAD(e.amount || 0, curr))}</span>
                          </div>
                        );
                      })}

                      {uMaint.map(m => (
                        <div key={m.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">TICKET</span>
                            <span className="font-semibold text-slate-800">{m.category}: {m.description}</span>
                            <span className="text-[10px] text-slate-500">[{m.priority}]</span>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">{m.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Property-wide general expenses, maintenance & inspections */}
              {(generalExpenses.length > 0 || generalMaint.length > 0 || propInsp.length > 0) && (
                <div className="bg-white rounded-xl border border-slate-200/70 p-3 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">Property-Wide Operations</span>
                  {generalExpenses.map(e => {
                    const vendor = dbState.vendors?.find(v => v.id === e.vendor_id);
                    return (
                      <div key={e.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">EXPENSE</span>
                          <span className="font-semibold text-slate-800">{e.category}: {e.description}</span>
                          {vendor && <span className="text-slate-400">• {vendor.company || vendor.name}</span>}
                          {e.receipt_url && (
                            <button
                              onClick={() => setActiveMediaModal({
                                type: 'document',
                                url: e.receipt_url!,
                                title: `${e.category} Receipt`,
                                caption: e.description,
                                propertyName: prop.name,
                                vendorOrAuditor: vendor?.company || vendor?.name,
                                date: e.date,
                                amountFormatted: formatMoney(convertToCAD(e.amount || 0, curr)),
                                status: e.payment_status
                              })}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-700 hover:underline"
                            >
                              <Eye className="w-3 h-3" /> Proof
                            </button>
                          )}
                        </div>
                        <span className="font-extrabold text-rose-700">-{formatMoney(convertToCAD(e.amount || 0, curr))}</span>
                      </div>
                    );
                  })}
                  {generalMaint.map(m => (
                    <div key={m.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">TICKET</span>
                        <span className="font-semibold text-slate-800">{m.category}: {m.description}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">{m.status}</span>
                    </div>
                  ))}
                  {propInsp.map(i => (
                    <div key={i.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">AUDIT</span>
                        <span className="font-semibold text-slate-800">{i.title}</span>
                        <span className="text-slate-400">• Lead: {i.team_lead_name}</span>
                        {i.attachments && i.attachments.length > 0 && (
                          <button
                            onClick={() => setActiveMediaModal({
                              type: i.attachments![0].file_type,
                              url: i.attachments![0].file_url,
                              title: i.title,
                              caption: i.general_remarks,
                              propertyName: prop.name,
                              vendorOrAuditor: i.team_lead_name,
                              date: i.scheduled_date,
                              status: i.status
                            })}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 hover:underline"
                          >
                            <Camera className="w-3 h-3" /> {i.attachments.length} Media
                          </button>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px]">{i.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Notices issued on this day */}
        {dNotices.length > 0 && (
          <div className="bg-stone-50 rounded-2xl border border-stone-200 p-4 space-y-2">
            <span className="text-xs font-bold text-stone-700 uppercase flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-brand-700" /> Statutory Notices Dispatched ({dNotices.length})
            </span>
            {dNotices.map(n => {
              const tenant = dbState.tenants.find(t => t.id === n.tenant_id);
              return (
                <div key={n.id} className="flex items-center justify-between text-xs py-1 border-b border-stone-200/60 last:border-0">
                  <div>
                    <span className="font-bold text-stone-900">{n.notice_type}</span>
                    <span className="text-stone-500"> → {tenant?.first_name} {tenant?.last_name}</span>
                    <p className="text-[11px] text-stone-500 line-clamp-1">{n.content}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-stone-200 text-stone-800 font-bold text-[10px]">{n.status}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Render a single Day accordion card
  const renderDayCard = (day: string, defaultOpen = false) => {
    const isExpanded = expandedDays[day] ?? defaultOpen;
    const totals = computeRangeTotals([day]);
    return (
      <div key={day} className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <button
          onClick={() => setExpandedDays(prev => ({ ...prev, [day]: !isExpanded }))}
          className="w-full px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5">
            {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
            <Calendar className="w-4 h-4 text-brand-700" />
            <span className="font-bold text-slate-900 text-sm">{formatDayTitle(day)}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
              {totals.count} events
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            {(totals.rentCad > 0 || totals.shortletCad > 0) && (
              <span className="text-emerald-700">+{formatMoney(totals.rentCad + totals.shortletCad)}</span>
            )}
            {totals.expenseCad > 0 && (
              <span className="text-rose-700">-{formatMoney(totals.expenseCad)}</span>
            )}
            <span className={`px-2.5 py-0.5 rounded-lg ${totals.netCad >= 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
              Net: {formatMoney(totals.netCad)}
            </span>
          </div>
        </button>
        {isExpanded && <div className="px-5 pb-5">{renderDayBreakdown(day)}</div>}
      </div>
    );
  };

  // Render a Month accordion card containing its days
  const renderMonthCard = (monthStr: string, defaultOpen = false) => {
    const isExpanded = expandedMonths[monthStr] ?? defaultOpen;
    const monthDays = allDays.filter(d => d.startsWith(monthStr));
    const totals = computeRangeTotals(monthDays);
    return (
      <div key={monthStr} className="bg-cream-50/70 rounded-3xl border border-cream-300 overflow-hidden">
        <button
          onClick={() => setExpandedMonths(prev => ({ ...prev, [monthStr]: !isExpanded }))}
          className="w-full px-6 py-4 flex flex-wrap items-center justify-between gap-3 hover:bg-cream-100/70 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            {isExpanded ? <ChevronDown className="w-5 h-5 text-stone-600" /> : <ChevronRight className="w-5 h-5 text-stone-600" />}
            <Layers className="w-4 h-4 text-brand-700" />
            <span className="font-extrabold text-stone-900 text-base">{formatMonthName(monthStr)}</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white border border-cream-300 text-stone-600 font-bold">
              {monthDays.length} active days • {totals.count} records
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-extrabold">
            <span className="text-emerald-700">Inflow: {formatMoney(totals.rentCad + totals.shortletCad)}</span>
            <span className="text-rose-700">Outflow: {formatMoney(totals.expenseCad)}</span>
            <span className="px-3 py-1 rounded-xl bg-white border border-cream-300 text-stone-900">
              Net: {formatMoney(totals.netCad)}
            </span>
          </div>
        </button>
        {isExpanded && (
          <div className="px-5 pb-5 space-y-3">
            {monthDays.map((day, idx) => renderDayCard(day, idx === 0))}
          </div>
        )}
      </div>
    );
  };

  // Capital break-even matrix calculation
  const propertyProfitData = dbState.properties.map(p => {
    const curr = getPropCurrency(p.id);
    const pUnits = dbState.units.filter(u => u.property_id === p.id);
    const revenue = pUnits.filter(u => u.status === 'Occupied').reduce((acc, u) => acc + convertToCAD(u.monthly_rent, curr), 0);
    const pExpenses = (dbState.expenses || []).filter(e => e.property_id === p.id);
    const operatingExpense = pExpenses.reduce((acc, e) => acc + convertToCAD(e.amount, curr), 0) / 12;
    const masterLeaseMonthly = p.acquisition?.acquisition_type === 'Long-Term Lease'
      ? convertToCAD(p.acquisition.monthly_lease_cost || 0, curr)
      : 0;
    const totalCost = operatingExpense + masterLeaseMonthly;
    const netProfit = revenue - totalCost;
    const initialOutlay = convertToCAD(p.acquisition?.down_payment_or_deposit || 0, curr);
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

  // Active Landlord for View 2
  const activeLandlord = dbState.landlords?.find(l => l.id === selectedLandlordId) || dbState.landlords?.[0];
  const activeLandlordOwnedPropertyIds = activeLandlord
    ? dbState.properties.filter(p => p.landlord_id === activeLandlord.id).map(p => p.id)
    : [];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner: Strict Single Line Title & Description */}
      <div className="flex items-baseline gap-2 sm:gap-3 overflow-hidden">
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight whitespace-nowrap shrink-0">
          Executive Intelligence & Audit Reports
        </h1>
        <span className="text-cream-400 font-light shrink-0">|</span>
        <p className="text-sm text-stone-600 truncate">
          Hierarchical multi-timeframe operational ledger, landlord statements, staff audits & capital break-even
        </p>
      </div>

      {/* Single Divider */}
      <hr className="border-t border-slate-800/80 print:hidden" />

      {/* View Switcher Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-2 bg-cream-100 p-1.5 rounded-2xl border border-cream-300">
          <button
            onClick={() => setReportView('ledger')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              reportView === 'ledger'
                ? 'bg-navy-950 text-white shadow-xs'
                : 'text-stone-700 hover:bg-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Company Executive Ledger
          </button>
          <button
            onClick={() => setReportView('landlords')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              reportView === 'landlords'
                ? 'bg-navy-950 text-white shadow-xs'
                : 'text-stone-700 hover:bg-white'
            }`}
          >
            <User className="w-3.5 h-3.5" /> Landlord Statements
          </button>
          <button
            onClick={() => setReportView('staff')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              reportView === 'staff'
                ? 'bg-navy-950 text-white shadow-xs'
                : 'text-stone-700 hover:bg-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Staff Operations Journal
          </button>
          <button
            onClick={() => setReportView('capital')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              reportView === 'capital'
                ? 'bg-navy-950 text-white shadow-xs'
                : 'text-stone-700 hover:bg-white'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" /> Capital Matrix
          </button>
        </div>

        <button
          onClick={() => window.print()}
          className="px-4 py-2 rounded-xl bg-white border border-cream-300 text-xs font-bold text-stone-700 hover:bg-cream-50 flex items-center gap-2 shadow-2xs"
        >
          <Printer className="w-3.5 h-3.5" /> Print Report
        </button>
      </div>

      {/* ============================================================== */}
      {/* VIEW 1: HIERARCHICAL MULTI-TIMEFRAME EXECUTIVE LEDGER          */}
      {/* ============================================================== */}
      {reportView === 'ledger' && (
        <div className="space-y-6">
          {/* All-Time Baseline Portfolio Strip */}
          <div className="bg-navy-950 text-white rounded-3xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-navy-300 block">
                Full 2026 Portfolio Baseline ({dbState.payments.length} Payments • {dbState.shortlet_bookings.length} Shortlets • {dbState.expenses.length} Expenses)
              </span>
              <div className="flex flex-wrap items-baseline gap-6 mt-1.5">
                <div>
                  <span className="text-xs text-navy-200">Total Revenue: </span>
                  <span className="text-base font-extrabold text-white">{formatMoney(allTimeStats.rentCad + allTimeStats.shortletCad)}</span>
                </div>
                <div>
                  <span className="text-xs text-navy-200">Mgmt Fees: </span>
                  <span className="text-base font-extrabold text-amber-300">{formatMoney(allTimeStats.feeCad)}</span>
                </div>
                <div>
                  <span className="text-xs text-navy-200">Expenses: </span>
                  <span className="text-base font-extrabold text-rose-300">-{formatMoney(allTimeStats.expenseCad)}</span>
                </div>
                <div>
                  <span className="text-xs text-navy-200">Net Cash Flow: </span>
                  <span className="text-base font-extrabold text-emerald-300">{formatMoney(allTimeStats.netCashFlowCad)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Timeframe & Filter Controls */}
          <div className="space-y-3 print:hidden">
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

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search tenant, guest, unit, vendor, ticket..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <select
                value={selectedPropertyFilter}
                onChange={e => setSelectedPropertyFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
              >
                <option value="all">All Properties ({dbState.properties.length})</option>
                {dbState.properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value as CategoryFilter)}
                className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
              >
                <option value="all">All Categories</option>
                <option value="revenue">Rent & Shortlets</option>
                <option value="expenses">Operating Expenses</option>
                <option value="maintenance">Maintenance Tickets</option>
                <option value="inspections">Field Inspections</option>
                <option value="notices">Statutory Notices</option>
              </select>
            </div>
          </div>

          {/* Active Period KPI Tiles */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">Period Rent</span>
              <span className="text-lg font-black text-emerald-700 mt-1 block">{formatMoney(periodStats.rentCad)}</span>
              <span className="text-[11px] text-slate-400">{filteredRecords.payments.length} payments</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">Shortlet Payouts</span>
              <span className="text-lg font-black text-purple-700 mt-1 block">{formatMoney(periodStats.shortletCad)}</span>
              <span className="text-[11px] text-slate-400">{filteredRecords.shortlets.length} stays</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">Mgmt Fees Earned</span>
              <span className="text-lg font-black text-amber-700 mt-1 block">{formatMoney(periodStats.feeCad)}</span>
              <span className="text-[11px] text-slate-400">Unit commission</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">Period Expenses</span>
              <span className="text-lg font-black text-rose-700 mt-1 block">-{formatMoney(periodStats.expenseCad)}</span>
              <span className="text-[11px] text-slate-400">{filteredRecords.expenses.length} bills</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs col-span-2 md:col-span-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase block">Net Cash Flow</span>
              <span className={`text-lg font-black mt-1 block ${periodStats.netCashFlowCad >= 0 ? 'text-stone-900' : 'text-rose-700'}`}>
                {formatMoney(periodStats.netCashFlowCad)}
              </span>
              <span className="text-[11px] text-slate-400">{allDays.length} active days</span>
            </div>
          </div>

          {/* Hierarchical Ledger Body */}
          {allDays.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No Records in Selected Period</h3>
              <p className="text-xs text-slate-500 mt-1">
                Try switching to All Time, Full Year, or another Quarter/Month using the timeframe bar above.
              </p>
            </div>
          ) : timeFrame === 'year' ? (
            <div className="space-y-5">
              {quarters.map(({ q, info, months }) => {
                const qKey = `Q${q}`;
                const isQOpen = expandedQuarters[qKey] ?? true;
                const qDays = allDays.filter(d => months.includes(d.slice(0, 7)));
                const qTotals = computeRangeTotals(qDays);
                return (
                  <div key={qKey} className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                    <button
                      onClick={() => setExpandedQuarters(prev => ({ ...prev, [qKey]: !isQOpen }))}
                      className="w-full px-6 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 text-left"
                    >
                      <div className="flex items-center gap-3">
                        {isQOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        <span className="font-black text-base">{info.label}</span>
                        <span className="text-xs text-slate-300">({months.length} months • {qTotals.count} records)</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-bold">
                        <span className="text-emerald-300">+{formatMoney(qTotals.rentCad + qTotals.shortletCad)}</span>
                        <span className="text-rose-300">-{formatMoney(qTotals.expenseCad)}</span>
                        <span className="px-3 py-1 rounded-xl bg-white/10">Net: {formatMoney(qTotals.netCad)}</span>
                      </div>
                    </button>
                    {isQOpen && (
                      <div className="p-5 space-y-4">
                        {months.map((m, mIdx) => renderMonthCard(m, q === 4 && mIdx === 0))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : timeFrame === 'multi_month' || timeFrame === 'all' || timeFrame === 'month' ? (
            <div className="space-y-4">
              {allMonths.map((m, idx) => renderMonthCard(m, idx === 0))}
            </div>
          ) : (
            <div className="space-y-3">
              {allDays.map((day, idx) => renderDayCard(day, idx === 0))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW 2: DEDICATED LANDLORD REMITTANCE STATEMENTS (SHARED)      */}
      {/* ============================================================== */}
      {reportView === 'landlords' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-cream-50 p-4 rounded-2xl border border-cream-300 print:hidden">
            <div>
              <h2 className="text-base font-bold text-stone-900">Landlord Portfolio Statements & Net Remittance</h2>
              <p className="text-xs text-stone-500">Full hierarchical multi-timeframe statement identical to the Landlord Portal</p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-stone-700">Select Landlord:</label>
              <select
                value={activeLandlord?.id || ''}
                onChange={(e) => setSelectedLandlordId(e.target.value)}
                className="px-3 py-1.5 bg-white border border-cream-300 rounded-xl text-xs font-bold text-stone-800 shadow-2xs"
              >
                {(dbState.landlords || []).map(l => (
                  <option key={l.id} value={l.id}>
                    {l.company_name || `${l.first_name} ${l.last_name}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {activeLandlord ? (
            <LandlordReportView
              dbState={dbState}
              landlord={activeLandlord}
              ownedPropertyIds={activeLandlordOwnedPropertyIds}
            />
          ) : (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-sm text-slate-500">
              No landlords registered in the database.
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* VIEW 3: STAFF OPERATIONS JOURNAL & PERFORMANCE REPORT          */}
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

      {/* Proof & Inspection Media Modal */}
      <PortalMediaModal
        item={activeMediaModal}
        onClose={() => setActiveMediaModal(null)}
      />
    </div>
  );
};
