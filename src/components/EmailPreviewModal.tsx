import React from 'react';
import { Mail, X, CheckCircle2, AlertCircle, Info, ExternalLink } from 'lucide-react';
import { Communication } from '../types/database';

interface EmailPreviewModalProps {
  communication: Communication | null;
  onClose: () => void;
}

export const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({
  communication,
  onClose
}) => {
  if (!communication) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <Mail className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Email Preview Modal</h3>
              <p className="text-xs text-slate-300">Mock Email Provider Abstraction</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Disclaimer Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>POC Mode:</strong> This email was processed via <code>MockEmailProvider</code>. No real external email was dispatched.
            </span>
          </div>
          <span className="font-bold uppercase tracking-wider bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded text-[10px]">
            {communication.status}
          </span>
        </div>

        {/* Email Metadata Details */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 space-y-2 text-xs text-slate-600">
          <div className="flex items-center">
            <span className="w-20 font-semibold text-slate-500">To:</span>
            <span className="font-medium text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">{communication.recipient}</span>
          </div>
          <div className="flex items-center">
            <span className="w-20 font-semibold text-slate-500">Subject:</span>
            <span className="font-semibold text-slate-900">{communication.subject}</span>
          </div>
          <div className="flex items-center gap-6">
            <div>
              <span className="font-semibold text-slate-500 mr-2">Template:</span>
              <span className="text-slate-800">{communication.template}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500 mr-2">Sent At:</span>
              <span className="text-slate-800">{new Date(communication.sent_at || communication.created_at).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Rendered HTML Email Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[250px]">
            <div
              className="prose prose-slate max-w-none text-sm"
              dangerouslySetInnerHTML={{ __html: communication.content_html }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Communication record logged to database</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-semibold transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
