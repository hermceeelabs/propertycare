import React, { useState } from 'react';
import {
  Users, UserCheck, ShieldCheck, Search, Filter,
  FileText, Clock, AlertCircle, CheckCircle2, ChevronRight, X, Phone, Mail, MapPin, DollarSign, Calendar, UserPlus
} from 'lucide-react';
import { DatabaseState, store } from '../services/supabase';
import { useCurrency } from '../context/CurrencyContext';
import { OnboardTenantModal } from '../components/OnboardTenantModal';

interface TenantsPageProps {
  dbState: DatabaseState;
  onSelectTenant: (tenantId: string) => void;
  defaultSubTab?: 'directory' | 'screening';
}

export const TenantsPage: React.FC<TenantsPageProps> = ({
  dbState,
  onSelectTenant,
  defaultSubTab = 'directory'
}) => {
  const [activeTab, setActiveTab] = useState<'directory' | 'screening'>(defaultSubTab);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [isOnboardTenantOpen, setIsOnboardTenantOpen] = useState(false);
  const { formatMoney } = useCurrency();

  // Screening state
  const [screeningFilter, setScreeningFilter] = useState<string>('All');
  const [selectedApplicant, setSelectedApplicant] = useState<any | null>(null);

  // Filtered tenants
  const filteredTenants = dbState.tenants.filter(tenant => {
    const matchesStatus = statusFilter === 'All' || tenant.status === statusFilter;
    const name = `${tenant.first_name} ${tenant.last_name}`.toLowerCase();
    const matchesSearch = name.includes(search.toLowerCase()) || tenant.email.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Filtered applicants
  const applicants = dbState.applicants || [];
  const filteredApplicants = applicants.filter(app => {
    if (screeningFilter === 'All') return true;
    return app.status === screeningFilter;
  });

  const handleUpdateStatus = (appId: string, newStatus: any) => {
    store.updateApplicant(appId, { status: newStatus });
    if (selectedApplicant?.id === appId) {
      setSelectedApplicant({ ...selectedApplicant, status: newStatus });
    }
  };

  const handleApproveApplicant = (app: any) => {
    handleUpdateStatus(app.id, 'Approved');

    // Create Active Tenant
    const nameParts = app.full_name.split(' ');
    const newTenant = {
      id: `ten-${Date.now()}`,
      first_name: nameParts[0] || 'Tenant',
      last_name: nameParts.slice(1).join(' ') || 'Applicant',
      email: app.email,
      phone: app.phone,
      status: 'Active' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Auto-create active lease for desired unit
    const unit = dbState.units.find(u => u.id === app.desired_unit_id);
    const rentAmount = unit ? unit.monthly_rent : 2200;

    const newLease = {
      id: `lease-${Date.now()}`,
      tenant_id: newTenant.id,
      unit_id: app.desired_unit_id,
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      monthly_rent: rentAmount,
      deposit: rentAmount,
      status: 'Active' as const,
      renewal_status: 'Pending Review' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    store.getState().tenants.unshift(newTenant);
    store.getState().leases.unshift(newLease);
    if (unit) {
      unit.status = 'Occupied';
    }
    store.saveState();
  };

  const tenantStatuses = ['All', 'Active', 'Notice Given', 'Former'];
  const applicantStatuses = ['All', 'In Review', 'Pending', 'Approved', 'Rejected'];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Header: Line 1 Title and Subtitle with visual divider */}
      <div className="flex items-baseline gap-2 sm:gap-3 overflow-hidden">
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight whitespace-nowrap shrink-0">Tenant Lifecycle & Screening</h1>
        <span className="text-cream-400 font-light shrink-0">|</span>
        <p className="text-sm text-stone-600 truncate">Manage tenant accounts, applicant screening pipelines & credit validations</p>
      </div>

      {/* Visual Horizontal Separator */}
      <hr className="border-t border-slate-800/80" />

      {/* Controls Line: Filters & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-wrap bg-cream-50 p-4 rounded-2xl border border-cream-300 shadow-xs">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Section View Dropdown */}
          <div className="flex items-center gap-2">
            <label htmlFor="tenant-tab-select" className="text-xs font-bold text-stone-600 uppercase tracking-wider">
              Section:
            </label>
            <select
              id="tenant-tab-select"
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as any)}
              className="bg-white text-stone-800 text-xs font-semibold px-3 py-2 rounded-xl border border-cream-300 shadow-2xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden cursor-pointer"
            >
              <option value="directory">Active Directory ({dbState.tenants.length})</option>
              <option value="screening">Applicant Screening ({applicants.filter(a => a.status === 'In Review' || a.status === 'Pending').length})</option>
            </select>
          </div>

          {/* Sub-Filter Dropdown for Directory or Screening */}
          {activeTab === 'directory' ? (
            <div className="flex items-center gap-2">
              <label htmlFor="tenant-status-select" className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                Status:
              </label>
              <select
                id="tenant-status-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white text-stone-800 text-xs font-semibold px-3 py-2 rounded-xl border border-cream-300 shadow-2xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden cursor-pointer"
              >
                {tenantStatuses.map(status => (
                  <option key={status} value={status}>
                    {status} ({status === 'All' ? dbState.tenants.length : dbState.tenants.filter(t => t.status === status).length})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <label htmlFor="screening-status-select" className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                Review Status:
              </label>
              <select
                id="screening-status-select"
                value={screeningFilter}
                onChange={(e) => setScreeningFilter(e.target.value)}
                className="bg-white text-stone-800 text-xs font-semibold px-3 py-2 rounded-xl border border-cream-300 shadow-2xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden cursor-pointer"
              >
                {applicantStatuses.map(status => (
                  <option key={status} value={status}>
                    {status} ({status === 'All' ? applicants.length : applicants.filter(a => a.status === status).length})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'directory' && (
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3.5 py-2 bg-white border border-cream-300 rounded-xl text-xs text-stone-800 placeholder-stone-400 shadow-2xs focus:ring-2 focus:ring-brand-500 focus:outline-hidden w-64"
            />
          )}

          <button
            onClick={() => setIsOnboardTenantOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4" /> Onboard Tenant Client
          </button>
        </div>
      </div>

      {/* DIRECTORY TAB */}
      {activeTab === 'directory' && (
        <div className="space-y-6">
          {/* Tenants Table */}
          <div className="bg-cream-50 rounded-2xl border border-cream-300 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-cream-100/90 border-b border-cream-300 text-stone-600 uppercase tracking-wider font-bold">
                    <th className="p-4">Tenant</th>
                    <th className="p-4">Residence & Unit</th>
                    <th className="p-4">Contact Info</th>
                    <th className="p-4">Active Lease</th>
                    <th className="p-4">Monthly Inflow</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Profile</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTenants.map(tenant => {
                    const activeLease = dbState.leases.find(l => l.tenant_id === tenant.id && l.status !== 'Ended');
                    const unit = activeLease ? dbState.units.find(u => u.id === activeLease.unit_id) : undefined;
                    const property = unit ? dbState.properties.find(p => p.id === unit.property_id) : undefined;

                    return (
                      <tr
                        key={tenant.id}
                        onClick={() => onSelectTenant(tenant.id)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        <td className="p-4 font-extrabold text-slate-900 group-hover:text-brand-600 transition-colors">
                          {tenant.first_name} {tenant.last_name}
                        </td>
                        <td className="p-4 text-slate-700">
                          {property && unit ? (
                            <div>
                              <span className="font-semibold block">{property.name}</span>
                              <span className="text-slate-400">Unit {unit.unit_number} ({property.city})</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No assigned unit</span>
                          )}
                        </td>
                        <td className="p-4 text-slate-600">
                          <div>{tenant.email}</div>
                          <div className="text-[11px] text-slate-400">{tenant.phone}</div>
                        </td>
                        <td className="p-4 text-slate-600">
                          {activeLease ? (
                            <span>Until {activeLease.end_date}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="p-4 font-bold text-slate-900">
                          {activeLease ? formatMoney(activeLease.monthly_rent) : '—'}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            tenant.status === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                            tenant.status === 'Notice Given' ? 'bg-amber-100 text-amber-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {tenant.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 inline-block" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SCREENING PIPELINE SUB-TAB */}
      {activeTab === 'screening' && (
        <div className="space-y-6">
          {/* Status Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
            {['All', 'Pending', 'In Review', 'Approved', 'Declined'].map(status => (
              <button
                key={status}
                onClick={() => setScreeningFilter(status)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  screeningFilter === status
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {status} ({status === 'All' ? applicants.length : applicants.filter(a => a.status === status).length})
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Applicant List */}
            <div className="lg:col-span-2 space-y-3">
              {filteredApplicants.map(app => {
                const property = dbState.properties.find(p => p.id === app.desired_property_id);
                const unit = dbState.units.find(u => u.id === app.desired_unit_id);
                const isSelected = selectedApplicant?.id === app.id;

                return (
                  <div
                    key={app.id}
                    onClick={() => setSelectedApplicant(app)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm text-slate-900">{app.full_name}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            app.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                            app.status === 'In Review' ? 'bg-blue-100 text-blue-800' :
                            app.status === 'Declined' ? 'bg-rose-100 text-rose-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {app.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{app.employment} • Income: {formatMoney(app.income)}/yr</p>
                        <p className="text-xs text-slate-600 font-medium">
                          Target: {property?.name} (Unit {unit?.unit_number || 'TBD'})
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-slate-400 block">Credit Score</span>
                        <span className={`text-base font-extrabold ${
                          (app.credit_score || 0) >= 700 ? 'text-emerald-600' : 'text-amber-600'
                        }`}>
                          {app.credit_score || 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Col: Screening Action Drawer */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5 h-fit">
              {selectedApplicant ? (
                <>
                  <div className="space-y-1 pb-4 border-b border-slate-100">
                    <span className="text-[10px] font-bold text-brand-700 uppercase tracking-wider">Candidate Dossier</span>
                    <h3 className="text-lg font-bold text-slate-900">{selectedApplicant.full_name}</h3>
                    <p className="text-xs text-slate-500">{selectedApplicant.email}</p>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Monthly Income:</span>
                      <strong className="text-slate-900">{formatMoney(selectedApplicant.income / 12)} / mo</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Credit Score:</span>
                      <strong className="text-emerald-700 font-bold">{selectedApplicant.credit_score} (Equifax Verified)</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Background Screening:</span>
                      <strong className="text-slate-900">{selectedApplicant.background_check || 'Clean / Verified'}</strong>
                    </div>
                  </div>

                  {/* Workflow Action Buttons */}
                  <div className="space-y-2 pt-4 border-t border-slate-100">
                    {selectedApplicant.status !== 'Approved' && (
                      <button
                        onClick={() => handleApproveApplicant(selectedApplicant)}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Approve & Sign Lease
                      </button>
                    )}

                    {selectedApplicant.status !== 'Declined' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedApplicant.id, 'Declined')}
                        className="w-full py-2 border border-rose-200 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors"
                      >
                        Decline Application
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Select an applicant from the left to review Equifax score and approve lease.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Onboard Tenant Modal */}
      <OnboardTenantModal
        isOpen={isOnboardTenantOpen}
        onClose={() => setIsOnboardTenantOpen(false)}
        units={dbState.units}
        properties={dbState.properties}
        onTenantAdded={(newTenant, lease) => {
          if (lease) {
            onSelectTenant(newTenant.id);
          }
        }}
      />
    </div>
  );
};
