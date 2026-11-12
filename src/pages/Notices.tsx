import React, { useState } from 'react';
import { Bell, FileText, AlertTriangle, ShieldCheck, CheckCircle2, Calculator, Plus, UserCheck } from 'lucide-react';
import { DatabaseState, store } from '../services/supabase';
import { N1NoticeWizardModal } from '../components/N1NoticeWizardModal';
import { Notice } from '../types/database';

interface NoticesProps {
  dbState: DatabaseState;
}

export const NoticesPage: React.FC<NoticesProps> = ({ dbState }) => {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showN1Wizard, setShowN1Wizard] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);

  const filteredNotices = dbState.notices.filter(n => {
    if (statusFilter === 'All') return true;
    return n.status === statusFilter;
  });

  const handleApproveNotice = (noticeId: string) => {
    store.updateNotice(noticeId, {
      status: 'Approved',
      approved_at: new Date().toISOString()
    });

    // Resolve corresponding task
    const relatedTask = dbState.tasks.find(t => t.related_entity_id === noticeId);
    if (relatedTask) {
      store.updateTask(relatedTask.id, { status: 'Completed' });
    }

    // Add Audit Log
    store.addAutomationLog({
      id: 'log-' + Date.now(),
      automation_type: 'notice_approval',
      entity_type: 'Notice',
      entity_id: noticeId,
      action: `Property Manager authorized & approved legal notice #${noticeId.slice(0, 8)}`,
      status: 'Success',
      created_at: new Date().toISOString()
    });

    store.saveState();
  };

  return (
    <div className="space-y-6">
      {/* Mandatory Legal Compliance Banner */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl shadow-xs space-y-1">
        <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>LEGAL WORKFLOW REQUIREMENT & DISCLAIMER</span>
        </div>
        <p className="text-xs text-amber-800 leading-relaxed">
          N1 and N4 functionality is for administrative workflow demonstration only. This application does NOT provide legal advice or automatically serve legal notices. Legal compliance, timing, and permitted amounts must be reviewed and authorized by the property manager or appropriate legal professional.
        </p>
      </div>

      {/* Filter Tabs & Wizard Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {['All', 'Draft', 'Awaiting Review', 'Approved', 'Sent'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === s
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {s} ({s === 'All' ? dbState.notices.length : dbState.notices.filter(n => n.status === s).length})
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowN1Wizard(true)}
          className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Calculator className="w-3.5 h-3.5" /> Form N1 Rent Increase Wizard
        </button>
      </div>

      {/* Notices List */}
      <div className="space-y-4">
        {filteredNotices.map(notice => {
          const tenant = dbState.tenants.find(t => t.id === notice.tenant_id);
          const lease = dbState.leases.find(l => l.id === notice.lease_id);
          const unit = lease ? dbState.units.find(u => u.id === lease.unit_id) : undefined;
          const property = unit ? dbState.properties.find(p => p.id === unit.property_id) : undefined;

          return (
            <div key={notice.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold bg-brand-50 text-brand-700 px-2.5 py-0.5 rounded border border-brand-200 uppercase">
                    {notice.notice_type}
                  </span>
                  <span className="text-xs font-bold text-slate-900">
                    {tenant?.first_name} {tenant?.last_name} — {property?.name} (Unit {unit?.unit_number})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    notice.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                    notice.status === 'Draft' || notice.status === 'Awaiting Review' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {notice.status} • Manager Approval Required
                  </span>

                  {(notice.status === 'Draft' || notice.status === 'Awaiting Review') && (
                    <button
                      onClick={() => handleApproveNotice(notice.id)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                    >
                      <UserCheck className="w-3.5 h-3.5" /> Approve Notice
                    </button>
                  )}
                </div>
              </div>

              {/* Notice Content Document Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                {notice.content}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Effective Date: <strong>{notice.effective_date}</strong></span>
                <span>Draft Created: {new Date(notice.created_at).toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>

      {showN1Wizard && (
        <N1NoticeWizardModal
          dbState={dbState}
          onClose={() => setShowN1Wizard(false)}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
};
