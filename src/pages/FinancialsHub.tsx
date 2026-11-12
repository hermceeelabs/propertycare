import React, { useState } from 'react';
import { CreditCard, Receipt } from 'lucide-react';
import { DatabaseState } from '../services/supabase';
import { PaymentsPage } from './Payments';
import { BillsPage } from './Bills';

interface FinancialsHubProps {
  dbState: DatabaseState;
  initialTab?: 'payments' | 'bills';
}

export const FinancialsHub: React.FC<FinancialsHubProps> = ({
  dbState,
  initialTab = 'payments'
}) => {
  const [activeTab, setActiveTab] = useState<'payments' | 'bills'>(initialTab);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Strict Single-Line Title & Subtitle at Top of Page */}
      <div className="flex items-baseline gap-2 sm:gap-3 overflow-hidden">
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight whitespace-nowrap shrink-0">
          {activeTab === 'payments' ? 'Rent & Financial Ledger' : 'Operating Expenses & Vendor Invoices'}
        </h1>
        <span className="text-cream-400 font-light shrink-0">|</span>
        <p className="text-sm text-stone-600 truncate">
          {activeTab === 'payments'
            ? 'Track monthly rent collections, outstanding balances & overdue escalations'
            : 'Track property operating expenditure, contractor bills, unit-specific repairs & automated alerts'}
        </p>
      </div>

      {/* Single Horizontal Separator */}
      <hr className="border-t border-slate-800/80" />

      {/* Hub Tab Switcher (Below Separator) */}
      <div className="flex items-center gap-2 bg-slate-900/5 p-1 rounded-2xl w-fit border border-slate-200">
        <button
          onClick={() => setActiveTab('payments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'payments'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <CreditCard className="w-4 h-4" /> Rent & Collections ({dbState.payments.length})
        </button>
        <button
          onClick={() => setActiveTab('bills')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'bills'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Receipt className="w-4 h-4" /> Expenses & Invoices ({(dbState.expenses || []).length + (dbState.bills || []).length})
        </button>
      </div>

      {/* Tab View Render */}
      <div>
        {activeTab === 'payments' && <PaymentsPage dbState={dbState} />}
        {activeTab === 'bills' && <BillsPage dbState={dbState} />}
      </div>
    </div>
  );
};
