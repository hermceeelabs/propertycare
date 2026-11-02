import React, { useState } from 'react';
import { Mail, Send, Eye, Filter, Plus, CheckCircle2, AlertTriangle, Users } from 'lucide-react';
import { DatabaseState, store } from '../services/supabase';
import { emailProvider } from '../services/emailService';
import { Communication } from '../types/database';

interface CommunicationsProps {
  dbState: DatabaseState;
  onPreviewEmail: (comm: Communication) => void;
}

export const CommunicationsPage: React.FC<CommunicationsProps> = ({
  dbState,
  onPreviewEmail
}) => {
  const [activeTab, setActiveTab] = useState<string>('All');
  const [showCampaignModal, setShowCampaignModal] = useState(false);

  // Campaign Form State
  const [campaignName, setCampaignName] = useState('');
  const [audienceSegment, setAudienceSegment] = useState('All Tenants');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const filteredCommunications = dbState.communications.filter(c => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Emails') return c.communication_type === 'Email';
    if (activeTab === 'Campaigns') return c.communication_type === 'Campaign';
    return true;
  });

  const handleLaunchCampaign = async () => {
    if (!subject.trim() || !body.trim()) return;

    let targetTenants = dbState.tenants;
    if (audienceSegment === 'Overdue Tenants') {
      const overdueTenantIds = new Set(dbState.payments.filter(p => p.status === 'Overdue').map(p => p.tenant_id));
      targetTenants = dbState.tenants.filter(t => overdueTenantIds.has(t.id));
    } else if (audienceSegment === 'Expiring Lease Tenants') {
      const expiringTenantIds = new Set(dbState.leases.filter(l => l.status === 'Expiring Soon').map(l => l.tenant_id));
      targetTenants = dbState.tenants.filter(t => expiringTenantIds.has(t.id));
    }

    let sentCount = 0;
    for (const tenant of targetTenants) {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #1e3a8a;">Northstar Property Announcement</h2>
          <p>Dear ${tenant.first_name} ${tenant.last_name},</p>
          <div style="padding: 15px; background-color: #f8fafc; border-left: 4px solid #2563eb; margin: 15px 0;">
            ${body.replace(/\n/g, '<br/>')}
          </div>
          <p style="font-size: 12px; color: #64748b;">Northstar Property Management Inc. Operations</p>
        </div>
      `;

      const comm = await emailProvider.sendEmail({
        to: tenant.email,
        subject,
        html,
        text: body,
        template: `Bulk Campaign: ${campaignName || 'General Announcement'}`,
        tenant_id: tenant.id
      });

      comm.communication_type = 'Campaign';
      store.addCommunication(comm);
      sentCount++;
    }

    // Add Audit Log
    store.addAutomationLog({
      id: 'log-' + Date.now(),
      automation_type: 'bulk_campaign',
      entity_type: 'Campaign',
      action: `Executed bulk email campaign "${campaignName || subject}" to ${sentCount} recipients (${audienceSegment})`,
      status: 'Success',
      metadata: { recipients_count: sentCount, segment: audienceSegment },
      created_at: new Date().toISOString()
    });

    setShowCampaignModal(false);
    setShowConfirm(false);
    setCampaignName('');
    setSubject('');
    setBody('');
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tenant Communications & Campaigns</h1>
          <p className="text-sm text-slate-500">Mock email delivery ledger, template previews & bulk tenant notifications</p>
        </div>

        <button
          onClick={() => setShowCampaignModal(true)}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5" /> Launch Bulk Campaign
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        {['All', 'Emails', 'Campaigns'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {tab} ({tab === 'All' ? dbState.communications.length : dbState.communications.filter(c => tab === 'Emails' ? c.communication_type === 'Email' : c.communication_type === 'Campaign').length})
          </button>
        ))}
      </div>

      {/* Communications Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                <th className="p-4">Recipient</th>
                <th className="p-4">Subject</th>
                <th className="p-4">Template</th>
                <th className="p-4">Type</th>
                <th className="p-4">Sent At</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCommunications.map(comm => (
                <tr key={comm.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4 font-bold text-slate-900">{comm.recipient}</td>
                  <td className="p-4 font-semibold text-slate-800">{comm.subject}</td>
                  <td className="p-4 text-slate-600">{comm.template}</td>
                  <td className="p-4 text-slate-600">{comm.communication_type}</td>
                  <td className="p-4 text-slate-500">{new Date(comm.sent_at || comm.created_at).toLocaleString()}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {comm.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => onPreviewEmail(comm)}
                      className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded text-xs font-semibold text-slate-700 transition-colors inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> Preview Email
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Campaign Modal */}
      {showCampaignModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900">Launch Bulk Email Campaign</h3>

            {!showConfirm ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Campaign Name</label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="e.g. Summer Building Maintenance Notice"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Audience Segment</label>
                  <select
                    value={audienceSegment}
                    onChange={(e) => setAudienceSegment(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                  >
                    <option value="All Tenants">All Active Tenants ({dbState.tenants.length})</option>
                    <option value="Overdue Tenants">Overdue Rent Accounts Only</option>
                    <option value="Expiring Lease Tenants">Expiring Lease Tenants</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email Subject Line</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Important Notice: Annual Fire Alarm Inspection"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Message Body</label>
                  <textarea
                    rows={4}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write announcement body..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button onClick={() => setShowCampaignModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">Cancel</button>
                  <button
                    onClick={() => setShowConfirm(true)}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-sm"
                  >
                    Proceed to Confirmation
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                  <h4 className="font-bold flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-amber-600" /> Confirm Bulk Email Generation</h4>
                  <p>You are about to dispatch this campaign to target segment <strong>{audienceSegment}</strong> via <code>MockEmailProvider</code>.</p>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => setShowConfirm(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">Back</button>
                  <button
                    onClick={handleLaunchCampaign}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm"
                  >
                    Execute Campaign
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
