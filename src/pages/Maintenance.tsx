import React, { useState } from 'react';
import {
  Wrench, Plus, CheckCircle2, AlertTriangle, Truck, User, Image, FileText,
  Calendar, DollarSign, X, Check, Clock, Eye, Sliders
} from 'lucide-react';
import { DatabaseState, store, supabase } from '../services/supabase';
import { MaintenanceRequest, MaintenanceStatus, MaintenancePriority, Vendor } from '../types/database';
import { useCurrency } from '../context/CurrencyContext';

interface MaintenanceProps {
  dbState: DatabaseState;
}

export const MaintenancePage: React.FC<MaintenanceProps> = ({ dbState }) => {
  const { formatMoney } = useCurrency();
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showNewModal, setShowNewModal] = useState(false);

  // Detail / Assign Modal state
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [assignVendorId, setAssignVendorId] = useState<string>('');
  const [assignStatus, setAssignStatus] = useState<MaintenanceStatus>('Assigned');
  const [estimatedCost, setEstimatedCost] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  // New Request Form state (Management internal dispatch)
  const [tenantId, setTenantId] = useState(dbState.tenants[0]?.id || '');
  const [category, setCategory] = useState<any>('Plumbing');
  const [priority, setPriority] = useState<MaintenancePriority>('Normal');
  const [description, setDescription] = useState('');

  // Lightbox for attachment viewing
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const filteredRequests = dbState.maintenance_requests.filter(m => {
    const matchCategory = categoryFilter === 'All' || m.category === categoryFilter;
    const matchStatus = statusFilter === 'All' || m.status === statusFilter;
    return matchCategory && matchStatus;
  });

  const handleOpenAssignModal = (req: MaintenanceRequest) => {
    setSelectedRequest(req);
    setAssignVendorId(req.vendor_id || (dbState.vendors[0]?.id || ''));
    setAssignStatus(req.status === 'New' ? 'Assigned' : req.status);
    setEstimatedCost(req.estimated_cost ? req.estimated_cost.toString() : '');
    setScheduledDate(req.scheduled_date || new Date().toISOString().split('T')[0]);
    setAdminNotes(req.admin_notes || '');
  };

  const handleSaveAssignment = async () => {
    if (!selectedRequest) return;
    setIsUpdating(true);

    const updatedData: Partial<MaintenanceRequest> = {
      vendor_id: assignVendorId || undefined,
      status: assignStatus,
      estimated_cost: estimatedCost ? parseFloat(estimatedCost) : undefined,
      scheduled_date: scheduledDate || undefined,
      admin_notes: adminNotes.trim() || undefined,
      updated_at: new Date().toISOString()
    };

    try {
      // 1. Update in Supabase
      await supabase
        .from('maintenance_requests')
        .update({
          vendor_id: updatedData.vendor_id,
          status: updatedData.status,
          estimated_cost: updatedData.estimated_cost,
          scheduled_date: updatedData.scheduled_date,
          admin_notes: updatedData.admin_notes,
          updated_at: updatedData.updated_at
        })
        .eq('id', selectedRequest.id);

      // 2. Update local state
      const target = dbState.maintenance_requests.find(m => m.id === selectedRequest.id);
      if (target) {
        Object.assign(target, updatedData);
      }
      store.saveState();
      setSelectedRequest(null);
    } catch (err) {
      console.error('Error updating maintenance ticket:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateRequest = async () => {
    if (!description.trim()) return;

    const tenant = dbState.tenants.find(t => t.id === tenantId);
    const lease = dbState.leases.find(l => l.tenant_id === tenantId);
    if (!tenant || !lease) return;

    const newReq: MaintenanceRequest = {
      id: 'maint-' + Date.now(),
      tenant_id: tenant.id,
      unit_id: lease.unit_id,
      category,
      description,
      priority,
      status: 'New',
      attachments: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      await supabase.from('maintenance_requests').insert({
        id: newReq.id,
        tenant_id: newReq.tenant_id,
        unit_id: newReq.unit_id,
        category: newReq.category,
        description: newReq.description,
        priority: newReq.priority,
        status: newReq.status,
        attachments: [],
        created_at: newReq.created_at,
        updated_at: newReq.updated_at
      });

      store.getState().maintenance_requests.unshift(newReq);
      store.saveState();
      setShowNewModal(false);
      setDescription('');
    } catch (err) {
      console.error('Error creating maintenance request:', err);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Maintenance & Work Orders</h1>
          <p className="text-sm text-stone-600 mt-1">
            Review resident repair tickets, inspect photographic evidence & dispatch trade contractors
          </p>
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Dispatch Internal Ticket
        </button>
      </div>

      {/* Decorative Divider */}
      <hr className="border-t border-slate-800/80" />

      {/* Controls Line: Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-wrap bg-cream-50 p-4 rounded-2xl border border-cream-300 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-stone-600 uppercase tracking-wider mr-1">Category:</span>
          {['All', 'Plumbing', 'Electrical', 'HVAC', 'Appliance', 'Structural', 'General'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                categoryFilter === cat
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-white text-stone-700 border border-cream-300 hover:bg-cream-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-cream-300 rounded-xl text-xs font-semibold text-stone-800 focus:outline-hidden cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="New">New / Pending Triage</option>
            <option value="Assigned">Assigned to Contractor</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Maintenance Tickets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredRequests.map(req => {
          const tenant = dbState.tenants.find(t => t.id === req.tenant_id);
          const unit = dbState.units.find(u => u.id === req.unit_id);
          const property = unit ? dbState.properties.find(p => p.id === unit.property_id) : undefined;
          const vendor = req.vendor_id ? dbState.vendors.find(v => v.id === req.vendor_id) : undefined;
          const attachments = req.attachments || [];

          return (
            <div key={req.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4 hover:border-slate-400 transition-all">
              {/* Status and Priority Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                    req.priority === 'Emergency' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                    req.priority === 'High' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                    'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {req.priority}
                  </span>
                  <span className="text-xs font-extrabold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                    {req.category}
                  </span>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  req.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                  req.status === 'Assigned' || req.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                  'bg-amber-100 text-amber-800 animate-pulse'
                }`}>
                  {req.status}
                </span>
              </div>

              {/* Description & Unit Context */}
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 leading-snug">{req.description}</h4>
                <div className="mt-2 text-xs text-slate-600 space-y-0.5">
                  <p>
                    Location: <strong className="text-slate-900">{property?.name || 'Property'} • Suite {unit?.unit_number || 'N/A'}</strong>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Resident: {tenant ? `${tenant.first_name} ${tenant.last_name} (${tenant.phone})` : 'Tenant'} • Filed on {req.created_at.split('T')[0]}
                  </p>
                </div>
              </div>

              {/* Supporting Attachments Section */}
              {attachments.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Supporting Documents / Photos ({attachments.length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {attachments.map(att => (
                      <button
                        key={att.id}
                        type="button"
                        onClick={() => setPreviewImage(att.url)}
                        className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-slate-700 transition-colors group cursor-pointer"
                      >
                        {att.type.startsWith('image/') ? (
                          <img src={att.url} alt={att.name} className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                          <FileText className="w-5 h-5 text-brand-600 ml-1" />
                        )}
                        <span className="truncate max-w-[130px] text-[11px]">{att.name}</span>
                        <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 mr-1" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Assigned Contractor & Action Button */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
                {vendor ? (
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                      <Truck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block leading-tight">{vendor.name}</span>
                      <span className="text-[10px] text-slate-400">{vendor.company} • {vendor.category}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-700">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="font-semibold text-xs">Awaiting Contractor Assignment</span>
                  </div>
                )}

                <button
                  onClick={() => handleOpenAssignModal(req)}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Sliders className="w-3.5 h-3.5" /> Manage & Assign
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Contractor Assignment & Approval Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-md">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Approve & Dispatch Work Order</h3>
                  <p className="text-xs text-slate-400">Assign registered contractor, record quote & set schedule</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Ticket Summary Box */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">{selectedRequest.category}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                    Ticket #{selectedRequest.id.slice(0, 10)}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-900">{selectedRequest.description}</p>
                <span className="text-[11px] text-slate-500 block">Filed on {selectedRequest.created_at.split('T')[0]}</span>
              </div>

              {/* Attachments Preview */}
              {selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Attached Photos / Documentation
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedRequest.attachments.map(att => (
                      <div
                        key={att.id}
                        onClick={() => setPreviewImage(att.url)}
                        className="group relative rounded-xl border border-slate-200 overflow-hidden cursor-pointer aspect-video bg-slate-100 flex items-center justify-center"
                      >
                        {att.type.startsWith('image/') ? (
                          <img src={att.url} alt={att.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <FileText className="w-8 h-8 text-slate-400" />
                        )}
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                          <Eye className="w-4 h-4" /> View
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Assignment Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Select Trade Contractor *</label>
                  <select
                    value={assignVendorId}
                    onChange={(e) => setAssignVendorId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 cursor-pointer focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="">-- Unassigned --</option>
                    {dbState.vendors.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.company} • {v.category}) [{v.status}]
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Ticket Status</label>
                  <select
                    value={assignStatus}
                    onChange={(e) => setAssignStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 cursor-pointer focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="New">New</option>
                    <option value="Assigned">Assigned</option>
                    <option value="Vendor Accepted">Vendor Accepted</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Target Repair Date</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Estimated Cost / Quote</label>
                  <input
                    type="number"
                    placeholder="e.g. 250"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Internal Instructions / Contractor Notes</label>
                  <textarea
                    rows={2}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="e.g. Approved tenant entry between 9am-12pm. Key available with building superintendent."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  disabled={isUpdating}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAssignment}
                  disabled={isUpdating}
                  className="px-6 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Confirm Assignment & Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Internal Ticket Creation Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-extrabold text-base text-slate-900">Dispatch Internal Maintenance Ticket</h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Select Tenant</label>
              <select
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
              >
                {dbState.tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.first_name} {t.last_name} ({t.email})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  {['Plumbing', 'Electrical', 'HVAC', 'Appliance', 'Structural', 'General'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                >
                  {['Low', 'Normal', 'High', 'Emergency'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Issue Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue in detail..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button onClick={() => setShowNewModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleCreateRequest}
                className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Create Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Attachment Image Lightbox */}
      {previewImage && (
        <div className="fixed inset-0 bg-slate-950/85 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full bg-slate-900 p-2 rounded-2xl">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-slate-900 font-bold flex items-center justify-center shadow-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <img src={previewImage} alt="Attachment Preview" className="w-full h-auto max-h-[80vh] object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
};
