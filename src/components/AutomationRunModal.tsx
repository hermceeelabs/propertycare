import React from 'react';
import { Zap, CheckCircle2, AlertTriangle, ArrowRight, X, Mail, FileCheck } from 'lucide-react';
import { ExecutionResult } from '../services/automationEngine';

interface AutomationRunModalProps {
  result: ExecutionResult | null;
  onClose: () => void;
  onViewCommunications?: () => void;
  onViewLogs?: () => void;
}

export const AutomationRunModal: React.FC<AutomationRunModalProps> = ({
  result,
  onClose,
  onViewCommunications,
  onViewLogs
}) => {
  if (!result) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Automation Completed</h3>
              <p className="text-xs text-emerald-400 font-medium">{result.automationName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Execution Metrics Summary Grid */}
        <div className="grid grid-cols-4 gap-3 p-6 bg-slate-50 border-b border-slate-200">
          <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
            <span className="text-xs text-slate-500 font-medium block">Processed</span>
            <span className="text-xl font-extrabold text-slate-900">{result.recordsProcessed}</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-emerald-200 text-center bg-emerald-50/50">
            <span className="text-xs text-emerald-700 font-medium block">Emails</span>
            <span className="text-xl font-extrabold text-emerald-600">{result.emailsCreated}</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
            <span className="text-xs text-slate-500 font-medium block">Skipped</span>
            <span className="text-xl font-extrabold text-slate-600">{result.skipped}</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-rose-200 text-center bg-rose-50/50">
            <span className="text-xs text-rose-700 font-medium block">Errors</span>
            <span className="text-xl font-extrabold text-rose-600">{result.errors}</span>
          </div>
        </div>

        {/* Execution Activity Log Details */}
        <div className="p-6 space-y-3 max-h-64 overflow-y-auto">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Execution Log Steps</h4>
          {result.details.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No state changes required for this run cycle.</p>
          ) : (
            <ul className="space-y-2">
              {result.details.map((detail, index) => (
                <li key={index} className="flex items-start gap-2.5 text-xs text-slate-700 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Action Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onViewCommunications && result.emailsCreated > 0 && (
              <button
                onClick={() => {
                  onClose();
                  onViewCommunications();
                }}
                className="px-3.5 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Mail className="w-3.5 h-3.5" /> View Generated Emails
              </button>
            )}

            {onViewLogs && (
              <button
                onClick={() => {
                  onClose();
                  onViewLogs();
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <FileCheck className="w-3.5 h-3.5" /> Audit Logs
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
