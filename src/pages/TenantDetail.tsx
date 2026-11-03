import React, { useState } from 'react';
import { ArrowLeft, Users, Mail, Phone, Calendar, FileText, CreditCard, Wrench, Bell, CheckCircle2, History } from 'lucide-react';
import { DatabaseState } from '../services/supabase';

interface TenantDetailProps {
  tenantId: string;
  dbState: DatabaseState;
  onBack: () => void;
  onPreviewEmail?: (commId: string) => void;
}

export const TenantDetailPage: React.FC<TenantDetailProps> = ({
  tenantId,
  dbState,
  onBack,
  onPreviewEmail
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'lease' | 'payments' | 'maintenance' | 'communications' | 'notices' | 'timeline'>('overview');

  const tenant = dbState.tenants.find(t => t.id === tenantId);
  if (!tenant) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Tenant record not found.</p>
        <button onClick={onBack} className="mt-4 text-brand-600 font-bold hover:underline">Return to Tenants</button>
      </div>
    );
  }

  const lease = dbState.leases.find(l => l.tenant_id === tenantId);
  const unit = lease ? dbState.units.find(u => u.id === lease.unit_id) : undefined;
  const property = unit ? dbState.properties.find(p => p.id === unit.property_id) : undefined;

  const payments = dbState.payments.filter(p => p.tenant_id === tenantId);
  const maintenance = dbState.maintenance_requests.filter(m => m.tenant_id === tenantId);
  const communications = dbState.communications.filter(c => c.tenant_id === tenantId || c.recipient === tenant.email);
  const notices = dbState.notices.filter(n => n.tenant_id === tenantId);

  // Chronological timeline events
  const timelineEvents = [
    { title: 'Tenant Profile Created', date: tenant.created_at.split('T')[0], type: 'System', desc: 'Registered in PropertyFlow PM database' },
    { title: 'Screening Completed', date: '2025-08-10', type: 'Screening', desc: 'Background & credit verification approved (Score: 765)' },
    { title: 'Lease Agreement Signed', date: lease?.start_date || '2025-09-01', type: 'Lease', desc: `Signed 1-year tenancy for ${property?.name} Unit ${unit?.unit_number}` },
    { title: 'Security Deposit Paid', date: lease?.start_date || '2025-09-01', type: 'Financial', desc: `$${lease?.deposit.toFixed(2)} CAD held in escrow` },
    ...payments.map(p => ({
      title: `Rent Payment Recorded ($${p.amount_paid.toFixed(2)} CAD)`,
      date: p.payment_date || p.due_date,
      type: 'Financial',
      desc: `Status: ${p.status} for period ${p.due_date}`
    })),
    ...maintenance.map(m => ({
      title: `Maintenance Request #${m.id.slice(0, 8)} (${m.category})`,
      date: m.created_at.split('T')[0],
      type: 'Maintenance',
      desc: m.description
    })),
    ...communications.map(c => ({
      title: `Communication Sent: ${c.subject}`,
      date: c.sent_at ? c.sent_at.split('T')[0] : c.created_at.split('T')[0],
      type: 'Notification',
      desc: `Template: ${c.template} (${c.status})`
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Back Header */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Tenants Directory
      </button>

      {/* Tenant Profile Banner Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white font-extrabold text-xl flex items-center justify-center shadow-md">
            {tenant.first_name[0]}{tenant.last_name[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900">{tenant.first_name} {tenant.last_name}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                {tenant.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-3">
              <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-slate-400" /> {tenant.email}</span>
              <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" /> {tenant.phone}</span>
            </p>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1">
          <span className="text-slate-500 font-medium block">Current Residence</span>
          <span className="font-bold text-slate-900">{property ? `${property.name} (Unit ${unit?.unit_number})` : 'Unassigned'}</span>
          <span className="text-slate-400 block">{property?.address}, {property?.city}</span>
        </div>
      </div>

      {/* Profile Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-px">
        {[
          { id: 'overview', label: 'Overview', icon: Users },
          { id: 'lease', label: 'Lease Agreement', icon: FileText },
          { id: 'payments', label: `Payments (${payments.length})`, icon: CreditCard },
          { id: 'maintenance', label: `Maintenance (${maintenance.length})`, icon: Wrench },
          { id: 'communications', label: `Emails (${communications.length})`, icon: Mail },
          { id: 'notices', label: `Notices (${notices.length})`, icon: Bell },
          { id: 'timeline', label: 'Activity Timeline', icon: History }
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

      {/* Tab Content Box */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-2">Tenancy Details</h3>
              <div className="space-y-2 text-xs">
                <p><span className="text-slate-500 font-medium">Lease Start Date:</span> <strong className="text-slate-900">{lease?.start_date || 'N/A'}</strong></p>
                <p><span className="text-slate-500 font-medium">Lease Expiration Date:</span> <strong className="text-slate-900">{lease?.end_date || 'N/A'}</strong></p>
                <p><span className="text-slate-500 font-medium">Monthly Rent Amount:</span> <strong className="text-slate-900">${lease?.monthly_rent.toLocaleString()} CAD</strong></p>
                <p><span className="text-slate-500 font-medium">Security Deposit:</span> <strong className="text-slate-900">${lease?.deposit.toLocaleString()} CAD</strong></p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-2">Account Status Summary</h3>
              <div className="space-y-2 text-xs">
                <p><span className="text-slate-500 font-medium">Tenancy Status:</span> <strong className="text-emerald-600">{tenant.status}</strong></p>
                <p><span className="text-slate-500 font-medium">Total Payments Recorded:</span> <strong className="text-slate-900">{payments.length} transactions</strong></p>
                <p><span className="text-slate-500 font-medium">Maintenance Requests Filed:</span> <strong className="text-slate-900">{maintenance.length} requests</strong></p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'communications' && (
          <div className="space-y-3">
            {communications.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No email communications sent yet.</p>
            ) : (
              communications.map(comm => (
                <div key={comm.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold bg-brand-50 text-brand-700 px-2 py-0.5 rounded border border-brand-200 uppercase">
                        {comm.template}
                      </span>
                      <span className="text-xs font-bold text-slate-900">{comm.subject}</span>
                    </div>
                    <p className="text-xs text-slate-500">Sent to: {comm.recipient} • Date: {new Date(comm.sent_at || comm.created_at).toLocaleString()}</p>
                  </div>
                  {onPreviewEmail && (
                    <button
                      onClick={() => onPreviewEmail(comm.id)}
                      className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 transition-colors"
                    >
                      Preview Email
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {timelineEvents.map((evt, idx) => (
              <div key={idx} className="relative group">
                <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-brand-600 ring-4 ring-white" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{evt.title}</span>
                    <span className="text-[10px] font-semibold text-slate-400">({evt.date})</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{evt.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
