import React, { useState, useMemo } from 'react';
import {
  Calendar, Clock, DollarSign, Download, Printer, Filter,
  FileText, CheckCircle2, AlertCircle, Eye, Search, Landmark,
  Video, Mic, Image, Paperclip, ChevronRight, Sparkles, Building2,
  CalendarRange, ShieldCheck, ChevronDown, ExternalLink, Play, Wrench, Home
} from 'lucide-react';
import { DatabaseState } from '../services/supabase';
import { useCurrency, CurrencyCode } from '../context/CurrencyContext';
import { Landlord, PropertyInspection, Expense, InspectionAttachment, ExpenseProof, Property, Unit } from '../types/database';
import { DualCurrencyDisplay } from './DualCurrencyDisplay';
import {
  ReportTimeFrame, getDateRangeForTimeFrame, formatMonthName,
  formatDayTitle, getQuarterInfo, DEFAULT_ANCHOR_DATE
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
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Remittances' | 'Expenses' | 'Inspections'>('All');
  const [activeMediaModal, setActiveMediaModal] = useState<{
    type: 'video' | 'audio' | 'photo' | 'document';
    url: string;
    title: string;
    caption?: string;
  } | null>(null);

  const handleTimeFrameChange = (newTf: ReportTimeFrame) => {
    setTimeFrame(newTf);
    if (newTf !== 'custom') {
      setDateRange(getDateRangeForTimeFrame(newTf));
    }
  };

  // Helper: Get property's native currency
  const getPropNativeCurrency = (propertyId?: string): CurrencyCode => {
    const prop = (dbState.properties || []).find(p => p.id === propertyId);
    return prop?.acquisition?.acquisition_currency || (prop?.city === 'Lagos' || prop?.city === 'Abuja' ? 'NGN' : 'CAD');
  };

  // 1. Filter Owned Properties
  const ownedProperties = useMemo(() => {
    return (dbState.properties || []).filter(p => ownedPropertyIds.includes(p.id));
  }, [dbState.properties, ownedPropertyIds]);

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

  // All owned units
  const ownedUnits = useMemo(() => {
    return (dbState.units || []).filter(u => ownedPropertyIds.includes(u.property_id));
  }, [dbState.units, ownedPropertyIds]);

  // Calculate totals in active currency
  const totalExpenseInActiveCurr = useMemo(() => {
    return filteredExpenses.reduce((acc, e) => {
      const nativeCurr = getPropNativeCurrency(e.property_id);
      return acc + convertAmount(e.amount || 0, nativeCurr, currentCurrency);
    }, 0);
  }, [filteredExpenses, currentCurrency]);

  const contractedGrossMonthlyInActiveCurr = useMemo(() => {
    return ownedUnits
      .filter(u => u.status === 'Occupied')
      .reduce((sum, u) => {
        const nativeCurr = getPropNativeCurrency(u.property_id);
        return sum + convertAmount(u.monthly_rent || 0, nativeCurr, currentCurrency);
      }, 0);
  }, [ownedUnits, currentCurrency]);

  const mgmtFeePercent = landlord.management_fee_percentage ?? 10.0;
  const managementFeeInActiveCurr = Math.round((contractedGrossMonthlyInActiveCurr * mgmtFeePercent) / 100);

  const totalRevenueInActiveCurr = useMemo(() => {
    return filteredPayments.reduce((acc, p) => {
      const lease = (dbState.leases || []).find(l => l.id === p.lease_id);
      const unit = lease ? (dbState.units || []).find(u => u.id === lease.unit_id) : undefined;
      const nativeCurr = getPropNativeCurrency(unit?.property_id);
      return acc + convertAmount(p.amount_paid || 0, nativeCurr, currentCurrency);
    }, 0);
  }, [filteredPayments, dbState.leases, dbState.units, currentCurrency]);

  const netRemittanceInActiveCurr = Math.max(0, totalRevenueInActiveCurr - managementFeeInActiveCurr - totalExpenseInActiveCurr);

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

    if (monthSet.size === 0 && dateRange.startDate) {
      monthSet.add(dateRange.startDate.slice(0, 7));
    }

    return Array.from(monthSet).sort().reverse();
  }, [filteredPayments, filteredExpenses, filteredInspections, dateRange]);

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

  // Helper to render hierarchical breakdown of Properties -> Units for a specific list of payments & expenses
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
          const totalPropFirmDeduction = Math.round((totalPropCollected * mgmtFeePercent) / 100);
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
                      General Building Operating Costs (Shared Building Infrastructure):
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
                      <th className="py-2.5 px-3">Active Tenant / Resident</th>
                      <th className="py-2.5 px-3">Status / Model</th>
                      <th className="py-2.5 px-3 text-right">Rent Inflow</th>
                      <th className="py-2.5 px-3 text-right">Unit Expenses</th>
                      <th className="py-2.5 px-3 text-right">Firm Fee ({mgmtFeePercent}%)</th>
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

                      // Management fee on unit rent
                      const unitFirmFee = Math.round((unitRentCollected * mgmtFeePercent) / 100);
                      const unitNetPayout = Math.max(0, unitRentCollected - unitFirmFee - totalUnitExpense);

                      return (
                        <tr key={unit.id} className="hover:bg-white transition-colors">
                          <td className="py-3 px-3 font-bold text-stone-900">
                            Unit {unit.unit_number}
                            <span className="text-[10px] text-stone-400 font-normal block">
                              {unit.bedrooms}BR / {unit.bathrooms}BA · {unit.square_feet ? `${unit.square_feet} sqft` : 'Standard'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            {activeTenant ? (
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
                              <span>-{currencyConfig.symbol}{convertAmount(unitFirmFee, nativeCurr, currentCurrency).toLocaleString()}</span>
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

  // Helper to render hierarchical Property -> Unit expenses breakdown with detailed proofs
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

          // Group by Unit (with 'Property-Wide' for non-unit specific expenses)
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
                    <span className="w-2 h-2 rounded-full bg-stone-400"></span>
                    General Building Operating Costs (Shared Infrastructure)
                  </span>
                  <div className="space-y-2">
                    {generalExpenses.map(ge => (
                      <div key={ge.id} className="p-3 bg-stone-50 rounded-lg border border-stone-200/80 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-stone-900">{ge.date}</span>
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
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-stone-800 flex items-center gap-1.5">
                        <Home className="w-3.5 h-3.5 text-brand-600" />
                        Unit {unit?.unit_number || uId} Deductions
                      </span>
                      <span className="font-bold font-mono text-xs text-rose-600">
                        Total: -{currencyConfig.symbol}{convertAmount(totalUnitExp, nativeCurr, currentCurrency).toLocaleString()}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {uExpenses.map(ue => (
                        <div key={ue.id} className="p-3 bg-stone-50 rounded-lg border border-stone-200/80 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-stone-900">{ue.date}</span>
                              <span className="font-semibold text-stone-800">{ue.category}</span>
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                                Suite Specific
                              </span>
                            </div>
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

  // Render a specific month section's detailed content
  const renderMonthSectionContent = (monthStr: string) => {
    const monthPayments = filteredPayments.filter(p => (p.payment_date || p.due_date)?.startsWith(monthStr));
    const monthExpenses = filteredExpenses.filter(e => (e.date || '').startsWith(monthStr));
    const monthInspections = filteredInspections.filter(i => (i.scheduled_date || '').startsWith(monthStr));

    const monthGross = monthPayments.reduce((sum, p) => {
      const lease = (dbState.leases || []).find(l => l.id === p.lease_id);
      const unit = lease ? (dbState.units || []).find(u => u.id === lease.unit_id) : undefined;
      const nativeCurr = getPropNativeCurrency(unit?.property_id);
      return sum + convertAmount(p.amount_paid || 0, nativeCurr, currentCurrency);
    }, 0);

    const monthExp = monthExpenses.reduce((sum, e) => {
      const nativeCurr = getPropNativeCurrency(e.property_id);
      return sum + convertAmount(e.amount || 0, nativeCurr, currentCurrency);
    }, 0);

    const monthMgmt = Math.round((monthGross * mgmtFeePercent) / 100);
    const monthNet = Math.max(0, monthGross - monthMgmt - monthExp);

    return (
      <div className="space-y-6 pt-2">
        {/* Month Financial Breakdown Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-stone-200 text-xs">
          <div>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Gross Rent Collected</span>
            <span className="font-bold text-stone-900 font-mono text-sm">{currencyConfig.symbol}{monthGross.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Management Fee ({mgmtFeePercent}%)</span>
            <span className="font-bold text-stone-600 font-mono text-sm">-{currencyConfig.symbol}{monthMgmt.toLocaleString()}</span>
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
                    High-level property operating costs, nested suites, collected rents, firm deductions & net payouts
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full">
                {ownedProperties.length} Properties · {ownedUnits.length} Suites
              </span>
            </div>

            {/* Render Hierarchical Property & Unit Table */}
            {renderPropertyUnitHierarchicalBreakdown(monthPayments, monthExpenses)}
          </div>
        )}

        {/* SECTION 2: HIERARCHICAL EXPENSES & CONTRACTOR PROOFS */}
        {(categoryFilter === 'All' || categoryFilter === 'Expenses') && (
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-50 text-rose-700 rounded-lg">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    Hierarchical Maintenance Deductions & Proofs
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Broken down property by property, with units, detailed expense descriptions, and attached invoices
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full">
                {monthExpenses.length} Expense Item{monthExpenses.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Render Hierarchical Expenses Details */}
            {renderHierarchicalExpensesDetail(monthExpenses)}
          </div>
        )}

        {/* SECTION 3: PHYSICAL AUDITS & INSPECTIONS */}
        {(categoryFilter === 'All' || categoryFilter === 'Inspections') && (
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    Physical Inspections & Auditor Walkthroughs
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Condition scorecards, timestamped photos, and facility walkthroughs
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full">
                {monthInspections.length} Audit{monthInspections.length !== 1 ? 's' : ''}
              </span>
            </div>

            {monthInspections.length === 0 ? (
              <p className="text-xs text-stone-400 py-3 text-center">No physical audits registered for this month.</p>
            ) : (
              <div className="space-y-3">
                {monthInspections.map(insp => {
                  const prop = ownedProperties.find(p => p.id === insp.property_id);
                  const sharedAttachments = (insp.attachments || []).filter(a => a.share_with_landlord !== false);

                  return (
                    <div key={insp.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-stone-900">{insp.title}</span>
                            <span className="text-stone-500 text-xs">({prop?.name})</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              insp.overall_condition === 'Excellent' ? 'bg-emerald-100 text-emerald-800' :
                              insp.overall_condition === 'Good' ? 'bg-blue-100 text-blue-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              Condition: {insp.overall_condition}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500 mt-0.5">
                            Lead Inspector: <strong>{insp.team_lead_name}</strong> • Scheduled: {insp.scheduled_date}
                          </p>
                        </div>
                      </div>

                      {insp.general_remarks && (
                        <p className="text-xs text-stone-600 bg-white p-2.5 rounded-lg border border-stone-200/60">
                          {insp.general_remarks}
                        </p>
                      )}

                      {sharedAttachments.length > 0 && (
                        <div className="flex items-center gap-2 pt-1">
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

          <div className="flex items-center gap-2">
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
                <option value="Inspections">Physical Audits</option>
              </select>
            </div>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Statement
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-brand-600" />
            <span>Active Period: <strong>{dateRange.startDate}</strong> through <strong>{dateRange.endDate}</strong></span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-semibold text-stone-600">
            <span>Collected Rent: <strong className="text-stone-900 font-mono">{currencyConfig.symbol}{totalRevenueInActiveCurr.toLocaleString()}</strong></span>
            <span>·</span>
            <span>Expenses: <strong className="text-rose-600 font-mono">-{currencyConfig.symbol}{totalExpenseInActiveCurr.toLocaleString()}</strong></span>
            <span>·</span>
            <span>Net Remittance: <strong className="text-emerald-600 font-mono">{currencyConfig.symbol}{netRemittanceInActiveCurr.toLocaleString()}</strong></span>
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
                  {/* Render Hierarchical Property & Unit Table for the day */}
                  {(categoryFilter === 'All' || categoryFilter === 'Remittances') && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                        Properties & Suites Daily Breakdown:
                      </span>
                      {renderPropertyUnitHierarchicalBreakdown(dayPayments, dayExpenses)}
                    </div>
                  )}

                  {/* Render Hierarchical Expenses Details for the day */}
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
                      {dayInspections.map(i => (
                        <div key={i.id} className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 flex items-center justify-between text-xs">
                          <span className="font-bold text-stone-900">{i.title}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                            Condition: {i.overall_condition}
                          </span>
                        </div>
                      ))}
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
          VIEW MODE 2: MONTHLY & MULTI-MONTH (Each Month as Main Section)
          ========================================================================= */}
      {(timeFrame === 'month' || timeFrame === 'multi_month' || timeFrame === 'custom') && (
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
                  Primary Section: Monthly Cycle
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
          VIEW MODE 4: SINGLE DAY
          ========================================================================= */}
      {timeFrame === 'day' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Daily Portfolio Statement: {formatDayTitle(dateRange.startDate)}
              </h3>
              <p className="text-xs text-stone-500">
                Chronological collections and repair expenditures for this 24-hour window
              </p>
            </div>
          </div>
          {renderMonthSectionContent(dateRange.startDate.slice(0, 7))}
        </div>
      )}

      {/* =========================================================================
          MEDIA MODAL (Video, Audio, Photo)
          ========================================================================= */}
      {activeMediaModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-stone-100 text-stone-800">
                  {activeMediaModal.type === 'video' ? <Video className="w-4 h-4" /> :
                   activeMediaModal.type === 'audio' ? <Mic className="w-4 h-4" /> :
                   <Paperclip className="w-4 h-4" />}
                </span>
                <h4 className="font-bold text-sm text-stone-900 truncate max-w-md">
                  {activeMediaModal.title}
                </h4>
              </div>
              <button
                onClick={() => setActiveMediaModal(null)}
                className="text-stone-400 hover:text-stone-700 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-stone-900 rounded-xl overflow-hidden flex items-center justify-center min-h-[240px]">
              {activeMediaModal.type === 'video' ? (
                <video
                  controls
                  autoPlay
                  src={activeMediaModal.url}
                  className="w-full max-h-[400px] object-contain"
                >
                  Your browser does not support HTML5 video playback.
                </video>
              ) : activeMediaModal.type === 'audio' ? (
                <div className="p-8 text-center w-full space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <Mic className="w-8 h-8 animate-pulse" />
                  </div>
                  <p className="text-xs text-stone-300 font-semibold">Auditor Field Voicenote Briefing</p>
                  <audio controls autoPlay src={activeMediaModal.url} className="w-full max-w-md mx-auto" />
                </div>
              ) : (
                <img
                  src={activeMediaModal.url}
                  alt={activeMediaModal.title}
                  className="w-full max-h-[420px] object-contain bg-white"
                />
              )}
            </div>

            {activeMediaModal.caption && (
              <p className="text-xs text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-200">
                <strong className="text-stone-900 block mb-0.5">Caption & Recorded Details:</strong>
                {activeMediaModal.caption}
              </p>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveMediaModal(null)}
                className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
