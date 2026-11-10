import React, { useState, useRef, useEffect } from 'react';
import { DatabaseState, supabase, store } from '../../services/supabase';
import {
  Building2, DollarSign, TrendingUp, Download, Printer, ShieldCheck, Wrench, CheckCircle2,
  UserPlus, Users, X, Lock, LogOut, LayoutDashboard, Home, FileText, CreditCard, Bell,
  ChevronRight, Calendar, ArrowUpRight, Search, Landmark
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
              VIEW 2: OWNED ASSETS & UNITS (STRICT SCOPE & SIDE-BY-SIDE DUAL CURRENCY)
              ========================================================================= */}
          {currentTab === 'properties' && (
            <div className="space-y-6">
              {/* Adopted Title and Subtitle Section Design with visual divider */}
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-3">
                  <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Owned Assets & Unit Registry</h1>
                  <span className="hidden sm:inline text-cream-400 font-light">|</span>
                  <p className="text-sm text-stone-600">
                    Comprehensive tenant occupancy and live dual-currency rental yield breakdown across your {ownedProperties.length} properties
                  </p>
                </div>

                {/* Property Filter Dropdown */}
                <select
                  value={selectedPropertyId || 'All'}
                  onChange={(e) => setSelectedPropertyId(e.target.value === 'All' ? null : e.target.value)}
                  className="px-4 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-800 cursor-pointer shadow-2xs self-start sm:self-auto"
                >
                  <option value="All">All Owned Properties ({ownedProperties.length})</option>
                  {ownedProperties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Visual Horizontal Separator */}
              <hr className="border-t border-slate-800/80" />

              {/* Property Units Table */}
              <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-stone-100 flex items-center justify-between">
                  <h2 className="font-bold text-stone-900 text-sm">
                    Unit Occupancy & Leases ({selectedPropertyId ? ownedUnits.filter(u => u.property_id === selectedPropertyId).length : ownedUnits.length})
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 text-stone-400 font-bold uppercase tracking-wider text-[10px] border-b border-stone-200">
                      <tr>
                        <th className="py-3 px-5">Unit Number</th>
                        <th className="py-3 px-5">Property</th>
                        <th className="py-3 px-5">Configuration</th>
                        <th className="py-3 px-5">Occupancy Status</th>
                        <th className="py-3 px-5">Current Tenant</th>
                        <th className="py-3 px-5 text-right">Contracted Rent (Live FX)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {(selectedPropertyId ? ownedUnits.filter(u => u.property_id === selectedPropertyId) : ownedUnits).map(u => {
                        const prop = ownedProperties.find(p => p.id === u.property_id);
                        const nativeCurr = getPropNativeCurrency(u.property_id);
                        const lease = (dbState.leases || []).find(l => l.unit_id === u.id && l.status === 'Active');
                        const tenant = lease ? (dbState.tenants || []).find(t => t.id === lease.tenant_id) : null;
                        return (
                          <tr key={u.id} className="hover:bg-stone-50/60 transition-colors">
                            <td className="py-3.5 px-5 font-bold text-stone-900">{u.unit_number}</td>
                            <td className="py-3.5 px-5 text-stone-600 font-medium">{prop?.name || 'Property'}</td>
                            <td className="py-3.5 px-5 text-stone-500">
                              {u.bedrooms} Bed • {u.bathrooms} Bath • {u.square_feet || 950} sq ft
                            </td>
                            <td className="py-3.5 px-5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                u.status === 'Occupied'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {u.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-5 text-stone-800">
                              {tenant ? `${tenant.first_name} ${tenant.last_name}` : <span className="text-stone-400 italic">Vacant</span>}
                            </td>
                            <td className="py-3.5 px-5 text-right font-black text-stone-900">
                              <DualCurrencyDisplay
                                amount={u.monthly_rent || 0}
                                nativeCurrency={nativeCurr}
                                primaryClassName="font-black text-stone-900"
                                secondaryClassName="text-[10px] text-stone-400 block"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-3">
                  <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Legal Delegates & Representative Access</h1>
                  <span className="hidden sm:inline text-cream-400 font-light">|</span>
                  <p className="text-sm text-stone-600">
                    Manage attorney, accountant, and family representative sub-permissions for your portfolio
                  </p>
                </div>
                <button
                  onClick={() => setShowDelegateModal(true)}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-xs"
                >
                  <UserPlus className="w-4 h-4 text-emerald-400" /> Add Authorized Delegate
                </button>
              </div>

              {/* Visual Horizontal Separator */}
              <hr className="border-t border-slate-800/80" />

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
