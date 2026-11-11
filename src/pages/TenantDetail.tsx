import React, { useState } from 'react';
import { ArrowLeft, Users, Mail, Phone, Calendar, FileText, CreditCard, Wrench, Bell, CheckCircle2, History, Edit3, X, Save } from 'lucide-react';
import { DatabaseState, store } from '../services/supabase';
import { useCurrency } from '../context/CurrencyContext';

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
  const { formatMoney } = useCurrency();
  const [isEditingTenant, setIsEditingTenant] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editStatus, setEditStatus] = useState<any>('Active');

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

  const payments = dbState.payments.filter(
    p => p.tenant_id === tenantId && (!lease || !p.lease_id || p.lease_id === lease.id)
  );
  const maintenance = dbState.maintenance_requests.filter(
    m =>
      m.tenant_id === tenantId &&
      (!unit || !m.unit_id || m.unit_id === unit.id) &&
      (!property || !m.property_id || m.property_id === property.id)
  );
  const communications = dbState.communications.filter(c => c.tenant_id === tenantId || c.recipient === tenant.email);
  const notices = dbState.notices.filter(n => n.tenant_id === tenantId);

  // Chronological timeline events
  const timelineEvents = [
    { title: 'Tenant Profile Created', date: tenant.created_at.split('T')[0], type: 'System', desc: 'Registered in PropertyFlow PM database' },
    { title: 'Screening Completed', date: '2025-08-10', type: 'Screening', desc: 'Background & credit verification approved (Score: 765)' },
    { title: 'Lease Agreement Signed', date: lease?.start_date || '2025-09-01', type: 'Lease', desc: `Signed 1-year tenancy for ${property?.name} Unit ${unit?.unit_number}` },
    { title: 'Security Deposit Paid', date: lease?.start_date || '2025-09-01', type: 'Financial', desc: `${formatMoney(lease?.deposit || 0)} held in escrow` },
    ...payments.map(p => ({
      title: `Rent Payment Recorded (${formatMoney(p.amount_paid)})`,
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

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditFirstName(tenant.first_name);
              setEditLastName(tenant.last_name);
              setEditEmail(tenant.email);
              setEditPhone(tenant.phone);
              setEditStatus(tenant.status);
              setIsEditingTenant(true);
            }}
            className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Edit3 className="w-3.5 h-3.5 text-emerald-400" /> Edit Resident Profile
          </button>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-0.5">
            <span className="text-slate-500 font-medium block">Current Residence</span>
            <span className="font-bold text-slate-900">{property ? `${property.name} (Unit ${unit?.unit_number})` : 'Unassigned'}</span>
            <span className="text-slate-400 block text-[11px]">{property?.address}, {property?.city}</span>
          </div>
        </div>
      </div>

      {/* Edit Resident Profile Modal */}
      {isEditingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border border-stone-200 shadow-2xl p-6 space-y-5">
            <div className="flex justify-between items-start pb-3 border-b border-stone-100">
              <div>
                <h3 className="font-black text-stone-900 text-lg">Edit Resident Record</h3>
                <p className="text-xs text-stone-500">Updates will sync across the tenant portal and directory</p>
              </div>
              <button
                onClick={() => setIsEditingTenant(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await store.updateTenant(tenant.id, {
                  first_name: editFirstName.trim(),
                  last_name: editLastName.trim(),
                  email: editEmail.trim().toLowerCase(),
                  phone: editPhone.trim(),
                  status: editStatus
                });
                setIsEditingTenant(false);
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700">First Name</label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-stone-700">Last Name</label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">Phone Number</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">Tenancy Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-brand-500 cursor-pointer"
                >
                  <option value="Active">Active</option>
                  <option value="Notice Given">Notice Given</option>
                  <option value="Former">Former</option>
                  <option value="Applicant">Applicant</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsEditingTenant(false)}
                  className="px-4 py-2 font-bold text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5 text-emerald-400" /> Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Decorative Divider */}
      <hr className="border-t border-slate-800/80" />

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
                <p><span className="text-slate-500 font-medium">Monthly Rent Amount:</span> <strong className="text-slate-900">{formatMoney(lease?.monthly_rent || 0)}</strong></p>
                <p><span className="text-slate-500 font-medium">Security Deposit:</span> <strong className="text-slate-900">{formatMoney(lease?.deposit || 0)}</strong></p>
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

        {activeTab === 'lease' && (
          <div className="space-y-4">
            {lease ? (
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">Lease ID: {lease.id}</span>
                    <h4 className="text-base font-extrabold text-slate-900 mt-0.5">
                      {property?.name} • Unit {unit?.unit_number}
                    </h4>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold self-start ${
                    lease.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {lease.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block">Monthly Rent</span>
                    <strong className="text-slate-900 text-sm">{formatMoney(lease.monthly_rent)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Security Deposit</span>
                    <strong className="text-slate-900 text-sm">{formatMoney(lease.deposit)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Term Duration</span>
                    <strong className="text-slate-900 text-sm">{lease.start_date} to {lease.end_date}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Renewal Status</span>
                    <strong className="text-slate-900 text-sm">{lease.renewal_status || 'Standard'}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center">No active lease agreement linked to this tenant record.</p>
            )}
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-3">
            {payments.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No payment transactions recorded for this tenant.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="pb-3">Reference</th>
                      <th className="pb-3">Due Date</th>
                      <th className="pb-3">Payment Date</th>
                      <th className="pb-3">Amount Due</th>
                      <th className="pb-3">Amount Paid</th>
                      <th className="pb-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 font-bold text-slate-900">{p.id}</td>
                        <td className="py-3 text-slate-600">{p.due_date}</td>
                        <td className="py-3 text-slate-600">{p.payment_date || '—'}</td>
                        <td className="py-3 text-slate-600">{formatMoney(p.amount_due)}</td>
                        <td className="py-3 font-bold text-emerald-700">{formatMoney(p.amount_paid)}</td>
                        <td className="py-3 text-right">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            p.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                            p.status === 'Overdue' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="space-y-3">
            {maintenance.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No maintenance requests logged for this tenant.</p>
            ) : (
              maintenance.map(m => (
                <div key={m.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold bg-stone-200 text-stone-800 px-2 py-0.5 rounded uppercase">
                        {m.category}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        m.priority === 'Emergency' ? 'bg-rose-100 text-rose-800' :
                        m.priority === 'High' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {m.priority} Priority
                      </span>
                      <strong className="text-xs text-slate-900">Ticket #{m.id.slice(0, 8)}</strong>
                    </div>
                    <p className="text-xs text-slate-700">{m.description}</p>
                    <span className="text-[11px] text-slate-400 block">Filed on {m.created_at.split('T')[0]}</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold self-start sm:self-center ${
                    m.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                    m.status === 'In Progress' ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {m.status}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'notices' && (
          <div className="space-y-3">
            {notices.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No statutory legal notices issued to this tenant.</p>
            ) : (
              notices.map(n => (
                <div key={n.id} className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                        Form {n.form_type}
                      </span>
                      <strong className="text-xs text-slate-900">{n.reason}</strong>
                    </div>
                    <p className="text-xs text-slate-600">
                      Amount: {formatMoney(n.amount_owing || 0)} • Termination/Due Date: {n.termination_date || 'N/A'}
                    </p>
                    <span className="text-[10px] text-slate-400">Issued Date: {n.issue_date}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    n.status === 'Served' ? 'bg-purple-100 text-purple-800' :
                    n.status === 'Approved' ? 'bg-blue-100 text-blue-800' : 'bg-stone-200 text-stone-700'
                  }`}>
                    {n.status}
                  </span>
                </div>
              ))
            )}
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
