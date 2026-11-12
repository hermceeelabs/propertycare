import React, { useState } from 'react';
import { Zap, ShieldAlert } from 'lucide-react';
import { DatabaseState } from '../services/supabase';
import { AutomationsPage } from './Automations';
import { AutomationLogsPage } from './AutomationLogs';

interface AutomationsHubProps {
  dbState: DatabaseState;
  initialTab?: 'rules' | 'logs';
}

export const AutomationsHub: React.FC<AutomationsHubProps> = ({
  dbState,
  initialTab = 'rules'
}) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'logs'>(initialTab);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Strict Single-Line Title & Subtitle at Top of Page */}
      <div className="flex items-baseline gap-2 sm:gap-3 overflow-hidden">
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight whitespace-nowrap shrink-0">
          {activeTab === 'rules' ? 'Automation Control Center' : 'Automation Audit Trail'}
        </h1>
        <span className="text-cream-400 font-light shrink-0">|</span>
        <p className="text-sm text-stone-600 truncate">
          {activeTab === 'rules'
            ? 'Native background engine executing recurring business rules & audit logging'
            : 'Immutable execution history, payload metadata & system diagnostics'}
        </p>
      </div>

      {/* Single Horizontal Separator */}
      <hr className="border-t border-slate-800/80" />

      {/* Hub Tab Switcher (Below Separator) */}
      <div className="flex items-center gap-2 bg-slate-900/5 p-1 rounded-2xl w-fit border border-slate-200">
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'rules'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Zap className="w-4 h-4" /> Automations Center ({dbState.automation_rules.length} Rules)
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <ShieldAlert className="w-4 h-4" /> Compliance & Execution Audit Trail
        </button>
      </div>

      {/* Tab View Render */}
      <div>
        {activeTab === 'rules' && (
          <AutomationsPage
            dbState={dbState}
            onNavigateToLogs={() => setActiveTab('logs')}
          />
        )}
        {activeTab === 'logs' && <AutomationLogsPage dbState={dbState} />}
      </div>
    </div>
  );
};
