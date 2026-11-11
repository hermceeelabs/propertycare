import React, { useState } from 'react';
import { X, Landmark, Building2, ShieldCheck, CheckCircle2, User, Phone, Mail, DollarSign, Calendar } from 'lucide-react';
import { store, supabase, DatabaseState } from '../services/supabase';
import { Landlord, LandlordLeaseType, LandlordPaymentStructure, LandlordDelegate } from '../types/database';
import { useCurrency } from '../context/CurrencyContext';
import { checkEmailConflict } from '../services/stakeholderValidator';

interface EditLandlordModalProps {
  isOpen: boolean;
  onClose: () => void;
  landlord: Landlord;
  dbState: DatabaseState;
  onLandlordUpdated: (updated: Landlord) => void;
}

export const EditLandlordModal: React.FC<EditLandlordModalProps> = ({
  isOpen,
  onClose,
  landlord,
  dbState,
  onLandlordUpdated
}) => {
  const { currencyConfig } = useCurrency();

  // Basic Details
  const [firstName, setFirstName] = useState(landlord.first_name);
  const [lastName, setLastName] = useState(landlord.last_name);
  const [email, setEmail] = useState(landlord.email);
  const [phone, setPhone] = useState(landlord.phone || '');
  const [companyName, setCompanyName] = useState(landlord.company_name || '');

  // Banking Details
  const [bankName, setBankName] = useState(landlord.bank_name || '');
  const [bankAccountNumber, setBankAccountNumber] = useState(landlord.bank_account_number || '');

  // Fee & Contract Terms
  const [managementFee, setManagementFee] = useState(landlord.management_fee_percentage?.toString() || '8.0');
  const [remittanceFreq, setRemittanceFreq] = useState<'Monthly' | 'Quarterly' | 'Bi-Weekly'>(
    landlord.remittance_frequency || 'Monthly'
  );
  const [leaseAgreementType, setLeaseAgreementType] = useState<LandlordLeaseType>(
    landlord.lease_agreement_type || 'Direct Management'
  );
  const [paymentStructure, setPaymentStructure] = useState<LandlordPaymentStructure>(
    landlord.payment_structure || 'Monthly'
  );
  const [leaseDurationMonths, setLeaseDurationMonths] = useState(
    landlord.lease_duration_months?.toString() || '12'
  );
  const [agreedPayoutAmount, setAgreedPayoutAmount] = useState(
    landlord.agreed_payout_amount?.toString() || ''
  );
  const [leaseStartDate, setLeaseStartDate] = useState(landlord.lease_start_date || '2026-01-01');
  const [leaseEndDate, setLeaseEndDate] = useState(landlord.lease_end_date || '2026-12-31');
  const [notes, setNotes] = useState(landlord.notes || '');

  // Managed Properties assignment
  const initialPropIds = dbState.properties
    .filter(p => p.landlord_id === landlord.id)
    .map(p => p.id);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>(initialPropIds);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggleProperty = (propId: string) => {
    setSelectedPropertyIds(prev =>
      prev.includes(propId) ? prev.filter(p => p !== propId) : [...prev, propId]
    );
  };

  const handleDurationPreset = (months: number, structure: LandlordPaymentStructure) => {
    setLeaseDurationMonths(months.toString());
    setPaymentStructure(structure);

    if (leaseStartDate) {
      const start = new Date(leaseStartDate);
      start.setMonth(start.getMonth() + months);
      setLeaseEndDate(start.toISOString().slice(0, 10));
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

    // Cross-role validation check (ignoring current landlord id)
    const conflict = await checkEmailConflict(email, landlord.id);
    if (conflict.hasConflict) {
      setErrorMsg(conflict.errorMessage || 'This email is already in use by another stakeholder.');
      setIsSubmitting(false);
      return;
    }

    const updates: Partial<Landlord> = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || undefined,
      company_name: companyName.trim() || undefined,
      bank_name: bankName.trim() || undefined,
      bank_account_number: bankAccountNumber.trim() || undefined,
      management_fee_percentage: parseFloat(managementFee) || 8.0,
      remittance_frequency: remittanceFreq,
      lease_agreement_type: leaseAgreementType,
      payment_structure: paymentStructure,
      lease_duration_months: parseFloat(leaseDurationMonths) || 12,
      agreed_payout_amount: agreedPayoutAmount ? parseFloat(agreedPayoutAmount) : undefined,
      lease_start_date: leaseStartDate,
      lease_end_date: leaseEndDate,
      notes: notes.trim() || undefined,
      updated_at: new Date().toISOString()
    };

    try {
      // 1. Update in local persistent store
      store.updateLandlord(landlord.id, updates);

      // 2. Update properties mapping
      dbState.properties.forEach(p => {
        if (selectedPropertyIds.includes(p.id)) {
          p.landlord_id = landlord.id;
        } else if (p.landlord_id === landlord.id) {
          p.landlord_id = undefined;
        }
      });
      store.saveState();

      // 3. Sync to Supabase
      try {
        await supabase
          .from('landlords')
          .update(updates)
          .eq('id', landlord.id);

        await supabase
          .from('properties')
          .update({ landlord_id: landlord.id, updated_at: new Date().toISOString() })
          .in('id', selectedPropertyIds);

        const unselected = initialPropIds.filter(id => !selectedPropertyIds.includes(id));
        if (unselected.length > 0) {
          await supabase
            .from('properties')
            .update({ landlord_id: null, updated_at: new Date().toISOString() })
            .in('id', unselected);
        }
      } catch (sbErr) {
        console.warn('Could not sync landlord to Supabase:', sbErr);
      }

      const mergedLandlord = { ...landlord, ...updates };
      onLandlordUpdated(mergedLandlord as Landlord);
      onClose();
    } catch (err: any) {
      console.error('Error updating landlord:', err);
      setErrorMsg(err.message || 'Failed to update landlord.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Edit Landlord Profile & Terms</h2>
              <p className="text-xs text-slate-400">Update personal info, payout structures & assigned assets</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-4 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs font-bold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* SECTION 1: Personal / Entity Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <User className="w-4 h-4 text-amber-600" /> Identity & Contact Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Holding Company / Estate Trust Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* SECTION 2: Banking & Remittance */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <Landmark className="w-4 h-4 text-amber-600" /> Banking & Payout Account
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Bank / Financial Institution
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Account Number / Routing
                </label>
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900 font-mono"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: Contractual Terms, Duration & Payment Structure */}
          <div className="space-y-4 bg-amber-50/50 p-4 rounded-2xl border border-amber-200">
            <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-700" /> Lease Duration & Payout Structure
            </h3>

            {/* Quick Duration Presets */}
            <div>
              <span className="text-[11px] font-bold text-amber-900 block mb-1.5">Quick Structure Presets:</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleDurationPreset(12, 'Yearly / Annual Upfront')}
                  className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg text-[11px] font-bold text-amber-900 transition-colors cursor-pointer"
                >
                  1 Year (Annual Upfront)
                </button>
                <button
                  type="button"
                  onClick={() => handleDurationPreset(18, '18 Months Upfront')}
                  className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg text-[11px] font-bold text-amber-900 transition-colors cursor-pointer"
                >
                  1.5 Years (18 Months Upfront)
                </button>
                <button
                  type="button"
                  onClick={() => handleDurationPreset(24, 'Multi-Year Lump-Sum')}
                  className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg text-[11px] font-bold text-amber-900 transition-colors cursor-pointer"
                >
                  2 Years (Multi-Year)
                </button>
                <button
                  type="button"
                  onClick={() => handleDurationPreset(12, 'Monthly')}
                  className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg text-[11px] font-bold text-amber-900 transition-colors cursor-pointer"
                >
                  Standard Monthly
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Agreement Mandate Type *
                </label>
                <select
                  value={leaseAgreementType}
                  onChange={(e) => setLeaseAgreementType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                >
                  <option value="Direct Management">Direct Management Mandate</option>
                  <option value="Master Lease (Corporate)">Master Lease (Corporate Sublease)</option>
                  <option value="Revenue Share / Guaranteed Yield">Revenue Share / Guaranteed Yield</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Payment Disbursement Structure *
                </label>
                <select
                  value={paymentStructure}
                  onChange={(e) => setPaymentStructure(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                >
                  <option value="Monthly">Monthly Remittance</option>
                  <option value="Quarterly">Quarterly Remittance</option>
                  <option value="Semi-Annual (Every 6 Months)">Semi-Annual (Every 6 Months)</option>
                  <option value="Yearly / Annual Upfront">Yearly / 1-Year Upfront</option>
                  <option value="18 Months Upfront">18 Months Upfront (1.5 Years)</option>
                  <option value="Multi-Year Lump-Sum">Multi-Year Lease Lump-Sum</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Contract Duration (Months)
                </label>
                <input
                  type="number"
                  min="1"
                  value={leaseDurationMonths}
                  onChange={(e) => setLeaseDurationMonths(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Agreed Cycle Payout ({currencyConfig.symbol})
                </label>
                <input
                  type="number"
                  placeholder="Leave empty for % net"
                  value={agreedPayoutAmount}
                  onChange={(e) => setAgreedPayoutAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                />
              </div>
            </div>

            <div className="p-2.5 bg-white/80 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>
                <strong>Note:</strong> Firm commission percentages are configured individually on each <strong>Property</strong> and <strong>Suite / Unit</strong>.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Agreement Start Date
                </label>
                <input
                  type="date"
                  value={leaseStartDate}
                  onChange={(e) => setLeaseStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Agreement End / Renewal Date
                </label>
                <input
                  type="date"
                  value={leaseEndDate}
                  onChange={(e) => setLeaseEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: Assigned Managed Properties */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
              <Building2 className="w-4 h-4 text-amber-600" /> Assign Managed Properties
            </h3>
            <p className="text-xs text-slate-500">
              Select properties owned by this landlord. These assets will feed into their financial statements.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
              {dbState.properties.map(prop => {
                const isSelected = selectedPropertyIds.includes(prop.id);
                return (
                  <div
                    key={prop.id}
                    onClick={() => handleToggleProperty(prop.id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                      isSelected
                        ? 'border-amber-600 bg-amber-50/70 text-amber-950 font-bold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div>
                      <span className="block">{prop.name}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{prop.city} • {prop.property_type}</span>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 5: Operational Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Internal Mandate Notes / Special Terms
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" /> Save Landlord Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
