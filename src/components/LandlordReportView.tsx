import React, { useState, useMemo } from 'react';
import {
  Calendar, Clock, DollarSign, Download, Printer, Filter,
  FileText, CheckCircle2, AlertCircle, Eye, Search, Landmark,
  Video, Mic, Image, Paperclip, ChevronRight, Sparkles, Building2,
  CalendarRange, ShieldCheck, ChevronDown, ExternalLink, Play
} from 'lucide-react';
import { DatabaseState } from '../services/supabase';
import { useCurrency, CurrencyCode } from '../context/CurrencyContext';
import { Landlord, PropertyInspection, Expense, InspectionAttachment, ExpenseProof } from '../types/database';
import { DualCurrencyDisplay } from './DualCurrencyDisplay';

interface LandlordReportViewProps {
  dbState: DatabaseState;
  landlord: Landlord;
  ownedPropertyIds: string[];
}

type DatePreset = 'today' | 'this_week' | 'this_month' | 'this_year' | 'custom';

export const LandlordReportView: React.FC<LandlordReportViewProps> = ({
  dbState,
  landlord,
  ownedPropertyIds
}) => {
  const { currentCurrency, currencyConfig, convertAmount } = useCurrency();

  // Selected preset and date range
  const [preset, setPreset] = useState<DatePreset>('today');
  
  // Default anchor date matching the rich mock timeline: 2026-08-21
  const defaultAnchorDate = '2026-08-21';
  const [startDate, setStartDate] = useState<string>(defaultAnchorDate);
  const [endDate, setEndDate] = useState<string>(defaultAnchorDate);
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [activeMediaModal, setActiveMediaModal] = useState<{
    type: 'video' | 'audio' | 'photo' | 'document';
    url: string;
    title: string;
    caption?: string;
  } | null>(null);

  // Helper to switch presets dynamically
  const applyPreset = (newPreset: DatePreset) => {
    setPreset(newPreset);
    if (newPreset === 'today') {
      setStartDate(defaultAnchorDate);
      setEndDate(defaultAnchorDate);
    } else if (newPreset === 'this_week') {
      // 2026-08-17 to 2026-08-23
      setStartDate('2026-08-17');
      setEndDate('2026-08-23');
    } else if (newPreset === 'this_month') {
      setStartDate('2026-08-01');
      setEndDate('2026-08-31');
    } else if (newPreset === 'this_year') {
      setStartDate('2026-01-01');
      setEndDate('2026-12-31');
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
      return date >= startDate && date <= endDate;
    });
    return list.sort((a, b) => (b.scheduled_date || '').localeCompare(a.scheduled_date || ''));
  }, [dbState.inspections, ownedPropertyIds, selectedPropertyFilter, startDate, endDate]);

  // 3. Filter Expenses in date range strictly for owned properties
  const filteredExpenses = useMemo(() => {
    const list = (dbState.expenses || []).filter(e => {
      if (!ownedPropertyIds.includes(e.property_id)) return false;
      if (selectedPropertyFilter !== 'All' && e.property_id !== selectedPropertyFilter) return false;
      if (categoryFilter !== 'All' && e.category !== categoryFilter) return false;
      const date = e.date;
      if (!date) return false;
      return date >= startDate && date <= endDate;
    });
    return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [dbState.expenses, ownedPropertyIds, selectedPropertyFilter, categoryFilter, startDate, endDate]);

  // 4. Filter Payments (Yields/Inflows) in date range strictly for owned properties
  const filteredPayments = useMemo(() => {
    const list = (dbState.payments || []).filter(p => {
      const lease = (dbState.leases || []).find(l => l.id === p.lease_id);
      const unit = lease ? (dbState.units || []).find(u => u.id === lease.unit_id) : undefined;
      if (!unit || !ownedPropertyIds.includes(unit.property_id)) return false;
      if (selectedPropertyFilter !== 'All' && unit.property_id !== selectedPropertyFilter) return false;
      const date = p.payment_date || p.due_date;
      if (!date) return false;
      return date >= startDate && date <= endDate;
    });
    return list.sort((a, b) => ((b.payment_date || b.due_date) || '').localeCompare((a.payment_date || a.due_date) || ''));
  }, [dbState.payments, dbState.leases, dbState.units, ownedPropertyIds, selectedPropertyFilter, startDate, endDate]);

  // Calculate totals in active currency
  const totalExpenseInActiveCurr = useMemo(() => {
    return filteredExpenses.reduce((acc, e) => {
      const nativeCurr = getPropNativeCurrency(e.property_id);
      return acc + convertAmount(e.amount || 0, nativeCurr, currentCurrency);
    }, 0);
  }, [filteredExpenses, currentCurrency]);

  const totalRevenueInActiveCurr = useMemo(() => {
    return filteredPayments.reduce((acc, p) => {
      const lease = (dbState.leases || []).find(l => l.id === p.lease_id);
      const unit = lease ? (dbState.units || []).find(u => u.id === lease.unit_id) : undefined;
      const nativeCurr = getPropNativeCurrency(unit?.property_id);
      return acc + convertAmount(p.amount_paid || 0, nativeCurr, currentCurrency);
    }, 0);
  }, [filteredPayments, dbState.leases, dbState.units, currentCurrency]);

  const hasActivity = filteredInspections.length > 0 || filteredExpenses.length > 0 || filteredPayments.length > 0;

  // Print / PDF Trigger
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Adopted Title and Subtitle Section Design with Divider */}
      <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-3">
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight whitespace-nowrap">
          Portfolio Operational & Financial Audit
        </h1>
        <span className="hidden sm:inline text-cream-400 font-light">|</span>
        <p className="text-sm text-stone-600">
          Daily timeline, verified field inspections with media proofs & itemized expense invoices
        </p>
      </div>

      {/* Visual Divider */}
      <hr className="border-t border-slate-800/80" />

      {/* Export / Print Actions Row */}
      <div className="flex justify-end gap-2 print:hidden">
        <button
          onClick={handlePrint}
          className="px-3.5 py-1.5 bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          title="Print or Save as PDF"
        >
          <Printer className="w-3.5 h-3.5 text-stone-600" />
          <span>Print Report</span>
        </button>
        <button
          onClick={handlePrint}
          className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          title="Export as Document"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Document (PDF)</span>
        </button>
      </div>

      {/* Interactive Date Range & Scope Controls */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl">
            {(
              [
                { id: 'today', label: 'Day / Today' },
                { id: 'this_week', label: 'This Week' },
                { id: 'this_month', label: 'This Month' },
                { id: 'this_year', label: 'This Year' },
                { id: 'custom', label: 'Custom Range' }
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                onClick={() => applyPreset(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  preset === tab.id
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Date Picker Inputs */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-stone-500 font-bold flex items-center gap-1">
              <CalendarRange className="w-3.5 h-3.5 text-stone-400" />
              Period:
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPreset('custom');
              }}
              className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
            />
            <span className="text-stone-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPreset('custom');
              }}
              className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Secondary Property & Category Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-stone-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-stone-500 font-semibold">Filter Asset:</span>
            <select
              value={selectedPropertyFilter}
              onChange={(e) => setSelectedPropertyFilter(e.target.value)}
              className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg font-bold text-stone-800 focus:outline-hidden"
            >
              <option value="All">All Portfolio Assets ({ownedProperties.length})</option>
              {ownedProperties.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.city})</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-stone-500 font-semibold">Expense Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg font-bold text-stone-800 focus:outline-hidden"
            >
              <option value="All">All Categories</option>
              <option value="Repairs & Maintenance">Repairs & Maintenance</option>
              <option value="Cleaning">Cleaning & Turnover</option>
              <option value="Utilities">Utilities</option>
              <option value="Management">Management Fees</option>
            </select>
          </div>

          <div className="ml-auto text-xs text-stone-500 font-medium">
            Reporting Scope: <strong className="text-stone-900">{startDate === endDate ? `Day of ${startDate}` : `${startDate} through ${endDate}`}</strong>
          </div>
        </div>
      </div>

      {/* Printable Report Header / Cover Banner */}
      <div className="bg-stone-900 text-white rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:border print:border-stone-800 print:text-black print:bg-white print:p-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 print:text-emerald-700 text-xs font-bold uppercase tracking-wider mb-1">
            <Landmark className="w-4 h-4" />
            <span>Official Investor Portfolio Audit Report</span>
          </div>
          <h2 className="text-xl font-black tracking-tight text-white print:text-stone-900">
            {landlord.company_name || `${landlord.first_name} ${landlord.last_name}`}
          </h2>
          <p className="text-xs text-stone-300 print:text-stone-600 mt-0.5">
            Covered timeframe: <strong className="text-white print:text-stone-900">{startDate}</strong> to <strong className="text-white print:text-stone-900">{endDate}</strong> • Base Currency: {currencyConfig.code} ({currencyConfig.symbol}) • Generated: {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-6 print:gap-4">
          <div className="text-right">
            <span className="text-[10px] text-stone-400 print:text-stone-500 uppercase font-bold block">Inflow Collections</span>
            <span className="text-lg font-black text-emerald-400 print:text-emerald-700">
              {currencyConfig.symbol}{totalRevenueInActiveCurr.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="text-right border-l border-stone-800 print:border-stone-300 pl-6 print:pl-4">
            <span className="text-[10px] text-stone-400 print:text-stone-500 uppercase font-bold block">Total Incurred Expenses</span>
            <span className="text-lg font-black text-rose-400 print:text-rose-700">
              {currencyConfig.symbol}{totalExpenseInActiveCurr.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </div>

      {/* IF NO ACTIVITY FOR THE SELECTED RANGE: DISPLAY CLEAR NOTICE */}
      {!hasActivity ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-cream-100 text-stone-400 flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-stone-900">
            No Events or Expenses Recorded for this Period
          </h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            There are no field inspections, maintenance tickets, or operational expenses registered across your portfolio on <strong>{startDate === endDate ? startDate : `${startDate} to ${endDate}`}</strong>.
          </p>
          <div className="pt-2">
            <button
              onClick={() => applyPreset('this_month')}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Expand to View This Month's Complete History
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* =========================================================================
              SECTION 1: PHYSICAL INSPECTIONS & MULTIMEDIA PROOFS (Video, Audio, Photos)
              ========================================================================= */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-stone-900">
                  Field Audits & Physical Inspections ({filteredInspections.length})
                </h3>
              </div>
              <span className="text-xs text-stone-500 font-medium">Designated for Landlord Review</span>
            </div>

            {filteredInspections.length === 0 ? (
              <p className="text-xs text-stone-400 py-3 italic">
                No physical inspections conducted within this timeframe.
              </p>
            ) : (
              <div className="space-y-4">
                {filteredInspections.map(insp => {
                  const prop = ownedProperties.find(p => p.id === insp.property_id);
                  const unit = (dbState.units || []).find(u => u.id === insp.unit_id);
                  const sharedAttachments = (insp.attachments || []).filter(a => a.share_with_landlord !== false);

                  return (
                    <div key={insp.id} className="p-5 bg-stone-50 rounded-xl border border-stone-200/80 space-y-4">
                      {/* Inspection Header */}
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-stone-200 text-stone-800">
                              {insp.scheduled_date} • {insp.scheduled_time || '10:00 AM'}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              insp.overall_condition === 'Excellent' ? 'bg-emerald-100 text-emerald-800' :
                              insp.overall_condition === 'Good' ? 'bg-blue-100 text-blue-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              Condition: {insp.overall_condition || 'Good'}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700">
                              {insp.status}
                            </span>
                          </div>
                          <h4 className="font-bold text-stone-900 text-sm mt-1">
                            {insp.title} — {prop?.name} {unit ? `(Suite ${unit.unit_number})` : ''}
                          </h4>
                          <p className="text-xs text-stone-500 mt-0.5">
                            Lead Inspector: <strong className="text-stone-700">{insp.team_lead_name}</strong> • Signed: {insp.team_lead_signed_by || insp.team_lead_name}
                          </p>
                        </div>
                      </div>

                      {/* General Remarks */}
                      {insp.general_remarks && (
                        <div className="p-3 bg-white rounded-lg border border-stone-200 text-xs text-stone-700">
                          <strong className="text-stone-900 block mb-0.5">Auditor's Field Notes:</strong>
                          {insp.general_remarks}
                        </div>
                      )}

                      {/* Area Findings */}
                      {insp.findings && insp.findings.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                          {insp.findings.map((f, idx) => (
                            <div key={idx} className="p-2.5 bg-white rounded-lg border border-stone-200 space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-stone-800">{f.area}</span>
                                <span className="text-[10px] font-extrabold text-stone-600">{f.rating}</span>
                              </div>
                              <p className="text-[11px] text-stone-500">{f.remarks}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* MULTIMEDIA PROOFS (Videos, Audio Voicenotes, Photos) */}
                      {sharedAttachments.length > 0 && (
                        <div className="pt-2 border-t border-stone-200 space-y-2">
                          <span className="text-[11px] uppercase tracking-wider font-bold text-stone-400 block">
                            Field Media Verification ({sharedAttachments.length} item{sharedAttachments.length !== 1 ? 's' : ''})
                          </span>

                          {/* Print Mode: Clean text audit summary of multimedia records */}
                          <div className="hidden print:block space-y-1 text-xs text-stone-700 bg-white p-3 rounded-lg border border-stone-200">
                            {sharedAttachments.map((att, attIdx) => (
                              <div key={att.id || attIdx} className="flex items-baseline justify-between text-[11px]">
                                <span>
                                  <strong>[{att.file_type.toUpperCase()}] {att.file_name}</strong>
                                  {att.caption ? ` — ${att.caption}` : ''}
                                </span>
                                <span className="text-stone-500 font-mono text-[10px]">
                                  Recorded by {att.recorded_by || insp.team_lead_name}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Screen Mode: Interactive player and preview cards */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 print:hidden">
                            {sharedAttachments.map(att => (
                              <div
                                key={att.id}
                                className="bg-white rounded-xl border border-stone-200 p-3 hover:border-brand-500 transition-all flex flex-col justify-between space-y-2"
                              >
                                <div className="flex items-start gap-2.5">
                                  <div className={`p-2 rounded-lg shrink-0 ${
                                    att.file_type === 'video' ? 'bg-purple-100 text-purple-700' :
                                    att.file_type === 'audio' ? 'bg-amber-100 text-amber-700' :
                                    'bg-blue-100 text-blue-700'
                                  }`}>
                                    {att.file_type === 'video' ? <Video className="w-4 h-4" /> :
                                     att.file_type === 'audio' ? <Mic className="w-4 h-4" /> :
                                     <Image className="w-4 h-4" />}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] uppercase font-bold text-stone-400">
                                        {att.file_type === 'audio' ? 'Voicenote' : att.file_type}
                                      </span>
                                    </div>
                                    <h5 className="font-bold text-stone-900 text-xs truncate" title={att.file_name}>
                                      {att.file_name}
                                    </h5>
                                    {att.caption && (
                                      <p className="text-[11px] text-stone-500 line-clamp-2 mt-0.5">
                                        {att.caption}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setActiveMediaModal({
                                    type: att.file_type,
                                    url: att.file_url,
                                    title: att.file_name,
                                    caption: att.caption
                                  })}
                                  className="w-full py-1.5 bg-stone-50 hover:bg-stone-100 text-stone-800 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-stone-200"
                                >
                                  <Play className="w-3 h-3 text-brand-600" />
                                  <span>{att.file_type === 'audio' ? 'Play Voicenote' : att.file_type === 'video' ? 'Play Video' : 'View High-Res Photo'}</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* =========================================================================
              SECTION 2: ITEMIZED EXPENSES & PROOFS (Invoices, Receipts, Bills)
              ========================================================================= */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-base text-stone-900">
                  Operational Expenses & Proof Invoices ({filteredExpenses.length})
                </h3>
              </div>
              <span className="text-xs text-stone-500 font-medium">Attached Vendor Receipts</span>
            </div>

            {filteredExpenses.length === 0 ? (
              <p className="text-xs text-stone-400 py-3 italic">
                No operational expenses incurred within this timeframe.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-stone-50 text-stone-500 uppercase text-[10px] font-bold border-b border-stone-200">
                      <th className="p-3">Date</th>
                      <th className="p-3">Asset & Scope</th>
                      <th className="p-3">Category & Description</th>
                      <th className="p-3 text-right">Incurred Cost</th>
                      <th className="p-3 text-center">Receipts & Invoices</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredExpenses.map(exp => {
                      const prop = ownedProperties.find(p => p.id === exp.property_id);
                      const unit = (dbState.units || []).find(u => u.id === exp.unit_id);
                      const vendor = (dbState.vendors || []).find(v => v.id === exp.vendor_id);
                      const nativeCurr = getPropNativeCurrency(exp.property_id);
                      const allProofs = exp.proofs || (exp.receipt_url ? [{
                        id: 'prf-' + exp.id,
                        file_name: exp.invoice_number || 'receipt.pdf',
                        file_type: 'invoice' as const,
                        file_url: exp.receipt_url,
                        caption: exp.description,
                        uploaded_at: exp.date
                      }] : []);

                      return (
                        <tr key={exp.id} className="hover:bg-stone-50/80 transition-colors">
                          <td className="p-3 font-semibold text-stone-700 whitespace-nowrap">
                            {exp.date}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="font-bold text-stone-900 block">{prop?.name}</span>
                            <span className="text-[10px] text-stone-400">
                              {unit ? `Suite ${unit.unit_number}` : 'Building-Wide'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-stone-800">{exp.category}</span>
                              {vendor && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-stone-100 text-stone-600 rounded">
                                  {vendor.name}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-stone-500 mt-0.5">{exp.description}</p>
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            <DualCurrencyDisplay
                              amount={exp.amount}
                              nativeCurrency={nativeCurr}
                              primaryClassName="font-black text-rose-700 text-sm"
                              secondaryClassName="text-[10px] text-stone-400 block"
                            />
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            {allProofs.length > 0 ? (
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Print Mode: Clear text proof reference */}
                                <div className="hidden print:block text-[10px] text-stone-600 font-mono">
                                  {allProofs.map(p => p.file_name).join(', ')}
                                </div>

                                {/* Screen Mode: Interactive view button */}
                                <div className="flex items-center justify-center gap-1.5 print:hidden">
                                  {allProofs.map((p, pIdx) => (
                                    <button
                                      key={p.id || pIdx}
                                      type="button"
                                      onClick={() => setActiveMediaModal({
                                        type: 'document',
                                        url: p.file_url,
                                        title: p.file_name,
                                        caption: p.caption || `Invoice: ${exp.invoice_number || exp.description}`
                                      })}
                                      className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-md font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors border border-stone-200"
                                    >
                                      <Paperclip className="w-3 h-3 text-stone-500" />
                                      <span>Proof {pIdx + 1}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[11px] text-stone-400 italic">Direct Settlement</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* =========================================================================
              SECTION 3: REVENUE / INFLOW REMITTANCE LOGS
              ========================================================================= */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-stone-900">
                  Gross Yield Collections Received ({filteredPayments.length})
                </h3>
              </div>
              <span className="text-xs text-stone-500 font-medium">Bank Deposited Rent</span>
            </div>

            {filteredPayments.length === 0 ? (
              <p className="text-xs text-stone-400 py-3 italic">
                No rent collections received on this selected date.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredPayments.map(pay => {
                  const lease = (dbState.leases || []).find(l => l.id === pay.lease_id);
                  const unit = lease ? (dbState.units || []).find(u => u.id === lease.unit_id) : undefined;
                  const prop = unit ? ownedProperties.find(p => p.id === unit.property_id) : undefined;
                  const tenant = lease ? (dbState.tenants || []).find(t => t.id === lease.tenant_id) : undefined;
                  const nativeCurr = getPropNativeCurrency(prop?.id);

                  return (
                    <div key={pay.id} className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase bg-emerald-100 px-2 py-0.5 rounded">
                          {pay.payment_date || pay.due_date}
                        </span>
                        <span className="text-[10px] font-extrabold text-emerald-700">
                          {pay.status}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-stone-900 text-xs">
                          {prop?.name} — Suite {unit?.unit_number}
                        </h4>
                        <p className="text-[11px] text-stone-500">
                          Tenant: {tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Corporate Occupant'}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-emerald-500/20 flex justify-between items-center">
                        <span className="text-[10px] text-stone-400 font-bold uppercase">Amount Paid</span>
                        <DualCurrencyDisplay
                          amount={pay.amount_paid}
                          nativeCurrency={nativeCurr}
                          primaryClassName="font-black text-emerald-700 text-sm"
                          secondaryClassName="text-[10px] text-stone-400 block text-right"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MEDIA MODAL (Video Player, Audio Player, Document / Photo Viewer)
          ========================================================================= */}
      {activeMediaModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
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
