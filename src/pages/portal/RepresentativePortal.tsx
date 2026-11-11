import React, { useState, useRef, useEffect } from 'react';
import { DatabaseState, supabase, store } from '../../services/supabase';
import {
  ShieldCheck, Wrench, FileText, CreditCard, Bell,
  Calendar, Search, Landmark, ChevronDown, Sparkles, AlertCircle, Eye,
  Mail, Building2, UserCheck, Lock, CheckCircle2, XCircle, ArrowUpRight,
  Printer, DollarSign, Clock, Layers, AlertTriangle, LogOut, Home, ChevronRight
} from 'lucide-react';
import { useCurrency, CURRENCIES, CurrencyCode } from '../../context/CurrencyContext';
import { Landlord, LandlordDelegate, Property, Unit, MaintenanceRequest, Expense } from '../../types/database';
import { DualCurrencyDisplay } from '../../components/DualCurrencyDisplay';
import { LandlordReportView } from '../../components/LandlordReportView';

export type RepNavTab = 'mandate' | 'statements' | 'approvals' | 'holdings';

interface RepresentativePortalProps {
  dbState: DatabaseState;
  landlordId?: string;
  repId?: string;
  onClosePreview?: () => void;
}

export const RepresentativePortal: React.FC<RepresentativePortalProps> = ({
  dbState,
  landlordId,
  repId,
  onClosePreview
}) => {
  const { currentCurrency, setCurrency, currencyConfig, convertAmount, formatAmountInTarget } = useCurrency();
  const [currentTab, setCurrentTab] = useState<RepNavTab>(() => {
    const saved = localStorage.getItem('propertyflow_rep_tab') as RepNavTab;
    const validTabs: RepNavTab[] = ['mandate', 'statements', 'approvals', 'holdings'];
    return validTabs.includes(saved) ? saved : 'mandate';
  });
  const [activePropertyViewId, setActivePropertyViewId] = useState<string | null>(null);
  const [unitFilterType, setUnitFilterType] = useState<'All' | 'Occupied' | 'Vacant' | 'Shortlet'>('All');
  const [activeUnitTabId, setActiveUnitTabId] = useState<string | null>(null);
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState<string | null>(null);

  const mainScrollRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentTab]);

  // Auto-scroll to top when switching tabs
  const handleTabChange = (tab: RepNavTab) => {
    setCurrentTab(tab);
    localStorage.setItem('propertyflow_rep_tab', tab);
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Find the landlord and the specific representative
  const landlord: Landlord = (dbState.landlords || []).find(l => {
    if (landlordId && l.id === landlordId) return true;
    if (repId && (l.authorized_representatives || []).some(r => r.id === repId)) return true;
    // Fallback: check if landlord has any authorized representative
    return (l.authorized_representatives || []).length > 0;
  }) || dbState.landlords?.[0] || {
    id: 'landlord-1',
    first_name: 'David',
    last_name: 'Adeyemi',
    email: 'david.adeyemi@adeyemiholdings.com',
    company_name: 'Adeyemi Asset Holdings Ltd',
    management_fee_percentage: 10.0,
    remittance_frequency: 'Monthly',
    authorized_representatives: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  const representatives: LandlordDelegate[] = landlord.authorized_representatives || [];
  const representative: LandlordDelegate = representatives.find(r => r.id === repId) || representatives[0] || {
    id: 'rep-1',
    name: 'Barrister Chidi Okonkwo',
    email: 'chidi.legal@adeyemiholdings.com',
    phone: '+234 802 334 5566',
    relationship: 'Legal Counsel / Lawyer',
    can_view_statements: true,
    can_approve_maintenance: true,
    can_modify_banking: false,
    status: 'Active',
    created_at: '2024-01-15T00:00:00Z'
  };

  // Portfolio assets strictly owned by principal landlord
  const ownedProperties = (dbState.properties || []).filter(p => p.landlord_id === landlord.id);
  const ownedPropertyIds = ownedProperties.map(p => p.id);
  const ownedUnits = (dbState.units || []).filter(u => ownedPropertyIds.includes(u.property_id));
  const ownedUnitIds = ownedUnits.map(u => u.id);
  const occupiedUnits = ownedUnits.filter(u => u.status === 'Occupied');
  const vacantUnits = ownedUnits.filter(u => u.status === 'Vacant');
  const occupancyRate = ownedUnits.length > 0 ? Math.round((occupiedUnits.length / ownedUnits.length) * 100) : 100;

  // Helper: Get property's native currency
  const getPropNativeCurrency = (propertyId?: string): CurrencyCode => {
    const prop = (dbState.properties || []).find(p => p.id === propertyId);
    return prop?.acquisition?.acquisition_currency || (prop?.city === 'Lagos' || prop?.city === 'Abuja' ? 'NGN' : 'CAD');
  };

  // Convert unit rents to target currency using real live FX rates
  const grossMonthlyRentInActiveCurr = occupiedUnits.reduce((acc, u) => {
    const nativeCurr = getPropNativeCurrency(u.property_id);
    return acc + convertAmount(u.monthly_rent || 0, nativeCurr, currentCurrency);
  }, 0);

  // Calculate firm commission per unit based on unit -> property commission hierarchy
  const managementFeeInActiveCurr = occupiedUnits.reduce((acc, u) => {
    const prop = ownedProperties.find(p => p.id === u.property_id);
    const nativeCurr = getPropNativeCurrency(u.property_id);
    const unitRentActive = convertAmount(u.monthly_rent || 0, nativeCurr, currentCurrency);
    const feePct = u.management_fee_percentage ?? prop?.landlord_contract?.management_fee_percentage ?? landlord.management_fee_percentage ?? 10.0;
    return acc + Math.round((unitRentActive * feePct) / 100);
  }, 0);

  // Operating costs strictly for owned properties converted dynamically
  const propertyExpenses = (dbState.expenses || []).filter(e => ownedPropertyIds.includes(e.property_id));
  const totalRepairsInActiveCurr = propertyExpenses.reduce((acc, e) => {
    const nativeCurr = getPropNativeCurrency(e.property_id);
    return acc + convertAmount(e.amount || 0, nativeCurr, currentCurrency);
  }, 0);

  const netRemittanceInActiveCurr = Math.max(0, grossMonthlyRentInActiveCurr - managementFeeInActiveCurr - totalRepairsInActiveCurr);

  // Maintenance requests strictly under this portfolio (reactive to dbState updates)
  const [maintenanceTickets, setMaintenanceTickets] = useState<MaintenanceRequest[]>([]);

  useEffect(() => {
    setMaintenanceTickets(
      (dbState.maintenance_requests || []).filter(m => {
        if (m.property_id && ownedPropertyIds.includes(m.property_id)) return true;
        if (m.unit_id && ownedUnitIds.includes(m.unit_id)) return true;
        return false;
      })
    );
  }, [dbState.maintenance_requests, landlord.id, ownedPropertyIds.join(','), ownedUnitIds.join(',')]);

  // Action status message
  const [approvalNotification, setApprovalNotification] = useState<{ id: string; msg: string; type: 'success' | 'warn' } | null>(null);

  // Handle Delegate Approving or Declining Maintenance Ticket
  const handleRepresentativeAction = async (ticketId: string, action: 'Approved' | 'Declined') => {
    if (!representative.can_approve_maintenance) {
      alert('Your power of attorney does not include maintenance quote approvals. Contact the principal landlord.');
      return;
    }

    const note = action === 'Approved'
      ? `Approved by Legal Delegate (${representative.name} - ${representative.relationship}) on ${new Date().toLocaleDateString()}`
      : `Declined / Modification Requested by Legal Delegate (${representative.name})`;

    // Update in memory
    const updated = maintenanceTickets.map(t => {
      if (t.id === ticketId) {
        return {
          ...t,
          status: (action === 'Approved' ? 'In Progress' : 'Pending') as any,
          resolution_notes: t.resolution_notes ? `${t.resolution_notes}\n${note}` : note,
          updated_at: new Date().toISOString()
        };
      }
      return t;
    });
    setMaintenanceTickets(updated);

    // Sync to global store
    const globalTicket = (dbState.maintenance_requests || []).find(m => m.id === ticketId);
    if (globalTicket) {
      globalTicket.status = (action === 'Approved' ? 'In Progress' : 'Pending') as any;
      globalTicket.resolution_notes = globalTicket.resolution_notes ? `${globalTicket.resolution_notes}\n${note}` : note;
      globalTicket.updated_at = new Date().toISOString();
      store.saveState();
    }

    try {
      await supabase
        .from('maintenance_requests')
        .update({
          status: action === 'Approved' ? 'In Progress' : 'Pending',
          resolution_notes: note,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);
    } catch (err) {
      console.warn('Could not sync maintenance decision to backend:', err);
    }

    setApprovalNotification({
      id: ticketId,
      msg: action === 'Approved'
        ? `Work Order #${ticketId.slice(0, 8)} successfully ratified and released to contractor dispatch.`
        : `Work Order #${ticketId.slice(0, 8)} marked for contractor renegotiation.`,
      type: action === 'Approved' ? 'success' : 'warn'
    });

    setTimeout(() => setApprovalNotification(null), 5000);
  };

  const pendingApprovals = maintenanceTickets.filter(m => m.status === 'Pending');

  const handleSignOut = async () => {
    localStorage.removeItem('propertyflow_active_tab');
    localStorage.removeItem('propertyflow_landlord_tab');
    localStorage.removeItem('propertyflow_rep_tab');
    await supabase.auth.signOut();
    window.location.reload();
  };

  // Nav sections
  const navSections = [
    {
      title: 'Representation & Scope',
      items: [
        { id: 'mandate' as RepNavTab, label: 'Executive Summary', icon: ShieldCheck },
        { id: 'holdings' as RepNavTab, label: 'Holdings & Assets', icon: Building2, badge: `${ownedProperties.length}` },
      ]
    },
    {
      title: 'Fiduciary Oversight',
      items: [
        {
          id: 'statements' as RepNavTab,
          label: 'Financial Statements & Reports',
          icon: FileText
        },
        {
          id: 'approvals' as RepNavTab,
          label: 'Maintenance & Work Orders',
          icon: Wrench,
          badge: pendingApprovals.length > 0 ? `${pendingApprovals.length}` : undefined
        },
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-cream-100 text-stone-900 font-sans antialiased overflow-hidden">
      {/* =========================================================================
          PERSISTENT SLATE SIDEBAR (Consistent with Admin, Landlord, and Tenant portals)
          ========================================================================= */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 select-none hidden md:flex">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center text-white font-black shadow-md shadow-purple-900/50">
              PF
            </div>
            <div>
              <h1 className="font-bold text-white tracking-wide text-sm leading-tight">PropertyFlow</h1>
              <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider block">Representative Portal</span>
            </div>
          </div>
        </div>

        {/* Principal Landlord Entity */}
        <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/80 text-[11px]">
          <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Principal Client</span>
          <span className="font-bold text-stone-200 block truncate">
            {landlord.company_name || `${landlord.first_name} ${landlord.last_name}`}
          </span>
          <span className="text-[10px] text-purple-300 font-medium flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
            Authorized Representative
          </span>
        </div>

        {/* Currency Switcher in Left Sidebar */}
        <div className="px-3 py-2 mx-3 my-2 bg-slate-950/40 rounded-xl border border-slate-800 flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span> Currency:
          </span>
          <select
            value={currentCurrency}
            onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
            className="bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 rounded-lg px-2 py-1 cursor-pointer focus:outline-hidden"
            title="Switch Operational Currency"
          >
            {Object.values(CURRENCIES).map(c => (
              <option key={c.code} value={c.code}>
                {c.code} ({c.symbol.trim()})
              </option>
            ))}
          </select>
        </div>

        {/* Grouped Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-5">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                {section.title}
              </span>

              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-purple-600 text-white shadow-xs font-bold'
                        : 'hover:bg-slate-800/70 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : item.badge === 'Authorized' || item.badge === 'Granted'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : item.badge === 'Restricted' || item.badge === 'Protected'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-purple-950 text-purple-300 border border-purple-800'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sign Out / User Account Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-slate-850/80 border border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white text-xs font-black flex items-center justify-center shrink-0">
                {(representative.name?.[0] || 'R').toUpperCase()}
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-bold text-white truncate">
                  {representative.name}
                </span>
                <span className="text-[10px] text-purple-300 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span> Verified Delegate
                </span>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Sign Out of Delegate Portal"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          MAIN APPLICATION VIEW AREA
          ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Preview Banner (if opened from Admin / Switcher) */}
        {onClosePreview && (
          <div className="bg-purple-950 text-purple-200 px-4 py-2 flex items-center justify-between text-xs shrink-0 z-50 border-b border-purple-800">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
              <strong>Representative Preview Mode:</strong> Viewing verified legal delegate workspace for <em>{representative.name}</em> (representing {landlord.company_name || `${landlord.first_name} ${landlord.last_name}`})
            </span>
            <button
              onClick={onClosePreview}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg font-bold text-[11px] transition-all cursor-pointer"
            >
              Exit Preview ✕
            </button>
          </div>
        )}

        {/* Main View Content */}
        <main ref={mainScrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Notification Alert if action performed */}
          {approvalNotification && (
            <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between animate-fadeIn ${
              approvalNotification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{approvalNotification.msg}</span>
              </div>
              <button
                onClick={() => setApprovalNotification(null)}
                className="text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>
          )}

          {/* =========================================================================
              VIEW 1: EXECUTIVE SUMMARY & POWERS OF ATTORNEY OVERVIEW
              ========================================================================= */}
          {currentTab === 'mandate' && (
            <div className="space-y-6">
              {/* Adopted Title and Subtitle Section Design (Strict Single Line) */}
              <div className="flex items-baseline gap-2 sm:gap-3 overflow-hidden">
                <h1 className="text-2xl font-bold text-stone-900 tracking-tight whitespace-nowrap shrink-0">
                  Executive Summary
                </h1>
                <span className="text-cream-400 font-light shrink-0">|</span>
                <p className="text-sm text-stone-600 truncate">
                  Fiduciary oversight, delegated authority scope & mandate execution for {landlord.company_name || `${landlord.first_name} ${landlord.last_name}`}
                </p>
              </div>

              {/* Personalized Welcome Banner */}
              <div className="flex items-center justify-between text-xs text-stone-600 bg-white px-4 py-2.5 rounded-xl border border-stone-200/80 shadow-2xs">
                <span>
                  Welcome, <strong className="text-stone-900">{representative.name}</strong> ({representative.relationship}) · Authorized Portfolio Representation
                </span>
                <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                  Authorized on: {representative.created_at?.slice(0, 10) || '2024-01-15'}
                </span>
              </div>

              <hr className="border-t border-slate-800/80" />

              {/* High-Level Portfolio Metrics for Representative (Live FX Converted) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Supervised Portfolio</span>
                  <div className="text-2xl font-black text-stone-900">{ownedProperties.length} Properties</div>
                  <span className="text-[11px] text-stone-500">
                    {occupiedUnits.length} Occupied / {vacantUnits.length} Vacant ({occupancyRate}%)
                  </span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Gross Monthly Yield</span>
                  <div className="text-2xl font-black text-stone-900 font-mono">
                    {currencyConfig.symbol}{grossMonthlyRentInActiveCurr.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <span className="text-[11px] text-stone-500">Calculated via live exchange rate feed</span>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-2xl shadow-xs space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">Net Monthly Remittance</span>
                  <div className="text-2xl font-black text-emerald-800 font-mono">
                    {currencyConfig.symbol}{netRemittanceInActiveCurr.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <span className="text-[11px] text-emerald-700 font-bold">
                    After {currencyConfig.symbol}{managementFeeInActiveCurr.toLocaleString(undefined, { maximumFractionDigits: 0 })} firm fee split
                  </span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Pending Approvals</span>
                  <div className="text-2xl font-black text-amber-600">{pendingApprovals.length} Work Orders</div>
                  <span className="text-[11px] text-stone-500">Require representative ratification</span>
                </div>
              </div>

              {/* Supervised Real Estate Holdings Overview Cards (With Live DualCurrencyDisplay) */}
              <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-stone-900">Supervised Real Estate Holdings ({ownedProperties.length})</h2>
                    <p className="text-xs text-stone-500">Properties registered under {landlord.company_name || `${landlord.first_name} ${landlord.last_name}`} with live {currentCurrency} currency conversion</p>
                  </div>
                  <button
                    onClick={() => handleTabChange('holdings')}
                    className="text-xs text-purple-600 hover:text-purple-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    Explore All Holdings <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {ownedProperties.map(p => {
                    const pUnits = ownedUnits.filter(u => u.property_id === p.id);
                    const pOccupied = pUnits.filter(u => u.status === 'Occupied').length;
                    const nativeCurr = getPropNativeCurrency(p.id);
                    const pNativeRent = pUnits.filter(u => u.status === 'Occupied').reduce((acc, u) => acc + (u.monthly_rent || 0), 0);
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          setActivePropertyViewId(p.id);
                          setActiveUnitTabId(pUnits[0]?.id || null);
                          handleTabChange('holdings');
                        }}
                        className="p-5 bg-white hover:bg-stone-50/80 rounded-2xl border border-stone-200/90 shadow-2xs hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between gap-4 group"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <h3 className="font-bold text-stone-900 text-sm group-hover:text-purple-600 transition-colors truncate">
                              {p.name}
                            </h3>
                            <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">{p.address}, {p.city}</p>
                          </div>
                          <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200/60 rounded-lg font-bold text-[10px] shrink-0">
                            {p.property_type}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-stone-100">
                          <div className="bg-stone-50/80 rounded-xl p-2.5 border border-stone-200/60 flex flex-col justify-center">
                            <span className="text-[10px] text-stone-400 block uppercase font-bold tracking-wider">Occupancy</span>
                            <span className="font-bold text-xs text-stone-800 mt-0.5">
                              {pOccupied} / {pUnits.length} Units
                            </span>
                          </div>
                          <div className="bg-stone-50/80 rounded-xl p-2.5 border border-stone-200/60 flex flex-col justify-center">
                            <span className="text-[10px] text-stone-400 block uppercase font-bold tracking-wider">Monthly Yield</span>
                            <div className="mt-0.5 min-w-0">
                              <DualCurrencyDisplay
                                amount={pNativeRent}
                                nativeCurrency={nativeCurr}
                                primaryClassName="font-black text-xs text-emerald-700 truncate"
                                secondaryClassName="text-[9px] text-stone-400 block truncate"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Authority Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Statements Permission */}
                <div className={`p-5 rounded-2xl border shadow-xs space-y-2 ${
                  representative.can_view_statements
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-stone-50 border-stone-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Statements & Audits</span>
                    {representative.can_view_statements ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Authorized
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-stone-200 text-stone-700 font-bold text-[10px] flex items-center gap-1">
                        <Lock className="w-3 h-3 text-stone-500" /> Restricted
                      </span>
                    )}
                  </div>
                  <div className="text-base font-bold text-stone-900">Financial Reports & Yields</div>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    {representative.can_view_statements
                      ? 'Full permission to audit gross tenant collections, management deductions, operating invoices, and net remittances.'
                      : 'Restricted by principal landlord. Financial remittances and statements are hidden.'}
                  </p>
                </div>

                {/* 2. Maintenance Approvals */}
                <div className={`p-5 rounded-2xl border shadow-xs space-y-2 ${
                  representative.can_approve_maintenance
                    ? 'bg-purple-50/50 border-purple-200'
                    : 'bg-stone-50 border-stone-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Work Order Ratification</span>
                    {representative.can_approve_maintenance ? (
                      <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[10px] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-purple-600" /> Authorized
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-stone-200 text-stone-700 font-bold text-[10px] flex items-center gap-1">
                        <Lock className="w-3 h-3 text-stone-500" /> View Only
                      </span>
                    )}
                  </div>
                  <div className="text-base font-bold text-stone-900">Repair Quotes & Dispatch</div>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    {representative.can_approve_maintenance
                      ? 'Full signatory power to approve contractor repair estimates, author dispatch orders, or request price negotiations.'
                      : 'Informational view only. Principal investor retains exclusive approval authority for capital expenditures.'}
                  </p>
                </div>
              </div>

              {/* Quick Action & Executive Guidance Pill */}
              <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-200/60 text-xs text-purple-900 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-purple-950">Delegated Executive Governance & Representation</div>
                  <p className="text-purple-900/90 leading-relaxed">
                    Actions ratified via this representative portal (including repair dispatch authorizations and audit sign-offs) carry legal binding authority under the principal landlord's executed property management agreement.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              VIEW 2: STATEMENTS & FINANCIAL AUDITS (Respects can_view_statements)
              ========================================================================= */}
          {currentTab === 'statements' && (
            <div className="space-y-6">
              {representative.can_view_statements ? (
                <div>
                  <div className="flex items-baseline gap-2 sm:gap-3 overflow-hidden mb-4 print:hidden">
                    <h1 className="text-2xl font-bold text-stone-900 tracking-tight whitespace-nowrap shrink-0">
                      Financial Statements & Reports
                    </h1>
                    <span className="text-cream-400 font-light shrink-0">|</span>
                    <p className="text-sm text-stone-600 truncate">
                      Audited financial ledger, rent yields, management fees and operating deductions for {landlord.company_name || `${landlord.first_name} ${landlord.last_name}`}
                    </p>
                  </div>
                  <hr className="border-t border-slate-800/80 mb-6 print:hidden" />

                  {/* Render the full hierarchical LandlordReportView */}
                  <LandlordReportView
                    dbState={dbState}
                    landlord={landlord}
                    ownedPropertyIds={ownedPropertyIds}
                  />
                </div>
              ) : (
                <div className="p-12 bg-white rounded-3xl border border-stone-200 text-center max-w-lg mx-auto space-y-4 my-12">
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                    <Lock className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-stone-900">Financial Statements Access Restricted</h3>
                  <p className="text-xs text-stone-500 leading-relaxed">
                    The principal landlord (<strong>{landlord.company_name || `${landlord.first_name} ${landlord.last_name}`}</strong>) has not authorized statement or yield disclosure for this representative account.
                  </p>
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-[11px] text-stone-600">
                    To review financial ledgers or tax reporting, contact the principal investor to grant <code>can_view_statements</code> in their investor portal settings.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              VIEW 3: MAINTENANCE & WORK ORDER APPROVALS (Respects can_approve_maintenance)
              ========================================================================= */}
          {currentTab === 'approvals' && (
            <div className="space-y-6">
              <div className="flex items-baseline gap-2 sm:gap-3 overflow-hidden">
                <h1 className="text-2xl font-bold text-stone-900 tracking-tight whitespace-nowrap shrink-0">
                  Maintenance & Work Orders
                </h1>
                <span className="text-cream-400 font-light shrink-0">|</span>
                <p className="text-sm text-stone-600 truncate">
                  Review contractor estimates, authorize emergency dispatches, and track asset repairs across supervised properties
                </p>
              </div>

              <hr className="border-t border-slate-800/80" />

              {/* Maintenance summary metric cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Awaiting Decision</span>
                  <div className="text-2xl font-black text-amber-600">{pendingApprovals.length} Requests</div>
                  <span className="text-[11px] text-stone-500">Require representative ratification</span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">In Progress / Dispatched</span>
                  <div className="text-2xl font-black text-blue-600">
                    {maintenanceTickets.filter(m => m.status === 'In Progress').length} Active
                  </div>
                  <span className="text-[11px] text-stone-500">Contractors currently mobilized</span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Completed & Verified</span>
                  <div className="text-2xl font-black text-emerald-600">
                    {maintenanceTickets.filter(m => m.status === 'Completed').length} Resolved
                  </div>
                  <span className="text-[11px] text-stone-500">Repairs completed historically</span>
                </div>
              </div>

              {/* Property Filter & Status Summary Bar */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">Filter Property:</span>
                  <select
                    value={selectedPropertyFilter || 'All'}
                    onChange={(e) => setSelectedPropertyFilter(e.target.value === 'All' ? null : e.target.value)}
                    className="px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-800 cursor-pointer shadow-2xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  >
                    <option value="All">All Supervised Properties ({ownedProperties.length})</option>
                    {ownedProperties.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="px-3 py-1 bg-amber-50 text-amber-800 rounded-full font-bold border border-amber-200/80">
                    {pendingApprovals.length} Awaiting Ratification
                  </span>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full font-bold border border-emerald-200/80">
                    {maintenanceTickets.filter(m => m.status === 'Completed').length} Completed
                  </span>
                </div>
              </div>

              {/* Tickets list */}
              <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/50">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-purple-600" />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-stone-700">
                      Work Orders Across Supervised Portfolio ({maintenanceTickets.filter(m => {
                        if (!selectedPropertyFilter) return true;
                        const pId = m.property_id || (dbState.units || []).find(u => u.id === m.unit_id)?.property_id;
                        return pId === selectedPropertyFilter;
                      }).length})
                    </h3>
                  </div>
                  {!representative.can_approve_maintenance && (
                    <span className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" /> Read-Only Mode (Approval powers not granted)
                    </span>
                  )}
                </div>

                {maintenanceTickets.length === 0 ? (
                  <div className="text-center py-12 text-stone-400 text-xs">
                    No active maintenance tickets for this landlord's properties.
                  </div>
                ) : (
                  <div className="divide-y divide-stone-100">
                    {maintenanceTickets
                      .filter(req => {
                        if (!selectedPropertyFilter) return true;
                        const propId = req.property_id || (dbState.units || []).find(u => u.id === req.unit_id)?.property_id;
                        return propId === selectedPropertyFilter;
                      })
                      .map(req => {
                      const propId = req.property_id || (dbState.units || []).find(u => u.id === req.unit_id)?.property_id;
                      const prop = (dbState.properties || []).find(p => p.id === propId);
                      const unit = (dbState.units || []).find(u => u.id === req.unit_id);
                      const vendor = (dbState.vendors || []).find(v => v.id === req.vendor_id || v.id === (req as any).assigned_vendor_id);
                      const isPending = req.status === 'Pending';
                      const nativeCurr = getPropNativeCurrency(propId);
                      const billableCost = req.estimated_cost ?? req.actual_cost;

                      return (
                        <div key={req.id} className="p-5 hover:bg-stone-50/60 transition-colors space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  req.priority === 'Emergency' ? 'bg-rose-100 text-rose-800' :
                                  req.priority === 'High' ? 'bg-amber-100 text-amber-800' :
                                  'bg-stone-100 text-stone-700'
                                }`}>
                                  {req.priority} Priority
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  req.status === 'Pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                  req.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                  'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}>
                                  {req.status}
                                </span>
                                <span className="text-xs font-semibold text-stone-500">
                                  {prop?.name} {unit ? `• Unit ${unit.unit_number}` : ''}
                                </span>
                              </div>
                              <h4 className="font-bold text-sm text-stone-900">{req.title || req.category}: {req.description}</h4>
                            </div>

                            {/* Estimate and actions */}
                            <div className="flex items-center gap-3 self-start sm:self-center">
                              {billableCost !== undefined && billableCost !== null ? (
                                <div className="text-right px-3 py-1.5 bg-stone-50 rounded-xl border border-stone-200/80">
                                  <span className="text-[10px] uppercase font-bold text-stone-400 block">
                                    {req.actual_cost ? 'Incurred Cost' : 'Estimated Cost'}
                                  </span>
                                  <DualCurrencyDisplay
                                    amount={Number(billableCost || 0)}
                                    nativeCurrency={nativeCurr}
                                    primaryClassName="font-bold text-sm text-stone-900 font-mono"
                                    secondaryClassName="text-[10px] text-stone-400 block"
                                  />
                                </div>
                              ) : (
                                <span className="text-[11px] text-stone-400 italic">No billable quote attached</span>
                              )}

                              {isPending && representative?.can_approve_maintenance && (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleRepresentativeAction(req.id, 'Approved')}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Dispatch
                                  </button>
                                  <button
                                    onClick={() => handleRepresentativeAction(req.id, 'Declined')}
                                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                                  >
                                    Renegotiate
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Resolution / Delegate Audit trail if available */}
                          {Boolean(req.resolution_notes) && (
                            <div className="p-2.5 bg-purple-50/50 rounded-xl border border-purple-100 text-[11px] text-purple-900">
                              <span className="font-bold">Audit Log:</span> {req.resolution_notes}
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1 border-t border-stone-100">
                            <span>Ticket ID: {req.id}</span>
                            <span>Assigned Trade: {vendor?.name || 'In-House Facilities Staff'}</span>
                            <span>Submitted: {req.created_at ? String(req.created_at).slice(0, 10) : 'Recent'}</span>
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
              VIEW 4: SUPERVISED HOLDINGS & ASSETS (WITH LIVE DUAL-CURRENCY CONVERSION)
              ========================================================================= */}
          {currentTab === 'holdings' && (
            <div className="space-y-6">
              <div className="flex items-baseline gap-2 sm:gap-3 overflow-hidden">
                <h1 className="text-2xl font-bold text-stone-900 tracking-tight whitespace-nowrap shrink-0">
                  Holdings & Assets
                </h1>
                <span className="text-cream-400 font-light shrink-0">|</span>
                <p className="text-sm text-stone-600 truncate">
                  Comprehensive real estate portfolio registry, building specifications, suite configurations, and supervised properties
                </p>
              </div>

              <hr className="border-t border-slate-800/80" />

              {activePropertyViewId ? (() => {
                const activeProp = ownedProperties.find(p => p.id === activePropertyViewId) || ownedProperties[0];
                const propUnits = ownedUnits.filter(u => u.property_id === activeProp.id);
                const propOccupiedUnits = propUnits.filter(u => u.status === 'Occupied');
                const propOccupancyRate = propUnits.length > 0 ? Math.round((propOccupiedUnits.length / propUnits.length) * 100) : 0;
                const nativeCurr = getPropNativeCurrency(activeProp.id);

                const filteredPropUnits = propUnits.filter(u => {
                  if (unitFilterType === 'Occupied') return u.status === 'Occupied';
                  if (unitFilterType === 'Vacant') return u.status === 'Vacant';
                  if (unitFilterType === 'Shortlet') return u.rental_model === 'Shortlet / STR';
                  return true;
                });

                const activeUnit = propUnits.find(u => u.id === activeUnitTabId) || propUnits[0];
                const activeLease = activeUnit ? (dbState.leases || []).find(l => l.unit_id === activeUnit.id && l.status === 'Active') : null;
                const activeTenant = activeLease ? (dbState.tenants || []).find(t => t.id === activeLease.tenant_id) : null;

                return (
                  <div className="space-y-6">
                    {/* Top Return Navigation Bar */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => {
                          setActivePropertyViewId(null);
                          setActiveUnitTabId(null);
                        }}
                        className="flex items-center gap-2 text-xs font-bold text-stone-600 hover:text-stone-900 bg-white px-3.5 py-2 rounded-xl border border-stone-200 shadow-2xs cursor-pointer transition-all hover:bg-stone-50"
                      >
                        <ChevronRight className="w-4 h-4 rotate-180" />
                        <span>Back to All Holdings ({ownedProperties.length})</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-stone-500 font-medium">Switch Building:</span>
                        <select
                          value={activeProp.id}
                          onChange={(e) => {
                            setActivePropertyViewId(e.target.value);
                            setActiveUnitTabId(null);
                          }}
                          className="px-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-800 cursor-pointer shadow-2xs"
                        >
                          {ownedProperties.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Property Specification Banner */}
                    <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm p-6 space-y-5">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-stone-100 pb-5">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-900 flex items-center justify-center font-black border border-purple-200 shadow-2xs">
                              <Building2 className="w-5 h-5 text-purple-700" />
                            </div>
                            <div>
                              <h2 className="text-xl font-black text-stone-900">{activeProp.name}</h2>
                              <p className="text-xs text-stone-500 mt-0.5">{activeProp.address}, {activeProp.city}, {activeProp.province}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-stone-100 text-stone-700">
                              {activeProp.property_type}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                              {activeProp.city}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              propOccupancyRate >= 75
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}>
                              {propOccupancyRate}% Occupied ({propOccupiedUnits.length}/{propUnits.length} Units)
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                              Base Fee: {activeProp.landlord_contract?.management_fee_percentage ?? landlord.management_fee_percentage ?? 10}%
                            </span>
                          </div>
                        </div>

                        {/* Property Specs Pill Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
                          <div className="px-4 py-2.5 bg-stone-50 rounded-2xl border border-stone-200/80 text-right">
                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Total Suites</span>
                            <span className="text-sm font-black text-stone-900 block">{propUnits.length} Registered</span>
                            <span className="text-[10px] text-stone-400 block">{propOccupiedUnits.length} Leased • {propUnits.length - propOccupiedUnits.length} Vacant</span>
                          </div>

                          <div className="px-4 py-2.5 bg-stone-50 rounded-2xl border border-stone-200/80 text-right">
                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Building Type</span>
                            <span className="text-sm font-black text-stone-800 block">{activeProp.property_type}</span>
                            <span className="text-[10px] text-stone-400 block">{activeProp.city}, {activeProp.province}</span>
                          </div>

                          <div className="px-4 py-2.5 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 text-right col-span-2 sm:col-span-1">
                            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Contracted Rent</span>
                            <DualCurrencyDisplay
                              amount={propOccupiedUnits.reduce((acc, u) => acc + (u.monthly_rent || 0), 0)}
                              nativeCurrency={nativeCurr}
                              primaryClassName="text-sm font-black text-emerald-800"
                              secondaryClassName="text-[10px] text-emerald-600/80 block"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Suite Explorer & Unit Filter Toolbar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                        <div>
                          <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Home className="w-3.5 h-3.5 text-stone-500" />
                            Individual Unit Explorer ({propUnits.length} Total Suites)
                          </h3>
                          <p className="text-[11px] text-stone-400">Select any suite tab below to inspect tenant lease, configurations, and contracted rent in {currentCurrency}</p>
                        </div>

                        <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl w-fit">
                          {(['All', 'Occupied', 'Vacant', 'Shortlet'] as const).map(type => (
                            <button
                              key={type}
                              onClick={() => setUnitFilterType(type)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                unitFilterType === type
                                  ? 'bg-stone-900 text-white shadow-2xs'
                                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Horizontal Unit Selector Pills / Tabs */}
                      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {filteredPropUnits.map(u => {
                          const isSelected = activeUnit?.id === u.id;
                          const isShortlet = u.rental_model === 'Shortlet / STR';
                          return (
                            <button
                              key={u.id}
                              onClick={() => setActiveUnitTabId(u.id)}
                              className={`px-4 py-2.5 rounded-2xl border text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
                                isSelected
                                  ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                                  : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                              }`}
                            >
                              <span>Unit {u.unit_number}</span>
                              <span className={`w-2 h-2 rounded-full ${u.status === 'Occupied' ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
                              {isShortlet && (
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${isSelected ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-800'}`}>
                                  STR
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Active Unit Drill-Down Card */}
                      {activeUnit && (
                        <div className="bg-stone-50/80 rounded-2xl border border-stone-200 p-5 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/60 pb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-stone-900 text-base">Unit {activeUnit.unit_number}</span>
                              <span className="text-xs text-stone-500">• {activeUnit.unit_type}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                activeUnit.status === 'Occupied' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {activeUnit.status}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                Commission: {activeUnit.management_fee_percentage ?? activeProp.landlord_contract?.management_fee_percentage ?? 10}%
                              </span>
                            </div>

                            <div className="text-xs font-bold text-stone-600">
                              {activeUnit.bedrooms} Bed • {activeUnit.bathrooms} Bath • {activeUnit.square_feet || 950} sqft
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-2">
                              {activeUnit.rental_model === 'Shortlet / STR' ? (
                                <>
                                  <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Active Guest & STR Booking</span>
                                  {(() => {
                                    const booking = (dbState.shortlet_bookings || []).find(b => b.unit_id === activeUnit.id && b.booking_status === 'Checked In');
                                    return booking ? (
                                      <div className="space-y-1 text-xs">
                                        <div className="flex items-center gap-2">
                                          <p className="font-extrabold text-stone-900">{booking.guest_name}</p>
                                          <span className="px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded font-bold text-[9px]">
                                            {booking.platform_source}
                                          </span>
                                        </div>
                                        <p className="text-stone-500 text-[11px]">{booking.guest_email}</p>
                                        <p className="text-stone-500 text-[11px]">{booking.guest_phone}</p>
                                        <div className="pt-2 border-t border-stone-100 text-[11px] text-stone-600">
                                          Current Stay: <strong className="text-stone-800">{booking.check_in}</strong> to <strong className="text-stone-800">{booking.check_out}</strong> ({booking.nights_count} Nights)
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="py-2 text-xs text-stone-400 italic">
                                        Available for guest check-in. Listed across Airbnb & Booking.com.
                                      </div>
                                    );
                                  })()}
                                </>
                              ) : (
                                <>
                                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Resident & Lease Agreement</span>
                                  {activeTenant ? (
                                    <div className="space-y-1 text-xs">
                                      <p className="font-extrabold text-stone-900">{activeTenant.first_name} {activeTenant.last_name}</p>
                                      <p className="text-stone-500 text-[11px]">{activeTenant.email}</p>
                                      <p className="text-stone-500 text-[11px]">{activeTenant.phone}</p>
                                      {activeLease && (
                                        <div className="pt-2 border-t border-stone-100 text-[11px] text-stone-600">
                                          Lease Period: <strong className="text-stone-800">{activeLease.start_date}</strong> to <strong className="text-stone-800">{activeLease.end_date}</strong>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="py-2 text-xs text-stone-400 italic">
                                      Unit is currently vacant. Active marketing in progress.
                                    </div>
                                  )}
                                </>
                              )}
                            </div>

                            <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-2">
                              {activeUnit.rental_model === 'Shortlet / STR' ? (
                                <>
                                  <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Nightly Rate & Projected STR Yield</span>
                                  <div className="space-y-1">
                                    <div className="flex items-baseline gap-1.5">
                                      <DualCurrencyDisplay
                                        amount={activeUnit.nightly_rate || 180000}
                                        nativeCurrency={nativeCurr}
                                        primaryClassName="text-xl font-black text-purple-900 font-mono"
                                        secondaryClassName="text-[10px] text-stone-400 block"
                                      />
                                      <span className="text-xs font-semibold text-stone-500">/ night</span>
                                    </div>
                                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                                      <span className="text-stone-400">Est. 70% Monthly Yield:</span>
                                      <span className="font-black text-emerald-800 font-mono">
                                        ~{formatAmountInTarget((activeUnit.nightly_rate || 180000) * 21, nativeCurr)}
                                      </span>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Contracted Monthly Rent</span>
                                  <div className="space-y-1">
                                    <DualCurrencyDisplay
                                      amount={activeUnit.monthly_rent || 0}
                                      nativeCurrency={nativeCurr}
                                      primaryClassName="text-lg font-black text-stone-900 font-mono block"
                                      secondaryClassName="text-[11px] text-stone-400 block pt-0.5"
                                    />
                                    <span className="text-[11px] text-stone-500 block">per calendar month</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })() : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {ownedProperties.map(prop => {
                    const pUnits = (dbState.units || []).filter(u => u.property_id === prop.id);
                    const pOccupied = pUnits.filter(u => u.status === 'Occupied');
                    const pExpenses = (dbState.expenses || []).filter(e => e.property_id === prop.id);
                    const pTotalSpent = pExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
                    const propGrossMonthly = pOccupied.reduce((acc, u) => acc + (u.monthly_rent || 0), 0);
                    const nativeCurr = getPropNativeCurrency(prop.id);

                    return (
                      <div
                        key={prop.id}
                        onClick={() => {
                          setActivePropertyViewId(prop.id);
                          setActiveUnitTabId(pUnits[0]?.id || null);
                        }}
                        className="group bg-white p-6 rounded-2xl border border-stone-200 hover:border-purple-500 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-4"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                              {prop.property_type || 'Residential Asset'}
                            </span>
                            <h3 className="text-base font-bold text-stone-900 group-hover:text-purple-600 transition-colors mt-1">{prop.name}</h3>
                            <p className="text-xs text-stone-500">{prop.address}, {prop.city}</p>
                          </div>
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            prop.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                          }`}>
                            {prop.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 p-3 bg-stone-50 rounded-xl text-center">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-stone-400 block">Suites</span>
                            <span className="font-bold text-sm text-stone-800">{pOccupied.length}/{pUnits.length} Leased</span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-stone-400 block">Monthly Rent</span>
                            <DualCurrencyDisplay
                              amount={propGrossMonthly}
                              nativeCurrency={nativeCurr}
                              primaryClassName="font-bold text-xs text-emerald-700 font-mono block"
                              secondaryClassName="text-[9px] text-stone-400 block"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-stone-400 block">Operating Costs</span>
                            <DualCurrencyDisplay
                              amount={pTotalSpent}
                              nativeCurrency={nativeCurr}
                              primaryClassName="font-bold text-xs text-rose-700 font-mono block"
                              secondaryClassName="text-[9px] text-stone-400 block"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs text-stone-600">
                          <div className="flex justify-between">
                            <span className="text-stone-400">Ownership Structure:</span>
                            <span className="font-semibold">{prop.ownership_type || 'Landlord Direct'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-stone-400">Management Contract:</span>
                            <span className="font-semibold">{prop.business_model || 'Direct Management'}</span>
                          </div>
                          <div className="flex justify-between items-center pt-1 border-t border-stone-100">
                            <span className="text-stone-400">Base Commission Fee: <strong className="text-purple-700">{prop.landlord_contract?.management_fee_percentage ?? landlord.management_fee_percentage ?? 10.0}%</strong></span>
                            <span className="text-purple-600 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                              Inspect Suites <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
