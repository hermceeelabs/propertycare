import React, { useState, useRef, useEffect } from 'react';
import { DatabaseState, supabase, store } from '../../services/supabase';
import {
  Building2, DollarSign, TrendingUp, Download, Printer, ShieldCheck, Wrench, CheckCircle2,
  UserPlus, Users, X, Lock, LogOut, LayoutDashboard, Home, FileText, CreditCard, Bell,
  ChevronRight, Calendar, ArrowUpRight, Search, Landmark, ChevronDown, Sparkles, AlertCircle, Eye, Tag
} from 'lucide-react';
import { useCurrency, CURRENCIES, CurrencyCode } from '../../context/CurrencyContext';
import { LandlordDelegate, Property, Unit, Lease, MaintenanceRequest, Expense } from '../../types/database';
import { DualCurrencyDisplay } from '../../components/DualCurrencyDisplay';
import { LandlordReportView } from '../../components/LandlordReportView';

export type LandlordNavTab = 'overview' | 'properties' | 'financials' | 'reports' | 'maintenance' | 'delegates';

interface LandlordPortalProps {
  dbState: DatabaseState;
  landlordId?: string;
  onClosePreview?: () => void;
}

export const LandlordPortal: React.FC<LandlordPortalProps> = ({
  dbState,
  landlordId = dbState.landlords?.[0]?.id || 'landlord-1',
  onClosePreview
}) => {
  const { formatMoney, currentCurrency, setCurrency, currencyConfig, convertAmount } = useCurrency();
  const [currentTab, setCurrentTab] = useState<LandlordNavTab>(() => {
    return (localStorage.getItem('propertyflow_landlord_tab') as LandlordNavTab) || 'overview';
  });
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedUnitDetail, setSelectedUnitDetail] = useState<Unit | null>(null);
  const [selectedPropertyDetail, setSelectedPropertyDetail] = useState<Property | null>(null);
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const mainScrollRef = useRef<HTMLElement>(null);

  // Auto-scroll to top when moving between pages/tabs
  const handleTabChange = (tab: LandlordNavTab) => {
    setCurrentTab(tab);
    setSelectedPropertyId(null);
    localStorage.setItem('propertyflow_landlord_tab', tab);
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentTab, selectedPropertyId]);

  // New Representative Form State
  const [repName, setRepName] = useState('');
  const [repEmail, setRepEmail] = useState('');
  const [repPhone, setRepPhone] = useState('');
  const [repRelationship, setRepRelationship] = useState<any>('Legal Counsel / Lawyer');
  const [canViewStatements, setCanViewStatements] = useState(true);
  const [canApproveMaintenance, setCanApproveMaintenance] = useState(true);
  const [canModifyBanking, setCanModifyBanking] = useState(false);

  // Find the exact landlord record
  const landlord = (dbState.landlords || []).find(l => l.id === landlordId) || dbState.landlords?.[0] || {
    id: 'landlord-1',
    first_name: 'David',
    last_name: 'Adeyemi',
    email: 'martecco@gmail.com',
    company_name: 'Adeyemi Asset Holdings Ltd',
    management_fee_percentage: 10.0,
    authorized_representatives: []
  };

  const representatives: LandlordDelegate[] = landlord.authorized_representatives || [];

  // =========================================================================
  // STRICT DATA ISOLATION: FILTER STRICTLY BY PROPERTIES OWNED BY THIS LANDLORD
  // =========================================================================
  const ownedProperties = (dbState.properties || []).filter(p => p.landlord_id === landlord.id);
  const ownedPropertyIds = ownedProperties.map(p => p.id);

  const ownedUnits = (dbState.units || []).filter(u => ownedPropertyIds.includes(u.property_id));
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

  const mgmtFeePercent = landlord.management_fee_percentage ?? 10.0;
  const managementFeeInActiveCurr = Math.round((grossMonthlyRentInActiveCurr * mgmtFeePercent) / 100);

  // Operating costs strictly for owned properties converted dynamically
  const propertyExpenses = (dbState.expenses || []).filter(e => ownedPropertyIds.includes(e.property_id));
  const totalRepairsInActiveCurr = propertyExpenses.reduce((acc, e) => {
    const nativeCurr = getPropNativeCurrency(e.property_id);
    return acc + convertAmount(e.amount || 0, nativeCurr, currentCurrency);
  }, 0);

  const netRemittanceInActiveCurr = grossMonthlyRentInActiveCurr - managementFeeInActiveCurr - totalRepairsInActiveCurr;

  // Maintenance requests strictly for owned properties
  const ownedMaintenance = (dbState.maintenance_requests || []).filter(m => ownedPropertyIds.includes(m.property_id));
  const openMaintenance = ownedMaintenance.filter(m => m.status !== 'Completed');

  const handleAddRepresentative = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repName.trim() || !repEmail.trim()) return;

    const newRep: LandlordDelegate = {
      id: 'rep-' + Date.now(),
      name: repName.trim(),
      email: repEmail.trim().toLowerCase(),
      phone: repPhone.trim(),
      relationship: repRelationship,
      can_view_statements: canViewStatements,
      can_approve_maintenance: canApproveMaintenance,
      can_modify_banking: canModifyBanking,
      status: 'Active',
      created_at: new Date().toISOString()
    };

    const updatedReps = [...representatives, newRep];
    landlord.authorized_representatives = updatedReps;
    store.saveState();

    try {
      await supabase
        .from('landlords')
        .update({ authorized_representatives: updatedReps })
        .eq('id', landlord.id);
    } catch (err) {
      console.warn('Could not sync delegate to Supabase:', err);
    }

    setShowDelegateModal(false);
    setRepName('');
    setRepEmail('');
    setRepPhone('');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const navSections = [
    {
      title: 'Investor Portfolio',
      items: [
        { id: 'overview' as LandlordNavTab, label: 'Portfolio Overview', icon: LayoutDashboard },
        { id: 'properties' as LandlordNavTab, label: 'Owned Assets & Units', icon: Building2, badge: `${ownedProperties.length}` },
        { id: 'financials' as LandlordNavTab, label: 'Yield & Remittances', icon: CreditCard },
        { id: 'reports' as LandlordNavTab, label: 'Reports & Audits', icon: FileText },
      ]
    },
    {
      title: 'Operations & Oversight',
      items: [
        { id: 'maintenance' as LandlordNavTab, label: 'Repairs & Requests', icon: Wrench, badge: openMaintenance.length > 0 ? `${openMaintenance.length}` : undefined },
        { id: 'delegates' as LandlordNavTab, label: 'Legal & Delegates', icon: Users, badge: `${representatives.length}` },
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-cream-100 text-stone-900 font-sans antialiased overflow-hidden">
      {/* =========================================================================
          PERSISTENT SLATE SIDEBAR (Identical admin dashboard theme)
          ========================================================================= */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 select-none hidden md:flex">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white font-black shadow-md shadow-brand-900/50">
              PF
            </div>
            <div>
              <h1 className="font-bold text-white tracking-wide text-sm leading-tight">PropertyFlow</h1>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">Investor Portal</span>
            </div>
          </div>
        </div>

        {/* Landlord Identity Pill */}
        <div className="px-4 py-3 bg-slate-950/40 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
              <Landmark className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-xs font-bold text-white truncate">
                {landlord.company_name || `${landlord.first_name} ${landlord.last_name}`}
              </span>
              <span className="text-[10px] text-stone-400 truncate block">
                {ownedProperties.length} Exclusive Asset{ownedProperties.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Grouped Classified Navigation */}
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
                        ? 'bg-brand-600 text-white shadow-xs font-bold'
                        : 'hover:bg-slate-800/70 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
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

        {/* Landlord Sign Out / Account Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-slate-850/80 border border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-slate-950 text-xs font-black flex items-center justify-center shrink-0">
                {(landlord.first_name?.[0] || landlord.email?.[0] || 'L').toUpperCase()}
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-bold text-white truncate">
                  {landlord.first_name} {landlord.last_name}
                </span>
                <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Verified Landlord
                </span>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors shrink-0 cursor-pointer"
              title="Sign Out of Landlord Portal"
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
        {/* Preview Banner (if opened from Admin Portal Preview) */}
        {onClosePreview && (
          <div className="bg-stone-900 text-white px-4 py-2 flex items-center justify-between text-xs shrink-0 z-50">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <strong>Manager Portal Preview:</strong> Viewing active investor portal as <em>{landlord.company_name || `${landlord.first_name} ${landlord.last_name}`}</em>
            </span>
            <button
              onClick={onClosePreview}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg font-bold text-[11px] transition-all cursor-pointer"
            >
              Exit Preview ✕
            </button>
          </div>
        )}

        {/* Global Header */}
        <header className="bg-cream-50/90 border-b border-cream-200 h-16 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs backdrop-blur-xs">
          <div className="flex items-center gap-4">
            <div className="md:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold text-xs">PF</div>
              <span className="font-bold text-xs text-stone-900">Landlord Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Multi-Currency Dropdown */}
            <div className="flex items-center gap-1.5 bg-cream-100 hover:bg-cream-200/90 px-3 py-1.5 rounded-xl border border-cream-300 transition-colors shadow-xs">
              <span className="text-xs font-bold text-stone-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {currencyConfig.code}
              </span>
              <select
                value={currentCurrency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="bg-transparent text-xs font-bold text-stone-800 cursor-pointer focus:outline-hidden"
                title="Switch Operational Currency"
              >
                {Object.values(CURRENCIES).map(c => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol.trim()})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {/* Decorative Dark Demarcation Line */}
        <hr className="border-t border-slate-800/80" />

        {/* Scrollable Portal Content Body */}
        <main ref={mainScrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* =========================================================================
              VIEW 1: PORTFOLIO OVERVIEW
              ========================================================================= */}
          {currentTab === 'overview' && (
            <div className="space-y-6">
              {/* Adopted Title and Subtitle Section Design with visual divider */}
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-3">
                <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
                  {landlord.company_name || `${landlord.first_name} ${landlord.last_name}`}
                </h1>
                <span className="hidden sm:inline text-cream-400 font-light">|</span>
                <p className="text-sm text-stone-600">
                  Investor portfolio overview, real-time live yield remittances & contracted fee oversight
                </p>
              </div>

              {/* Visual Horizontal Separator */}
              <hr className="border-t border-slate-800/80" />

              {/* High-Level Metric Tiles with Live FX Conversion */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Total Owned Assets</span>
                  <div className="text-2xl font-black text-stone-900">{ownedProperties.length} Properties</div>
                  <span className="text-[11px] text-stone-500">{ownedUnits.length} Total Units Across Portfolio</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Portfolio Occupancy</span>
                  <div className="text-2xl font-black text-emerald-600">{occupancyRate}%</div>
                  <span className="text-[11px] text-emerald-700 font-medium">
                    {occupiedUnits.length} Occupied / {vacantUnits.length} Vacant
                  </span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Gross Monthly Yield</span>
                  <div className="text-2xl font-black text-stone-900">
                    {currencyConfig.symbol}{grossMonthlyRentInActiveCurr.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <span className="text-[11px] text-stone-400">Calculated via live exchange rate feed</span>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-2xl shadow-xs space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">Net Remittance Due</span>
                  <div className="text-2xl font-black text-emerald-800">
                    {currencyConfig.symbol}{netRemittanceInActiveCurr.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <span className="text-[11px] text-emerald-700 font-bold">Scheduled for direct bank transfer</span>
                </div>
              </div>

              {/* Owned Properties Grid (Strict Landlord Scope) */}
              <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-stone-900">Your Real Estate Holdings ({ownedProperties.length})</h2>
                    <p className="text-xs text-stone-500">Only properties registered under your ownership entity are visible here</p>
                  </div>
                  <button
                    onClick={() => handleTabChange('properties')}
                    className="text-xs text-brand-600 hover:text-brand-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    View All Units <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ownedProperties.map(p => {
                    const pUnits = ownedUnits.filter(u => u.property_id === p.id);
                    const pOccupied = pUnits.filter(u => u.status === 'Occupied').length;
                    const nativeCurr = getPropNativeCurrency(p.id);
                    const pNativeRent = pUnits.filter(u => u.status === 'Occupied').reduce((acc, u) => acc + (u.monthly_rent || 0), 0);
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedPropertyId(p.id);
                          handleTabChange('properties');
                        }}
                        className="p-5 bg-stone-50 hover:bg-stone-100/80 rounded-xl border border-stone-200 transition-all cursor-pointer space-y-3 group"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-stone-900 text-sm group-hover:text-brand-600 transition-colors">
                              {p.name}
                            </h3>
                            <p className="text-xs text-stone-500 mt-0.5">{p.address}, {p.city}</p>
                          </div>
                          <span className="px-2.5 py-1 bg-brand-100 text-brand-800 rounded-lg font-bold text-[10px]">
                            {p.property_type}
                          </span>
                        </div>

                        <div className="pt-3 border-t border-stone-200 flex justify-between items-center text-xs">
                          <div>
                            <span className="text-[10px] text-stone-400 block uppercase font-bold">Occupancy</span>
                            <span className="font-bold text-stone-800">{pOccupied} / {pUnits.length} Units</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-stone-400 block uppercase font-bold">Monthly Yield</span>
                            <DualCurrencyDisplay
                              amount={pNativeRent}
                              nativeCurrency={nativeCurr}
                              primaryClassName="font-black text-emerald-700"
                              secondaryClassName="text-[10px] text-stone-400 block"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Split Row: Payout & Bank Details vs Authorized Delegates */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Banking & Remittance Settlement */}
                <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-brand-600" />
                    <h2 className="text-base font-bold text-stone-900">Banking & Settlement Profile</h2>
                  </div>

                  <div className="bg-stone-50 rounded-xl p-4 border border-stone-200/80 space-y-3 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-stone-500">Beneficiary Bank:</span>
                      <strong className="text-stone-900">{landlord.bank_name || 'First Bank Nigeria'}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-stone-500">Account Number:</span>
                      <strong className="text-stone-900 font-mono tracking-wider">{landlord.bank_account_number || '3029182390'}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-stone-500">Remittance Cycle:</span>
                      <strong className="text-stone-900">{landlord.remittance_frequency || 'Monthly'}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-stone-500">Contract Agreement Type:</span>
                      <strong className="text-stone-900">{landlord.lease_agreement_type || 'Direct Management'}</strong>
                    </div>
                  </div>
                  <p className="text-[11px] text-stone-400">
                    To update settlement bank credentials, please contact the property management office or authorize your legal representative.
                  </p>
                </div>

                {/* Legal Delegates Quick Widget */}
                <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-brand-600" />
                      <h2 className="text-base font-bold text-stone-900">Legal Representatives ({representatives.length})</h2>
                    </div>
                    <button
                      onClick={() => setShowDelegateModal(true)}
                      className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Add Delegate
                    </button>
                  </div>

                  {representatives.length === 0 ? (
                    <div className="p-6 text-center text-xs text-stone-400 bg-stone-50 rounded-xl border border-stone-200/80">
                      No legal representatives registered. You can grant access to your attorney or accountant.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {representatives.map(rep => (
                        <div key={rep.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between text-xs">
                          <div>
                            <strong className="text-stone-900 block">{rep.name}</strong>
                            <span className="text-stone-500 text-[11px]">{rep.relationship} • {rep.email}</span>
                          </div>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                            {rep.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              VIEW 2: OWNED ASSETS & UNITS (STRUCTURED HORIZONTAL PROPERTY CARDS & UNITS)
              ========================================================================= */}
          {currentTab === 'properties' && (
            <div className="space-y-6">
              {/* Adopted Title and Subtitle Section Design with visual divider */}
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-3">
                <h1 className="text-2xl font-bold text-stone-900 tracking-tight whitespace-nowrap">Owned Assets & Unit Registry</h1>
                <span className="hidden sm:inline text-cream-400 font-light">|</span>
                <p className="text-sm text-stone-600">
                  Interactive real estate holdings with embedded unit layouts, live occupancy & property expense breakdown
                </p>
              </div>

              {/* Visual Horizontal Separator */}
              <hr className="border-t border-slate-800/80" />

              {/* Property Filter and Search Bar */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">Filter Property:</span>
                  <select
                    value={selectedPropertyId || 'All'}
                    onChange={(e) => setSelectedPropertyId(e.target.value === 'All' ? null : e.target.value)}
                    className="px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-800 cursor-pointer shadow-2xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                  >
                    <option value="All">All Holdings ({ownedProperties.length} Properties)</option>
                    {ownedProperties.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="text-xs text-stone-500 font-medium">
                  Showing <span className="font-bold text-stone-900">{selectedPropertyId ? 1 : ownedProperties.length}</span> properties • <span className="font-bold text-stone-900">{selectedPropertyId ? ownedUnits.filter(u => u.property_id === selectedPropertyId).length : ownedUnits.length}</span> total suites
                </div>
              </div>

              {/* Properties List with Horizontal Grouped Cards */}
              <div className="space-y-6">
                {(selectedPropertyId ? ownedProperties.filter(p => p.id === selectedPropertyId) : ownedProperties).map(prop => {
                  const propUnits = ownedUnits.filter(u => u.property_id === prop.id);
                  const propOccupiedUnits = propUnits.filter(u => u.status === 'Occupied');
                  const propOccupancyRate = propUnits.length > 0 ? Math.round((propOccupiedUnits.length / propUnits.length) * 100) : 0;
                  const nativeCurr = getPropNativeCurrency(prop.id);

                  // Calculate gross monthly revenue for this property
                  const propGrossMonthly = propOccupiedUnits.reduce((acc, u) => {
                    return acc + (u.monthly_rent || 0);
                  }, 0);

                  // Property-specific expenses (both property scope & unit expenses)
                  const propExpenses = (dbState.expenses || []).filter(e => e.property_id === prop.id);
                  const propTotalExpenses = propExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

                  // Inspections for this property
                  const propInspections = (dbState.inspections || []).filter(i => i.property_id === prop.id);

                  return (
                    <div
                      key={prop.id}
                      className="bg-white rounded-3xl border border-stone-200/90 shadow-sm hover:shadow-md transition-all overflow-hidden"
                    >
                      {/* Property Header Bar (Horizontal Card Header) */}
                      <div className="p-6 bg-gradient-to-r from-stone-50 via-white to-stone-50/40 border-b border-stone-100 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h2 className="text-lg font-black text-stone-900 tracking-tight">{prop.name}</h2>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-stone-100 text-stone-700 border border-stone-200">
                              {prop.property_type}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                              {prop.city}, {prop.province}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              propOccupancyRate >= 75
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {propOccupancyRate}% Occupied ({propOccupiedUnits.length}/{propUnits.length} Units)
                            </span>
                          </div>
                          <p className="text-xs text-stone-500 flex items-center gap-1.5">
                            <span>{prop.address}, {prop.postal_code}</span>
                            <span>•</span>
                            <span className="font-semibold text-stone-700">Acquisition: {prop.acquisition?.acquisition_type || 'Outright Purchase'}</span>
                          </p>
                        </div>

                        {/* Property Financial Summary Pill */}
                        <div className="flex items-center gap-4 shrink-0 flex-wrap sm:flex-nowrap">
                          <div className="px-4 py-2.5 bg-stone-50 rounded-2xl border border-stone-200 text-right">
                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Gross Yield</span>
                            <DualCurrencyDisplay
                              amount={propGrossMonthly}
                              nativeCurrency={nativeCurr}
                              primaryClassName="text-sm font-black text-stone-900"
                              secondaryClassName="text-[10px] text-stone-500 font-medium block"
                            />
                          </div>

                          <div className="px-4 py-2.5 bg-rose-50/50 rounded-2xl border border-rose-100 text-right">
                            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">Recorded Expenses</span>
                            <DualCurrencyDisplay
                              amount={propTotalExpenses}
                              nativeCurrency={nativeCurr}
                              primaryClassName="text-sm font-black text-rose-800"
                              secondaryClassName="text-[10px] text-rose-600 font-medium block"
                            />
                          </div>

                          <button
                            onClick={() => setSelectedPropertyDetail(prop)}
                            className="px-3.5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                          >
                            <Building2 className="w-3.5 h-3.5" /> View Property Card & Costs
                          </button>
                        </div>
                      </div>

                      {/* Units Section Inside the Property Card */}
                      <div className="p-6 bg-white space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-2">
                            <Home className="w-3.5 h-3.5 text-stone-500" />
                            Grouped Suites & Units ({propUnits.length})
                          </h3>
                          <span className="text-[11px] text-stone-400">Click any suite for complete lease, tenant, and cost details</span>
                        </div>

                        {propUnits.length === 0 ? (
                          <div className="p-6 text-center text-xs text-stone-400 italic bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                            No individual units registered under this property.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                            {propUnits.map(unit => {
                              const activeLease = (dbState.leases || []).find(l => l.unit_id === unit.id && l.status === 'Active');
                              const tenant = activeLease ? (dbState.tenants || []).find(t => t.id === activeLease.tenant_id) : null;
                              const isShortlet = unit.rental_model === 'Shortlet / STR';
                              const unitExpenses = (dbState.expenses || []).filter(e => e.unit_id === unit.id);
                              const unitExpenseTotal = unitExpenses.reduce((sum, e) => sum + e.amount, 0);

                              return (
                                <div
                                  key={unit.id}
                                  onClick={() => setSelectedUnitDetail(unit)}
                                  className="group p-4 bg-stone-50/70 hover:bg-white border border-stone-200/80 hover:border-brand-500 rounded-2xl transition-all shadow-2xs hover:shadow-md cursor-pointer flex flex-col justify-between space-y-3"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-extrabold text-sm text-stone-900 group-hover:text-brand-600 transition-colors">
                                          Unit {unit.unit_number}
                                        </span>
                                        {isShortlet ? (
                                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                                            <Sparkles className="w-2.5 h-2.5" /> Shortlet
                                          </span>
                                        ) : (
                                          <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-stone-200 text-stone-700">
                                            {unit.unit_type || 'Apartment'}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[11px] text-stone-500 block mt-0.5">
                                        {unit.bedrooms} Bed • {unit.bathrooms} Bath • {unit.square_feet || 950} sq ft
                                      </span>
                                    </div>

                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      unit.status === 'Occupied'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {unit.status}
                                    </span>
                                  </div>

                                  <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-xs">
                                    <div>
                                      <span className="text-[10px] text-stone-400 block font-medium">Tenant / Resident</span>
                                      <span className="font-bold text-stone-800 text-[11px] truncate max-w-[130px] block">
                                        {tenant ? `${tenant.first_name} ${tenant.last_name}` : <span className="text-stone-400 font-normal italic">Vacant</span>}
                                      </span>
                                    </div>

                                    <div className="text-right">
                                      <span className="text-[10px] text-stone-400 block font-medium">Monthly Rent</span>
                                      <span className="font-black text-stone-900 text-xs block">
                                        {formatMoney(convertAmount(unit.monthly_rent || 0, nativeCurr, currentCurrency))}
                                      </span>
                                    </div>
                                  </div>

                                  {unitExpenseTotal > 0 && (
                                    <div className="pt-2 border-t border-stone-200/40 flex items-center justify-between text-[11px] text-stone-500">
                                      <span>Direct Costs:</span>
                                      <span className="font-bold text-rose-700">
                                        {formatMoney(convertAmount(unitExpenseTotal, nativeCurr, currentCurrency))}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =========================================================================
              VIEW 3: FINANCIALS & SETTLEMENT STATEMENTS (WITH SIDE-BY-SIDE DUAL CURRENCY)
              ========================================================================= */}
          {currentTab === 'financials' && (
            <div className="space-y-6">
              {/* Adopted Title and Subtitle Section Design with visual divider */}
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-3">
                <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Yield & Remittance Statements</h1>
                <span className="hidden sm:inline text-cream-400 font-light">|</span>
                <p className="text-sm text-stone-600">Monthly settlement ledgers, live currency exchange calculations & repair receipts</p>
              </div>

              {/* Visual Horizontal Separator */}
              <hr className="border-t border-slate-800/80" />

              {/* Financial Summary Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Total Contracted Rent</span>
                  <div className="text-2xl font-black text-stone-900">
                    {currencyConfig.symbol}{grossMonthlyRentInActiveCurr.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <span className="text-[11px] text-emerald-600 font-bold">100% Contracted Yield</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Management Fee ({mgmtFeePercent}%)</span>
                  <div className="text-2xl font-black text-stone-600">
                    -{currencyConfig.symbol}{managementFeeInActiveCurr.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <span className="text-[11px] text-stone-400">Retained for property operations</span>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-2xl shadow-xs space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">Net Transfer Amount</span>
                  <div className="text-2xl font-black text-emerald-800">
                    {currencyConfig.symbol}{netRemittanceInActiveCurr.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <span className="text-[11px] text-emerald-700 font-bold">Transferred to {landlord.bank_name || 'Bank'}</span>
                </div>
              </div>

              {/* Deductions & Maintenance Invoices with Side-by-Side Dual Currency */}
              <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4">
                <h2 className="text-base font-bold text-stone-900">Operating Expenses & Maintenance Deductions</h2>
                {propertyExpenses.length === 0 ? (
                  <p className="text-xs text-stone-400 py-6 text-center">No repair deductions recorded for your properties.</p>
                ) : (
                  <div className="divide-y divide-stone-100">
                    {propertyExpenses.map(e => {
                      const prop = ownedProperties.find(p => p.id === e.property_id);
                      const nativeCurr = getPropNativeCurrency(e.property_id);
                      return (
                        <div key={e.id} className="py-3 flex items-center justify-between text-xs">
                          <div>
                            <strong className="text-stone-900 block">{e.description}</strong>
                            <span className="text-stone-500 text-[11px]">{prop?.name} • Category: {e.category}</span>
                          </div>
                          <div className="text-right">
                            <DualCurrencyDisplay
                              amount={e.amount}
                              nativeCurrency={nativeCurr}
                              prefix="-"
                              primaryClassName="font-black text-rose-600 block"
                              secondaryClassName="text-[10px] text-stone-400 block"
                            />
                            <span className="text-[10px] text-stone-400">{e.date}</span>
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
              VIEW 4: MAINTENANCE & REPAIR OVERSIGHT
              ========================================================================= */}
          {currentTab === 'maintenance' && (
            <div className="space-y-6">
              {/* Adopted Title and Subtitle Section Design with visual divider */}
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-3">
                <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Maintenance & Work Orders</h1>
                <span className="hidden sm:inline text-cream-400 font-light">|</span>
                <p className="text-sm text-stone-600">Live repair tracking across your properties with trade contractor dispatches</p>
              </div>

              {/* Visual Horizontal Separator */}
              <hr className="border-t border-slate-800/80" />

              <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
                {ownedMaintenance.length === 0 ? (
                  <div className="p-12 text-center text-xs text-stone-400">
                    No active maintenance tickets recorded for your properties.
                  </div>
                ) : (
                  <div className="divide-y divide-stone-100">
                    {ownedMaintenance.map(m => {
                      const prop = ownedProperties.find(p => p.id === m.property_id);
                      const nativeCurr = getPropNativeCurrency(m.property_id);
                      return (
                        <div key={m.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50/60 transition-colors">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <strong className="text-stone-900 text-sm font-bold">{m.category}</strong>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                m.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {m.status}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                m.priority === 'Urgent' ? 'bg-rose-100 text-rose-800' : 'bg-stone-100 text-stone-600'
                              }`}>
                                {m.priority}
                              </span>
                            </div>
                            <p className="text-xs text-stone-600">{m.description}</p>
                            <span className="text-[11px] text-stone-400 block">{prop?.name} • Reported on {m.created_at}</span>
                          </div>
                          <div className="text-right">
                            {m.estimated_cost && (
                              <div className="text-xs">
                                <span className="text-[10px] text-stone-400 block uppercase font-bold">Estimated Cost</span>
                                <DualCurrencyDisplay
                                  amount={m.estimated_cost}
                                  nativeCurrency={nativeCurr}
                                  primaryClassName="font-black text-stone-900"
                                  secondaryClassName="text-[10px] text-stone-400 block"
                                />
                              </div>
                            )}
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
              VIEW 5: AUTHORIZED DELEGATES & LEGAL COUNSEL
              ========================================================================= */}
          {currentTab === 'delegates' && (
            <div className="space-y-6">
              {/* Adopted Title and Subtitle Section Design with visual divider */}
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-3">
                <h1 className="text-2xl font-bold text-stone-900 tracking-tight whitespace-nowrap">Legal Delegates & Representative Access</h1>
                <span className="hidden sm:inline text-cream-400 font-light">|</span>
                <p className="text-sm text-stone-600">
                  Manage attorney, accountant, and family representative sub-permissions for your portfolio
                </p>
              </div>

              {/* Visual Horizontal Separator */}
              <hr className="border-t border-slate-800/80" />

              {/* Action Button Row */}
              <div className="flex justify-end">
                <button
                  onClick={() => setShowDelegateModal(true)}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <UserPlus className="w-4 h-4 text-emerald-400" /> Add Authorized Delegate
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {representatives.map(rep => (
                  <div key={rep.id} className="p-5 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-stone-900 text-sm">{rep.name}</h3>
                        <span className="text-xs text-stone-500 block">{rep.relationship}</span>
                        <span className="text-xs text-stone-400 font-mono block mt-0.5">{rep.email}</span>
                      </div>
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                        {rep.status}
                      </span>
                    </div>

                    <div className="pt-3 border-t border-stone-100 text-xs space-y-1.5 text-stone-600">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${rep.can_view_statements ? 'bg-emerald-500' : 'bg-stone-300'}`}></span>
                        <span>View financial statements & tax reports: <strong>{rep.can_view_statements ? 'Yes' : 'No'}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${rep.can_approve_maintenance ? 'bg-emerald-500' : 'bg-stone-300'}`}></span>
                        <span>Approve contractor repair quotes: <strong>{rep.can_approve_maintenance ? 'Yes' : 'No'}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${rep.can_modify_banking ? 'bg-emerald-500' : 'bg-rose-400'}`}></span>
                        <span>Modify settlement bank details: <strong className={rep.can_modify_banking ? 'text-emerald-700' : 'text-rose-600'}>{rep.can_modify_banking ? 'Authorized' : 'Restricted (Protected)'}</strong></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =========================================================================
              VIEW 6: REPORTS & FIELD AUDITS
              ========================================================================= */}
          {currentTab === 'reports' && (
            <LandlordReportView
              dbState={dbState}
              landlord={landlord}
              ownedPropertyIds={ownedPropertyIds}
            />
          )}
        </main>
      </div>

      {/* Property Details & Costs Modal */}
      {selectedPropertyDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-stone-200 shadow-2xl p-6 sm:p-7 space-y-6 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-4 border-b border-stone-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-stone-900 text-lg">{selectedPropertyDetail.name}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700">
                    {selectedPropertyDetail.property_type}
                  </span>
                </div>
                <p className="text-xs text-stone-500">{selectedPropertyDetail.address}, {selectedPropertyDetail.city}, {selectedPropertyDetail.province}</p>
              </div>
              <button
                onClick={() => setSelectedPropertyDetail(null)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics */}
            {(() => {
              const propUnits = ownedUnits.filter(u => u.property_id === selectedPropertyDetail.id);
              const propOccupied = propUnits.filter(u => u.status === 'Occupied');
              const nativeCurr = getPropNativeCurrency(selectedPropertyDetail.id);
              const propExpenses = (dbState.expenses || []).filter(e => e.property_id === selectedPropertyDetail.id);
              const propTotalExpenses = propExpenses.reduce((sum, e) => sum + e.amount, 0);
              const propInspections = (dbState.inspections || []).filter(i => i.property_id === selectedPropertyDetail.id);
              const propMaintenance = (dbState.maintenance_requests || []).filter(m => m.property_id === selectedPropertyDetail.id);

              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Total Suites</span>
                      <span className="text-base font-extrabold text-stone-900">{propUnits.length} Units</span>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Occupancy</span>
                      <span className="text-base font-extrabold text-emerald-800">
                        {propUnits.length > 0 ? Math.round((propOccupied.length / propUnits.length) * 100) : 0}%
                      </span>
                    </div>
                    <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Native Currency</span>
                      <span className="text-base font-extrabold text-stone-900">{nativeCurr}</span>
                    </div>
                    <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200">
                      <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Total Expenses</span>
                      <span className="text-base font-extrabold text-rose-800">
                        {formatMoney(convertAmount(propTotalExpenses, nativeCurr, currentCurrency))}
                      </span>
                    </div>
                  </div>

                  {/* Acquisition Details */}
                  {selectedPropertyDetail.acquisition && (
                    <div className="p-4 bg-stone-50/80 rounded-2xl border border-stone-200 space-y-2">
                      <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">Asset Acquisition & Ownership Structure</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1">
                        <div>
                          <span className="text-stone-400 block text-[10px]">Structure</span>
                          <span className="font-semibold text-stone-800">{selectedPropertyDetail.acquisition.acquisition_type}</span>
                        </div>
                        <div>
                          <span className="text-stone-400 block text-[10px]">Acquisition Date</span>
                          <span className="font-semibold text-stone-800">{selectedPropertyDetail.acquisition.acquisition_date}</span>
                        </div>
                        <div>
                          <span className="text-stone-400 block text-[10px]">Historical Cost</span>
                          <span className="font-semibold text-stone-800">
                            {formatMoney(convertAmount(selectedPropertyDetail.acquisition.total_acquisition_cost || 0, selectedPropertyDetail.acquisition.acquisition_currency || 'CAD', currentCurrency))}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Property Expenses & Invoices */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-stone-500" />
                        Itemized Operating & Maintenance Expenses ({propExpenses.length})
                      </h4>
                      <span className="text-[11px] text-stone-500 font-semibold">
                        Total: {formatMoney(convertAmount(propTotalExpenses, nativeCurr, currentCurrency))}
                      </span>
                    </div>

                    {propExpenses.length === 0 ? (
                      <p className="p-4 text-center text-xs text-stone-400 italic bg-stone-50 rounded-xl">No expenses recorded for this property.</p>
                    ) : (
                      <div className="border border-stone-200 rounded-2xl overflow-hidden divide-y divide-stone-100 max-h-56 overflow-y-auto">
                        {propExpenses.map(exp => (
                          <div key={exp.id} className="p-3 hover:bg-stone-50 flex items-center justify-between gap-3 text-xs">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-stone-800">{exp.description}</span>
                                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-stone-100 text-stone-600 rounded">
                                  {exp.category}
                                </span>
                                {exp.scope === 'Unit' && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-50 text-blue-700 rounded">
                                    Unit Specific
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-stone-400 block">
                                {exp.date} • {exp.invoice_number ? `Invoice #${exp.invoice_number}` : 'Receipt Logged'}
                              </span>
                            </div>
                            <span className="font-black text-rose-700 shrink-0">
                              {formatMoney(convertAmount(exp.amount, nativeCurr, currentCurrency))}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Field Audits & Inspections */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Field Audits & Inspections ({propInspections.length})
                    </h4>
                    {propInspections.length === 0 ? (
                      <p className="p-3 text-center text-xs text-stone-400 italic bg-stone-50 rounded-xl">No inspections logged yet.</p>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {propInspections.slice(0, 4).map(insp => (
                          <div key={insp.id} className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-stone-800 block">{insp.title}</span>
                              <span className="text-[10px] text-stone-400">{insp.scheduled_date} • Rating: {insp.overall_condition || 'Good'}</span>
                            </div>
                            <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
                              {insp.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="flex justify-end pt-4 border-t border-stone-100">
              <button
                onClick={() => setSelectedPropertyDetail(null)}
                className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Close Property Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Specific Unit Detail Modal */}
      {selectedUnitDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-stone-200 shadow-2xl p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-4 border-b border-stone-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-stone-900 text-lg">Unit {selectedUnitDetail.unit_number}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedUnitDetail.status === 'Occupied'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedUnitDetail.status}
                  </span>
                  {selectedUnitDetail.rental_model === 'Shortlet / STR' && (
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                      Shortlet / STR
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  {ownedProperties.find(p => p.id === selectedUnitDetail.property_id)?.name} • {selectedUnitDetail.unit_type}
                </p>
              </div>
              <button
                onClick={() => setSelectedUnitDetail(null)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Unit Specs & Lease Info */}
            {(() => {
              const activeLease = (dbState.leases || []).find(l => l.unit_id === selectedUnitDetail.id && l.status === 'Active');
              const tenant = activeLease ? (dbState.tenants || []).find(t => t.id === activeLease.tenant_id) : null;
              const unitExpenses = (dbState.expenses || []).filter(e => e.unit_id === selectedUnitDetail.id);
              const unitExpenseTotal = unitExpenses.reduce((sum, e) => sum + e.amount, 0);
              const nativeCurr = getPropNativeCurrency(selectedUnitDetail.property_id);

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2.5 p-3.5 bg-stone-50 rounded-2xl border border-stone-200 text-center">
                    <div>
                      <span className="text-[10px] text-stone-400 block font-bold uppercase">Bedrooms</span>
                      <span className="font-extrabold text-stone-900 text-sm">{selectedUnitDetail.bedrooms} Bed</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block font-bold uppercase">Bathrooms</span>
                      <span className="font-extrabold text-stone-900 text-sm">{selectedUnitDetail.bathrooms} Bath</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400 block font-bold uppercase">Floor Space</span>
                      <span className="font-extrabold text-stone-900 text-sm">{selectedUnitDetail.square_feet || 950} sq ft</span>
                    </div>
                  </div>

                  {/* Financial & Contracted Rent */}
                  <div className="p-4 bg-gradient-to-r from-stone-50 to-cream-50/50 rounded-2xl border border-stone-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Contracted Rent</span>
                      <span className="text-lg font-black text-stone-900">
                        {formatMoney(convertAmount(selectedUnitDetail.monthly_rent || 0, nativeCurr, currentCurrency))}
                      </span>
                      <span className="text-[10px] text-stone-400 block">per month</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Direct Suite Costs</span>
                      <span className="text-sm font-extrabold text-rose-700">
                        {formatMoney(convertAmount(unitExpenseTotal, nativeCurr, currentCurrency))}
                      </span>
                    </div>
                  </div>

                  {/* Resident / Tenant Information */}
                  <div className="p-4 bg-white rounded-2xl border border-stone-200 space-y-2">
                    <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">Tenant & Lease Agreement</h4>
                    {tenant ? (
                      <div className="text-xs space-y-1.5 pt-1">
                        <div className="flex justify-between">
                          <span className="text-stone-500">Resident Name:</span>
                          <span className="font-bold text-stone-900">{tenant.first_name} {tenant.last_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-500">Contact Email:</span>
                          <span className="font-medium text-stone-800">{tenant.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-500">Contact Phone:</span>
                          <span className="font-medium text-stone-800">{tenant.phone}</span>
                        </div>
                        {activeLease && (
                          <div className="flex justify-between pt-1 border-t border-stone-100">
                            <span className="text-stone-500">Lease Term:</span>
                            <span className="font-semibold text-stone-800">{activeLease.start_date} to {activeLease.end_date}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-stone-400 italic pt-1">Unit is currently vacant. Marketing for qualified tenant.</p>
                    )}
                  </div>

                  {/* Unit-specific Expenses */}
                  {unitExpenses.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">Suite Expense Log ({unitExpenses.length})</h4>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto">
                        {unitExpenses.map(e => (
                          <div key={e.id} className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-semibold text-stone-800 block">{e.description}</span>
                              <span className="text-[10px] text-stone-400">{e.date} • {e.category}</span>
                            </div>
                            <span className="font-bold text-rose-700">
                              {formatMoney(convertAmount(e.amount, nativeCurr, currentCurrency))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="flex justify-end pt-3 border-t border-stone-100">
              <button
                onClick={() => setSelectedUnitDetail(null)}
                className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Close Suite Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delegate Modal */}
      {showDelegateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full border border-stone-200 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center pb-3 border-b border-stone-100">
              <h3 className="font-extrabold text-stone-900 text-sm">Add Authorized Legal Delegate</h3>
              <button onClick={() => setShowDelegateModal(false)} className="text-stone-400 hover:text-stone-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddRepresentative} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Barrister Chidi Okonkwo"
                  value={repName}
                  onChange={(e) => setRepName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Corporate / Law Email</label>
                <input
                  type="email"
                  required
                  placeholder="lawyer@adeyemipartners.com"
                  value={repEmail}
                  onChange={(e) => setRepEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Relationship</label>
                <select
                  value={repRelationship}
                  onChange={(e) => setRepRelationship(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Legal Counsel / Lawyer">Legal Counsel / Lawyer</option>
                  <option value="Asset Manager">Asset Manager</option>
                  <option value="Family Representative">Family Representative</option>
                  <option value="Accountant / Auditor">Accountant / Auditor</option>
                  <option value="Other">Other Representative</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowDelegateModal(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  Authorize Delegate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
