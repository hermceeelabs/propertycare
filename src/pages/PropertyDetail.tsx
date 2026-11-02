import React, { useState } from 'react';
import { ArrowLeft, Building2, MapPin, Home, Users, FileText, CreditCard, Wrench, Receipt, History } from 'lucide-react';
import { DatabaseState } from '../services/supabase';

interface PropertyDetailProps {
  propertyId: string;
  dbState: DatabaseState;
  onBack: () => void;
}

export const PropertyDetailPage: React.FC<PropertyDetailProps> = ({
  propertyId,
  dbState,
  onBack
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'units' | 'tenants' | 'leases' | 'payments' | 'maintenance' | 'bills' | 'activity'>('overview');

  const property = dbState.properties.find(p => p.id === propertyId);
  if (!property) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Property not found.</p>
        <button onClick={onBack} className="mt-4 text-brand-600 font-bold hover:underline">Return to Properties</button>
      </div>
    );
  }

  const units = dbState.units.filter(u => u.property_id === propertyId);
  const unitIds = new Set(units.map(u => u.id));

  const leases = dbState.leases.filter(l => unitIds.has(l.unit_id));
  const tenantIds = new Set(leases.map(l => l.tenant_id));
  const tenants = dbState.tenants.filter(t => tenantIds.has(t.id));

  const payments = dbState.payments.filter(p => tenantIds.has(p.tenant_id));
  const maintenance = dbState.maintenance_requests.filter(m => unitIds.has(m.unit_id));
  const bills = dbState.bills.filter(b => b.property_id === propertyId);

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Properties
      </button>

      {/* Property Title Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-brand-50 text-brand-700 px-2.5 py-0.5 rounded border border-brand-200">
              {property.property_type}
            </span>
            <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
              {property.status}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">{property.name}</h1>
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-slate-400" />
            {property.address}, {property.city}, {property.province} {property.postal_code}
          </p>
        </div>

        <div className="flex items-center gap-6 text-center border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-6">
          <div>
            <span className="text-xs text-slate-500 block font-medium">Units</span>
            <span className="text-xl font-extrabold text-slate-900">{units.length}</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block font-medium">Occupied</span>
            <span className="text-xl font-extrabold text-emerald-600">{units.filter(u => u.status === 'Occupied').length}</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block font-medium">Monthly Rent</span>
            <span className="text-xl font-extrabold text-slate-900">
              ${units.reduce((acc, u) => acc + u.monthly_rent, 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Detail Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-px">
        {[
          { id: 'overview', label: 'Overview', icon: Building2 },
          { id: 'units', label: `Units (${units.length})`, icon: Home },
          { id: 'tenants', label: `Tenants (${tenants.length})`, icon: Users },
          { id: 'leases', label: `Leases (${leases.length})`, icon: FileText },
          { id: 'payments', label: `Payments (${payments.length})`, icon: CreditCard },
          { id: 'maintenance', label: `Maintenance (${maintenance.length})`, icon: Wrench },
          { id: 'bills', label: `Bills (${bills.length})`, icon: Receipt },
          { id: 'activity', label: 'Activity Log', icon: History }
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

      {/* Tab Contents */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h3 className="font-bold text-slate-900 text-sm">Asset Management Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-semibold block">Primary City</span>
                <span className="text-base font-extrabold text-slate-900">{property.city}, Ontario</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-semibold block">Property Class</span>
                <span className="text-base font-extrabold text-slate-900">{property.property_type}</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-semibold block">Created Date</span>
                <span className="text-base font-extrabold text-slate-900">{property.created_at.split('T')[0]}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'units' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold">
                  <th className="pb-3">Unit Number</th>
                  <th className="pb-3">Layout / Type</th>
                  <th className="pb-3">Bed / Bath</th>
                  <th className="pb-3">Monthly Rent</th>
                  <th className="pb-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {units.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-3 font-bold text-slate-900">Unit {u.unit_number}</td>
                    <td className="py-3 text-slate-600">{u.unit_type}</td>
                    <td className="py-3 text-slate-600">{u.bedrooms} Bed / {u.bathrooms} Bath</td>
                    <td className="py-3 font-semibold text-slate-900">${u.monthly_rent.toLocaleString()} CAD</td>
                    <td className="py-3 text-right">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        u.status === 'Occupied' ? 'bg-emerald-100 text-emerald-800' :
                        u.status === 'Vacant' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'tenants' && (
          <div className="space-y-3">
            {tenants.map(t => (
              <div key={t.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-900">{t.first_name} {t.last_name}</h4>
                  <p className="text-xs text-slate-500">{t.email} • {t.phone}</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="space-y-3">
            {maintenance.map(m => (
              <div key={m.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-700 px-2 py-0.5 rounded">
                    {m.category} • {m.priority}
                  </span>
                  <p className="text-xs font-semibold text-slate-900 mt-1">{m.description}</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  {m.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'bills' && (
          <div className="space-y-3">
            {bills.map(b => (
              <div key={b.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Invoice #{b.bill_number}</h4>
                  <p className="text-xs text-slate-500">{b.description} (Due: {b.due_date})</p>
                </div>
                <span className="font-extrabold text-sm text-slate-900">${b.amount.toFixed(2)} CAD</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="text-xs text-slate-500 space-y-2">
            <p>• Property created in Northstar Database on {property.created_at.split('T')[0]}</p>
            <p>• Portfolio audit check completed on {property.updated_at.split('T')[0]}</p>
          </div>
        )}
      </div>
    </div>
  );
};
