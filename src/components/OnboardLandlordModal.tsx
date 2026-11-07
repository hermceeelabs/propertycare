import React, { useState } from 'react';
import { X, Building, User, Mail, Phone, Landmark, DollarSign, Calendar, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Landlord, LandlordDelegate, Property } from '../types/database';
import { supabase, store } from '../services/supabase';

interface OnboardLandlordModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  onLandlordAdded: (landlord: Landlord) => void;
}

export const OnboardLandlordModal: React.FC<OnboardLandlordModalProps> = ({
  isOpen,
  onClose,
  properties,
  onLandlordAdded
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [managementFee, setManagementFee] = useState('8.0');
  const [remittanceFreq, setRemittanceFreq] = useState<'Monthly' | 'Quarterly' | 'Bi-Weekly'>('Monthly');
  const [notes, setNotes] = useState('');

  // Delegate / Legal counsel
  const [hasDelegate, setHasDelegate] = useState(false);
  const [repName, setRepName] = useState('');
  const [repEmail, setRepEmail] = useState('');
  const [repPhone, setRepPhone] = useState('');
  const [repRelationship, setRepRelationship] = useState<any>('Legal Counsel / Lawyer');
  const [repCanViewStatements, setRepCanViewStatements] = useState(true);
  const [repCanApproveMaintenance, setRepCanApproveMaintenance] = useState(true);

  // Property assignment
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggleProperty = (propId: string) => {
    setSelectedPropertyIds(prev =>
      prev.includes(propId) ? prev.filter(p => p !== propId) : [...prev, propId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setErrorMsg('First Name, Last Name and Email are required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const landlordId = `landlord-${Date.now()}`;
    const delegates: LandlordDelegate[] = [];

    if (hasDelegate && repEmail.trim() && repName.trim()) {
      delegates.push({
        id: `rep-${Date.now()}`,
        name: repName.trim(),
        email: repEmail.trim().toLowerCase(),
        phone: repPhone.trim() || undefined,
        relationship: repRelationship,
        can_view_statements: repCanViewStatements,
        can_approve_maintenance: repCanApproveMaintenance,
        can_modify_banking: false,
        status: 'Active',
        created_at: new Date().toISOString()
      });
    }

    const newLandlord: Landlord = {
      id: landlordId,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || undefined,
      company_name: companyName.trim() || undefined,
      bank_name: bankName.trim() || undefined,
      bank_account_number: bankAccountNumber.trim() || undefined,
      management_fee_percentage: parseFloat(managementFee) || 8.0,
      remittance_frequency: remittanceFreq,
      notes: notes.trim() || undefined,
      authorized_representatives: delegates,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('landlords')
        .insert(newLandlord)
        .select()
        .single();

      if (error) throw error;

      // Update any assigned properties to point to this landlord
      if (selectedPropertyIds.length > 0) {
        await supabase
          .from('properties')
          .update({ landlord_id: landlordId, updated_at: new Date().toISOString() })
          .in('id', selectedPropertyIds);

        selectedPropertyIds.forEach(pId => {
          const prop = store.getState().properties.find(p => p.id === pId);
          if (prop) prop.landlord_id = landlordId;
        });
        store.saveState();
      }

      onLandlordAdded(data as Landlord);
      onClose();
    } catch (err: any) {
      console.error('Error onboarding landlord:', err);
      setErrorMsg(err.message || 'Failed to save landlord record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-md">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">Onboard Landlord / Property Owner</h3>
              <p className="text-xs text-slate-400">Register owner client, banking terms, assigned assets & legal delegates</p>
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

          {/* Identity */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Client Identity</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Richard"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sterling"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Owner Email (Google Sign-In) *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. richard@sterlingholdings.ca"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. (416) 555-8890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 block mb-1">Holding Company / Corporate Entity (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Sterling Asset Holdings Inc."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Financial & Remittance */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Management & Banking Terms</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Management Fee (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={managementFee}
                  onChange={(e) => setManagementFee(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Remittance Frequency</label>
                <select
                  value={remittanceFreq}
                  onChange={(e) => setRemittanceFreq(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Bi-Weekly">Bi-Weekly</option>
                  <option value="Quarterly">Quarterly</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Bank Name</label>
                <input
                  type="text"
                  placeholder="e.g. RBC Royal Bank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="text-xs font-semibold text-slate-700 block mb-1">Bank Account / Direct Deposit Transit</label>
                <input
                  type="text"
                  placeholder="e.g. Transit 00012 Account 1234567"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Assigned Properties */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 block">
              Link Real Estate Assets to Landlord
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {properties.map(p => {
                const isSelected = selectedPropertyIds.includes(p.id);
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => handleToggleProperty(p.id)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-900 text-white border-amber-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate pr-1">{p.name}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pre-authorize Delegate / Legal Counsel */}
          <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <strong className="text-xs text-amber-950">Add Legal Counsel or Delegate Right Now?</strong>
              </div>
              <input
                type="checkbox"
                checked={hasDelegate}
                onChange={(e) => setHasDelegate(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
            </div>

            {hasDelegate && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-200/60">
                <div>
                  <label className="text-[11px] font-bold text-amber-900 block mb-1">Representative Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Marcus Vance, Esq."
                    value={repName}
                    onChange={(e) => setRepName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-amber-900 block mb-1">Representative Email (Google Auth)</label>
                  <input
                    type="email"
                    placeholder="e.g. marcus@vancelaw.ca"
                    value={repEmail}
                    onChange={(e) => setRepEmail(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-amber-900 block mb-1">Relationship</label>
                  <select
                    value={repRelationship}
                    onChange={(e) => setRepRelationship(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    <option value="Legal Counsel / Lawyer">Legal Counsel / Lawyer</option>
                    <option value="Asset Manager">Asset Manager</option>
                    <option value="Family Representative">Family Representative</option>
                    <option value="Accountant / Auditor">Accountant / Auditor</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-amber-900 block mb-1">Representative Phone</label>
                  <input
                    type="tel"
                    placeholder="e.g. (416) 555-0188"
                    value={repPhone}
                    onChange={(e) => setRepPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg text-xs"
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
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Onboarding Landlord...' : 'Onboard Landlord Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
