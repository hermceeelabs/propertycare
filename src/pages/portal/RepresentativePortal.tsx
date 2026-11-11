import React, { useState, useRef, useEffect } from 'react';
import { DatabaseState, supabase, store } from '../../services/supabase';
import {
  ShieldCheck, Wrench, FileText, CreditCard, Bell,
  Calendar, Search, Landmark, ChevronDown, Sparkles, AlertCircle, Eye,
  Mail, Building2, UserCheck, Lock, CheckCircle2, XCircle, ArrowUpRight,
  Printer, DollarSign, Clock, Layers, AlertTriangle, LogOut
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
  const { currentCurrency, setCurrency, currencyConfig, convertAmount, formatMoney } = useCurrency();
  const [currentTab, setCurrentTab] = useState<RepNavTab>(() => {
    const saved = localStorage.getItem('propertyflow_rep_tab') as RepNavTab;
    const validTabs: RepNavTab[] = ['mandate', 'statements', 'approvals', 'holdings'];
    return validTabs.includes(saved) ? saved : 'mandate';
  });

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
    authorized_representatives: []
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

  // Maintenance requests strictly under this portfolio
  const [maintenanceTickets, setMaintenanceTickets] = useState<MaintenanceRequest[]>(() => {
    return (dbState.maintenance_requests || []).filter(m => {
      if (m.property_id && ownedPropertyIds.includes(m.property_id)) return true;
      if (m.unit_id && ownedUnitIds.includes(m.unit_id)) return true;
      return false;
    });
  });

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
      title: 'Power of Attorney & Mandate',
      items: [
        { id: 'mandate' as RepNavTab, label: 'Executive Summary & Scope', icon: ShieldCheck },
        { id: 'holdings' as RepNavTab, label: 'Supervised Holdings', icon: Building2, badge: `${ownedProperties.length}` },
      ]
    },
    {
      title: 'Fiduciary Oversight',
      items: [
        {
          id: 'statements' as RepNavTab,
          label: 'Statements & Financials',
          icon: FileText,
          badge: representative.can_view_statements ? 'Authorized' : 'Restricted'
        },
        {
          id: 'approvals' as RepNavTab,
          label: 'Maintenance Approvals',
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
          <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Power of Attorney Active
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
                  Representative Executive Summary
                </h1>
                <span className="text-cream-400 font-light shrink-0">|</span>
                <p className="text-sm text-stone-600 truncate">
                  Fiduciary oversight, delegated authority scope & mandate execution for {landlord.company_name || `${landlord.first_name} ${landlord.last_name}`}
                </p>
              </div>

              {/* Personalized Welcome Banner */}
              <div className="flex items-center justify-between text-xs text-stone-600 bg-white px-4 py-2.5 rounded-xl border border-stone-200/80 shadow-2xs">
                <span>
                  Welcome, <strong className="text-stone-900">{representative.name}</strong> ({representative.relationship}) · Delegated Legal Authority Active
                </span>
                <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                  Mandate Ratified: {representative.created_at?.slice(0, 10) || '2024-01-15'}
                </span>
              </div>

              <hr className="border-t border-slate-800/80" />

              {/* High-Level Portfolio Metrics for Representative */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Supervised Portfolio</span>
                  <div className="text-2xl font-black text-stone-900">{ownedProperties.length} Properties</div>
                  <span className="text-[11px] text-stone-500">{ownedUnits.length} Total Units Across Assets</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Portfolio Occupancy</span>
                  <div className="text-2xl font-black text-emerald-600">
                    {ownedUnits.length > 0 ? Math.round((ownedUnits.filter(u => u.status === 'Occupied').length / ownedUnits.length) * 100) : 100}%
                  </div>
                  <span className="text-[11px] text-emerald-700 font-medium">
                    {ownedUnits.filter(u => u.status === 'Occupied').length} Occupied / {ownedUnits.filter(u => u.status === 'Vacant').length} Vacant
                  </span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Pending Approvals</span>
                  <div className="text-2xl font-black text-amber-600">{pendingApprovals.length} Work Orders</div>
                  <span className="text-[11px] text-stone-500">Require representative ratification</span>
                </div>

                <div className="bg-purple-50/60 border border-purple-200/80 p-5 rounded-2xl shadow-xs space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-900">Principal Client</span>
                  <div className="text-lg font-black text-purple-950 truncate">
                    {landlord.company_name || `${landlord.first_name} ${landlord.last_name}`}
                  </div>
                  <span className="text-[11px] text-purple-700 font-bold block truncate">
                    Contract Fee: {landlord.management_fee_percentage ?? 10}%
                  </span>
                </div>
              </div>

              {/* Power of Attorney Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                {/* 3. Banking Modification */}
                <div className={`p-5 rounded-2xl border shadow-xs space-y-2 ${
                  representative.can_modify_banking
                    ? 'bg-rose-50/50 border-rose-200'
                    : 'bg-amber-50/50 border-amber-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Settlement Accounts</span>
                    {representative.can_modify_banking ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600" /> Granted
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-600" /> Protected
                      </span>
                    )}
                  </div>
                  <div className="text-base font-bold text-stone-900">Bank Routing Credentials</div>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    {representative.can_modify_banking
                      ? 'Authorized to update remittance bank accounts and routing numbers.'
                      : 'Protected fiduciary protocol. Only the verified principal investor can alter settlement banking coordinates.'}
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
                  <div className="flex items-baseline gap-2 sm:gap-3 overflow-hidden mb-4">
                    <h1 className="text-2xl font-bold text-stone-900 tracking-tight whitespace-nowrap shrink-0">
                      Financial Statements & Yield Audit
                    </h1>
                    <span className="text-cream-400 font-light shrink-0">|</span>
                    <p className="text-sm text-stone-600 truncate">
                      Audited ledger, rent collections, management fees and operating deductions for {landlord.company_name || landlord.first_name}
                    </p>
                  </div>
                  <hr className="border-t border-slate-800/80 mb-6" />

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
                  Maintenance & Repair Approvals
                </h1>
                <span className="text-cream-400 font-light shrink-0">|</span>
                <p className="text-sm text-stone-600 truncate">
                  Review contractor estimates, authorize emergency dispatches, and track asset repairs
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

              {/* Tickets list */}
              <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50/50">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-purple-600" />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-stone-700">
                      Work Orders Across Supervised Portfolio ({maintenanceTickets.length})
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
                    {maintenanceTickets.map(req => {
                      const prop = (dbState.properties || []).find(p => p.id === req.property_id);
                      const unit = (dbState.units || []).find(u => u.id === req.unit_id);
                      const vendor = (dbState.vendors || []).find(v => v.id === req.vendor_id);
                      const isPending = req.status === 'Pending';

                      return (
                        <div key={req.id} className="p-5 hover:bg-stone-50/60 transition-colors space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
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
                              <h4 className="font-bold text-sm text-stone-900">{req.category}: {req.description}</h4>
                            </div>

                            {/* Estimate and actions */}
                            <div className="flex items-center gap-3 self-start sm:self-center">
                              {req.estimated_cost !== undefined && req.estimated_cost !== null && (
                                <div className="text-right">
                                  <span className="text-[10px] uppercase font-bold text-stone-400 block">Estimated Cost</span>
                                  <span className="font-bold text-sm text-stone-900">
                                    {currencyConfig?.symbol || '$'}{Number(req.estimated_cost || 0).toLocaleString()}
                                  </span>
                                </div>
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
              VIEW 4: SUPERVISED HOLDINGS & ASSETS
              ========================================================================= */}
          {currentTab === 'holdings' && (
            <div className="space-y-6">
              <div className="flex items-baseline gap-2 sm:gap-3 overflow-hidden">
                <h1 className="text-2xl font-bold text-stone-900 tracking-tight whitespace-nowrap shrink-0">
                  Supervised Real Estate Assets
                </h1>
                <span className="text-cream-400 font-light shrink-0">|</span>
                <p className="text-sm text-stone-600 truncate">
                  Complete asset directory of properties under legal representation for {landlord.company_name || landlord.first_name}
                </p>
              </div>

              <hr className="border-t border-slate-800/80" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {ownedProperties.map(prop => {
                  const pUnits = (dbState.units || []).filter(u => u.property_id === prop.id);
                  const pOccupied = pUnits.filter(u => u.status === 'Occupied');
                  const pExpenses = (dbState.expenses || []).filter(e => e.property_id === prop.id);
                  const pTotalSpent = pExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

                  return (
                    <div key={prop.id} className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                            {prop.property_type || 'Residential Asset'}
                          </span>
                          <h3 className="text-base font-bold text-stone-900 mt-1">{prop.name}</h3>
                          <p className="text-xs text-stone-500">{prop.address}, {prop.city}</p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          prop.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                        }`}>
                          {prop.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 p-3 bg-stone-50 rounded-xl text-center">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-stone-400 block">Total Units</span>
                          <span className="font-bold text-sm text-stone-800">{pUnits.length}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-stone-400 block">Occupancy</span>
                          <span className="font-bold text-sm text-emerald-700">
                            {pUnits.length > 0 ? Math.round((pOccupied.length / pUnits.length) * 100) : 100}%
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-stone-400 block">Operating Costs</span>
                          <span className="font-bold text-sm text-stone-800">
                            {currencyConfig?.symbol || '$'}{Number(pTotalSpent || 0).toLocaleString()}
                          </span>
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
                        <div className="flex justify-between">
                          <span className="text-stone-400">Effective Fee:</span>
                          <span className="font-semibold text-purple-700">
                            {prop.landlord_contract?.management_fee_percentage || landlord.management_fee_percentage || 10.0}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
