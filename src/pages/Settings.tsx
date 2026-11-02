import React, { useState } from 'react';
import { Settings, Building2, Sliders, Mail, Link2, Check, AlertCircle, Info, RefreshCw } from 'lucide-react';
import { DatabaseState, store } from '../services/supabase';

interface SettingsProps {
  dbState: DatabaseState;
}

export const SettingsPage: React.FC<SettingsProps> = ({ dbState }) => {
  const [activeTab, setActiveTab] = useState<'company' | 'rules' | 'templates' | 'integrations'>('company');
  const [stessaMsg, setStessaMsg] = useState(false);
  const [n8nMsg, setN8nMsg] = useState(false);

  // Template editor state
  const [selectedTemplate, setSelectedTemplate] = useState('Rent Overdue Reminder');
  const [templateContent, setTemplateContent] = useState(`
Dear {{tenant_name}},

This is a reminder that your rent payment of {{rent_amount}} CAD for {{property_name}}, Unit {{unit_number}} due on {{due_date}} is currently overdue.

Please submit Interac e-Transfer to payments@northstarpm.ca immediately.

Northstar Operations Team
  `.trim());

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">System Preferences & Settings</h1>
        <p className="text-sm text-slate-500">Configure company profile, automation thresholds, notification templates & third-party integrations</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-px">
        {[
          { id: 'company', label: 'Company Profile', icon: Building2 },
          { id: 'rules', label: 'Automation Rules & Thresholds', icon: Sliders },
          { id: 'templates', label: 'Notification Templates', icon: Mail },
          { id: 'integrations', label: 'Integrations (Stessa / n8n / Resend)', icon: Link2 }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all shrink-0 ${
                isActive
                  ? 'border-brand-600 text-brand-600 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        {activeTab === 'company' && (
          <div className="space-y-4 max-w-xl">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">Northstar Property Management Inc.</h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Company Legal Name</label>
              <input type="text" readOnly value="Northstar Property Management Inc." className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Headquarters Office</label>
              <input type="text" readOnly value="100 King Street West, Suite 4800, Toronto, ON M5X 1A9" className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Default Currency</label>
              <input type="text" readOnly value="Canadian Dollars (CAD $)" className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-brand-700" />
            </div>
            <div className="pt-4">
              <button onClick={() => store.resetDemoData()} className="px-4 py-2 bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs rounded-lg hover:bg-rose-100 transition-colors">
                Reset Demo Dataset to Initial State
              </button>
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-6">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">Configurable Automation Thresholds</h3>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-xs text-slate-900">Rent Reminder Schedule</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white p-2.5 rounded border border-slate-200">Pre-Due Reminder: <strong>3 Days Before</strong></div>
                  <div className="bg-white p-2.5 rounded border border-slate-200">Due Date Notice: <strong>Day 0 (Due Date)</strong></div>
                  <div className="bg-white p-2.5 rounded border border-slate-200">Overdue Reminder: <strong>1 & 3 Days Overdue</strong></div>
                  <div className="bg-white p-2.5 rounded border border-slate-200">Manager Escalation: <strong>7 Days Overdue</strong></div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-bold text-xs text-slate-900">Lease Expiration Workflow</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white p-2.5 rounded border border-slate-200">Renewal Task: <strong>90 Days Out</strong></div>
                  <div className="bg-white p-2.5 rounded border border-slate-200">Offer Email: <strong>60 Days Out</strong></div>
                  <div className="bg-white p-2.5 rounded border border-slate-200">Manager Alert: <strong>30 Days Out</strong></div>
                  <div className="bg-white p-2.5 rounded border border-slate-200">Escalation: <strong>14 Days Out</strong></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">Editable Notification Templates</h3>
            <p className="text-xs text-slate-500">Available handle variables: <code>{"{{tenant_name}}"}</code>, <code>{"{{property_name}}"}</code>, <code>{"{{unit_number}}"}</code>, <code>{"{{rent_amount}}"}</code>, <code>{"{{due_date}}"}</code>, <code>{"{{lease_end_date}}"}</code></p>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Select Template</label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full max-w-md px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
              >
                <option value="Rent Overdue Reminder">Rent Overdue Reminder</option>
                <option value="Lease Renewal Offer">Lease Renewal Offer</option>
                <option value="Maintenance Vendor Dispatch">Maintenance Vendor Dispatch</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Template Content</label>
              <textarea
                rows={8}
                value={templateContent}
                onChange={(e) => setTemplateContent(e.target.value)}
                className="w-full p-4 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              />
            </div>
          </div>
        )}

        {activeTab === 'integrations' && (
          <div className="space-y-6">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">Third-Party & Production Integrations</h3>

            {/* Stessa Integration */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Stessa Real Estate Accounting</h4>
                  <p className="text-xs text-slate-500">Automated financial ledger sync, asset performance & tax reporting</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                  Status: Not Connected
                </span>
              </div>
              <button
                onClick={() => setStessaMsg(true)}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
              >
                Connect Stessa
              </button>
              {stessaMsg && (
                <p className="text-xs font-semibold text-brand-700 bg-brand-50 p-2.5 rounded border border-brand-200">
                  Integration configuration will be available in production.
                </p>
              )}
            </div>

            {/* n8n Integration */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">n8n Workflow Automation Orchestrator</h4>
                  <p className="text-xs text-slate-500">External multi-step webhook pipeline orchestration & third-party connectors</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                  Status: Not Connected
                </span>
              </div>
              <p className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed">
                n8n can be connected later for external workflow orchestration and third-party integrations (e.g. SMS gateways, banking API Webhooks, automated accounting sync).
              </p>
            </div>

            {/* Resend Provider */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Resend Production Email Provider</h4>
                  <p className="text-xs text-slate-500">Transactional email engine with custom domain DKIM/SPF verification</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  POC Mock Provider Active
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Current POC uses <code>MockEmailProvider</code> to generate rendered email previews without requiring a Resend API key or sending domain.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
