import React, { useState } from 'react';
import { DatabaseState } from '../../services/supabase';
import { Home, CreditCard, Wrench, FileText, CheckCircle2, Clock, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';

interface TenantPortalProps {
  dbState: DatabaseState;
  tenantId?: string;
  onClosePreview?: () => void;
}

export const TenantPortal: React.FC<TenantPortalProps> = ({
  dbState,
  tenantId = dbState.tenants[0]?.id,
  onClosePreview
}) => {
  const { formatMoney } = useCurrency();
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'maintenance' | 'documents'>('overview');
  const [newRequestDesc, setNewRequestDesc] = useState('');
  const [newRequestCategory, setNewRequestCategory] = useState('Plumbing');
  const [ticketSubmitted, setTicketSubmitted] = useState(false);

  const tenant = dbState.tenants.find(t => t.id === tenantId) || dbState.tenants[0];
  const lease = dbState.leases.find(l => l.tenant_id === tenant?.id);
  const unit = dbState.units.find(u => u.id === lease?.unit_id);
  const property = dbState.properties.find(p => p.id === unit?.property_id);

  const tenantPayments = dbState.payments.filter(p => p.tenant_id === tenant?.id);
  const tenantRequests = dbState.maintenance_requests.filter(m => m.tenant_id === tenant?.id);

  const pendingAmount = tenantPayments.filter(p => p.status !== 'Paid').reduce((acc, p) => acc + (p.amount_due || 0), 0);

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequestDesc.trim()) return;
    setTicketSubmitted(true);
    setTimeout(() => {
      setTicketSubmitted(false);
      setNewRequestDesc('');
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 font-sans">
      {/* Top Banner (Shows if opened in Preview Mode) */}
      {onClosePreview && (
        <div className="bg-stone-900 text-white px-4 py-2.5 flex items-center justify-between text-xs sticky top-0 z-50">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <strong>Manager Portal Preview:</strong> Viewing active self-service portal as <em>{tenant.first_name} {tenant.last_name}</em>
          </span>
          <button
            onClick={onClosePreview}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg font-bold text-[11px] transition-all"
          >
            Exit Portal Preview ✕
          </button>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-6 py-4 sticky top-0 z-40 shadow-xs">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-600 text-white font-extrabold flex items-center justify-center shadow-md">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-base text-stone-900 tracking-tight">Resident Portal</h1>
              <p className="text-xs text-stone-500">{property?.name} • Suite {unit?.unit_number}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-stone-600">
            <div className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs font-bold">
              {tenant.first_name[0]}{tenant.last_name[0]}
            </div>
            <span className="hidden sm:inline">{tenant.first_name} {tenant.last_name}</span>
          </div>
        </div>
      </header>

      {/* Navigation Sub-bar */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-6 flex gap-4 overflow-x-auto text-xs font-bold">
          {[
            { id: 'overview', label: 'Home Overview' },
            { id: 'payments', label: 'Rent & Payments' },
            { id: 'maintenance', label: 'Maintenance & Repairs' },
            { id: 'documents', label: 'Lease & Documents' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3.5 border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto p-6 space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Rent Status Card */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400">Current Balance Due</span>
                <div className="text-3xl font-black text-stone-900">
                  {formatMoney(pendingAmount)}
                </div>
                <p className="text-xs text-stone-500">
                  Monthly rent: {formatMoney(lease?.monthly_rent || 0)} • Due on the 1st
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('payments')}
                  className="px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl text-xs font-bold shadow-md transition-all flex items-center gap-2"
                >
                  <CreditCard className="w-4 h-4" /> Pay Online (Card / E-Transfer)
                </button>
              </div>
            </div>

            {/* Quick Actions & Maintenance status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-brand-600" /> Active Maintenance Requests
                </h3>
                {tenantRequests.length === 0 ? (
                  <p className="text-xs text-stone-500 py-6 text-center">No active repair tickets. Everything in good order!</p>
                ) : (
                  <div className="space-y-2.5">
                    {tenantRequests.map(req => (
                      <div key={req.id} className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-1">
                        <div className="flex justify-between items-center font-bold">
                          <span>{req.category}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                            req.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                        <p className="text-stone-600 truncate">{req.description}</p>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setActiveTab('maintenance')}
                  className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-all"
                >
                  + Report New Maintenance Issue
                </button>
              </div>

              {/* Lease Snapshot */}
              <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Tenancy Agreement
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-stone-100">
                    <span className="text-stone-500">Property:</span>
                    <strong className="text-stone-900">{property?.name}</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-stone-100">
                    <span className="text-stone-500">Suite / Unit:</span>
                    <strong className="text-stone-900">Unit {unit?.unit_number}</strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-stone-100">
                    <span className="text-stone-500">Term:</span>
                    <strong className="text-stone-900">{lease?.start_date} to {lease?.end_date}</strong>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-stone-500">Security Deposit Held:</span>
                    <strong className="text-stone-900">{formatMoney(lease?.deposit || 0)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-stone-900">Payment History & Receipts</h2>
            <div className="divide-y divide-stone-100">
              {tenantPayments.map(p => (
                <div key={p.id} className="py-3.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-stone-900 block">Rent Due: {p.due_date}</span>
                    <span className="text-stone-400 text-[11px]">{p.payment_date ? `Paid on ${p.payment_date}` : 'Awaiting payment'}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-stone-900 block">{formatMoney(p.amount_due)}</span>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      p.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-6">
            <h2 className="text-base font-bold text-stone-900">Submit a Maintenance Request</h2>
            {ticketSubmitted && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Your repair ticket has been submitted and auto-dispatched to building management.
              </div>
            )}
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Trade Category</label>
                <select
                  value={newRequestCategory}
                  onChange={(e) => setNewRequestCategory(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold"
                >
                  <option value="Plumbing">Plumbing / Water Leak</option>
                  <option value="Electrical">Electrical / Lighting</option>
                  <option value="HVAC">Heating & Air Conditioning</option>
                  <option value="Appliance">Kitchen Appliance</option>
                  <option value="Structural">Doors / Windows / Structural</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Issue Description</label>
                <textarea
                  rows={3}
                  value={newRequestDesc}
                  onChange={(e) => setNewRequestDesc(e.target.value)}
                  placeholder="Please describe the issue in detail..."
                  className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl text-xs"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
              >
                Submit Request
              </button>
            </form>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-stone-900">Resident Document Vault</h2>
            <div className="space-y-2">
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-brand-600" />
                  <div>
                    <strong className="block text-stone-900">Standard Residential Tenancy Agreement</strong>
                    <span className="text-stone-400">PDF • Signed & Verified</span>
                  </div>
                </div>
                <button className="px-3 py-1.5 bg-white border border-stone-300 hover:bg-stone-100 rounded-lg text-xs font-bold">
                  View PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
