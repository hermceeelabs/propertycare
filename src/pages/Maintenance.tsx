import React, { useState } from 'react';
import { Wrench, Plus, CheckCircle2, AlertTriangle, Truck, User } from 'lucide-react';
import { DatabaseState, store } from '../services/supabase';

interface MaintenanceProps {
  dbState: DatabaseState;
}

export const MaintenancePage: React.FC<MaintenanceProps> = ({
  dbState
}) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [showNewModal, setShowNewModal] = useState(false);

  // New Request Form state
  const [tenantId, setTenantId] = useState(dbState.tenants[0]?.id || '');
  const [category, setCategory] = useState<any>('Plumbing');
  const [priority, setPriority] = useState<any>('Normal');
  const [description, setDescription] = useState('');

  const filteredRequests = dbState.maintenance_requests.filter(m => {
    if (categoryFilter === 'All') return true;
    return m.category === categoryFilter;
  });

  const handleCreateRequest = () => {
    if (!description.trim()) return;

    const tenant = dbState.tenants.find(t => t.id === tenantId);
    const lease = dbState.leases.find(l => l.tenant_id === tenantId);
    if (!tenant || !lease) return;

    const newReq: any = {
      id: 'maint-' + Date.now(),
      tenant_id: tenant.id,
      unit_id: lease.unit_id,
      category,
      description,
      priority,
      status: 'New',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    store.addMaintenanceRequest(newReq);
    setShowNewModal(false);
    setDescription('');
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header: Line 1 Title and Subtitle with visual divider */}
      <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-3">
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Maintenance & Work Orders</h1>
        <span className="hidden sm:inline text-cream-400 font-light">|</span>
        <p className="text-sm text-stone-600">Tenant repair requests, trade category dispatch & contractor ticketing</p>
      </div>

      {/* Visual Horizontal Separator */}
      <hr className="border-t border-cream-300" />

      {/* Controls Line: Category Filter & New Ticket Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-wrap bg-cream-50 p-4 rounded-2xl border border-cream-300 shadow-xs">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-stone-600 uppercase tracking-wider mr-1">Category:</span>
          {['All', 'Plumbing', 'Electrical', 'HVAC', 'Appliance', 'Structural', 'Pest'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                categoryFilter === cat
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-white text-stone-700 border border-cream-300 hover:bg-cream-100'
              }`}
            >
              {cat} ({cat === 'All' ? dbState.maintenance_requests.length : dbState.maintenance_requests.filter(m => m.category === cat).length})
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowNewModal(true)}
          className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> New Ticket
        </button>
      </div>

      {/* Maintenance Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRequests.map(req => {
          const tenant = dbState.tenants.find(t => t.id === req.tenant_id);
          const unit = dbState.units.find(u => u.id === req.unit_id);
          const property = unit ? dbState.properties.find(p => p.id === unit.property_id) : undefined;
          const vendor = req.vendor_id ? dbState.vendors.find(v => v.id === req.vendor_id) : undefined;

          return (
            <div key={req.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    req.priority === 'Emergency' ? 'bg-rose-100 text-rose-800' :
                    req.priority === 'High' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {req.priority}
                  </span>
                  <span className="text-xs font-extrabold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                    {req.category}
                  </span>
                </div>

                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  req.status === 'Assigned' || req.status === 'Vendor Accepted' ? 'bg-emerald-100 text-emerald-800' :
                  req.status === 'New' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                }`}>
                  {req.status}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-900 leading-snug">{req.description}</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Location: <strong className="text-slate-800">{property?.name} (Unit {unit?.unit_number})</strong>
                </p>
                <p className="text-[11px] text-slate-400">Filed by: {tenant?.first_name} {tenant?.last_name} ({tenant?.phone})</p>
              </div>

              {/* Vendor Assignment Status Box */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                {vendor ? (
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-brand-600 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-900">{vendor.name}</span>
                      <span className="text-slate-400 block text-[11px]">{vendor.company}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-700">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="font-medium">Unassigned</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Maintenance Ticket Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900">Create New Maintenance Request</h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Select Tenant</label>
              <select
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                >
                  {['Plumbing', 'Electrical', 'HVAC', 'Appliance', 'Structural', 'Pest', 'General'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
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
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setShowNewModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">Cancel</button>
              <button
                onClick={handleCreateRequest}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-bold shadow-xs"
              >
                Create Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
