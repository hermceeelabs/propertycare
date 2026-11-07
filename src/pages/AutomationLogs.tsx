import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { DatabaseState } from '../services/supabase';
import { AutomationLog } from '../types/database';

interface AutomationLogsProps {
  dbState: DatabaseState;
}

export const AutomationLogsPage: React.FC<AutomationLogsProps> = ({ dbState }) => {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const filteredLogs = dbState.automation_logs.filter(l => {
    if (statusFilter === 'All') return true;
    return l.status === statusFilter;
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Automation Audit Trail</h1>
          <p className="text-sm text-slate-500">Immutable execution history, payload metadata & system diagnostics</p>
        </div>
      </div>

      {/* Decorative Divider */}
      <hr className="border-t border-slate-800/80" />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        {['All', 'Success', 'Failed', 'Skipped'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === s
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {s} ({s === 'All' ? dbState.automation_logs.length : dbState.automation_logs.filter(l => l.status === s).length})
          </button>
        ))}
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                <th className="p-4">Timestamp</th>
                <th className="p-4">Automation Type</th>
                <th className="p-4">Entity Type</th>
                <th className="p-4">Action Summary</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map(log => {
                const isExpanded = expandedLogId === log.id;
                return (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 text-slate-500 font-mono text-[11px]">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="p-4 font-bold text-slate-900">
                        <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">{log.automation_type}</code>
                      </td>
                      <td className="p-4 text-slate-600">{log.entity_type}</td>
                      <td className="p-4 font-medium text-slate-900">{log.action}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === 'Success' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          className="text-brand-600 font-bold hover:underline inline-flex items-center gap-1"
                        >
                          JSON {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </tr>

                    {/* Metadata JSON Drawer */}
                    {isExpanded && (
                      <tr className="bg-slate-900 text-emerald-400">
                        <td colSpan={6} className="p-4 font-mono text-[11px]">
                          <pre>{JSON.stringify({ id: log.id, metadata: log.metadata || {}, error: log.error || null }, null, 2)}</pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
