import React, { useState } from 'react';
import {
  Truck, Wrench, MapPin, Phone, User, Calendar, Clock,
  CheckCircle2, AlertTriangle, FileText, Eye, Check, X, Building2, Home
} from 'lucide-react';
import { DatabaseState, store, supabase } from '../../services/supabase';
import { MaintenanceRequest, Vendor, Property, Unit } from '../../types/database';
import { useCurrency } from '../../context/CurrencyContext';

interface ContractorPortalProps {
  dbState: DatabaseState;
  vendorId?: string;
  onClosePreview?: () => void;
}

export const ContractorPortal: React.FC<ContractorPortalProps> = ({
  dbState,
  vendorId = dbState.vendors[0]?.id,
  onClosePreview
}) => {
  const { formatMoney } = useCurrency();
  const [selectedVendorId, setSelectedVendorId] = useState<string>(vendorId || dbState.vendors[0]?.id || '');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [scopeFilter, setScopeFilter] = useState<'All' | 'Unit' | 'Property'>('All');
  const [previewAttachment, setPreviewAttachment] = useState<string | null>(null);

  const vendor = dbState.vendors.find(v => v.id === selectedVendorId) || dbState.vendors[0];

  // Requests assigned to this contractor
  const assignedRequests = dbState.maintenance_requests.filter(m => m.vendor_id === vendor?.id);

  const filteredRequests = assignedRequests.filter(req => {
    if (statusFilter !== 'All' && req.status !== statusFilter) return false;
    return true;
  });

  const handleUpdateTicketStatus = async (requestId: string, newStatus: any) => {
    try {
      await supabase
        .from('maintenance_requests')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', requestId);

      const target = dbState.maintenance_requests.find(m => m.id === requestId);
      if (target) {
        target.status = newStatus;
        target.updated_at = new Date().toISOString();
      }
      store.saveState();
    } catch (err) {
      console.error('Failed to update contractor ticket status:', err);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 font-sans">
      {/* Top Banner (Shows if opened in Preview Mode) */}
      {onClosePreview && (
        <div className="bg-stone-900 text-white px-4 py-2.5 flex items-center justify-between text-xs sticky top-0 z-50">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            <strong>Contractor Portal Preview:</strong> Viewing field operations as <em>{vendor?.name} ({vendor?.company})</em>
          </span>

          <div className="flex items-center gap-3">
            <select
              value={selectedVendorId}
              onChange={(e) => setSelectedVendorId(e.target.value)}
              className="bg-stone-800 text-white text-[11px] font-bold px-2 py-1 rounded-lg border border-stone-700 cursor-pointer"
            >
              {dbState.vendors.map(v => (
                <option key={v.id} value={v.id}>{v.name} ({v.category})</option>
              ))}
            </select>
            <button
              onClick={onClosePreview}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg font-bold text-[11px] transition-all cursor-pointer"
            >
              Exit Portal Preview ✕
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-6 py-4 sticky top-0 z-40 shadow-xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white font-extrabold flex items-center justify-center shadow-md">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-base text-stone-900 tracking-tight">Contractor Field Portal</h1>
              <p className="text-xs text-stone-500">{vendor?.company} • Trade: {vendor?.category}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-xl text-stone-700">
              Service Area: <strong>{vendor?.service_area}</strong>
            </div>
            <div className="bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-xl text-stone-700">
              Emergency Dispatch: <strong>{vendor?.phone}</strong>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Quick Summary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
            <span className="text-stone-400 text-xs font-bold uppercase tracking-wider block">Total Work Orders</span>
            <div className="text-2xl font-black text-stone-900 mt-1">{assignedRequests.length}</div>
            <span className="text-[11px] text-stone-500">Historical lifetime requests</span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
            <span className="text-amber-600 text-xs font-bold uppercase tracking-wider block">Pending / Scheduled</span>
            <div className="text-2xl font-black text-amber-700 mt-1">
              {assignedRequests.filter(r => r.status === 'Assigned' || r.status === 'In Progress' || r.status === 'New').length}
            </div>
            <span className="text-[11px] text-amber-600 font-semibold">Active field dispatches</span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
            <span className="text-emerald-600 text-xs font-bold uppercase tracking-wider block">Completed Repairs</span>
            <div className="text-2xl font-black text-emerald-700 mt-1">
              {assignedRequests.filter(r => r.status === 'Completed').length}
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold">Verified & closed</span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs">
            <span className="text-brand-600 text-xs font-bold uppercase tracking-wider block">Contractor Rating</span>
            <div className="text-2xl font-black text-brand-700 mt-1">98%</div>
            <span className="text-[11px] text-stone-500">On-time SLA compliance</span>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-bold text-stone-600 uppercase tracking-wider mr-1">Status:</span>
            {['All', 'Assigned', 'In Progress', 'Completed'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="text-xs text-stone-500">
            Showing <strong>{filteredRequests.length}</strong> work orders
          </div>
        </div>

        {/* Dispatched Requests List */}
        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-3xl border border-stone-200">
              <Truck className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="text-xs text-stone-500 font-semibold">No work orders matching the selected filter.</p>
            </div>
          ) : (
            filteredRequests.map(req => {
              const unit = dbState.units.find(u => u.id === req.unit_id);
              const property = unit ? dbState.properties.find(p => p.id === unit.property_id) : undefined;
              const tenant = dbState.tenants.find(t => t.id === req.tenant_id);
              const attachments = req.attachments || [];

              return (
                <div
                  key={req.id}
                  className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-5 hover:border-slate-400 transition-all"
                >
                  {/* Top Bar: Priority, Category, Status & Action Toggles */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                        req.priority === 'Emergency' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                        req.priority === 'High' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {req.priority}
                      </span>
                      <span className="text-xs font-extrabold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded border border-blue-200">
                        {req.category}
                      </span>
                      <span className="text-xs font-bold text-stone-400">
                        Work Order #{req.id.slice(0, 10)}
                      </span>
                    </div>

                    {/* Quick Contractor Status Update Buttons */}
                    <div className="flex items-center gap-2">
                      {req.status !== 'Completed' ? (
                        <>
                          <button
                            onClick={() => handleUpdateTicketStatus(req.id, 'In Progress')}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              req.status === 'In Progress'
                                ? 'bg-blue-600 text-white'
                                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                            }`}
                          >
                            Mark In Progress
                          </button>
                          <button
                            onClick={() => handleUpdateTicketStatus(req.id, 'Completed')}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Mark Completed
                          </button>
                        </>
                      ) : (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Completed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Main Job Description & Dispatch Instructions */}
                  <div className="space-y-2">
                    <h3 className="text-base font-extrabold text-stone-900 leading-snug">
                      {req.description}
                    </h3>

                    {req.admin_notes && (
                      <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs text-amber-900">
                        <strong className="block text-amber-950 font-bold mb-0.5">Management Access Instructions:</strong>
                        {req.admin_notes}
                      </div>
                    )}
                  </div>

                  {/* Critical Property Location & Resident Contact Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Location Card */}
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                        <Building2 className="w-3.5 h-3.5 text-brand-600" /> Job Site Location
                      </div>
                      <div className="font-extrabold text-stone-900 text-sm">
                        {property?.name} • Suite {unit?.unit_number}
                      </div>
                      <p className="text-stone-600 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        {property?.address}, {property?.city}, {property?.province} {property?.postal_code}
                      </p>
                    </div>

                    {/* Resident Contact Card */}
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                        <User className="w-3.5 h-3.5 text-emerald-600" /> Resident / Tenant to Contact
                      </div>
                      <div className="font-extrabold text-stone-900 text-sm">
                        {tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Resident Unassigned'}
                      </div>
                      {tenant?.phone && (
                        <a
                          href={`tel:${tenant.phone}`}
                          className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
                        >
                          <Phone className="w-3.5 h-3.5" /> Call Resident: {tenant.phone}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Attached Evidence & Documentation */}
                  {attachments.length > 0 && (
                    <div className="pt-2 border-t border-stone-100 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                        Tenant Photographic Proof ({attachments.length})
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {attachments.map(att => (
                          <button
                            key={att.id}
                            type="button"
                            onClick={() => setPreviewAttachment(att.url)}
                            className="p-1.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-stone-700 transition-colors group cursor-pointer"
                          >
                            {att.type.startsWith('image/') ? (
                              <img src={att.url} alt={att.name} className="w-8 h-8 rounded-lg object-cover" />
                            ) : (
                              <FileText className="w-5 h-5 text-brand-600 ml-1" />
                            )}
                            <span className="truncate max-w-[130px] text-[11px]">{att.name}</span>
                            <Eye className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-700 mr-1" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Schedule & Financial Metadata */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500 border-t border-stone-100">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-stone-400" />
                      Target Service Date: <strong>{req.scheduled_date || 'Immediate Triage'}</strong>
                    </span>
                    {req.estimated_cost && (
                      <span className="font-bold text-stone-900">
                        Approved Quote: {formatMoney(req.estimated_cost)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Lightbox for Attachment Viewing */}
      {previewAttachment && (
        <div className="fixed inset-0 bg-stone-950/85 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full bg-stone-900 p-2 rounded-2xl">
            <button
              onClick={() => setPreviewAttachment(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-stone-900 font-bold flex items-center justify-center shadow-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <img src={previewAttachment} alt="Evidence" className="w-full h-auto max-h-[80vh] object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
};
