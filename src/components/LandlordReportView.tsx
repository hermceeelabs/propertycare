import React, { useState, useMemo } from 'react';
import {
  Calendar, Clock, DollarSign, Download, Printer, Filter,
  FileText, CheckCircle2, AlertCircle, Eye, Search, Landmark,
  Video, Mic, Image, Paperclip, ChevronRight, Sparkles, Building2,
  CalendarRange, ShieldCheck, ChevronDown, ExternalLink, Play, Wrench, Home,
  Layers, CheckSquare, Hotel
} from 'lucide-react';
import { DatabaseState } from '../services/supabase';
import { useCurrency, CurrencyCode } from '../context/CurrencyContext';
import { Landlord, PropertyInspection, Expense, InspectionAttachment, ExpenseProof, Property, Unit, MaintenanceRequest } from '../types/database';
import { DualCurrencyDisplay } from './DualCurrencyDisplay';
import {
  ReportTimeFrame, getDateRangeForTimeFrame, getDateRangeForQuarter, formatMonthName,
  formatDayTitle, getQuarterInfo, DEFAULT_ANCHOR_DATE, getRealWorldToday
} from '../services/reportGrouping';

interface LandlordReportViewProps {
  dbState: DatabaseState;
  landlord: Landlord;
  ownedPropertyIds: string[];
}

