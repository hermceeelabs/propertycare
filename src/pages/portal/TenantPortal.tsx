import React, { useState } from 'react';
import { DatabaseState, store, supabase } from '../../services/supabase';
import {
  Home, CreditCard, Wrench, FileText, CheckCircle2, Clock, AlertTriangle,
  ArrowRight, ShieldCheck, Upload, Image, X, Eye, Paperclip, LogOut
} from 'lucide-react';
import { useCurrency, CurrencyCode } from '../../context/CurrencyContext';
import { MaintenanceAttachment, MaintenanceRequest, MaintenancePriority } from '../../types/database';
import { DualCurrencyDisplay } from '../../components/DualCurrencyDisplay';

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
  
  // Maintenance Form State
  const [newRequestDesc, setNewRequestDesc] = useState('');
  const [newRequestCategory, setNewRequestCategory] = useState('Plumbing');
  const [priority, setPriority] = useState<MaintenancePriority>('Normal');
  const [attachments, setAttachments] = useState<MaintenanceAttachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const [previewAttachmentUrl, setPreviewAttachmentUrl] = useState<string | null>(null);

  const tenant = dbState.tenants.find(t => t.id === tenantId) || dbState.tenants[0];
  const lease = dbState.leases.find(l => l.tenant_id === tenant?.id);
  const unit = dbState.units.find(u => u.id === lease?.unit_id);
  const property = dbState.properties.find(p => p.id === unit?.property_id);

  const tenantPayments = dbState.payments.filter(p => p.tenant_id === tenant?.id);
  const tenantRequests = dbState.maintenance_requests.filter(m => m.tenant_id === tenant?.id);

  const pendingAmount = tenantPayments.filter(p => p.status !== 'Paid').reduce((acc, p) => acc + (p.amount_due || 0), 0);
  const nativeCurr: CurrencyCode =
    property?.acquisition?.acquisition_currency ||
    (property?.city === 'Lagos' || property?.city === 'Abuja' ? 'NGN' : 'CAD');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = event.target?.result as string;
        const newAttachment: MaintenanceAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          url: base64Url,
          type: file.type || 'image/jpeg',
          size: file.size,
          uploaded_at: new Date().toISOString()
        };
        setAttachments(prev => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequestDesc.trim()) return;

    setIsSubmitting(true);
    const reqId = `maint-${Date.now()}`;

    const newRequest: MaintenanceRequest = {
      id: reqId,
      tenant_id: tenant.id,
      unit_id: lease?.unit_id || 'unit-unknown',
      category: newRequestCategory as any,
      description: newRequestDesc.trim(),
      priority: priority,
      status: 'New',
      attachments: attachments,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      // 1. Save to Supabase maintenance_requests table
      const { error } = await supabase.from('maintenance_requests').insert({
        id: newRequest.id,
        tenant_id: newRequest.tenant_id,
        unit_id: newRequest.unit_id,
        category: newRequest.category,
        description: newRequest.description,
        priority: newRequest.priority,
        status: newRequest.status,
        attachments: newRequest.attachments,
        created_at: newRequest.created_at,
        updated_at: newRequest.updated_at
      });

      if (error) throw error;

      // 2. Add to in-memory state and sync
      store.getState().maintenance_requests.unshift(newRequest);
      store.saveState();

      setTicketSubmitted(true);
      setNewRequestDesc('');
      setAttachments([]);
      setTimeout(() => setTicketSubmitted(false), 4000);
    } catch (err) {
      console.error('Failed to submit maintenance ticket:', err);
    } finally {
      setIsSubmitting(false);
    }
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
            className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg font-bold text-[11px] transition-all cursor-pointer"
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

        {/* Decorative Divider */}
        <hr className="border-t border-slate-800/80 mt-4 max-w-5xl mx-auto" />
      </header>

      {/* Navigation Sub-bar */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-6 flex gap-4 overflow-x-auto text-xs font-bold">
          {[
            { id: 'overview', label: 'Home Overview' },
            { id: 'payments', label: `Rent & Payments (${tenantPayments.length})` },
            { id: 'maintenance', label: `Maintenance & Repairs (${tenantRequests.length})` },
            { id: 'documents', label: 'Lease & Documents' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3.5 border-b-2 transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'border-brand-600 text-brand-600 font-extrabold'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto p-6 space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Rent Alert Box */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Account Balance</span>
                <div className="text-3xl font-black text-stone-900">
                  <DualCurrencyDisplay
                    amount={pendingAmount}
                    nativeCurrency={nativeCurr}
                    primaryClassName="text-3xl font-black text-stone-900"
                    secondaryClassName="text-xs text-stone-500 font-medium ml-2"
                  />
                </div>
                <p className="text-xs text-stone-500">
                  {pendingAmount > 0
                    ? 'Payment is due for upcoming billing cycle.'
                    : 'Your rent ledger is in good standing with zero arrears.'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('payments')}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-xs shadow-md shadow-brand-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" /> View Payment History
                </button>
                <button
                  onClick={() => setActiveTab('maintenance')}
                  className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Wrench className="w-4 h-4 text-stone-600" /> Request Repair
                </button>
              </div>
            </div>

            {/* Quick Grid: Active Requests & Lease */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Active Maintenance Tickets */}
              <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-brand-600" /> Recent Maintenance Tickets
                  </h3>
                  <button
                    onClick={() => setActiveTab('maintenance')}
                    className="text-xs font-bold text-brand-600 hover:underline"
                  >
                    View All
                  </button>
                </div>

                {tenantRequests.length === 0 ? (
                  <p className="text-xs text-stone-400 py-4 text-center">No open maintenance requests.</p>
                ) : (
                  <div className="space-y-3">
                    {tenantRequests.slice(0, 3).map(req => (
                      <div key={req.id} className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-stone-900">{req.category}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            req.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                            req.status === 'Assigned' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                        <p className="text-stone-600 line-clamp-1">{req.description}</p>
                      </div>
                    ))}
                  </div>
                )}
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

        {/* PAYMENTS TAB */}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-stone-900">Payment History & Receipts</h2>
            <div className="divide-y divide-stone-100">
              {tenantPayments.map(p => (
                <div key={p.id} className="py-3.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-stone-900 block">Rent Period: {p.due_date}</span>
                    <span className="text-stone-400 text-[11px]">{p.payment_date ? `Paid on ${p.payment_date}` : 'Awaiting payment'}</span>
                  </div>
                  <div className="text-right">
                    <DualCurrencyDisplay
                      amount={p.amount_due}
                      nativeCurrency={nativeCurr}
                      primaryClassName="font-extrabold text-stone-900 block"
                      secondaryClassName="text-[10px] text-stone-400 block"
                    />
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mt-1 ${
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

        {/* MAINTENANCE TAB (WITH PHOTO & DOC ATTACHMENTS) */}
        {activeTab === 'maintenance' && (
          <div className="space-y-6">
            {/* Submit New Request Card */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-6">
              <div>
                <h2 className="text-base font-extrabold text-stone-900">Submit a Maintenance Request</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Report an issue in your suite, attach photos of the defect, and our operations team will dispatch a contractor.
                </p>
              </div>

              {ticketSubmitted && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  Your repair ticket and attached photos have been safely logged and dispatched to building management!
                </div>
              )}

              <form onSubmit={handleSubmitRequest} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Trade Category *
                    </label>
                    <select
                      value={newRequestCategory}
                      onChange={(e) => setNewRequestCategory(e.target.value)}
                      className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-brand-500 cursor-pointer"
                    >
                      <option value="Plumbing">Plumbing / Water Leak</option>
                      <option value="Electrical">Electrical / Lighting</option>
                      <option value="HVAC">Heating & Air Conditioning</option>
                      <option value="Appliance">Kitchen Appliance (Stove, Fridge, Dishwasher)</option>
                      <option value="Structural">Doors / Windows / Locks</option>
                      <option value="General">General Suite Maintenance</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                      Urgency / Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-brand-500 cursor-pointer"
                    >
                      <option value="Low">Low - Cosmetic or non-urgent</option>
                      <option value="Normal">Normal - Standard maintenance</option>
                      <option value="High">High - Significant disruption</option>
                      <option value="Emergency">Emergency - Active leak or heating failure</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Issue Description *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={newRequestDesc}
                    onChange={(e) => setNewRequestDesc(e.target.value)}
                    placeholder="Describe exactly what is malfunctioning, where it is located, and any access instructions..."
                    className="w-full p-3 bg-stone-50 border border-stone-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                {/* File / Photo Upload Dropzone */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Attach Supporting Photos or Documents
                  </label>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <label className="px-4 py-2.5 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-2xs w-fit">
                      <Upload className="w-4 h-4" /> Upload Photos / Evidence
                      <input
                        type="file"
                        multiple
                        accept="image/*,application/pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[11px] text-stone-400">
                      Upload clear photos of the issue to speed up approval and contractor dispatch.
                    </span>
                  </div>

                  {/* Uploaded Attachments Thumbnails */}
                  {attachments.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                      {attachments.map(att => (
                        <div
                          key={att.id}
                          className="relative p-2 bg-stone-50 rounded-2xl border border-stone-200 flex items-center gap-2 group"
                        >
                          {att.type.startsWith('image/') ? (
                            <img src={att.url} alt={att.name} className="w-10 h-10 rounded-lg object-cover" />
                          ) : (
                            <FileText className="w-8 h-8 text-brand-600" />
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-bold text-stone-800 truncate block">{att.name}</span>
                            <span className="text-[9px] text-stone-400">Attached</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(att.id)}
                            className="w-5 h-5 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-700 flex items-center justify-center text-xs"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-md shadow-stone-900/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Submitting to Building Ops...' : 'Submit Maintenance Request'}
                  </button>
                </div>
              </form>
            </div>

            {/* Past Requests History for Tenant */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
              <h3 className="text-base font-extrabold text-stone-900">Your Past Requests & Repair Status</h3>
              {tenantRequests.length === 0 ? (
                <p className="text-xs text-stone-400 py-6 text-center">No maintenance history recorded for your suite.</p>
              ) : (
                <div className="divide-y divide-stone-100">
                  {tenantRequests.map(req => {
                    const reqAttachments = req.attachments || [];
                    return (
                      <div key={req.id} className="py-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold bg-brand-50 text-brand-700 px-2.5 py-0.5 rounded border border-brand-200">
                              {req.category}
                            </span>
                            <span className="text-xs font-bold text-stone-900">Ticket #{req.id.slice(0, 10)}</span>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            req.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                            req.status === 'Assigned' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                        <p className="text-xs text-stone-700">{req.description}</p>
                        
                        {req.scheduled_date && (
                          <p className="text-[11px] text-brand-700 font-semibold flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> Scheduled Service Date: {req.scheduled_date}
                          </p>
                        )}

                        {reqAttachments.length > 0 && (
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-[10px] font-semibold text-stone-400">Photos:</span>
                            {reqAttachments.map(att => (
                              <button
                                key={att.id}
                                type="button"
                                onClick={() => setPreviewAttachmentUrl(att.url)}
                                className="w-7 h-7 rounded-lg overflow-hidden border border-stone-200 hover:scale-105 transition-transform"
                              >
                                {att.type.startsWith('image/') ? (
                                  <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                                ) : (
                                  <FileText className="w-4 h-4 m-auto text-stone-500" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* DOCUMENTS TAB */}
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
                <button className="px-3 py-1.5 bg-white border border-stone-300 hover:bg-stone-100 rounded-lg text-xs font-bold cursor-pointer">
                  View PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Fullscreen Attachment Image Lightbox */}
      {previewAttachmentUrl && (
        <div className="fixed inset-0 bg-stone-950/85 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full bg-stone-900 p-2 rounded-2xl">
            <button
              onClick={() => setPreviewAttachmentUrl(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-stone-900 font-bold flex items-center justify-center shadow-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <img src={previewAttachmentUrl} alt="Evidence" className="w-full h-auto max-h-[80vh] object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
};
