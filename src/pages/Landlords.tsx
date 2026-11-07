import React, { useState } from 'react';
import {
  Landmark, UserPlus, Search, Building2, Phone, Mail, ShieldCheck,
  ChevronRight, ArrowLeft, ExternalLink, DollarSign, Home, Users, CheckCircle2, AlertCircle
} from 'lucide-react';
import { DatabaseState, store } from '../services/supabase';
import { Landlord, Property, Unit } from '../types/database';
import { useCurrency } from '../context/CurrencyContext';
import { OnboardLandlordModal } from '../components/OnboardLandlordModal';

interface LandlordsPageProps {
  dbState: DatabaseState;
  onSelectProperty: (propertyId: string) => void;
}

export const LandlordsPage: React.FC<LandlordsPageProps> = ({
  dbState,
  onSelectProperty
}) => {
  const { formatMoney } = useCurrency();
  const [search, setSearch] = useState('');
  const [selectedLandlordId, setSelectedLandlordId] = useState<string | null>(null);
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);

  // List of landlords from dbState or demo
  const landlords = dbState.landlords || [];

  const filteredLandlords = landlords.filter(l => {
    const term = search.toLowerCase();
    const fullName = `${l.first_name} ${l.last_name}`.toLowerCase();
    const company = (l.company_name || '').toLowerCase();
    const email = l.email.toLowerCase();
    return fullName.includes(term) || company.includes(term) || email.includes(term);
  });

  const activeLandlord = selectedLandlordId
    ? landlords.find(l => l.id === selectedLandlordId)
    : null;

  // Selected landlord's properties
  const landlordProperties = activeLandlord
    ? dbState.properties.filter(p => p.landlord_id === activeLandlord.id)
    : [];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Landlord Detail View */}
      {activeLandlord ? (
        <div className="space-y-6">
          <button
            onClick={() => setSelectedLandlordId(null)}
            className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Landlords Directory
          </button>

          {/* Landlord Header Banner */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-amber-600/20">
                {activeLandlord.first_name[0]}{activeLandlord.last_name[0]}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-black text-slate-900">
                    {activeLandlord.first_name} {activeLandlord.last_name}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                    Asset Owner
                  </span>
                </div>
                {activeLandlord.company_name && (
                  <p className="text-xs font-bold text-slate-700 mt-0.5">
                    {activeLandlord.company_name}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mt-2">
                  <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" /> {activeLandlord.email}</span>
                  {activeLandlord.phone && (
                    <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" /> {activeLandlord.phone}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Financial Summary for Landlord */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Mgmt Fee</span>
                <strong className="text-slate-900 text-sm font-extrabold">{activeLandlord.management_fee_percentage}%</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Payment Structure</span>
                <strong className="text-amber-700 text-sm font-extrabold">{activeLandlord.payment_structure || activeLandlord.remittance_frequency}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Contract Duration</span>
                <strong className="text-slate-900 text-sm font-extrabold">
                  {activeLandlord.lease_duration_months ? `${activeLandlord.lease_duration_months} Months` : '12 Months (Annual)'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Agreed Cycle Payout</span>
                <strong className="text-slate-900 text-sm font-extrabold">
                  {activeLandlord.agreed_payout_amount ? formatMoney(activeLandlord.agreed_payout_amount) : 'Standard Revenue'}
                </strong>
              </div>
            </div>
          </div>

          {/* Authorized Representatives & Legal Counsel Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600" /> Authorized Representatives & Legal Counsel
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Appointed delegates authorized to access portal and manage records on this landlord's behalf
                </p>
              </div>
            </div>

            {(!activeLandlord.authorized_representatives || activeLandlord.authorized_representatives.length === 0) ? (
              <p className="text-xs text-slate-400 italic py-2">
                No legal representatives or delegates configured yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeLandlord.authorized_representatives.map(rep => (
                  <div key={rep.id} className="p-4 bg-amber-50/50 border border-amber-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <strong className="text-xs font-bold text-amber-950">{rep.name}</strong>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        {rep.relationship}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">{rep.email} {rep.phone && `• ${rep.phone}`}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {rep.can_view_statements && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-white border border-amber-300 text-amber-800 font-semibold">
                          View Statements
                        </span>
                      )}
                      {rep.can_approve_maintenance && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-white border border-amber-300 text-amber-800 font-semibold">
                          Approve Repairs
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Owned Properties Portfolio */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Owned Real Estate Assets ({landlordProperties.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Properties registered and managed under {activeLandlord.first_name} {activeLandlord.last_name}'s ownership
                </p>
              </div>
            </div>

            {landlordProperties.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
                <p className="text-xs text-slate-500">No properties currently linked to this landlord.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {landlordProperties.map(property => {
                  const propUnits = dbState.units.filter(u => u.property_id === property.id);
                  const occupiedCount = propUnits.filter(u => u.status === 'Occupied').length;
                  const totalRent = propUnits.filter(u => u.status === 'Occupied').reduce((sum, u) => sum + u.monthly_rent, 0);

                  return (
                    <div
                      key={property.id}
                      onClick={() => onSelectProperty(property.id)}
                      className="p-5 bg-white rounded-3xl border border-slate-200 shadow-xs hover:border-amber-500 hover:shadow-md transition-all cursor-pointer group space-y-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-amber-700 transition-colors">
                            {property.name}
                          </h4>
                          <p className="text-xs text-slate-500">{property.address}, {property.city}</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                          {property.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-2xl text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Total Units</span>
                          <strong className="text-slate-900 font-extrabold">{propUnits.length} Units</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Occupancy</span>
                          <strong className="text-slate-900 font-extrabold">
                            {propUnits.length > 0 ? Math.round((occupiedCount / propUnits.length) * 100) : 0}%
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Monthly Rent</span>
                          <strong className="text-emerald-700 font-extrabold">{formatMoney(totalRent)}</strong>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-amber-700 font-bold pt-1">
                        <span>View Asset Yield & Unit Details</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Landlords Directory View */
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Landlord Clients & Asset Owners</h1>
              <p className="text-sm text-slate-500 mt-1">
                Manage property owner accounts, remitted asset yields, management contracts & appointed legal delegates
              </p>
            </div>

            <button
              onClick={() => setIsOnboardModalOpen(true)}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <UserPlus className="w-4 h-4" /> Onboard Landlord Client
            </button>
          </div>

          {/* Decorative Divider */}
          <hr className="border-t border-slate-800/80" />

          {/* Search bar */}
          <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
            <Search className="w-4 h-4 text-slate-400 ml-2" />
            <input
              type="text"
              placeholder="Search landlords by name, holding company or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-hidden"
            />
          </div>

          {/* Landlords Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLandlords.map(landlord => {
              const ownedProps = dbState.properties.filter(p => p.landlord_id === landlord.id);
              const repCount = (landlord.authorized_representatives || []).length;

              return (
                <div
                  key={landlord.id}
                  onClick={() => setSelectedLandlordId(landlord.id)}
                  className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs hover:border-amber-500 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 font-extrabold text-base flex items-center justify-center border border-amber-200 shadow-2xs">
                        {landlord.first_name[0]}{landlord.last_name[0]}
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                        {ownedProps.length} {ownedProps.length === 1 ? 'Asset' : 'Assets'}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-extrabold text-base text-slate-900 group-hover:text-amber-700 transition-colors">
                        {landlord.first_name} {landlord.last_name}
                      </h3>
                      {landlord.company_name ? (
                        <p className="text-xs font-semibold text-slate-600 truncate mt-0.5">
                          {landlord.company_name}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 mt-0.5">Private Investor</p>
                      )}
                      <p className="text-xs text-slate-500 mt-2 truncate flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{landlord.email}</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Mgmt Fee</span>
                        <strong className="text-slate-900 font-bold">{landlord.management_fee_percentage}%</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Payout Freq</span>
                        <strong className="text-slate-900 font-bold">{landlord.remittance_frequency}</strong>
                      </div>
                    </div>

                    {repCount > 0 && (
                      <div className="text-[11px] text-amber-800 font-semibold bg-amber-50/70 px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                        {repCount} Appointed Legal {repCount === 1 ? 'Delegate' : 'Delegates'}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-700">
                    <span>View Portfolio & Profile</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Onboard Landlord Modal */}
      <OnboardLandlordModal
        isOpen={isOnboardModalOpen}
        onClose={() => setIsOnboardModalOpen(false)}
        properties={dbState.properties}
        onLandlordAdded={() => {
          // Handled
        }}
      />
    </div>
  );
};
