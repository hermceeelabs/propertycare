import React, { useState } from 'react';
import { CreditCard, Receipt, FileText } from 'lucide-react';
import { DatabaseState } from '../services/supabase';
import { PaymentsPage } from './Payments';
import { BillsPage } from './Bills';
import { ReportsPage } from './Reports';

interface FinancialsHubProps {
  dbState: DatabaseState;
  initialTab?: 'payments' | 'bills' | 'reports';
}

export const FinancialsHub: React.FC<FinancialsHubProps> = ({
  dbState,
  initialTab = 'payments'
}) => {
  const [activeTab, setActiveTab] = useState<'payments' | 'bills' | 'reports'>(initialTab);

  return (
    <div className="space-y-4">
      {/* Hub Tab Switcher Header */}
      <div className="px-8 pt-6 pb-0 max-w-7xl mx-auto space-y-4">
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
            <Receipt className="w-4 h-4" /> Expenses & Invoices ({dbState.bills.length})
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <FileText className="w-4 h-4" /> Reports & Audits
          </button>
        </div>

        {/* Decorative Divider */}
        <hr className="border-t border-slate-800/80" />
      </div>

      {/* Tab View Render */}
      <div>
        {activeTab === 'payments' && <PaymentsPage dbState={dbState} />}
        {activeTab === 'bills' && <BillsPage dbState={dbState} />}
        {activeTab === 'reports' && <ReportsPage dbState={dbState} />}
      </div>
    </div>
  );
};
