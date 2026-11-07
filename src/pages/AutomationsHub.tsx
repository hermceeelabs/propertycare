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
    <div className="space-y-4">
      {/* Hub Tab Switcher Header */}
      <div className="px-8 pt-6 pb-0 max-w-7xl mx-auto space-y-4">
        <div className="flex items-center gap-2 bg-slate-900/5 p-1 rounded-2xl w-fit border border-slate-200">
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'rules'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Zap className="w-4 h-4" /> Automations Center ({dbState.automation_rules.length} Rules)
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'logs'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <ShieldAlert className="w-4 h-4" /> Compliance & Execution Audit Trail
          </button>
        </div>

        {/* Decorative Divider */}
        <hr className="border-t border-slate-800/80" />
      </div>

      {/* Tab View Render */}
      <div>
        {activeTab === 'rules' && <AutomationsPage dbState={dbState} />}
        {activeTab === 'logs' && <AutomationLogsPage dbState={dbState} />}
      </div>
    </div>
  );
};
