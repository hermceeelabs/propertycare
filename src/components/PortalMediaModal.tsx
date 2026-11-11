import React from 'react';
import {
  X, Paperclip, FileText, ExternalLink, ShieldCheck, Building2,
  CheckCircle2, Calendar, User, Wrench, Camera, Film, Volume2
} from 'lucide-react';

export interface PortalMediaItem {
  type: 'photo' | 'video' | 'audio' | 'document';
  url: string;
  title: string;
  caption?: string;
  propertyName?: string;
  unitNumber?: string;
  vendorOrAuditor?: string;
  date?: string;
  amountFormatted?: string;
  status?: string;
  referenceId?: string;
}

interface PortalMediaModalProps {
  item: PortalMediaItem | null;
  onClose: () => void;
}

export const PortalMediaModal: React.FC<PortalMediaModalProps> = ({ item, onClose }) => {
  if (!item) return null;

  const isQuote = item.title.toLowerCase().includes('quote') || item.title.toLowerCase().includes('estimate');
  const isInvoice = item.title.toLowerCase().includes('invoice') || item.title.toLowerCase().includes('receipt');
  const isCompletion = item.title.toLowerCase().includes('completion') || item.title.toLowerCase().includes('signoff') || item.title.toLowerCase().includes('sign-off');
  const isChecklist = item.title.toLowerCase().includes('checklist') || item.title.toLowerCase().includes('audit');

  const docTypeLabel = isQuote
    ? 'Official Contractor Repair Estimate & Scope'
    : isInvoice
    ? 'Verified Contractor Tax Invoice & Receipt'
    : isCompletion
    ? 'Work Order Completion & Quality Sign-Off Certificate'
    : isChecklist
    ? 'Field Inspection & MEP Compliance Checklist'
    : 'Official Supporting Document';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-stone-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-brand-600/20 border border-brand-500/40 flex items-center justify-center text-brand-400 shrink-0">
              {item.type === 'photo' && <Camera className="w-4 h-4" />}
              {item.type === 'video' && <Film className="w-4 h-4" />}
              {item.type === 'audio' && <Volume2 className="w-4 h-4" />}
              {item.type === 'document' && <FileText className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-white text-sm truncate">{item.title}</h3>
              <span className="text-[11px] text-slate-400 block truncate">
                {item.propertyName ? `${item.propertyName}${item.unitNumber ? ` • Suite ${item.unitNumber}` : ''}` : docTypeLabel}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {item.type === 'photo' && (
            <div className="space-y-3">
              <div className="bg-stone-950 rounded-2xl p-3 flex items-center justify-center">
                <img
                  src={item.url}
                  alt={item.title}
                  className="max-h-[55vh] max-w-full rounded-xl object-contain shadow-md"
                />
              </div>
              <div className="flex items-center justify-between text-xs text-stone-500 px-1">
                <span className="flex items-center gap-1.5 font-medium text-stone-700">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Verified High-Resolution Site Evidence
                </span>
                {item.date && <span>Recorded: {item.date}</span>}
              </div>
            </div>
          )}

          {item.type === 'video' && (
            <div className="space-y-3">
              <div className="bg-stone-950 rounded-2xl p-3 flex items-center justify-center">
                <video controls className="max-h-[55vh] w-full rounded-xl">
                  <source src={item.url} type="video/mp4" />
                  Your browser does not support video playback.
                </video>
              </div>
            </div>
          )}

          {item.type === 'audio' && (
            <div className="p-6 bg-stone-50 rounded-2xl border border-stone-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-stone-900">Field Inspector Audio Memo</h4>
                  <p className="text-xs text-stone-500">{item.vendorOrAuditor || 'Operations Lead'}</p>
                </div>
              </div>
              <audio controls className="w-full">
                <source src={item.url} type="audio/webm" />
                <source src={item.url} type="audio/mpeg" />
                Your browser does not support audio playback.
              </audio>
            </div>
          )}

          {item.type === 'document' && (
            <div className="bg-stone-50 rounded-2xl border border-stone-200 p-5 space-y-4">
              {/* Official Document Preview Header */}
              <div className="flex items-start justify-between pb-4 border-b border-stone-200 gap-4">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> Verified Archive Document
                  </span>
                  <h4 className="font-black text-stone-900 text-base pt-1">{docTypeLabel}</h4>
                  <p className="text-xs text-stone-500 font-mono">File: {item.title}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Reference ID</span>
                  <span className="font-mono font-bold text-xs text-stone-800">{item.referenceId || 'DOC-2026-VERIFIED'}</span>
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-white p-4 rounded-xl border border-stone-200/80">
                {item.propertyName && (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-stone-400 block">Property / Asset</span>
                    <span className="font-bold text-stone-900 flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                      <span className="truncate">{item.propertyName}</span>
                    </span>
                  </div>
                )}
                {item.unitNumber && (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-stone-400 block">Suite / Unit</span>
                    <span className="font-bold text-stone-900 block mt-0.5">Unit {item.unitNumber}</span>
                  </div>
                )}
                {item.vendorOrAuditor && (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-stone-400 block">Contractor / Lead</span>
                    <span className="font-bold text-stone-900 flex items-center gap-1 mt-0.5">
                      <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="truncate">{item.vendorOrAuditor}</span>
                    </span>
                  </div>
                )}
                {item.date && (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-stone-400 block">Document Date</span>
                    <span className="font-semibold text-stone-800 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      {item.date}
                    </span>
                  </div>
                )}
                {item.amountFormatted && (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-stone-400 block">Certified Amount</span>
                    <span className="font-black text-stone-900 font-mono block mt-0.5">{item.amountFormatted}</span>
                  </div>
                )}
                {item.status && (
                  <div>
                    <span className="text-[10px] font-bold uppercase text-stone-400 block">Work Status</span>
                    <span className="font-bold text-emerald-700 block mt-0.5">{item.status}</span>
                  </div>
                )}
              </div>

              {/* Document Summary Text */}
              <div className="p-3.5 bg-white rounded-xl border border-stone-200/80 space-y-1.5 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                  Scope & Compliance Notes
                </span>
                <p className="text-stone-700 leading-relaxed">
                  {item.caption || 'This document has been logged, audited, and counter-signed by PropertyFlow Asset Management in accordance with the property management mandate.'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-stone-500 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-brand-600" />
                  Digital copy archived in stakeholder vault
                </span>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                >
                  Open / Download PDF <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {item.caption && item.type !== 'document' && (
            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-700">
              <span className="font-bold text-stone-900 block mb-0.5">Summary / Field Notes:</span>
              {item.caption}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
