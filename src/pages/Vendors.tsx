import React, { useState } from 'react';
import { Truck, Mail, Phone, MapPin, Plus, Star, Edit3, X, Save, CheckCircle2 } from 'lucide-react';
import { DatabaseState, store } from '../services/supabase';
import { Vendor, VendorCategory, VendorStatus } from '../types/database';

interface VendorsProps {
  dbState: DatabaseState;
}

const TRADE_CATEGORIES: string[] = [
  'Plumbing',
  'Electrical',
  'HVAC',
  'General Maintenance',
  'Cleaning',
  'Landscaping',
  'Pest Control',
  'Painting',
  'Security',
  'Appliances'
];

const SERVICE_AREAS: string[] = [
  'Toronto',
  'Mississauga',
  'Hamilton',
  'Ottawa',
  'Lagos',
  'Abuja'
];

export const VendorsPage: React.FC<VendorsProps> = ({ dbState }) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [cityFilter, setCityFilter] = useState<string>('All');
  const [showAddModal, setShowAddModal] = useState(false);

  // Add Form State
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState<VendorCategory>('Plumbing');
  const [serviceArea, setServiceArea] = useState('Toronto');

  // Edit Contractor Modal State
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [editName, setEditName] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCategory, setEditCategory] = useState<VendorCategory>('Plumbing');
  const [editServiceArea, setEditServiceArea] = useState('Toronto');
  const [editStatus, setEditStatus] = useState<VendorStatus>('Active');
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  const filteredVendors = dbState.vendors.filter(v => {
    const matchCat = categoryFilter === 'All' || v.category === categoryFilter;
    const matchCity = cityFilter === 'All' || (v.service_area || '').toLowerCase().includes(cityFilter.toLowerCase());
    return matchCat && matchCity;
  });

  const handleAddVendor = () => {
    if (!name.trim() || !company.trim()) return;

    const newVendor: Vendor = {
      id: 'ven-' + Date.now(),
      name: name.trim(),
      company: company.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      category,
      service_area: serviceArea.trim() || 'Toronto',
      status: 'Active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    store.getState().vendors.unshift(newVendor);
    store.saveState();
    setShowAddModal(false);
    setName('');
    setCompany('');
    setEmail('');
    setPhone('');
  };

  const openEditModal = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setEditName(vendor.name || '');
    setEditCompany(vendor.company || '');
    setEditEmail(vendor.email || '');
    setEditPhone(vendor.phone || '');
    setEditCategory((vendor.category as VendorCategory) || 'Plumbing');
    setEditServiceArea(vendor.service_area || 'Toronto');
    setEditStatus(vendor.status || 'Active');
  };

  const handleSaveVendorEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVendor || !editName.trim() || !editCompany.trim()) return;

    await store.updateVendor(editingVendor.id, {
      name: editName.trim(),
      company: editCompany.trim(),
      email: editEmail.trim().toLowerCase(),
      phone: editPhone.trim(),
      category: editCategory,
      service_area: editServiceArea.trim(),
      status: editStatus
    });

    setSavedBanner(`Updated contractor profile for ${editCompany.trim()}`);
    setEditingVendor(null);
    setTimeout(() => setSavedBanner(null), 4000);
  };

  return (
    <div className="space-y-6">
      {savedBanner && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs font-bold text-emerald-900">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{savedBanner}</span>
        </div>
      )}

      {/* Filter Toolbar & Add Vendor Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 overflow-x-auto">
          {['All', 'Plumbing', 'Electrical', 'HVAC', 'General Maintenance', 'Pest Control', 'Cleaning'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-600 uppercase tracking-wider">Service Area:</span>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 cursor-pointer focus:outline-hidden"
            >
              <option value="All">All Cities ({dbState.vendors.length})</option>
              {SERVICE_AREAS.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Trade Vendor
          </button>
        </div>
      </div>

      {/* Vendor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredVendors.map(vendor => {
          const assignedJobs = dbState.maintenance_requests.filter(m => m.vendor_id === vendor.id);
          const completedJobs = assignedJobs.filter(m => m.status === 'Completed').length;

          return (
            <div key={vendor.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between hover:border-slate-300 transition-all">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-700 px-2 py-0.5 rounded border border-brand-200">
                      {vendor.category}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{vendor.name}</h3>
                    <p className="text-xs text-slate-500 font-medium">{vendor.company}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      vendor.status === 'Active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : vendor.status === 'Pending'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {vendor.status}
                    </span>
                    <button
                      onClick={() => openEditModal(vendor)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                      title="Edit Contractor Information"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-600">
                  <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" /> {vendor.email}</p>
                  <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /> {vendor.phone}</p>
                  <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" /> Service Area: <strong className="text-slate-800">{vendor.service_area}</strong></p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">
                  {assignedJobs.length} Assigned ({completedJobs} Completed)
                </span>
                <button
                  onClick={() => openEditModal(vendor)}
                  className="text-brand-700 hover:text-brand-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3 h-3" /> Edit Contractor
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Contractor Modal */}
      {editingVendor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-stone-200 p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between pb-3 border-b border-stone-100">
              <div>
                <h3 className="font-black text-base text-slate-900">Edit Contractor Profile</h3>
                <p className="text-xs text-stone-500">Update contact details, trade specialization, or active status</p>
              </div>
              <button
                onClick={() => setEditingVendor(null)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVendorEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Contact Person / Lead Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Company / Trade Entity Name</label>
                <input
                  type="text"
                  required
                  value={editCompany}
                  onChange={(e) => setEditCompany(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Dispatch Email</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Trade Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as VendorCategory)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-800 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                  >
                    {TRADE_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Service Area</label>
                  <input
                    type="text"
                    required
                    value={editServiceArea}
                    onChange={(e) => setEditServiceArea(e.target.value)}
                    placeholder="e.g. Toronto, Lagos, Abuja"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Contractor Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as VendorStatus)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-800 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Active">Active (Approved for Dispatch)</option>
                  <option value="Pending">Pending Compliance Review</option>
                  <option value="Inactive">Inactive / Suspended</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingVendor(null)}
                  className="px-4 py-2 font-bold text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5 text-emerald-400" /> Save Contractor Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Vendor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900">Add Approved Trade Vendor</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Contact Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Robert Vance"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Company Name</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Ontario HVAC Experts Inc"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="dispatch@vendor.ca"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(416) 555-0199"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as VendorCategory)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                  >
                    {TRADE_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">City Service Area</label>
                  <select
                    value={serviceArea}
                    onChange={(e) => setServiceArea(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                  >
                    {SERVICE_AREAS.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 cursor-pointer">Cancel</button>
              <button
                onClick={handleAddVendor}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer"
              >
                Save Vendor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
