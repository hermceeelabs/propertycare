import React, { useState } from 'react';
import { X, ShieldCheck, Mail, Phone, User, CheckCircle2, Building, Sparkles } from 'lucide-react';
import { UserPermissions, RoleTemplate, UserProfile } from '../types/database';
import { supabase } from '../services/supabase';
import { checkEmailConflict } from '../services/stakeholderValidator';

interface OnboardStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleTemplates: RoleTemplate[];
  properties: Array<{ id: string; name: string }>;
  onStaffAdded: (newProfile: UserProfile) => void;
}

const DEFAULT_PERMISSIONS: UserPermissions = {
  can_view_financials: false,
  can_manage_leases: false,
  can_dispatch_maintenance: false,
  can_issue_notices: false,
  can_edit_properties: false,
  can_trigger_automations: false
};

export const OnboardStaffModal: React.FC<OnboardStaffModalProps> = ({
  isOpen,
  onClose,
  roleTemplates,
  properties,
  onStaffAdded
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(roleTemplates[0]?.id || '');
  const [roleTitle, setRoleTitle] = useState(roleTemplates[0]?.name || 'Operations Specialist');
  const [permissions, setPermissions] = useState<UserPermissions>(
    roleTemplates[0]?.permissions || DEFAULT_PERMISSIONS
  );
  const [assignedProperties, setAssignedProperties] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId === 'custom') {
      setRoleTitle('Custom Role');
      return;
    }
    const template = roleTemplates.find(t => t.id === templateId);
    if (template) {
      setRoleTitle(template.name);
      setPermissions({ ...template.permissions });
    }
  };

  const handleToggleProperty = (propId: string) => {
    setAssignedProperties(prev =>
      prev.includes(propId) ? prev.filter(p => p !== propId) : [...prev, propId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !fullName.trim()) {
      setErrorMsg('Full Name and Email are required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    // Cross-role validation check
    const conflict = await checkEmailConflict(email);
    if (conflict.hasConflict) {
      setErrorMsg(conflict.errorMessage || 'This email is already in use by another role.');
      setIsSubmitting(false);
      return;
    }

    try {
      const newProfile: Partial<UserProfile> = {
        email: email.trim().toLowerCase(),
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        is_owner: false,
        user_type: 'staff',
        role_title: roleTitle.trim() || 'Operations Specialist',
        role_template_id: selectedTemplateId || undefined,
        status: 'Active',
        permissions: permissions,
        assigned_properties: assignedProperties,
        updated_at: new Date().toISOString()
      };

      // Save to Supabase profiles
      const { data, error } = await supabase
        .from('profiles')
        .upsert(newProfile, { onConflict: 'email' })
        .select()
        .single();

      if (error) {
        throw error;
      }

      onStaffAdded(data as UserProfile);
      onClose();
    } catch (err: any) {
      console.error('Error onboarding staff:', err);
      setErrorMsg(err.message || 'Failed to save staff record to database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">Onboard Company Staff</h3>
              <p className="text-xs text-slate-400">Add team members, assign reusable roles or configure custom permissions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Identity Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Full Name *</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. David Miller"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Corporate / Google Email *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="e.g. david@propertyflow.ca"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  placeholder="e.g. (416) 555-0144"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Select Reusable Role Template</label>
              <div className="relative">
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full px-3 py-2 bg-brand-50/50 border border-brand-300 rounded-xl text-xs font-bold text-brand-900 focus:ring-2 focus:ring-brand-500 cursor-pointer"
                >
                  {roleTemplates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.is_system ? '(Standard)' : '(Custom)'}
                    </option>
                  ))}
                  <option value="custom">Custom Role & Permissions</option>
                </select>
              </div>
            </div>
          </div>

          {/* Role Title Customization */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Displayed Job / Role Title</label>
            <input
              type="text"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              placeholder="e.g. Senior Portfolio Operations Lead"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Permissions Matrix */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Granular Permissions (PBAC)
              </span>
              <span className="text-[11px] text-slate-400">
                {selectedTemplateId !== 'custom' ? 'Preset by Template (Editable)' : 'Custom Configuration'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: 'can_view_financials', label: 'Financials & Yield Reports', desc: 'Rent collection, operating expenses & statements' },
                { key: 'can_manage_leases', label: 'Lease Agreements & Terms', desc: 'Draft, renew, and modify residential tenancies' },
                { key: 'can_dispatch_maintenance', label: 'Maintenance & Contractors', desc: 'Dispatch work orders and approve contractor tasks' },
                { key: 'can_issue_notices', label: 'Statutory Legal Notices', desc: 'Ontario Form N1/N4 eviction or increase notices' },
                { key: 'can_edit_properties', label: 'Assets & Suite Units', desc: 'Add property buildings, edit units and shortlets' },
                { key: 'can_trigger_automations', label: 'Automations Center', desc: 'Run automated rent collection and compliance workflows' }
              ].map(perm => {
                const checked = permissions[perm.key as keyof UserPermissions];
                return (
                  <label
                    key={perm.key}
                    className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                      checked ? 'bg-brand-50/40 border-brand-300' : 'bg-slate-50/60 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setPermissions({ ...permissions, [perm.key]: e.target.checked })
                      }
                      className="mt-0.5 rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
                    />
                    <div>
                      <strong className="text-xs text-slate-900 block">{perm.label}</strong>
                      <p className="text-[10px] text-slate-500 leading-snug">{perm.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Property Portfolio Scoping */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Assigned Properties Scope
              </span>
              <span className="text-[11px] text-slate-400">
                {assignedProperties.length === 0 ? 'All Properties (Unrestricted Portfolio)' : `${assignedProperties.length} selected`}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {properties.map(p => {
                const isSelected = assignedProperties.includes(p.id);
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => handleToggleProperty(p.id)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate pr-1">{p.name}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400 italic">
              Leave unselected to give this staff member oversight across the entire property portfolio.
            </p>
          </div>

          {/* Action Buttons */}
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
              className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Registering Staff...' : 'Onboard Staff Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