export const LandlordReportView: React.FC<LandlordReportViewProps> = ({
  dbState,
  landlord,
  ownedPropertyIds
}) => {
  const { currentCurrency, currencyConfig, convertAmount } = useCurrency();

  // Selected preset and date range - Default to 'month'
  const [timeFrame, setTimeFrame] = useState<ReportTimeFrame>('month');
  const [dateRange, setDateRange] = useState(() => getDateRangeForTimeFrame('month'));
  const [selectedQuarter, setSelectedQuarter] = useState<1 | 2 | 3 | 4>(() => {
    return (Math.floor(new Date().getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
  });
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Remittances' | 'Expenses' | 'Inspections' | 'Maintenance'>('All');
  const [activeMediaModal, setActiveMediaModal] = useState<{
    type: 'video' | 'audio' | 'photo' | 'document';
    url: string;
    title: string;
    caption?: string;
  } | null>(null);

  const handleTimeFrameChange = (newTf: ReportTimeFrame) => {
    setTimeFrame(newTf);
    if (newTf === 'multi_month') {
      const year = parseInt((dateRange.startDate || getRealWorldToday()).slice(0, 4), 10) || new Date().getFullYear();
      setDateRange(getDateRangeForQuarter(year, selectedQuarter));
    } else if (newTf !== 'custom') {
      setDateRange(getDateRangeForTimeFrame(newTf));
    }
  };

  const handleQuarterChange = (q: 1 | 2 | 3 | 4) => {
    setSelectedQuarter(q);
    const year = parseInt((dateRange.startDate || getRealWorldToday()).slice(0, 4), 10) || new Date().getFullYear();
    setDateRange(getDateRangeForQuarter(year, q));
  };

  // Helper: Get property's native currency
  const getPropNativeCurrency = (propertyId?: string): CurrencyCode => {
    const prop = (dbState.properties || []).find(p => p.id === propertyId);
    return prop?.acquisition?.acquisition_currency || (prop?.city === 'Lagos' || prop?.city === 'Abuja' ? 'NGN' : 'CAD');
  };

  // Helper: Get effective management fee percentage for a specific unit or property
  const getEffectiveFeePercent = (unit?: Unit, property?: Property): number => {
    if (unit?.management_fee_percentage !== undefined && unit.management_fee_percentage !== null) {
      return unit.management_fee_percentage;
    }
    if (property?.landlord_contract?.management_fee_percentage !== undefined && property.landlord_contract.management_fee_percentage !== null) {
      return property.landlord_contract.management_fee_percentage;
    }
    return landlord.management_fee_percentage ?? 10.0;
  };

  // 1. Filter Owned Properties
  const ownedProperties = useMemo(() => {
    return (dbState.properties || []).filter(p => ownedPropertyIds.includes(p.id));
  }, [dbState.properties, ownedPropertyIds]);

  // All owned units
  const ownedUnits = useMemo(() => {
    return (dbState.units || []).filter(u => ownedPropertyIds.includes(u.property_id));
  }, [dbState.units, ownedPropertyIds]);

  // 2. Filter Inspections in date range strictly for owned properties
  const filteredInspections = useMemo(() => {
    const list = (dbState.inspections || []).filter(i => {
      if (!ownedPropertyIds.includes(i.property_id)) return false;
      if (selectedPropertyFilter !== 'All' && i.property_id !== selectedPropertyFilter) return false;
      const date = i.scheduled_date;
      if (!date) return false;
      return date >= dateRange.startDate && date <= dateRange.endDate;
    });
    return list.sort((a, b) => (b.scheduled_date || '').localeCompare(a.scheduled_date || ''));
  }, [dbState.inspections, ownedPropertyIds, selectedPropertyFilter, dateRange]);

  // 3. Filter Expenses in date range strictly for owned properties
  const filteredExpenses = useMemo(() => {
    const list = (dbState.expenses || []).filter(e => {
      if (!ownedPropertyIds.includes(e.property_id)) return false;
      if (selectedPropertyFilter !== 'All' && e.property_id !== selectedPropertyFilter) return false;
      const date = e.date;
      if (!date) return false;
      return date >= dateRange.startDate && date <= dateRange.endDate;
    });
    return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [dbState.expenses, ownedPropertyIds, selectedPropertyFilter, dateRange]);

  // 4. Filter Payments (Yields/Inflows) in date range strictly for owned properties
  const filteredPayments = useMemo(() => {
    const list = (dbState.payments || []).filter(p => {
      const lease = (dbState.leases || []).find(l => l.id === p.lease_id);
      const unit = lease ? (dbState.units || []).find(u => u.id === lease.unit_id) : undefined;
      if (!unit || !ownedPropertyIds.includes(unit.property_id)) return false;
      if (selectedPropertyFilter !== 'All' && unit.property_id !== selectedPropertyFilter) return false;
      const date = p.payment_date || p.due_date;
      if (!date) return false;
      return date >= dateRange.startDate && date <= dateRange.endDate;
    });
    return list.sort((a, b) => ((b.payment_date || b.due_date) || '').localeCompare((a.payment_date || a.due_date) || ''));
  }, [dbState.payments, dbState.leases, dbState.units, ownedPropertyIds, selectedPropertyFilter, dateRange]);

  // 5. Filter Maintenance Requests in date range strictly for owned properties
  const filteredMaintenanceRequests = useMemo(() => {
    const list = (dbState.maintenance_requests || []).filter(m => {
      if (m.property_id && !ownedPropertyIds.includes(m.property_id)) return false;
      if (!m.property_id) {
        const u = (dbState.units || []).find(un => un.id === m.unit_id);
        if (!u || !ownedPropertyIds.includes(u.property_id)) return false;
      }
      if (selectedPropertyFilter !== 'All') {
        const propId = m.property_id || (dbState.units || []).find(un => un.id === m.unit_id)?.property_id;
        if (propId !== selectedPropertyFilter) return false;
      }
      const date = m.created_at ? m.created_at.slice(0, 10) : '';
      if (!date) return false;
      return date >= dateRange.startDate && date <= dateRange.endDate;
    });
    return list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }, [dbState.maintenance_requests, dbState.units, ownedPropertyIds, selectedPropertyFilter, dateRange]);

  // Shortlet Occupancy Calculator: Count bookings and nights in active period for a unit
  const getShortletOccupancy = (unitId: string) => {
    const bookings = (dbState.shortlet_bookings || []).filter(b => {
      if (b.unit_id !== unitId) return false;
      const checkIn = b.check_in;
      const checkOut = b.check_out;
      // Intersects dateRange
      return checkIn <= dateRange.endDate && checkOut >= dateRange.startDate;
    });

    const totalNights = bookings.reduce((sum, b) => sum + (b.nights_count || 0), 0);
    return {
      bookingCount: bookings.length,
      nightsCount: totalNights
    };
  };

  // -------------------------------------------------------------
  // ALL-TIME PORTFOLIO FINANCIAL KPI TOTALS (STANDALONE)
  // -------------------------------------------------------------
  const allTimeStats = useMemo(() => {
    // All payments all time for owned properties
    const allPayments = (dbState.payments || []).filter(p => {
      const lease = (dbState.leases || []).find(l => l.id === p.lease_id);
      const unit = lease ? (dbState.units || []).find(u => u.id === lease.unit_id) : undefined;
      return unit && ownedPropertyIds.includes(unit.property_id);
    });

    const allExpenses = (dbState.expenses || []).filter(e => ownedPropertyIds.includes(e.property_id));

    let grossRevenue = 0;
    let firmFees = 0;
    allPayments.forEach(p => {
      const lease = (dbState.leases || []).find(l => l.id === p.lease_id);
      const unit = lease ? (dbState.units || []).find(u => u.id === lease.unit_id) : undefined;
      const prop = unit ? (dbState.properties || []).find(pr => pr.id === unit.property_id) : undefined;
      const nativeCurr = getPropNativeCurrency(unit?.property_id);
      const amt = convertAmount(p.amount_paid || p.amount || 0, nativeCurr, currentCurrency);
      grossRevenue += amt;

      const feePct = getEffectiveFeePercent(unit, prop);
      firmFees += Math.round((amt * feePct) / 100);
    });

    const totalExpenses = allExpenses.reduce((sum, e) => {
      const nativeCurr = getPropNativeCurrency(e.property_id);
      return sum + convertAmount(e.amount || 0, nativeCurr, currentCurrency);
    }, 0);

    const netRemitted = Math.max(0, grossRevenue - firmFees - totalExpenses);

    return {
      grossRevenue,
      firmFees,
      totalExpenses,
      netRemitted,
      totalAssets: ownedProperties.length,
      totalUnits: ownedUnits.length
    };
  }, [dbState.payments, dbState.expenses, dbState.leases, dbState.units, dbState.properties, ownedPropertyIds, currentCurrency]);

  // -------------------------------------------------------------
  // ACTIVE PERIOD TOTALS
  // -------------------------------------------------------------
  const periodStats = useMemo(() => {
    let grossCollected = 0;
    let firmFees = 0;

    filteredPayments.forEach(p => {
      const lease = (dbState.leases || []).find(l => l.id === p.lease_id);
      const unit = lease ? (dbState.units || []).find(u => u.id === lease.unit_id) : undefined;
      const prop = unit ? (dbState.properties || []).find(pr => pr.id === unit.property_id) : undefined;
      const nativeCurr = getPropNativeCurrency(unit?.property_id);
      const amt = convertAmount(p.amount_paid || p.amount || 0, nativeCurr, currentCurrency);
      grossCollected += amt;

      const feePct = getEffectiveFeePercent(unit, prop);
      firmFees += Math.round((amt * feePct) / 100);
    });

    const expensesTotal = filteredExpenses.reduce((acc, e) => {
      const nativeCurr = getPropNativeCurrency(e.property_id);
      return acc + convertAmount(e.amount || 0, nativeCurr, currentCurrency);
    }, 0);

    const netRemitted = Math.max(0, grossCollected - firmFees - expensesTotal);

    return {
      grossCollected,
      firmFees,
      expensesTotal,
      netRemitted
    };
  }, [filteredPayments, filteredExpenses, dbState.leases, dbState.units, dbState.properties, currentCurrency]);

  // Group events by month (YYYY-MM)
  const allMonths = useMemo(() => {
    const monthSet = new Set<string>();
    filteredPayments.forEach(p => {
      const d = p.payment_date || p.due_date;
      if (d) monthSet.add(d.slice(0, 7));
    });
    filteredExpenses.forEach(e => {
      if (e.date) monthSet.add(e.date.slice(0, 7));
    });
    filteredInspections.forEach(i => {
      if (i.scheduled_date) monthSet.add(i.scheduled_date.slice(0, 7));
    });
    filteredMaintenanceRequests.forEach(m => {
      if (m.created_at) monthSet.add(m.created_at.slice(0, 7));
    });

    if (monthSet.size === 0 && dateRange.startDate) {
      monthSet.add(dateRange.startDate.slice(0, 7));
    }

    return Array.from(monthSet).sort().reverse();
  }, [filteredPayments, filteredExpenses, filteredInspections, filteredMaintenanceRequests, dateRange]);

  // Group events by day for week view
  const allDays = useMemo(() => {
    const daySet = new Set<string>();
    filteredPayments.forEach(p => {
      const d = p.payment_date || p.due_date;
      if (d) daySet.add(d);
    });
    filteredExpenses.forEach(e => {
      if (e.date) daySet.add(e.date);
    });
    filteredInspections.forEach(i => {
      if (i.scheduled_date) daySet.add(i.scheduled_date);
    });

    if (daySet.size === 0 && dateRange.startDate) {
      daySet.add(dateRange.startDate);
    }

    return Array.from(daySet).sort().reverse();
  }, [filteredPayments, filteredExpenses, filteredInspections, dateRange]);

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

  // -------------------------------------------------------------
  // RENDER: HIERARCHICAL PROPERTY -> UNIT LEDGER BREAKDOWN
  // -------------------------------------------------------------
  const renderPropertyUnitHierarchicalBreakdown = (
    periodPayments: typeof filteredPayments,
    periodExpenses: typeof filteredExpenses
  ) => {
    const targetProperties = selectedPropertyFilter === 'All'
      ? ownedProperties
      : ownedProperties.filter(p => p.id === selectedPropertyFilter);

    if (targetProperties.length === 0) {
      return (
        <div className="py-4 text-center text-xs text-stone-400">
          No registered properties found for this landlord.
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {targetProperties.map((prop) => {
          const nativeCurr = getPropNativeCurrency(prop.id);
          const propUnits = (dbState.units || []).filter(u => u.property_id === prop.id);
          const propFeePercent = prop.landlord_contract?.management_fee_percentage ?? landlord.management_fee_percentage ?? 10.0;

          // All expenses that belong directly to this property
          const allPropExpenses = periodExpenses.filter(e => e.property_id === prop.id);
          // General operating costs: expenses with scope 'Property' or no specific unit_id
          const generalPropertyExpenses = allPropExpenses.filter(e => e.scope === 'Property' || !e.unit_id);
          const totalGeneralExpense = generalPropertyExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

          // Calculate property-level totals
          const propPayments = periodPayments.filter(p => {
            const lease = (dbState.leases || []).find(l => l.id === p.lease_id);
            const unit = lease ? (dbState.units || []).find(u => u.id === lease.unit_id) : undefined;
            return unit?.property_id === prop.id;
          });

          const totalPropCollected = propPayments.reduce((sum, p) => sum + (p.amount_paid || p.amount || 0), 0);
          const totalPropExpenses = allPropExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

          // Accumulate unit-level fees based on custom fee hierarchy
          let totalPropFirmDeduction = 0;
          propUnits.forEach(u => {
            const lease = (dbState.leases || []).find(l => l.unit_id === u.id);
            const uPayments = propPayments.filter(p => p.lease_id === lease?.id);
            const uRent = uPayments.reduce((sum, p) => sum + (p.amount_paid || p.amount || 0), 0);
            const uFeePct = getEffectiveFeePercent(u, prop);
            totalPropFirmDeduction += Math.round((uRent * uFeePct) / 100);
          });

          const totalPropNetPayout = Math.max(0, totalPropCollected - totalPropFirmDeduction - totalPropExpenses);

          return (
            <div key={prop.id} className="bg-stone-50 rounded-2xl border border-stone-200/90 overflow-hidden shadow-2xs">
              {/* Property Header Banner */}
              <div className="p-4 bg-white border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-stone-900">{prop.name}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cream-200 text-stone-800 border border-cream-300">
                        {prop.property_type}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        Base Fee: {propFeePercent}%
                      </span>
                      <span className="text-[10px] font-mono text-stone-400">
                        {prop.city}, {prop.province}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      {propUnits.length} Total Suites · General Operating Costs:{' '}
                      <strong className="text-rose-600 font-mono">
                        {currencyConfig.symbol}{convertAmount(totalGeneralExpense, nativeCurr, currentCurrency).toLocaleString()}
                      </strong>
                    </p>
                  </div>
                </div>

                {/* Property Summary Pill */}
                <div className="flex items-center gap-3 text-xs bg-cream-50 px-3.5 py-1.5 rounded-xl border border-cream-200">
                  <div className="text-right">
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Net Remittance</span>
                    <span className="font-black font-mono text-emerald-600 text-sm">
                      {currencyConfig.symbol}{convertAmount(totalPropNetPayout, nativeCurr, currentCurrency).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* General Property Expenses Strip (Costs not tied to single unit) */}
              {generalPropertyExpenses.length > 0 && (
                <div className="px-4 py-3 bg-rose-50/40 border-b border-rose-100/80 text-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Wrench className="w-3 h-3 text-rose-600" />
                      General Building Operating Costs (Shared Infrastructure):
                    </span>
                    <span className="font-bold font-mono text-rose-700">
                      Total: {currencyConfig.symbol}{convertAmount(totalGeneralExpense, nativeCurr, currentCurrency).toLocaleString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {generalPropertyExpenses.map(ge => (
                      <div key={ge.id} className="p-2 bg-white rounded-lg border border-rose-200/60 text-[11px] flex justify-between items-center">
                        <div>
                          <span className="font-semibold text-stone-900 block truncate">{ge.category}</span>
                          <span className="text-[10px] text-stone-500 truncate block">{ge.description}</span>
                        </div>
                        <span className="font-bold font-mono text-rose-600 ml-2 shrink-0">
                          -{currencyConfig.symbol}{convertAmount(ge.amount || 0, nativeCurr, currentCurrency).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nested Units Breakdown Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-100/80 border-b border-stone-200 text-[10px] uppercase font-bold text-stone-500 tracking-wider">
                      <th className="py-2.5 px-3">Unit / Suite</th>
                      <th className="py-2.5 px-3">Active Tenant / Shortlet Info</th>
                      <th className="py-2.5 px-3">Status / Model</th>
                      <th className="py-2.5 px-3 text-right">Rent Inflow</th>
                      <th className="py-2.5 px-3 text-right">Unit Expenses</th>
                      <th className="py-2.5 px-3 text-right">Firm Fee (Applied %)</th>
                      <th className="py-2.5 px-3 text-right">Net Unit Payout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200/60 text-stone-700">
                    {propUnits.map((unit) => {
                      const lease = (dbState.leases || []).find(l => l.unit_id === unit.id && l.status === 'Active') ||
                                    (dbState.leases || []).find(l => l.unit_id === unit.id);
                      const activeTenant = lease ? (dbState.tenants || []).find(t => t.id === lease.tenant_id) : undefined;

                      // Payments for this unit in the active period
                      const unitPayments = periodPayments.filter(p => p.lease_id === lease?.id);
                      const unitRentCollected = unitPayments.reduce((sum, p) => sum + (p.amount_paid || p.amount || 0), 0);

                      // Expenses specific to this unit
                      const unitExpenses = allPropExpenses.filter(e => e.unit_id === unit.id && e.scope === 'Unit');
                      const totalUnitExpense = unitExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

                      // Dynamic Management fee on unit rent
                      const unitFeePercent = getEffectiveFeePercent(unit, prop);
                      const unitFirmFee = Math.round((unitRentCollected * unitFeePercent) / 100);
                      const unitNetPayout = Math.max(0, unitRentCollected - unitFirmFee - totalUnitExpense);

                      // Shortlet occupancy metrics
                      const isShortlet = unit.rental_model === 'Shortlet / STR' || unit.rental_model === 'Hybrid';
                      const shortletMetrics = isShortlet ? getShortletOccupancy(unit.id) : null;

                      return (
                        <tr key={unit.id} className="hover:bg-white transition-colors">
                          <td className="py-3 px-3 font-bold text-stone-900">
                            Unit {unit.unit_number}
                            <span className="text-[10px] text-stone-400 font-normal block">
                              {unit.bedrooms}BR / {unit.bathrooms}BA · {unit.square_feet ? `${unit.square_feet} sqft` : 'Standard'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {isShortlet ? (
                              <div>
                                <span className="font-semibold text-purple-900 flex items-center gap-1">
                                  <Hotel className="w-3.5 h-3.5 text-purple-600" />
                                  STR Shortlet Suite
                                </span>
                                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 block w-fit mt-1">
                                  {shortletMetrics?.bookingCount || 0} Booking{(shortletMetrics?.bookingCount || 0) !== 1 ? 's' : ''} ({shortletMetrics?.nightsCount || 0} Nights Occupied)
                                </span>
                              </div>
                            ) : activeTenant ? (
                              <div>
                                <span className="font-semibold text-stone-800">{activeTenant.first_name} {activeTenant.last_name}</span>
                                <span className="text-[10px] text-stone-400 block font-mono">{activeTenant.phone || activeTenant.email}</span>
                              </div>
                            ) : (
                              <span className="text-stone-400 italic">Unoccupied / Vacant</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              unit.status === 'Occupied' ? 'bg-emerald-100 text-emerald-800' :
                              unit.status === 'Vacant' ? 'bg-amber-100 text-amber-800' :
                              'bg-stone-200 text-stone-700'
                            }`}>
                              {unit.status}
                            </span>
                            <span className="text-[10px] text-stone-500 block mt-0.5">
                              {unit.rental_model || 'Long-Term'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-stone-900">
                            {unitRentCollected > 0 ? (
                              <DualCurrencyDisplay
                                amount={unitRentCollected}
                                sourceCurrency={nativeCurr}
                                amountClassName="font-bold font-mono"
                              />
                            ) : (
                              <span className="text-stone-400">₦0.00</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-rose-600">
                            {totalUnitExpense > 0 ? (
                              <span>-{currencyConfig.symbol}{convertAmount(totalUnitExpense, nativeCurr, currentCurrency).toLocaleString()}</span>
                            ) : (
                              <span className="text-stone-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-medium text-stone-600">
                            {unitFirmFee > 0 ? (
                              <div>
                                <span>-{currencyConfig.symbol}{convertAmount(unitFirmFee, nativeCurr, currentCurrency).toLocaleString()}</span>
                                <span className="text-[9px] font-bold text-brand-600 block bg-brand-50 rounded px-1 w-fit ml-auto">
                                  {unitFeePercent}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-stone-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-emerald-600">
                            {currencyConfig.symbol}{convertAmount(unitNetPayout, nativeCurr, currentCurrency).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // -------------------------------------------------------------
  // RENDER: HIERARCHICAL PROPERTY -> UNIT EXPENSES WITH PROOFS
  // -------------------------------------------------------------
  const renderHierarchicalExpensesDetail = (periodExpenses: typeof filteredExpenses) => {
    const targetProperties = selectedPropertyFilter === 'All'
      ? ownedProperties
      : ownedProperties.filter(p => p.id === selectedPropertyFilter);

    if (periodExpenses.length === 0) {
      return (
        <p className="text-xs text-stone-400 py-3 text-center">No maintenance expenses deducted for this period.</p>
      );
    }

    return (
      <div className="space-y-6">
        {targetProperties.map((prop) => {
          const nativeCurr = getPropNativeCurrency(prop.id);
          const propExpenses = periodExpenses.filter(e => e.property_id === prop.id);
          if (propExpenses.length === 0) return null;

          const generalExpenses = propExpenses.filter(e => e.scope === 'Property' || !e.unit_id);
          const unitExpensesMap = new Map<string, Expense[]>();

          propExpenses.forEach(e => {
            if (e.scope === 'Unit' && e.unit_id) {
              const list = unitExpensesMap.get(e.unit_id) || [];
              list.push(e);
              unitExpensesMap.set(e.unit_id, list);
            }
          });

          const totalPropExpenseAmt = propExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

          return (
            <div key={prop.id} className="bg-stone-50 rounded-2xl border border-stone-200 overflow-hidden shadow-2xs space-y-3 p-4">
              {/* Property Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-stone-200 gap-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-brand-600" />
                  <h4 className="font-bold text-sm text-stone-900">{prop.name}</h4>
                  <span className="text-[10px] text-stone-500 font-mono">({propExpenses.length} Expense Item{propExpenses.length !== 1 ? 's' : ''})</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Total Incurred</span>
                  <span className="font-black font-mono text-rose-600 text-xs">
                    -{currencyConfig.symbol}{convertAmount(totalPropExpenseAmt, nativeCurr, currentCurrency).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 1. General Property-Wide Incurred Expenses */}
              {generalExpenses.length > 0 && (
                <div className="bg-white rounded-xl border border-stone-200 p-3 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-stone-400" />
                    Property-Wide Common Expenses ({generalExpenses.length})
                  </span>
                  <div className="space-y-2">
                    {generalExpenses.map(ge => (
                      <div key={ge.id} className="p-2.5 bg-stone-50 rounded-lg border border-stone-200/80 space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-stone-800">{ge.category}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-stone-200 text-stone-800">
                              Property Scope
                            </span>
                          </div>
                          <span className="font-black font-mono text-rose-600">
                            -{currencyConfig.symbol}{convertAmount(ge.amount || 0, nativeCurr, currentCurrency).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-stone-600">{ge.description}</p>
                        {ge.proofs && ge.proofs.length > 0 && (
                          <div className="flex items-center gap-2 pt-1 border-t border-stone-200/60">
                            <span className="text-[10px] font-bold uppercase text-stone-400">Proofs:</span>
                            {ge.proofs.map(prf => (
                              <button
                                key={prf.id}
                                onClick={() => setActiveMediaModal({
                                  type: prf.file_type === 'photo' ? 'photo' : 'document',
                                  url: prf.file_url,
                                  title: prf.file_name,
                                  caption: prf.caption
                                })}
                                className="px-2 py-0.5 bg-white hover:bg-stone-100 border border-stone-200 rounded text-[10px] font-medium text-stone-700 flex items-center gap-1 cursor-pointer"
                              >
                                <Paperclip className="w-3 h-3 text-rose-600" />
                                {prf.file_name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Unit-by-Unit Incurred Expenses */}
              {Array.from(unitExpensesMap.entries()).map(([uId, uExpenses]) => {
                const unit = (dbState.units || []).find(u => u.id === uId);
                const totalUnitExp = uExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

                return (
                  <div key={uId} className="bg-white rounded-xl border border-stone-200 p-3 space-y-2">
                    <div className="flex justify-between items-center border-b border-stone-100 pb-1.5">
                      <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                        <Home className="w-3.5 h-3.5 text-stone-500" />
                        Unit {unit?.unit_number || uId} Incurred Costs ({uExpenses.length})
                      </span>
                      <span className="text-xs font-bold font-mono text-rose-600">
                        Total: -{currencyConfig.symbol}{convertAmount(totalUnitExp, nativeCurr, currentCurrency).toLocaleString()}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {uExpenses.map(ue => (
                        <div key={ue.id} className="p-2.5 bg-stone-50 rounded-lg border border-stone-200/80 space-y-1.5 text-xs">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-stone-800">{ue.category}</span>
                            <span className="font-black font-mono text-rose-600">
                              -{currencyConfig.symbol}{convertAmount(ue.amount || 0, nativeCurr, currentCurrency).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-stone-600">{ue.description}</p>
                          {ue.proofs && ue.proofs.length > 0 && (
                            <div className="flex items-center gap-2 pt-1 border-t border-stone-200/60">
                              <span className="text-[10px] font-bold uppercase text-stone-400">Proofs:</span>
                              {ue.proofs.map(prf => (
                                <button
                                  key={prf.id}
                                  onClick={() => setActiveMediaModal({
                                    type: prf.file_type === 'photo' ? 'photo' : 'document',
                                    url: prf.file_url,
                                    title: prf.file_name,
                                    caption: prf.caption
                                  })}
                                  className="px-2 py-0.5 bg-white hover:bg-stone-100 border border-stone-200 rounded text-[10px] font-medium text-stone-700 flex items-center gap-1 cursor-pointer"
                                >
                                  <Paperclip className="w-3 h-3 text-rose-600" />
                                  {prf.file_name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  // -------------------------------------------------------------
  // RENDER: HIERARCHICAL PROPERTY -> UNIT PHYSICAL AUDITS / INSPECTIONS
  // -------------------------------------------------------------
  const renderHierarchicalInspections = (inspectionsList: typeof filteredInspections) => {
    const targetProperties = selectedPropertyFilter === 'All'
      ? ownedProperties
      : ownedProperties.filter(p => p.id === selectedPropertyFilter);

    if (inspectionsList.length === 0) {
      return (
        <p className="text-xs text-stone-400 py-3 text-center">No physical audits registered for this period.</p>
      );
    }

    return (
      <div className="space-y-4">
        {targetProperties.map(prop => {
          const propInspections = inspectionsList.filter(i => i.property_id === prop.id);
          if (propInspections.length === 0) return null;

          // Group by Building-Wide vs Specific Unit Audits
          const generalAudits = propInspections.filter(i => !i.unit_id);
          const unitAudits = propInspections.filter(i => !!i.unit_id);

          return (
            <div key={prop.id} className="bg-stone-50 rounded-2xl border border-stone-200 p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-brand-600" />
                  <h4 className="font-bold text-sm text-stone-900">{prop.name}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cream-200 text-stone-800">
                    {propInspections.length} Physical Audit{propInspections.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Building-wide audits */}
              {generalAudits.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    Building-Wide & Infrastructure Audits
                  </span>
                  {generalAudits.map(insp => {
                    const sharedAttachments = (insp.attachments || []).filter(a => a.share_with_landlord !== false);
                    return (
                      <div key={insp.id} className="p-3 bg-white rounded-xl border border-stone-200 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-900">{insp.title}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            insp.overall_condition === 'Excellent' ? 'bg-emerald-100 text-emerald-800' :
                            insp.overall_condition === 'Good' ? 'bg-blue-100 text-blue-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            Condition: {insp.overall_condition}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500">
                          Lead Inspector: <strong>{insp.team_lead_name}</strong> • Scheduled: {insp.scheduled_date}
                        </p>
                        {insp.general_remarks && (
                          <p className="text-xs text-stone-600 bg-stone-50 p-2 rounded border border-stone-200/60">
                            {insp.general_remarks}
                          </p>
                        )}
                        {sharedAttachments.length > 0 && (
                          <div className="flex items-center gap-2 pt-1 border-t border-stone-100">
                            <span className="text-[10px] uppercase font-bold text-stone-400">Media Briefs:</span>
                            {sharedAttachments.map(att => (
                              <button
                                key={att.id}
                                onClick={() => setActiveMediaModal({
                                  type: att.file_type === 'video' ? 'video' : att.file_type === 'audio' ? 'audio' : 'photo',
                                  url: att.file_url,
                                  title: att.file_name,
                                  caption: att.caption
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
                    );
                  })}
                </div>
              )}

              {/* Unit-specific audits */}
              {unitAudits.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-stone-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    Individual Unit Walkthroughs
                  </span>
                  {unitAudits.map(insp => {
                    const unit = (dbState.units || []).find(u => u.id === insp.unit_id);
                    const sharedAttachments = (insp.attachments || []).filter(a => a.share_with_landlord !== false);
                    return (
                      <div key={insp.id} className="p-3 bg-white rounded-xl border border-stone-200 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Home className="w-3.5 h-3.5 text-stone-500" />
                            <span className="font-bold text-stone-900">Unit {unit?.unit_number || 'Suite'} · {insp.title}</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            insp.overall_condition === 'Excellent' ? 'bg-emerald-100 text-emerald-800' :
                            insp.overall_condition === 'Good' ? 'bg-blue-100 text-blue-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            Condition: {insp.overall_condition}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500">
                          Lead Inspector: <strong>{insp.team_lead_name}</strong> • Scheduled: {insp.scheduled_date}
                        </p>
                        {insp.general_remarks && (
                          <p className="text-xs text-stone-600 bg-stone-50 p-2 rounded border border-stone-200/60">
                            {insp.general_remarks}
                          </p>
                        )}
                        {sharedAttachments.length > 0 && (
                          <div className="flex items-center gap-2 pt-1 border-t border-stone-100">
                            <span className="text-[10px] uppercase font-bold text-stone-400">Media Briefs:</span>
                            {sharedAttachments.map(att => (
                              <button
                                key={att.id}
                                onClick={() => setActiveMediaModal({
                                  type: att.file_type === 'video' ? 'video' : att.file_type === 'audio' ? 'audio' : 'photo',
                                  url: att.file_url,
                                  title: att.file_name,
                                  caption: att.caption
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
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // -------------------------------------------------------------
  // RENDER: MONTHLY SECTION CONTENT
  // -------------------------------------------------------------
  const renderMonthSectionContent = (monthStr: string) => {
    const monthPayments = filteredPayments.filter(p => (p.payment_date || p.due_date)?.startsWith(monthStr));
    const monthExpenses = filteredExpenses.filter(e => (e.date || '').startsWith(monthStr));
    const monthInspections = filteredInspections.filter(i => (i.scheduled_date || '').startsWith(monthStr));
    const monthMaintenance = filteredMaintenanceRequests.filter(m => (m.created_at || '').startsWith(monthStr));

    let monthGross = 0;
    let monthFirmFees = 0;

    monthPayments.forEach(p => {
      const lease = (dbState.leases || []).find(l => l.id === p.lease_id);
      const unit = lease ? (dbState.units || []).find(u => u.id === lease.unit_id) : undefined;
      const prop = unit ? (dbState.properties || []).find(pr => pr.id === unit.property_id) : undefined;
      const nativeCurr = getPropNativeCurrency(unit?.property_id);
      const amt = convertAmount(p.amount_paid || p.amount || 0, nativeCurr, currentCurrency);
      monthGross += amt;

      const feePct = getEffectiveFeePercent(unit, prop);
      monthFirmFees += Math.round((amt * feePct) / 100);
    });

    const monthExp = monthExpenses.reduce((sum, e) => {
      const nativeCurr = getPropNativeCurrency(e.property_id);
      return sum + convertAmount(e.amount || 0, nativeCurr, currentCurrency);
    }, 0);

    const monthNet = Math.max(0, monthGross - monthFirmFees - monthExp);

    return (
      <div className="space-y-6 pt-2">
        {/* Month Financial Breakdown Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-stone-200 text-xs">
          <div>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Gross Rent Collected</span>
            <span className="font-bold text-stone-900 font-mono text-sm">{currencyConfig.symbol}{monthGross.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Firm Management Fees</span>
            <span className="font-bold text-stone-600 font-mono text-sm">-{currencyConfig.symbol}{monthFirmFees.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Maintenance Deductions</span>
            <span className="font-bold text-rose-600 font-mono text-sm">-{currencyConfig.symbol}{monthExp.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Net Investor Remittance</span>
            <span className="font-black text-emerald-600 font-mono text-sm">{currencyConfig.symbol}{monthNet.toLocaleString()}</span>
          </div>
        </div>

        {/* SECTION 1: HIERARCHICAL PROPERTY & UNIT OPERATIONAL REMITTANCE MATRIX */}
        {(categoryFilter === 'All' || categoryFilter === 'Remittances') && (
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    Property & Unit Operational Remittance Ledger
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    High-level property operating costs, nested suites, collected rents, custom fee splits & net payouts
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Net: {currencyConfig.symbol}{monthNet.toLocaleString()}
              </span>
            </div>

            {renderPropertyUnitHierarchicalBreakdown(monthPayments, monthExpenses)}
          </div>
        )}

        {/* SECTION 2: HIERARCHICAL MAINTENANCE EXPENSES BREAKDOWN WITH PROOFS */}
        {(categoryFilter === 'All' || categoryFilter === 'Expenses') && (
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-50 text-rose-700 rounded-lg">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    Itemized Maintenance Expenses & Proofs
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Contractor invoices, materials, and facility repairs categorized by property and unit
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                Total: -{currencyConfig.symbol}{monthExp.toLocaleString()}
              </span>
            </div>

            {renderHierarchicalExpensesDetail(monthExpenses)}
          </div>
        )}

        {/* SECTION 3: INFORMATIVE MAINTENANCE DISPATCH LOG (NO DOUBLE-COUNTING) */}
        {(categoryFilter === 'All' || categoryFilter === 'Maintenance') && (
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    Maintenance Dispatch & Operations Log
                  </h4>
                  <p className="text-[11px] text-amber-700 font-medium">
                    Work orders dispatched during this cycle (Informative only — financial costs are accounted for in the Ledger above)
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full">
                {monthMaintenance.length} Ticket{monthMaintenance.length !== 1 ? 's' : ''}
              </span>
            </div>

            {monthMaintenance.length === 0 ? (
              <p className="text-xs text-stone-400 py-3 text-center">No maintenance work orders logged for this cycle.</p>
            ) : (
              <div className="space-y-2">
                {monthMaintenance.map(req => {
                  const prop = ownedProperties.find(p => p.id === req.property_id);
                  const unit = (dbState.units || []).find(u => u.id === req.unit_id);
                  return (
                    <div key={req.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900">{req.title || `${req.category} Issue`}</span>
                          <span className="text-[10px] text-stone-500 font-mono">
                            {prop?.name} {unit ? `• Unit ${unit.unit_number}` : ''}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                            req.priority === 'Emergency' || req.priority === 'High' ? 'bg-rose-100 text-rose-800' : 'bg-stone-200 text-stone-700'
                          }`}>
                            {req.priority}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-600 mt-0.5">{req.description}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          req.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                          req.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {req.status}
                        </span>
                        <span className="text-[10px] text-stone-400 font-mono">
                          {req.created_at?.slice(0, 10)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SECTION 4: HIERARCHICAL PHYSICAL AUDITS & INSPECTIONS */}
        {(categoryFilter === 'All' || categoryFilter === 'Inspections') && (
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    Physical Property Audits & Condition Walkthroughs
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Condition scorecards, timestamped photos, and facility walkthroughs organized by property and unit
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full">
                {monthInspections.length} Audit{monthInspections.length !== 1 ? 's' : ''}
              </span>
            </div>

            {renderHierarchicalInspections(monthInspections)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          CONTROL & FILTER BAR (2 HORIZONTAL ROWS)
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
        {/* ROW 1: TIME-FRAME PRESETS, QUARTER SELECTOR & CUSTOM DATE RANGE */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
              Reporting Time-Frame Filter:
            </span>
            <div className="flex flex-wrap items-center bg-cream-100 p-1 rounded-xl border border-cream-300 gap-1">
              {[
                { id: 'day' as ReportTimeFrame, label: 'Today' },
                { id: 'week' as ReportTimeFrame, label: 'Weekly (Day-by-Day)' },
                { id: 'month' as ReportTimeFrame, label: 'Monthly' },
                { id: 'multi_month' as ReportTimeFrame, label: 'Quarter' },
                { id: 'year' as ReportTimeFrame, label: 'Yearly (Quarterly)' },
                { id: 'all' as ReportTimeFrame, label: 'All Time' },
                { id: 'custom' as ReportTimeFrame, label: 'Custom Range' },
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

          {/* Sub-selector for Specific Quarter if Quarter mode is selected */}
          {timeFrame === 'multi_month' && (
            <div className="flex items-center gap-1.5 bg-stone-50 p-1.5 rounded-xl border border-stone-200">
              <span className="text-[10px] font-bold text-stone-500 uppercase px-1">Select Quarter:</span>
              {([1, 2, 3, 4] as const).map(q => (
                <button
                  key={q}
                  onClick={() => handleQuarterChange(q)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedQuarter === q
                      ? 'bg-brand-600 text-white shadow-2xs'
                      : 'text-stone-600 hover:bg-stone-200/70'
                  }`}
                >
                  Q{q}
                </button>
              ))}
            </div>
          )}

          {/* Custom Date Pickers */}
          {timeFrame === 'custom' && (
            <div className="flex items-center gap-2 bg-stone-50 p-1.5 rounded-xl border border-stone-200">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-stone-400">From:</span>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="bg-white border border-stone-300 rounded px-2 py-0.5 text-xs font-mono font-bold text-stone-800"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-stone-400">To:</span>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="bg-white border border-stone-300 rounded px-2 py-0.5 text-xs font-mono font-bold text-stone-800"
                />
              </div>
            </div>
          )}
        </div>

        {/* ROW 2: PROPERTY FILTER, CATEGORY FILTER & PRINT STATEMENT */}
        <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Property Selector Filter */}
            <div className="flex items-center gap-1.5 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200">
              <Building2 className="w-3.5 h-3.5 text-stone-500" />
              <select
                value={selectedPropertyFilter}
                onChange={(e) => setSelectedPropertyFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-stone-800 cursor-pointer focus:outline-hidden"
              >
                <option value="All">All Owned Properties</option>
                {ownedProperties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1.5 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200">
              <Filter className="w-3.5 h-3.5 text-stone-500" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-stone-800 cursor-pointer focus:outline-hidden"
              >
                <option value="All">All Categories</option>
                <option value="Remittances">Rent & Remittances</option>
                <option value="Expenses">Maintenance Deductions</option>
                <option value="Maintenance">Maintenance Dispatch Log</option>
                <option value="Inspections">Physical Audits</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer w-fit"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Statement
          </button>
        </div>

        {/* ACTIVE PERIOD DATE STRIP */}
        <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-brand-600" />
            <span>Active Reporting Window: <strong>{dateRange.startDate}</strong> through <strong>{dateRange.endDate}</strong></span>
          </div>
          <span className="text-[11px] font-mono text-stone-400">
            {timeFrame === 'all' ? 'All Historic Records' : timeFrame === 'multi_month' ? `Quarter Q${selectedQuarter}` : timeFrame.toUpperCase()}
          </span>
        </div>
      </div>

      {/* =========================================================================
          DYNAMIC FINANCIAL KPI CARDS (LINKED DIRECTLY TO ACTIVE FILTER WINDOW)
          ========================================================================= */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            Financial Performance & Remittance Metrics ({dateRange.startDate} → {dateRange.endDate})
          </span>
          <span className="text-[10px] font-mono text-stone-400">
            {selectedPropertyFilter === 'All' ? `${ownedProperties.length} Properties · ${ownedUnits.length} Units` : 'Filtered Property Scope'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Period Inflow Collections</span>
            <div className="text-2xl font-black text-stone-900 font-mono">
              {currencyConfig.symbol}{periodStats.grossCollected.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <span className="text-[11px] text-stone-500">Gross rent & shortlet receipts</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Period Management Fees</span>
            <div className="text-2xl font-black text-stone-700 font-mono">
              -{currencyConfig.symbol}{periodStats.firmFees.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <span className="text-[11px] text-stone-500">Retained firm management split</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Period Expenses & Deductions</span>
            <div className="text-2xl font-black text-rose-600 font-mono">
              -{currencyConfig.symbol}{periodStats.expensesTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <span className="text-[11px] text-rose-700/80 font-medium">Repairs, maintenance & operating costs</span>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-2xl shadow-xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">Period Net Remitted Payout</span>
            <div className="text-2xl font-black text-emerald-800 font-mono">
              {currencyConfig.symbol}{periodStats.netRemitted.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <span className="text-[11px] text-emerald-700 font-bold">Total net funds remitted to landlord</span>
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
              Weekly Investor Activity (Day-by-Day Sections)
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Breakdown of collections, contractor invoices, and unit walk-throughs by calendar day
            </p>
          </div>

          {allDays.map(dayStr => {
            const dayPayments = filteredPayments.filter(p => (p.payment_date || p.due_date) === dayStr);
            const dayExpenses = filteredExpenses.filter(e => e.date === dayStr);
            const dayInspections = filteredInspections.filter(i => i.scheduled_date === dayStr);
            const hasActivity = dayPayments.length > 0 || dayExpenses.length > 0 || dayInspections.length > 0;

            return (
              <div key={dayStr} className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
                <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    <h3 className="font-bold text-sm tracking-wide">
                      {formatDayTitle(dayStr)}
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-stone-300">
                    {hasActivity ? 'Operational Events Registered' : 'No Events'}
                  </span>
                </div>

                <div className="p-5 space-y-4">
                  {(categoryFilter === 'All' || categoryFilter === 'Remittances') && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                        Properties & Suites Daily Breakdown:
                      </span>
                      {renderPropertyUnitHierarchicalBreakdown(dayPayments, dayExpenses)}
                    </div>
                  )}

                  {(categoryFilter === 'All' || categoryFilter === 'Expenses') && dayExpenses.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-stone-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                        Maintenance Deductions (Properties & Units):
                      </span>
                      {renderHierarchicalExpensesDetail(dayExpenses)}
                    </div>
                  )}

                  {dayInspections.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-stone-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                        Physical Audits:
                      </span>
                      {renderHierarchicalInspections(dayInspections)}
                    </div>
                  )}

                  {!hasActivity && (
                    <p className="text-xs text-stone-400 italic">No operational deductions or dispatches on this day.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          VIEW MODE 2: MONTHLY, MULTI-MONTH (QUARTER), ALL TIME, OR CUSTOM
          ========================================================================= */}
      {(timeFrame === 'day' || timeFrame === 'month' || timeFrame === 'multi_month' || timeFrame === 'all' || timeFrame === 'custom') && (
        <div className="space-y-8">
          {allMonths.map(monthStr => (
            <div key={monthStr} className="bg-cream-50/80 rounded-2xl border border-cream-300 p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-cream-300/80 gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {monthStr.slice(5, 7)}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-stone-900 tracking-tight">
                      {formatMonthName(monthStr)} Statement
                    </h2>
                    <span className="text-[11px] text-stone-500">
                      Portfolio Rents, Deductions & Net Yield Remittance
                    </span>
                  </div>
                </div>

                <span className="text-[10px] uppercase font-bold text-stone-400 bg-white px-2.5 py-1 rounded-lg border border-cream-300">
                  Monthly Cycle
                </span>
              </div>

              {renderMonthSectionContent(monthStr)}
            </div>
          ))}
        </div>
      )}

      {/* =========================================================================
          VIEW MODE 3: YEARLY (Quarterly Main Sections -> Monthly -> Subsections)
          ========================================================================= */}
      {timeFrame === 'year' && (
        <div className="space-y-10">
          {quarters.map(q => (
            <div key={q.id} className="bg-cream-100 rounded-3xl border-2 border-stone-800/10 p-6 shadow-sm space-y-6">
              <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-brand-400" />
                  <div>
                    <h2 className="text-base font-bold tracking-wide">{q.label}</h2>
                    <p className="text-xs text-stone-400">Quarterly Portfolio Audit Statement</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-stone-300 bg-slate-800 px-3 py-1 rounded-lg">
                  3 Calendar Months
                </span>
              </div>

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
          ))}
        </div>
      )}

      {/* =========================================================================
          MEDIA BRIEF / PROOF VIEWER MODAL
          ========================================================================= */}
      {activeMediaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-stone-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-stone-100">
              <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-brand-600" />
                {activeMediaModal.title}
              </h3>
              <button
                onClick={() => setActiveMediaModal(null)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto flex items-center justify-center bg-stone-100 rounded-xl p-4">
              {activeMediaModal.type === 'photo' && (
                <img
                  src={activeMediaModal.url}
                  alt={activeMediaModal.title}
                  className="max-h-[50vh] max-w-full rounded-lg object-contain shadow-xs"
                />
              )}
              {activeMediaModal.type === 'video' && (
                <video controls className="max-h-[50vh] max-w-full rounded-lg">
                  <source src={activeMediaModal.url} type="video/mp4" />
                  Your browser does not support video playback.
                </video>
              )}
              {activeMediaModal.type === 'audio' && (
                <audio controls className="w-full">
                  <source src={activeMediaModal.url} type="audio/webm" />
                  Your browser does not support audio playback.
                </audio>
              )}
              {activeMediaModal.type === 'document' && (
                <div className="text-center p-6 space-y-3">
                  <FileText className="w-12 h-12 text-stone-400 mx-auto" />
                  <p className="text-xs text-stone-600">Document available for official inspection</p>
                  <a
                    href={activeMediaModal.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-bold"
                  >
                    Open Document <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            {activeMediaModal.caption && (
              <p className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                {activeMediaModal.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
