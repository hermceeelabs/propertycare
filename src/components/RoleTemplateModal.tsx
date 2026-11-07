import React, { useState } from 'react';
import { X, ShieldCheck, Plus, Sparkles, Check, Trash2, Edit3 } from 'lucide-react';
import { RoleTemplate, UserPermissions } from '../types/database';
import { supabase } from '../services/supabase';

interface RoleTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (template: RoleTemplate) => void;
  editingTemplate?: RoleTemplate | null;
}

const DEFAULT_PERMS: UserPermissions = {
  can_view_financials: false,
  can_manage_leases: false,
  can_dispatch_maintenance: false,
  can_issue_notices: false,
  can_edit_properties: false,
  can_trigger_automations: false
};

export const RoleTemplateModal: React.FC<RoleTemplateModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  editingTemplate
}) => {
  const [name, setName] = useState(editingTemplate?.name || '');
  const [description, setDescription] = useState(editingTemplate?.description || '');
  const [permissions, setPermissions] = useState<UserPermissions>(
    editingTemplate?.permissions || DEFAULT_PERMS
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Role Name is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const templateId = editingTemplate?.id || `role-custom-${Date.now()}`;
    const newTemplate: RoleTemplate = {
      id: templateId,
      name: name.trim(),
      description: description.trim() || 'Custom reusable role',
      permissions,
      is_system: editingTemplate ? !!editingTemplate.is_system : false,
      updated_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('role_templates')
        .upsert(newTemplate, { onConflict: 'id' })
        .select()
        .single();

      if (error) throw error;
      onSaved(data as RoleTemplate);
      onClose();
    } catch (err: any) {
      console.error('Error saving role template:', err);
      setErrorMsg(err.message || 'Failed to save role template');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white">
                {editingTemplate ? 'Edit Reusable Role' : 'Create Reusable Role Template'}
              </h3>
              <p className="text-xs text-slate-400">Save a standardized bundle of permissions to assign with 1-click</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Role Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Regional Property Supervisor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Role Description</label>
            <textarea
              rows={2}
              placeholder="Specify the operational responsibilities covered by this template..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Granted Permissions Package
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { key: 'can_view_financials', label: 'Financials & P&L Reports' },
                { key: 'can_manage_leases', label: 'Lease Agreements & Terms' },
                { key: 'can_dispatch_maintenance', label: 'Maintenance & Contractors' },
                { key: 'can_issue_notices', label: 'Ontario Notices (N1/N4)' },
                { key: 'can_edit_properties', label: 'Properties & Units Assets' },
                { key: 'can_trigger_automations', label: 'Automations Center' }
              ].map(perm => {
                const checked = permissions[perm.key as keyof UserPermissions];
                return (
                  <label
                    key={perm.key}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      checked ? 'bg-purple-50 border-purple-300 text-purple-900' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <span className="text-xs font-bold">{perm.label}</span>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => setPermissions({ ...permissions, [perm.key]: e.target.checked })}
                      className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                  </label>
                );
              })}
            </div>
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
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition-all cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : 'Save Role Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
