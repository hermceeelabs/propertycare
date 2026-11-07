import React, { useState } from 'react';
import { Zap, Play, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Clock, RefreshCw } from 'lucide-react';
import { DatabaseState, store } from '../services/supabase';
import { AutomationEngine, ExecutionResult } from '../services/automationEngine';
import { AutomationRunModal } from '../components/AutomationRunModal';

interface AutomationsProps {
  dbState: DatabaseState;
  onNavigateToLogs: () => void;
  onNavigateToCommunications?: () => void;
}

export const AutomationsPage: React.FC<AutomationsProps> = ({
  dbState,
  onNavigateToLogs,
  onNavigateToCommunications
}) => {
  const [runResult, setRunResult] = useState<ExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const automationsList = [
    {
      id: 'rule-rent',
      name: 'Rent Reminders & Escalations',
      desc: 'Checks upcoming & overdue rent payments. Sends 3-day reminders and escalates overdue accounts to management tasks.',
      trigger: 'Scheduled Daily at 09:00 EST',
      type: 'rent'
    },
    {
      id: 'rule-lease',
      name: 'Lease Expiration & Renewal Check',
      desc: 'Scans active lease expiry dates at 90, 60, 30, and 14-day intervals to trigger renewal task creation & tenant emails.',
      trigger: 'Scheduled Daily at 08:00 EST',
      type: 'lease'
    },
    {
      id: 'rule-vendor',
      name: 'Automatic Maintenance Vendor Assignment',
      desc: 'Matches incoming maintenance repair tickets to trade vendors by trade category and municipal service area.',
      trigger: 'Event Driven (Ticket Created)',
      type: 'vendor'
    },
    {
      id: 'rule-bill',
      name: 'Vendor Bill Due Date Reminders',
      desc: 'Monitors contractor invoice due dates at 7 days before due date to prevent accounts payable penalties.',
      trigger: 'Scheduled Daily at 09:30 EST',
      type: 'bill'
    },
    {
      id: 'rule-n4',
      name: 'Ontario Form N4 Non-Payment Draft Workflow',
      desc: 'Prepares administrative Form N4 draft notices when rent balances exceed 14 days overdue for property manager review.',
      trigger: 'Scheduled Daily at 10:00 EST',
      type: 'n4'
    }
  ];

  const handleRunSingle = async (type: string) => {
    setIsRunning(true);
    let res: ExecutionResult;

    if (type === 'rent') res = await AutomationEngine.runRentReminderAutomation();
    else if (type === 'lease') res = await AutomationEngine.runLeaseExpirationAutomation();
    else if (type === 'vendor') res = await AutomationEngine.runMaintenanceVendorAssignment();
    else if (type === 'bill') res = await AutomationEngine.runBillReminderAutomation();
    else res = await AutomationEngine.runOverduePaymentCheck();

    setRunResult(res);
    setIsRunning(false);
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header: Line 1 Title and Subtitle with visual divider */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-3">
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Automation Control Center</h1>
          <span className="hidden sm:inline text-cream-400 font-light">|</span>
          <p className="text-sm text-stone-600">Native background engine executing recurring business rules & audit logging</p>
        </div>

        <button
          onClick={onNavigateToLogs}
          className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 self-start sm:self-auto shrink-0"
        >
          <Clock className="w-4 h-4" /> View Full Audit Log
        </button>
      </div>

      {/* Visual Horizontal Separator */}
      <hr className="border-t border-slate-800/80" />

      {/* Visual Workflow Diagram Card */}
      <div className="bg-stone-900 text-white p-6 rounded-2xl shadow-sm border border-stone-800 space-y-3">
        <h3 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> Standard Automation Architecture
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-center text-xs font-semibold pt-2">
          <div className="p-2.5 bg-stone-800/80 rounded-xl border border-stone-700/60 text-stone-200">1. Trigger</div>
          <div className="p-2.5 bg-stone-800/80 rounded-xl border border-stone-700/60 text-stone-200">2. Find Records</div>
          <div className="p-2.5 bg-stone-800/80 rounded-xl border border-stone-700/60 text-stone-200">3. Apply Rules</div>
          <div className="p-2.5 bg-stone-800/80 rounded-xl border border-stone-700/60 text-stone-200">4. Draft Notices</div>
          <div className="p-2.5 bg-stone-800/80 rounded-xl border border-stone-700/60 text-stone-200">5. Email / SMS</div>
          <div className="p-2.5 bg-emerald-600 rounded-xl text-stone-950 font-bold shadow-xs">6. Audit Log</div>
        </div>
      </div>

      {/* Automation Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {automationsList.map(rule => {
          const ruleLogs = dbState.automation_logs.filter(l => l.automation_type.includes(rule.type));
          const successCount = ruleLogs.filter(l => l.status === 'Success').length;

          return (
            <div key={rule.id} className="bg-cream-50 p-6 rounded-2xl border border-cream-300 shadow-xs space-y-4 flex flex-col justify-between hover:border-cream-400 transition-colors">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-cream-200/60 text-stone-700 px-2.5 py-1 rounded-md border border-cream-300">
                    {rule.trigger}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" /> Active
                  </span>
                </div>

                <h3 className="text-base font-bold text-stone-900">{rule.name}</h3>
                <p className="text-xs text-stone-600 leading-relaxed">{rule.desc}</p>
              </div>

              <div className="pt-4 border-t border-cream-200 flex items-center justify-between">
                <span className="text-xs text-stone-500 font-medium">
                  Logged Executions: <strong className="text-stone-900">{successCount}</strong>
                </span>

                <button
                  onClick={() => handleRunSingle(rule.type)}
                  disabled={isRunning}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Play className="w-3 h-3 fill-current" /> Run Now
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <AutomationRunModal
        result={runResult}
        onClose={() => setRunResult(null)}
        onViewCommunications={onNavigateToCommunications}
        onViewLogs={onNavigateToLogs}
      />
    </div>
  );
};
