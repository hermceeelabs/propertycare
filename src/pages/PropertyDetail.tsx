import React, { useState } from 'react';
import {
  ArrowLeft, Building2, MapPin, Home, Users, FileText,
  CreditCard, Wrench, Receipt, History, TrendingUp, Plus,
  Trash2, Landmark, Clock, Calendar, CheckCircle2, AlertCircle, ArrowUpRight, Sliders,
  ArrowRightLeft, HelpCircle, RefreshCw, Layers
} from 'lucide-react';
import { DatabaseState, store } from '../services/supabase';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { EditAcquisitionModal } from '../components/EditAcquisitionModal';
import { AddUnitModal } from '../components/AddUnitModal';
import { useCurrency, CURRENCIES, CurrencyCode } from '../context/CurrencyContext';
import { getYearlyWeightedExchangeRate, YearFxCalculation } from '../services/exchangeRateApi';

interface PropertyDetailProps {
  propertyId: string;
  dbState: DatabaseState;
  onBack: () => void;
}

export const PropertyDetailPage: React.FC<PropertyDetailProps> = ({
  propertyId,
  dbState,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState<'financials' | 'asset' | 'overview' | 'units' | 'tenants' | 'leases' | 'payments' | 'maintenance' | 'bills' | 'activity'>('financials');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isEditAcquisitionOpen, setIsEditAcquisitionOpen] = useState(false);
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [selectedUnitForExpense, setSelectedUnitForExpense] = useState<string | undefined>(undefined);
  const { formatMoney, currencyConfig, liveFx, refreshLiveFx, getLiveRateVsUsd } = useCurrency();

  const property = dbState.properties.find(p => p.id === propertyId);
  if (!property) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Property not found.</p>
        <button onClick={onBack} className="mt-4 text-brand-600 font-bold hover:underline">Return to Properties</button>
      </div>
    );
  }

  const units = dbState.units.filter(u => u.property_id === propertyId);
  const unitIds = new Set(units.map(u => u.id));

  const leases = dbState.leases.filter(l => unitIds.has(l.unit_id));
  const tenantIds = new Set(leases.map(l => l.tenant_id));
  const tenants = dbState.tenants.filter(t => tenantIds.has(t.id));

  const payments = dbState.payments.filter(p => tenantIds.has(p.tenant_id));
  const maintenance = dbState.maintenance_requests.filter(m => unitIds.has(m.unit_id));
  const bills = dbState.bills.filter(b => b.property_id === propertyId);
  const expenses = (dbState.expenses || []).filter(e => e.property_id === propertyId);

  // Financial Calculations for entire property
  const occupiedUnits = units.filter(u => u.status === 'Occupied');
  const actualMonthlyRent = occupiedUnits.reduce((acc, u) => acc + u.monthly_rent, 0);
  const totalPropertyExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

  // Master Lease monthly deduction if applicable
  const monthlyMasterLeaseFee = property.acquisition?.acquisition_type === 'Long-Term Lease'
    ? (property.acquisition.monthly_lease_cost || 0)
    : 0;

  const propertyNetOperatingIncome = actualMonthlyRent - totalPropertyExpenses - monthlyMasterLeaseFee;
  const propertyProfitMargin = actualMonthlyRent > 0
    ? Math.round((propertyNetOperatingIncome / actualMonthlyRent) * 100)
    : 0;

  // Asset Management & Break-Even Metrics
  const acquisition = property.acquisition || {
    acquisition_type: 'Outright Purchase' as const,
    acquisition_date: property.created_at.split('T')[0],
    total_acquisition_cost: 5000000,
    down_payment_or_deposit: 1000000,
    amortization_period_years: 25,
    annual_depreciation_or_amort: 200000,
    interest_rate_percent: 4.85
  };

  const initialCashOutlay = acquisition.down_payment_or_deposit;
  const annualNetCashFlow = propertyNetOperatingIncome * 12;
  const breakEvenYears = annualNetCashFlow > 0 ? (initialCashOutlay / annualNetCashFlow) : 999;
  const breakEvenMonths = annualNetCashFlow > 0 ? Math.round(breakEvenYears * 12) : 0;

  // Acquisition date breakdown for partial year proration
  const acqDateObj = new Date(acquisition.acquisition_date);
  const acquisitionYear = acqDateObj.getFullYear() || 2024;
  const acquisitionMonth = (acqDateObj.getMonth() + 1) || 1; // 1-12 (e.g. 6 for June)
  const currentYear = 2026;
  const yearsElapsed = Math.max(0, currentYear - acquisitionYear);
  const capitalRecoveredSoFar = Math.min(initialCashOutlay, Math.max(0, annualNetCashFlow * yearsElapsed));
  const recoveryProgressPercent = initialCashOutlay > 0
    ? Math.min(100, Math.round((capitalRecoveredSoFar / initialCashOutlay) * 100))
    : 100;

  // FX Valuation & Dynamic Break-Even Sensitivity State
  const defaultAcqRate = acquisition.exchange_rate_at_acquisition || 1427;
  const defaultBaseUsd = acquisition.base_valuation_in_usd || (defaultAcqRate > 0 ? Math.round(acquisition.total_acquisition_cost / defaultAcqRate) : 200000);
  const [currentFxRate, setCurrentFxRate] = useState<number>(defaultAcqRate);
  const [expenseInflationPercent, setExpenseInflationPercent] = useState<number>(0); // e.g. 0% default, adjustable -30% to +50%
  const [forecastAnnualDriftPercent, setForecastAnnualDriftPercent] = useState<number>(5); // e.g. 5% annual depreciation in forecast years

  // Total valuation at simulated current FX rate:
  const currentAssetValuationInLocal = defaultBaseUsd * currentFxRate;
  const initialEquityInUsd = defaultAcqRate > 0 ? (initialCashOutlay / defaultAcqRate) : 0;

  // Adjusted Expenses & Adjusted Annual Cash Flow under FX / expense sensitivity:
  const adjustedTotalExpenses = totalPropertyExpenses * (1 + (expenseInflationPercent / 100));
  const dynamicMonthlyNOI = actualMonthlyRent - adjustedTotalExpenses - monthlyMasterLeaseFee;
  const dynamicAnnualNetCashFlow = dynamicMonthlyNOI * 12;

  // Break-even horizon under simulated conditions:
  // If we measure recouping initial local outlay:
  const dynamicBreakEvenYears = dynamicAnnualNetCashFlow > 0 ? (initialCashOutlay / dynamicAnnualNetCashFlow) : 999;
  
  // If we measure recouping USD-denominated equity basis using current FX conversion:
  const annualNetCashFlowInUsd = currentFxRate > 0 ? (dynamicAnnualNetCashFlow / currentFxRate) : 0;
  const usdBreakEvenYears = annualNetCashFlowInUsd > 0 ? (initialEquityInUsd / annualNetCashFlowInUsd) : 999;

  // FX change percentage relative to deal entry date:
  const fxChangePercent = defaultAcqRate > 0 ? ((currentFxRate - defaultAcqRate) / defaultAcqRate) * 100 : 0;

  // 10-Year Amortization Schedule Projection
  const annualAmortization = acquisition.annual_depreciation_or_amort;
  const scheduleYears = Array.from({ length: 10 }, (_, i) => acquisitionYear + i);

  // Pre-calculate year-by-year FX calculations with proration for Year 1
  const yearlyScheduleDetails = (() => {
    let runningCumulativeLocal = 0;
    let runningCumulativeUsd = 0;

    return scheduleYears.map((yr, idx) => {
      const yearIndex = idx + 1;
      const isYearOne = idx === 0;
      
      // Calculate active months & proration for Year 1 (e.g. June = 7 active months)
      const fxCalc = getYearlyWeightedExchangeRate('NGN', yr, {
        startMonth: isYearOne ? acquisitionMonth : 1,
        dealEntryRate: defaultAcqRate,
        currentLiveRate: Math.round(getLiveRateVsUsd('NGN')),
        annualForecastDriftPercent: forecastAnnualDriftPercent,
        currentYear: 2026
      });

      const activeFactor = fxCalc.prorationFraction;
      const yrRevenue = actualMonthlyRent * 12 * activeFactor;
      const yrOperatingCost = adjustedTotalExpenses * 12 * activeFactor;
      const yrMasterLease = monthlyMasterLeaseFee * 12 * activeFactor;
      const yrNetCashFlow = dynamicMonthlyNOI * 12 * activeFactor;
      
      runningCumulativeLocal += yrNetCashFlow;
      
      // Convert year's net cash flow to USD using that year's specific weighted average rate
      const yrNetCashFlowUsd = fxCalc.rateVsUsd > 0 ? (yrNetCashFlow / fxCalc.rateVsUsd) : 0;
      runningCumulativeUsd += yrNetCashFlowUsd;

      const remainingBookVal = Math.max(0, acquisition.total_acquisition_cost - (annualAmortization * yearIndex));
      const isLocalBreakEvenReached = runningCumulativeLocal >= initialCashOutlay;
      const isUsdBreakEvenReached = runningCumulativeUsd >= initialEquityInUsd;

      return {
        year: yr,
        yearIndex,
        isYearOne,
        fxCalc,
        yrRevenue,
        yrOperatingCost,
        yrMasterLease,
        yrNetCashFlow,
        yrNetCashFlowUsd,
        cumulativeLocal: runningCumulativeLocal,
        cumulativeUsd: runningCumulativeUsd,
        remainingBookVal,
        isLocalBreakEvenReached,
        isUsdBreakEvenReached
      };
    });
  })();

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Back Button & Action Controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Properties
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditAcquisitionOpen(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <Sliders className="w-4 h-4 text-brand-600" /> Edit Asset Terms
          </button>

          <button
            onClick={() => {
              setSelectedUnitForExpense(undefined);
              setIsAddExpenseOpen(true);
            }}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Record New Expense
          </button>
        </div>
      </div>

      {/* Property Title Card with Acquisition Metadata */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold bg-brand-50 text-brand-700 px-2.5 py-0.5 rounded border border-brand-200">
              {property.property_type}
            </span>
            {property.ownership_type === 'Firm-Owned' ? (
              <span className="text-xs font-bold bg-purple-50 text-purple-700 px-2.5 py-0.5 rounded border border-purple-200 flex items-center gap-1">
                <Landmark className="w-3.5 h-3.5" />
                Firm Asset ({property.acquisition?.acquisition_type || 'Outright'}): {formatMoney(acquisition.total_acquisition_cost, { maximumFractionDigits: 0 })}
              </span>
            ) : (
              <span className="text-xs font-bold bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Landlord Asset · {property.business_model || 'Direct Management'} Mandate
              </span>
            )}
            <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
              {property.status}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">{property.name}</h1>
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-slate-400" />
            {property.address}, {property.city}, {property.province} {property.postal_code}
          </p>
        </div>

        <div className="flex items-center gap-6 text-center border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-6">
          <div>
            <span className="text-xs text-slate-500 block font-medium">Suites</span>
            <span className="text-xl font-extrabold text-slate-900">{units.length}</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block font-medium">Occupancy</span>
            <span className="text-xl font-extrabold text-emerald-600">
              {units.length > 0 ? Math.round((occupiedUnits.length / units.length) * 100) : 0}%
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block font-medium">Monthly Inflow</span>
            <span className="text-xl font-extrabold text-slate-900">
              {formatMoney(actualMonthlyRent)}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block font-medium">Net Profit Margin</span>
            <span className={`text-xl font-extrabold ${propertyProfitMargin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {propertyProfitMargin}%
            </span>
          </div>
        </div>
      </div>

      {/* Decorative Divider */}
      <hr className="border-t border-slate-800/80" />

      {/* Detail Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-px">
        {[
          { id: 'financials', label: 'Unit Economics & Profit', icon: TrendingUp },
          {
            id: 'asset',
            label: property.ownership_type === 'Firm-Owned'
              ? 'Firm Amortization & Balance Sheet'
              : property.business_model === 'Corporate Master Lease'
              ? 'Master Lease Capex Amortization'
              : 'Owner Asset Basis & Advisory',
            icon: Landmark
          },
          { id: 'overview', label: 'Overview', icon: Building2 },
          { id: 'units', label: `Units (${units.length})`, icon: Home },
          { id: 'tenants', label: `Tenants (${tenants.length})`, icon: Users },
          { id: 'leases', label: `Leases (${leases.length})`, icon: FileText },
          { id: 'payments', label: `Payments (${payments.length})`, icon: CreditCard },
          { id: 'maintenance', label: `Maintenance (${maintenance.length})`, icon: Wrench },
          { id: 'bills', label: `Expenses & Bills (${expenses.length})`, icon: Receipt },
          { id: 'activity', label: 'Activity Log', icon: History }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all shrink-0 ${
                isActive
                  ? 'border-brand-600 text-brand-600 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        {/* ASSET MANAGEMENT & AMORTIZATION TAB */}
        {activeTab === 'asset' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {property.ownership_type === 'Firm-Owned'
                    ? 'Firm Asset Capitalization, Amortization & Balance Sheet Payback'
                    : property.business_model === 'Corporate Master Lease'
                    ? 'Master Lease Capex & Upfront Capital Payback Horizon'
                    : 'Landlord Asset Valuation & Capital Allowance Advisory'}
                </h3>
                <p className="text-xs text-slate-500">
                  {property.ownership_type === 'Firm-Owned'
                    ? '100% corporate balance sheet asset owned by firm. Tracking equity recovery and structural debt amortization.'
                    : property.business_model === 'Corporate Master Lease'
                    ? 'Institutional leasehold leased by firm. Tracking recovery of fit-out capex and security deposits against sublease margins.'
                    : 'Landlord-owned asset operated under management mandate. Firm acts as managing agent without balance sheet capital expenditure.'}
                </p>
              </div>

              <button
                onClick={() => setIsEditAcquisitionOpen(true)}
                className="px-3.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Sliders className="w-3.5 h-3.5" /> Adjust Acquisition Structure
              </button>
            </div>

            {/* Top Asset KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-semibold block uppercase">Acquisition Capital</span>
                <span className="text-xl font-extrabold text-slate-900">{formatMoney(acquisition.total_acquisition_cost, { maximumFractionDigits: 0 })}</span>
                <span className="text-[11px] text-brand-700 font-medium block mt-1">
                  {acquisition.acquisition_type} • {acquisition.acquisition_date}
                </span>
              </div>

              <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-200">
                <span className="text-xs text-purple-900 font-semibold block uppercase">Initial Cash Outlay</span>
                <span className="text-xl font-extrabold text-purple-800">{formatMoney(initialCashOutlay, { maximumFractionDigits: 0 })}</span>
                <span className="text-[11px] text-purple-600 block mt-1">
                  {acquisition.acquisition_type === 'Outright Purchase' ? 'Equity Down Payment' : 'Upfront Deposit & Capex'}
                </span>
              </div>

              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200">
                <span className="text-xs text-emerald-900 font-semibold block uppercase">Annual Net Cash Flow</span>
                <span className="text-xl font-extrabold text-emerald-700">{formatMoney(annualNetCashFlow, { maximumFractionDigits: 0 })} / yr</span>
                <span className="text-[11px] text-emerald-600 block mt-1">
                  {formatMoney(propertyNetOperatingIncome, { maximumFractionDigits: 0 })} / mo net yield
                </span>
              </div>

              <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-amber-900 font-semibold uppercase">Estimated Break-Even</span>
                  <span className="text-[9px] font-extrabold uppercase bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded tracking-wider">
                    Estimated
                  </span>
                </div>
                <span className="text-xl font-extrabold text-amber-800">
                  {annualNetCashFlow > 0 ? `${breakEvenYears.toFixed(1)} Years` : 'N/A (Deficit)'}
                </span>
                <span className="text-[11px] text-amber-700 block mt-1">
                  {annualNetCashFlow > 0 ? `~${breakEvenMonths} operational months` : 'Requires cash flow review'}
                </span>
              </div>
            </div>

            {/* Multi-Currency Valuation & FX Sensitivity Break-Even Simulator */}
            <div className="p-6 bg-linear-to-br from-slate-900 to-blue-950 text-white rounded-2xl border border-blue-900/60 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-800/60 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30 flex items-center justify-center">
                    <ArrowRightLeft className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-white text-base">Exchange Rate & Expense Sensitivity Model</h4>
                      <span className="text-[10px] font-extrabold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded tracking-wider">
                        Estimated Projection
                      </span>
                    </div>
                    <p className="text-xs text-blue-200/80">
                      Simulate how FX volatility and operating cost shifts shorten or prolong investment payback time
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {liveFx && (
                    <button
                      onClick={() => {
                        const marketRate = Math.round(getLiveRateVsUsd('NGN'));
                        if (marketRate > 0) setCurrentFxRate(marketRate);
                      }}
                      className="px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Sync slider with live market exchange rate"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      Apply Live Market Rate (~{Math.round(getLiveRateVsUsd('NGN'))} NGN/USD)
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setCurrentFxRate(defaultAcqRate);
                      setExpenseInflationPercent(0);
                    }}
                    className="px-3 py-1.5 bg-blue-900/40 hover:bg-blue-800/60 text-blue-200 border border-blue-700/50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Reset to Baseline ({defaultAcqRate})
                  </button>
                </div>
              </div>

              {/* Deal Basis vs Current State Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-3.5 bg-slate-800/80 rounded-xl border border-blue-800/40 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-blue-300 block">Baseline Valuation (Deal Inception)</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-extrabold text-white">
                      ${(defaultBaseUsd).toLocaleString()} USD
                    </span>
                  </div>
                  <span className="text-[11px] text-blue-300/80 block">
                    Fixed rate @ {defaultAcqRate.toLocaleString()} NGN/USD
                  </span>
                </div>

                <div className="p-3.5 bg-slate-800/80 rounded-xl border border-blue-800/40 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-blue-300 block">Simulated Asset Valuation</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-extrabold text-blue-200">
                      {formatMoney(currentAssetValuationInLocal, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <span className={`text-[11px] font-bold block ${fxChangePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {fxChangePercent >= 0 ? `+${fxChangePercent.toFixed(1)}%` : `${fxChangePercent.toFixed(1)}%`} vs deal baseline
                  </span>
                </div>

                <div className="p-3.5 bg-slate-800/80 rounded-xl border border-blue-800/40 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-amber-300 block">Simulated Break-Even (Local Currency)</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-extrabold text-amber-300">
                      {dynamicAnnualNetCashFlow > 0 ? `~${dynamicBreakEvenYears.toFixed(1)} Years` : 'Deficit'}
                    </span>
                    <span className="text-[10px] text-amber-200/70 font-semibold uppercase">(Estimated)</span>
                  </div>
                  <span className="text-[11px] text-blue-300/80 block">
                    {dynamicAnnualNetCashFlow > 0 ? `${Math.round(dynamicBreakEvenYears * 12)} months to recoup initial equity` : 'Operating in cash deficit'}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-800/80 rounded-xl border border-blue-800/40 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-purple-300 block">USD Real Payback Horizon</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-extrabold text-purple-200">
                      {annualNetCashFlowInUsd > 0 ? `~${usdBreakEvenYears.toFixed(1)} Years` : 'Deficit'}
                    </span>
                    <span className="text-[10px] text-purple-300/70 font-semibold uppercase">(Estimated)</span>
                  </div>
                  <span className="text-[11px] text-blue-300/80 block">
                    Under ${(annualNetCashFlowInUsd).toLocaleString(undefined, { maximumFractionDigits: 0 })} USD/yr net yield
                  </span>
                </div>
              </div>

              {/* Interactive Sensitivity Sliders */}
              <div className="p-4 bg-blue-900/30 rounded-xl border border-blue-800/50 space-y-4">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-blue-200 flex items-center gap-1.5">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400" />
                    Simulated Exchange Rate: <strong className="text-white text-sm ml-1">{currentFxRate.toLocaleString()} NGN / USD</strong>
                  </span>
                  <span className="text-xs text-blue-300">
                    Baseline Deal Rate: <strong>{defaultAcqRate.toLocaleString()}</strong>
                  </span>
                </div>

                <div className="space-y-1">
                  <input
                    type="range"
                    min={Math.round(defaultAcqRate * 0.5)}
                    max={Math.round(defaultAcqRate * 2.2)}
                    step={10}
                    value={currentFxRate}
                    onChange={(e) => setCurrentFxRate(parseFloat(e.target.value))}
                    className="w-full accent-blue-400 cursor-pointer h-2 bg-slate-700 rounded-lg appearance-none"
                  />
                  <div className="flex justify-between text-[10px] text-blue-300/70 font-mono">
                    <span>Strengthening FX: {Math.round(defaultAcqRate * 0.5).toLocaleString()}</span>
                    <span>Baseline: {defaultAcqRate.toLocaleString()}</span>
                    <span>Depreciating FX: {Math.round(defaultAcqRate * 2.2).toLocaleString()}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-blue-800/40">
                  <div className="flex items-center justify-between text-xs font-semibold mb-1">
                    <span className="text-blue-200">
                      Operational Expense Fluctuation: <strong className="text-white text-sm ml-1">{expenseInflationPercent > 0 ? `+${expenseInflationPercent}%` : `${expenseInflationPercent}%`}</strong>
                    </span>
                    <span className="text-xs text-blue-300">
                      Adjusted Expenses: <strong>{formatMoney(adjustedTotalExpenses, { maximumFractionDigits: 0 })}/mo</strong>
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-30}
                    max={60}
                    step={5}
                    value={expenseInflationPercent}
                    onChange={(e) => setExpenseInflationPercent(parseInt(e.target.value, 10))}
                    className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-700 rounded-lg appearance-none"
                  />
                  <div className="flex justify-between text-[10px] text-blue-300/70 font-mono">
                    <span>-30% Cost Efficiency</span>
                    <span>0% Current Baseline</span>
                    <span>+60% Cost Inflation (Fuel, Tariffs, Parts)</span>
                  </div>
                </div>

                {/* Annual FX Depreciation Drift for Multi-Year Forecasting */}
                <div className="pt-2 border-t border-blue-800/40">
                  <div className="flex items-center justify-between text-xs font-semibold mb-1">
                    <span className="text-blue-200 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                      Future Annual FX Depreciation Drift (2027+): <strong className="text-white text-sm ml-1">+{forecastAnnualDriftPercent}% / year</strong>
                    </span>
                    <span className="text-xs text-purple-300 font-mono">
                      Compounded in Year-by-Year Schedule below
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={25}
                    step={1}
                    value={forecastAnnualDriftPercent}
                    onChange={(e) => setForecastAnnualDriftPercent(parseInt(e.target.value, 10))}
                    className="w-full accent-purple-400 cursor-pointer h-2 bg-slate-700 rounded-lg appearance-none"
                  />
                  <div className="flex justify-between text-[10px] text-blue-300/70 font-mono">
                    <span>0% Stable Currency</span>
                    <span>+5% Moderate Drift</span>
                    <span>+15% High Depreciation</span>
                    <span>+25% Severe Devaluation</span>
                  </div>
                </div>
              </div>

              {/* Explanatory Context Note & Live FX Attribution */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-blue-950/60 rounded-xl border border-blue-800/30 text-xs text-blue-200">
                <div className="flex items-start gap-2.5">
                  <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    <strong>Estimated Projection Disclaimer:</strong> Break-even horizons represent dynamic mathematical estimates based on current lease inflows, master lease commitments, and projected operating expenditures. In foreign asset purchases (e.g. $200k USD @ 1,427), currency depreciation increases the local currency value required to recover original foreign capital, whereas expense inflation directly compresses net operating margins, extending the investment payback duration.
                  </p>
                </div>

                {liveFx && (
                  <div className="shrink-0 text-right bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-blue-800/40 text-[10px]">
                    <span className="text-emerald-400 font-bold flex items-center justify-end gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Live Financial API Feed
                    </span>
                    <span className="text-blue-300/80 block">Updated: {new Date(liveFx.lastUpdated).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Break-Even Progress Bar */}
            <div className="p-5 bg-gradient-to-r from-slate-50 to-blue-50/40 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-extrabold text-slate-900 text-sm">Capital Payback & Break-Even Progress</span>
                  <p className="text-slate-500 text-[11px]">Cumulative operational net income recovered against initial cash investment</p>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-brand-700 text-sm">{recoveryProgressPercent}% Recovered</span>
                  <span className="block text-[11px] text-slate-500">
                    {formatMoney(capitalRecoveredSoFar, { maximumFractionDigits: 0 })} of {formatMoney(initialCashOutlay, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              <div className="w-full bg-slate-200 h-3.5 rounded-full overflow-hidden p-0.5">
                <div
                  className="bg-brand-600 h-full rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-1 text-[9px] font-bold text-white"
                  style={{ width: `${Math.max(5, recoveryProgressPercent)}%` }}
                >
                  {recoveryProgressPercent > 15 ? `${recoveryProgressPercent}%` : ''}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>Acquired: {acquisition.acquisition_date}</span>
                <span>
                  Estimated Break-Even Date:{' '}
                  <strong className="text-slate-800">
                    {annualNetCashFlow > 0 ? `${Math.round(acquisitionYear + breakEvenYears)} (approx)` : 'Pending positive cash flow'}
                  </strong>
                </span>
                <span>Amortization Term: {acquisition.amortization_period_years} Years</span>
              </div>
            </div>

            {/* Year-by-Year Amortization & Cash Flow Table */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                      Year-by-Year Amortization Schedule & Cumulative Return
                    </h4>
                    <span className="text-[10px] font-extrabold uppercase bg-brand-50 text-brand-700 px-2 py-0.5 rounded border border-brand-200">
                      Prorated & FX Weighted
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Accounts for Year 1 partial holding period (from {acqDateObj.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}) and yearly FX fluctuations
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded border border-purple-200">
                    Annual Write-Off: {formatMoney(annualAmortization, { maximumFractionDigits: 0 })}/yr
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="p-3.5">Fiscal Year & Active Duration</th>
                      <th className="p-3.5">Effective FX Rate</th>
                      <th className="p-3.5">Gross Revenue</th>
                      <th className="p-3.5">Operating Costs</th>
                      {acquisition.acquisition_type === 'Long-Term Lease' && (
                        <th className="p-3.5">Master Lease Fee</th>
                      )}
                      <th className="p-3.5">Net Cash Flow (Local)</th>
                      <th className="p-3.5">USD Converted Return</th>
                      <th className="p-3.5">Remaining Book Value</th>
                      <th className="p-3.5 text-right">Cumulative Net Return</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {yearlyScheduleDetails.map((row) => {
                      const {
                        year,
                        yearIndex,
                        isYearOne,
                        fxCalc,
                        yrRevenue,
                        yrOperatingCost,
                        yrMasterLease,
                        yrNetCashFlow,
                        yrNetCashFlowUsd,
                        cumulativeLocal,
                        cumulativeUsd,
                        remainingBookVal,
                        isLocalBreakEvenReached,
                        isUsdBreakEvenReached
                      } = row;

                      const isCurrentYr = year === currentYear;

                      return (
                        <tr
                          key={year}
                          className={`hover:bg-slate-50/80 transition-colors ${isCurrentYr ? 'bg-brand-50/40 font-semibold' : ''}`}
                        >
                          <td className="p-3.5 font-bold text-slate-900">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>Year {yearIndex} ({year})</span>
                              {isCurrentYr && (
                                <span className="text-[10px] font-extrabold text-brand-700 bg-brand-100 px-1.5 py-0.2 rounded">
                                  Current
                                </span>
                              )}
                              {isYearOne && fxCalc.isProrated && (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-1.5 py-0.2 rounded">
                                  {fxCalc.monthsActive} of 12 Mos Active
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Effective FX Rate Column */}
                          <td className="p-3.5">
                            <div className="space-y-0.5">
                              <span className="font-extrabold text-slate-800">
                                {fxCalc.rateVsUsd.toLocaleString()} NGN/$
                              </span>
                              <span className={`block text-[9px] font-bold uppercase tracking-wider ${
                                fxCalc.sourceType === 'Live Market API'
                                  ? 'text-emerald-600'
                                  : fxCalc.sourceType === 'Historical Monthly Weighted'
                                  ? 'text-blue-600'
                                  : fxCalc.sourceType === 'Projected Forecast'
                                  ? 'text-purple-600'
                                  : 'text-slate-500'
                              }`}>
                                {fxCalc.sourceType}
                              </span>
                            </div>
                          </td>

                          <td className="p-3.5 text-slate-800">{formatMoney(yrRevenue, { maximumFractionDigits: 0 })}</td>
                          <td className="p-3.5 text-rose-600">-{formatMoney(yrOperatingCost, { maximumFractionDigits: 0 })}</td>
                          {acquisition.acquisition_type === 'Long-Term Lease' && (
                            <td className="p-3.5 text-amber-700 font-medium">-{formatMoney(yrMasterLease, { maximumFractionDigits: 0 })}</td>
                          )}

                          <td className="p-3.5 font-bold text-emerald-600">
                            +{formatMoney(yrNetCashFlow, { maximumFractionDigits: 0 })}
                          </td>

                          {/* Converted USD Return Column */}
                          <td className="p-3.5 font-bold text-blue-900">
                            +${Math.round(yrNetCashFlowUsd).toLocaleString()} USD
                            <span className="block text-[10px] text-slate-400 font-normal">
                              @ {fxCalc.rateVsUsd.toLocaleString()} rate
                            </span>
                          </td>

                          <td className="p-3.5 text-slate-600 font-medium">
                            {formatMoney(remainingBookVal, { maximumFractionDigits: 0 })}
                          </td>

                          {/* Cumulative Return & Break-Even Badges */}
                          <td className="p-3.5 text-right font-extrabold">
                            <span className={cumulativeLocal >= initialCashOutlay ? 'text-emerald-700' : 'text-slate-700'}>
                              {formatMoney(cumulativeLocal, { maximumFractionDigits: 0 })}
                            </span>
                            <span className="block text-[11px] text-blue-800 font-medium">
                              (${Math.round(cumulativeUsd).toLocaleString()} USD)
                            </span>

                            {isLocalBreakEvenReached && (
                              <span className="inline-block mt-0.5 text-[9px] text-emerald-700 bg-emerald-100 font-bold px-1.5 py-0.5 rounded mr-1">
                                ✓ Local Break-Even
                              </span>
                            )}

                            {isUsdBreakEvenReached && (
                              <span className="inline-block mt-0.5 text-[9px] text-blue-800 bg-blue-100 font-bold px-1.5 py-0.5 rounded">
                                ✓ USD Equity Recovered
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Contract Terms Details */}
            {acquisition.notes && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <span className="font-bold text-slate-700 block">Acquisition & Lease Agreement Details</span>
                <p className="text-slate-600">{acquisition.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* FINANCIALS & UNIT ECONOMICS TAB */}
        {activeTab === 'financials' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Unit-by-Unit Financial Performance & Profit Margins</h3>
                <p className="text-xs text-slate-500">Track monthly income against unit-allocated expenses and common property costs</p>
              </div>

              <button
                onClick={() => {
                  setSelectedUnitForExpense(undefined);
                  setIsAddExpenseOpen(true);
                }}
                className="px-3.5 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Log Expense
              </button>
            </div>

            {/* Property Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-medium block">Total Monthly Inflow</span>
                <span className="text-xl font-extrabold text-slate-900">{formatMoney(actualMonthlyRent)}</span>
                <span className="text-[11px] text-slate-400 block mt-1">From {occupiedUnits.length} active leases</span>
              </div>

              <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-200">
                <span className="text-xs text-rose-800 font-medium block">Total Operating Outflow</span>
                <span className="text-xl font-extrabold text-rose-700">
                  {formatMoney(totalPropertyExpenses + monthlyMasterLeaseFee)}
                </span>
                <span className="text-[11px] text-rose-600 block mt-1">
                  {monthlyMasterLeaseFee > 0 ? `Includes ${formatMoney(monthlyMasterLeaseFee)} master lease fee` : `${expenses.length} operating expenses logged`}
                </span>
              </div>

              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200">
                <span className="text-xs text-emerald-800 font-medium block">Net Operating Income (NOI)</span>
                <span className={`text-xl font-extrabold ${propertyNetOperatingIncome >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatMoney(propertyNetOperatingIncome)}
                </span>
                <span className="text-[11px] text-emerald-700 block mt-1">Net property monthly yield</span>
              </div>

              <div className="p-4 bg-brand-50/50 rounded-xl border border-brand-200">
                <span className="text-xs text-brand-800 font-medium block">Overall Profit Margin</span>
                <span className={`text-xl font-extrabold ${propertyProfitMargin >= 0 ? 'text-brand-700' : 'text-rose-600'}`}>
                  {propertyProfitMargin}%
                </span>
                <span className="text-[11px] text-brand-600 block mt-1">Return on monthly gross</span>
              </div>
            </div>

            {/* Per-Unit Economics Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="p-3.5">Unit #</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Monthly Income</th>
                    <th className="p-3.5">Direct Unit Expenses</th>
                    <th className="p-3.5">Shared Building Cost</th>
                    <th className="p-3.5">Net Profit / Yield</th>
                    <th className="p-3.5">Profit Margin</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {units.map(unit => {
                    const unitDirectExpenses = expenses.filter(e => e.unit_id === unit.id);
                    const unitDirectTotal = unitDirectExpenses.reduce((acc, e) => acc + e.amount, 0);

                    // Property-wide shared costs distributed proportionally across units
                    const propertyWideExpenses = expenses.filter(e => e.scope === 'Property');
                    const sharedPropertyCostPerUnit = units.length > 0
                      ? (propertyWideExpenses.reduce((acc, e) => acc + e.amount, 0) + monthlyMasterLeaseFee) / units.length
                      : 0;

                    const totalCostForUnit = unitDirectTotal + sharedPropertyCostPerUnit;
                    const unitIncome = unit.status === 'Occupied' ? unit.monthly_rent : 0;
                    const unitProfit = unitIncome - totalCostForUnit;
                    const unitMargin = unitIncome > 0
                      ? Math.round((unitProfit / unitIncome) * 100)
                      : (totalCostForUnit > 0 ? -100 : 0);

                    return (
                      <tr key={unit.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-extrabold text-slate-900">
                          Unit {unit.unit_number}
                          <span className="block text-[11px] font-normal text-slate-500">{unit.unit_type}</span>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            unit.status === 'Occupied' ? 'bg-emerald-100 text-emerald-800' :
                            unit.status === 'Vacant' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {unit.status}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">
                          {formatMoney(unitIncome)}
                        </td>
                        <td className="p-3.5 text-rose-600 font-semibold">
                          {formatMoney(unitDirectTotal)}
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {unitDirectExpenses.length} logged
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-500">
                          {formatMoney(sharedPropertyCostPerUnit)}
                          <span className="block text-[10px] text-slate-400">allocated</span>
                        </td>
                        <td className="p-3.5 font-extrabold">
                          <span className={unitProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                            {formatMoney(unitProfit)}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-extrabold ${
                            unitMargin >= 50 ? 'bg-emerald-100 text-emerald-800' :
                            unitMargin > 0 ? 'bg-blue-100 text-blue-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {unitMargin}%
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => {
                              setSelectedUnitForExpense(unit.id);
                              setIsAddExpenseOpen(true);
                            }}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded-lg transition-colors inline-flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Add Expense
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* List of Recent Expenses for this property */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-xs">Logged Expenses for {property.name}</h4>
                <span className="text-xs text-slate-500 font-medium">{expenses.length} Total Records</span>
              </div>

              {expenses.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                  No expenses logged for this property yet. Click "Record New Expense" above.
                </div>
              ) : (
                <div className="space-y-2">
                  {expenses.map(exp => {
                    const unit = exp.unit_id ? units.find(u => u.id === exp.unit_id) : undefined;
                    return (
                      <div key={exp.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                              {exp.scope === 'Unit' ? `Unit ${unit?.unit_number || 'Unit'}` : 'Building-Wide'}
                            </span>
                            <span className="text-[10px] font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                              {exp.category}
                            </span>
                            <span className="text-xs text-slate-400">{exp.date}</span>
                          </div>
                          <p className="text-xs font-semibold text-slate-800">{exp.description}</p>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="font-extrabold text-sm text-rose-600">-{formatMoney(exp.amount)}</span>
                          <button
                            onClick={() => store.deleteExpense(exp.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-200 transition-colors"
                            title="Delete Expense"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h3 className="font-bold text-slate-900 text-sm">Asset Management Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-semibold block">Primary City</span>
                <span className="text-base font-extrabold text-slate-900">{property.city}, Ontario</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-semibold block">Property Class</span>
                <span className="text-base font-extrabold text-slate-900">{property.property_type}</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-semibold block">Acquisition Type</span>
                <span className="text-base font-extrabold text-brand-700">{acquisition.acquisition_type}</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-semibold block">Created Date</span>
                <span className="text-base font-extrabold text-slate-900">{property.created_at.split('T')[0]}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'units' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                Suites & Inventory ({units.length})
              </span>
              <button
                onClick={() => setIsAddUnitOpen(true)}
                className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Suite to Property
              </button>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold">
                  <th className="pb-3">Unit Number</th>
                  <th className="pb-3">Layout / Type</th>
                  <th className="pb-3">Bed / Bath</th>
                  <th className="pb-3">Monthly Rent</th>
                  <th className="pb-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {units.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-3 font-bold text-slate-900">Unit {u.unit_number}</td>
                    <td className="py-3 text-slate-600">{u.unit_type}</td>
                    <td className="py-3 text-slate-600">{u.bedrooms} Bed / {u.bathrooms} Bath</td>
                    <td className="py-3 font-semibold text-slate-900">{formatMoney(u.monthly_rent)}</td>
                    <td className="py-3 text-right">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        u.status === 'Occupied' ? 'bg-emerald-100 text-emerald-800' :
                        u.status === 'Vacant' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

        {activeTab === 'tenants' && (
          <div className="space-y-3">
            {tenants.map(t => (
              <div key={t.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-900">{t.first_name} {t.last_name}</h4>
                  <p className="text-xs text-slate-500">{t.email} • {t.phone}</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'leases' && (
          <div className="space-y-3">
            {leases.map(l => (
              <div key={l.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Lease #{l.id}</h4>
                  <p className="text-xs text-slate-500">{l.start_date} to {l.end_date}</p>
                </div>
                <span className="font-extrabold text-sm text-slate-900">{formatMoney(l.monthly_rent)} / mo</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-3">
            {payments.map(p => (
              <div key={p.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Payment Due: {p.due_date}</h4>
                  <p className="text-xs text-slate-500">Paid: {formatMoney(p.amount_paid)} / Due: {formatMoney(p.amount_due)}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  p.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="space-y-3">
            {maintenance.map(m => (
              <div key={m.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-700 px-2 py-0.5 rounded">
                    {m.category} • {m.priority}
                  </span>
                  <p className="text-xs font-semibold text-slate-900 mt-1">{m.description}</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  {m.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'bills' && (
          <div className="space-y-3">
            {bills.map(b => (
              <div key={b.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Invoice #{b.bill_number}</h4>
                  <p className="text-xs text-slate-500">{b.description} (Due: {b.due_date})</p>
                </div>
                <span className="font-extrabold text-sm text-slate-900">{formatMoney(b.amount)}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="text-xs text-slate-500 space-y-2">
            <p>• Property created in Central Database on {property.created_at.split('T')[0]}</p>
            <p>• Portfolio audit check completed on {property.updated_at.split('T')[0]}</p>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        dbState={dbState}
        defaultPropertyId={propertyId}
        defaultUnitId={selectedUnitForExpense}
      />

      {/* Edit Acquisition Modal */}
      <EditAcquisitionModal
        isOpen={isEditAcquisitionOpen}
        onClose={() => setIsEditAcquisitionOpen(false)}
        property={property}
      />

      {/* Add Unit Modal */}
      <AddUnitModal
        isOpen={isAddUnitOpen}
        onClose={() => setIsAddUnitOpen(false)}
        dbState={dbState}
        defaultPropertyId={propertyId}
      />
    </div>
  );
};
