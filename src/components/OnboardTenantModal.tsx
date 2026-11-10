import React, { useState } from 'react';
import { X, UserCheck, Mail, Phone, Calendar, DollarSign, Home, CheckCircle2 } from 'lucide-react';
import { Tenant, Lease, Unit } from '../types/database';
import { supabase, store } from '../services/supabase';
import { useCurrency } from '../context/CurrencyContext';
import { checkEmailConflict } from '../services/stakeholderValidator';

interface OnboardTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  units: Unit[];
  properties: Array<{ id: string; name: string }>;
  onTenantAdded: (tenant: Tenant, lease?: Lease) => void;
}

export const OnboardTenantModal: React.FC<OnboardTenantModalProps> = ({
  isOpen,
  onClose,
  units,
  properties,
  onTenantAdded
}) => {
  const { formatMoney } = useCurrency();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  
  // Unit & Lease Assignment
  const [assignLeaseNow, setAssignLeaseNow] = useState(true);
  const [selectedUnitId, setSelectedUnitId] = useState<string>(units[0]?.id || '');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  
  const selectedUnit = units.find(u => u.id === selectedUnitId);
  const [rentAmount, setRentAmount] = useState<string>(
    selectedUnit ? selectedUnit.monthly_rent.toString() : '2200'
  );
  const [depositAmount, setDepositAmount] = useState<string>(
    selectedUnit ? selectedUnit.monthly_rent.toString() : '2200'
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUnitChange = (unitId: string) => {
    setSelectedUnitId(unitId);
    const u = units.find(unit => unit.id === unitId);
    if (u) {
      setRentAmount(u.monthly_rent.toString());
      setDepositAmount(u.monthly_rent.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setErrorMsg('First Name, Last Name and Email are required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    // Cross-role validation check
    const conflict = await checkEmailConflict(email);
    if (conflict.hasConflict) {
      setErrorMsg(conflict.errorMessage || 'This email is already registered to another stakeholder role.');
      setIsSubmitting(false);
      return;
    }

    const tenantId = `ten-${Date.now()}`;
    const newTenant: Tenant = {
      id: tenantId,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || undefined,
      status: 'Active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let newLease: Lease | undefined = undefined;

    if (assignLeaseNow && selectedUnitId) {
      newLease = {
        id: `lease-${Date.now()}`,
        tenant_id: tenantId,
        unit_id: selectedUnitId,
        start_date: startDate,
        end_date: endDate,
        monthly_rent: parseFloat(rentAmount) || 2200,
        deposit: parseFloat(depositAmount) || 2200,
        status: 'Active',
        renewal_status: 'Pending Review',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    try {
      // 1. Insert tenant
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .insert(newTenant)
        .select()
        .single();

      if (tenantError) throw tenantError;

      // 2. Insert lease if enabled
      if (newLease) {
        const { error: leaseError } = await supabase
          .from('leases')
          .insert(newLease);

        if (leaseError) throw leaseError;

        // Mark unit occupied
        await supabase
          .from('units')
          .update({ status: 'Occupied', updated_at: new Date().toISOString() })
          .eq('id', selectedUnitId);

        const currentUnit = store.getState().units.find(u => u.id === selectedUnitId);
        if (currentUnit) currentUnit.status = 'Occupied';
        store.getState().leases.unshift(newLease);
      }

      store.getState().tenants.unshift(newTenant);
      store.saveState();

      onTenantAdded(tenantData as Tenant, newLease);
      onClose();
    } catch (err: any) {
      console.error('Error onboarding tenant:', err);
      setErrorMsg(err.message || 'Failed to onboard tenant client.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">Onboard Resident / Tenant Client</h3>
              <p className="text-xs text-slate-400">Register active resident, bind lease terms and grant Resident Portal access</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Resident Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Resident Contact Info</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Emily"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Watson"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Resident Email (Google Auth) *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. emily.watson@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. (416) 555-0911"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Lease Binding */}
          <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <strong className="text-xs text-emerald-950 block">Bind Active Lease Agreement</strong>
                <p className="text-[11px] text-emerald-700">Assign a suite unit and set contract monthly rent terms</p>
              </div>
              <input
                type="checkbox"
                checked={assignLeaseNow}
                onChange={(e) => setAssignLeaseNow(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            {assignLeaseNow && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-emerald-200/60">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Assigned Suite Unit *</label>
                  <select
                    value={selectedUnitId}
                    onChange={(e) => handleUnitChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    {units.map(u => {
                      const prop = properties.find(p => p.id === u.property_id);
                      return (
                        <option key={u.id} value={u.id}>
                          {prop?.name || 'Property'} • Unit {u.unit_number} ({u.unit_type} - {formatMoney(u.monthly_rent)}/mo) [{u.status}]
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Lease Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Lease Expiration Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Contract Monthly Rent</label>
                  <input
                    type="number"
                    value={rentAmount}
                    onChange={(e) => setRentAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Security Deposit Held</label>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Onboarding Resident...' : 'Onboard Resident Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
