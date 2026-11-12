import React, { useState, useEffect } from 'react';
import {
  Building2, Sliders, Mail, ShieldCheck, Sparkles, UserPlus, Edit3, Trash2
} from 'lucide-react';
import { DatabaseState, store, supabase } from '../services/supabase';
import { usePermissions } from '../context/PermissionsContext';
import { RoleTemplate, UserProfile } from '../types/database';
import { OnboardStaffModal } from '../components/OnboardStaffModal';
import { RoleTemplateModal } from '../components/RoleTemplateModal';

interface SettingsProps {
  dbState: DatabaseState;
}

export const SettingsPage: React.FC<SettingsProps> = ({ dbState }) => {
  const [activeTab, setActiveTab] = useState<'access' | 'company' | 'rules' | 'templates'>('access');
  const [accessSubTab, setAccessSubTab] = useState<'team' | 'roles'>('team');

  const { profile, updatePermissions } = usePermissions();

  // Role templates & staff members
  const [roleTemplates, setRoleTemplates] = useState<RoleTemplate[]>([]);
  const [staffProfiles, setStaffProfiles] = useState<UserProfile[]>([]);
  const [isOnboardStaffOpen, setIsOnboardStaffOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<UserProfile | null>(null);
  const [isRoleTemplateModalOpen, setIsRoleTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RoleTemplate | null>(null);
  const [isLoadingAccess, setIsLoadingAccess] = useState(false);

  // Fetch role templates and staff records
  const fetchAccessData = async () => {
    setIsLoadingAccess(true);
    try {
      const { data: templates } = await supabase
        .from('role_templates')
        .select('*')
        .order('name');
      if (templates) setRoleTemplates(templates as RoleTemplate[]);

      const { data: staffList } = await supabase
        .from('staffs')
        .select('*')
        .order('created_at', { ascending: false });
      if (staffList) setStaffProfiles(staffList as UserProfile[]);
    } catch (err) {
      console.error('Error fetching access control data:', err);
    } finally {
      setIsLoadingAccess(false);
    }
  };

  useEffect(() => {
    fetchAccessData();
  }, []);

  const handleToggleStaffStatus = async (staff: UserProfile) => {
    const newStatus = staff.status === 'Active' ? 'Suspended' : 'Active';
    try {
      await supabase
        .from('staffs')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', staff.id);

      setStaffProfiles(prev =>
        prev.map(p => (p.id === staff.id ? { ...p, status: newStatus } : p))
      );
    } catch (err) {
      console.error('Error toggling staff status:', err);
    }
  };

  const handleDeleteRoleTemplate = async (tpl: RoleTemplate) => {
    if (tpl.is_system) return;
    try {
      const { error } = await supabase
        .from('role_templates')
        .delete()
        .eq('id', tpl.id);
      if (error) throw error;
      setRoleTemplates(prev => prev.filter(t => t.id !== tpl.id));
    } catch (err) {
      console.error('Error deleting role template:', err);
    }
  };

  // Template editor state
  const [selectedTemplate, setSelectedTemplate] = useState('Rent Overdue Reminder');
  const [templateContent, setTemplateContent] = useState(`
Dear {{tenant_name}},

This is a reminder that your rent payment of {{rent_amount}} CAD for {{property_name}}, Unit {{unit_number}} due on {{due_date}} is currently overdue.

Please submit Interac e-Transfer to payments@propertyflow.app immediately.

Operations Team
  `.trim());

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-baseline gap-2 sm:gap-3 overflow-hidden">
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight whitespace-nowrap shrink-0">
          System Preferences & Team Access
        </h1>
        <span className="text-cream-400 font-light shrink-0">|</span>
        <p className="text-sm text-stone-600 truncate">
          Manage company staff, reusable role templates, automation thresholds & notification templates
        </p>
      </div>

      {/* Decorative Divider */}
      <hr className="border-t border-slate-800/80" />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-px">
        {[
          { id: 'access', label: 'Team & Granular Access Control', icon: ShieldCheck },
          { id: 'company', label: 'Company Profile', icon: Building2 },
          { id: 'rules', label: 'Automation Rules & Thresholds', icon: Sliders },
          { id: 'templates', label: 'Notification Templates', icon: Mail }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
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

      {/* Tab Panels */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        {/* TEAM & ACCESS CONTROL TAB */}
        {activeTab === 'access' && (
          <div className="space-y-6 max-w-4xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Company Staff & Permission-Based Access Control (PBAC)</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Onboard company staff, edit staff information, assign reusable role templates or configure custom permissions. The <strong>Master Owner</strong> retains fixed full authority.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setEditingTemplate(null);
                    setIsRoleTemplateModalOpen(true);
                  }}
                  className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-4 h-4" /> New Role Template
                </button>
                <button
                  onClick={() => {
                    setEditingStaff(null);
                    setIsOnboardStaffOpen(true);
                  }}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-brand-600/20"
                >
                  <UserPlus className="w-4 h-4" /> Onboard Staff
                </button>
              </div>
            </div>

            {/* Sub-Tabs for Access Management */}
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl text-xs font-bold w-fit">
              <button
                onClick={() => setAccessSubTab('team')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  accessSubTab === 'team' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Staff Directory ({staffProfiles.length})
              </button>
              <button
                onClick={() => setAccessSubTab('roles')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  accessSubTab === 'roles' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Reusable Role Templates ({roleTemplates.length})
              </button>
            </div>

            {/* SUBTAB 1: STAFF DIRECTORY */}
            {accessSubTab === 'team' && (
              <div className="space-y-3">
                {isLoadingAccess ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
                    Loading staff directory...
                  </div>
                ) : staffProfiles.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                    <p className="text-xs text-slate-500">No staff members onboarded yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {staffProfiles.map(staff => {
                      const template = roleTemplates.find(t => t.id === staff.role_template_id);
                      const isCurrentUser = staff.email === profile?.email;
                      const isMasterOwner = staff.email === 'hermceeelabs@gmail.com';
                      const enabledPermsCount = Object.values(staff.permissions || {}).filter(Boolean).length;

                      return (
                        <div key={staff.id} className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-extrabold flex items-center justify-center text-sm shadow-sm shrink-0">
                              {staff.full_name?.[0] || staff.email[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <strong className="text-slate-900 text-xs">{staff.full_name || staff.email}</strong>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  isMasterOwner ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                                  staff.status === 'Suspended' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                                  'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}>
                                  {isMasterOwner ? 'Master Platform Owner' : (staff.status || 'Active')}
                                </span>
                                {isCurrentUser && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">You</span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {staff.role_title || template?.name || 'Custom Role'} • {staff.email}
                                {!isMasterOwner && (
                                  <span className="text-slate-400"> • {enabledPermsCount}/6 capabilities</span>
                                )}
                              </p>
                              {staff.assigned_properties && staff.assigned_properties.length > 0 && (
                                <span className="text-[10px] text-brand-600 font-semibold block mt-0.5">
                                  Scoped to {staff.assigned_properties.length} assigned properties
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-center">
                            {!isMasterOwner && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingStaff(staff);
                                    setIsOnboardStaffOpen(true);
                                  }}
                                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" /> Edit Info & Role
                                </button>
                                <button
                                  onClick={() => handleToggleStaffStatus(staff)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                                    staff.status === 'Active'
                                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                                  }`}
                                >
                                  {staff.status === 'Active' ? 'Suspend Access' : 'Reactivate'}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SUBTAB 2: REUSABLE ROLE TEMPLATES */}
            {accessSubTab === 'roles' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {roleTemplates.map(tpl => {
                    const activePermCount = Object.values(tpl.permissions || {}).filter(Boolean).length;
                    return (
                      <div key={tpl.id} className="p-4 bg-purple-50/40 border border-purple-200 rounded-2xl space-y-2 shadow-xs">
                        <div className="flex items-center justify-between">
                          <strong className="text-xs font-extrabold text-purple-950">{tpl.name}</strong>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800">
                            {tpl.is_system ? 'Standard Role' : 'Custom Role'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">{tpl.description}</p>
                        <div className="pt-2 border-t border-purple-200/60 flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-purple-900">{activePermCount} permissions enabled</span>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                setEditingTemplate(tpl);
                                setIsRoleTemplateModalOpen(true);
                              }}
                              className="text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit Template
                            </button>
                            {!tpl.is_system && (
                              <button
                                onClick={() => handleDeleteRoleTemplate(tpl)}
                                className="text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Onboard / Edit Staff Modal */}
        <OnboardStaffModal
          isOpen={isOnboardStaffOpen}
          onClose={() => {
            setIsOnboardStaffOpen(false);
            setEditingStaff(null);
          }}
          roleTemplates={roleTemplates}
          properties={dbState.properties}
          editingStaff={editingStaff}
          onStaffAdded={(savedStaff) => {
            setStaffProfiles(prev => {
              const exists = prev.some(p => p.id === savedStaff.id);
              if (exists) {
                return prev.map(p => (p.id === savedStaff.id ? savedStaff : p));
              }
              return [savedStaff, ...prev];
            });
            if (profile?.email && savedStaff.email === profile.email && savedStaff.permissions) {
              updatePermissions(savedStaff.permissions);
            }
          }}
        />

        {/* Role Template Modal */}
        <RoleTemplateModal
          isOpen={isRoleTemplateModalOpen}
          onClose={() => {
            setIsRoleTemplateModalOpen(false);
            setEditingTemplate(null);
          }}
          editingTemplate={editingTemplate}
          onSaved={(savedTemplate) => {
            setRoleTemplates(prev => {
              const idx = prev.findIndex(t => t.id === savedTemplate.id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = savedTemplate;
                return next;
              }
              return [...prev, savedTemplate];
            });
          }}
        />

        {/* Company Profile Tab */}
        {activeTab === 'company' && (
          <div className="space-y-4 max-w-2xl text-xs">
            <h3 className="font-bold text-slate-900 text-sm">PropertyFlow Management</h3>
            <p className="text-slate-500">Corporate legal identity, operations headquarters & Interac e-Transfer banking endpoints</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Company Legal Name</label>
                <input type="text" readOnly value="PropertyFlow Management" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium" />
              </div>
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Operating Jurisdiction</label>
                <input type="text" readOnly value="Ontario, Canada (LTB / RTA Compliant)" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium" />
              </div>
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Primary Operational Email</label>
                <input type="text" readOnly value="operations@propertyflow.app" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium" />
              </div>
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Interac e-Transfer Endpoint</label>
                <input type="text" readOnly value="payments@propertyflow.app" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium" />
              </div>
            </div>
          </div>
        )}

        {/* Automation Rules Tab */}
        {activeTab === 'rules' && (
          <div className="space-y-4 max-w-3xl">
            <h3 className="font-bold text-slate-900 text-sm">Configurable Automation Rule Thresholds</h3>
            <div className="space-y-3">
              {dbState.automation_rules.map(rule => (
                <div key={rule.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{rule.name}</span>
                    <button
                      onClick={() => store.updateRule(rule.id, { enabled: !rule.enabled })}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                        rule.enabled ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                    >
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">{rule.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="space-y-4 max-w-3xl">
            <h3 className="font-bold text-slate-900 text-sm">Operational Notification Templates</h3>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
            >
              <option value="Rent Overdue Reminder">Rent Overdue Reminder (3 Days)</option>
              <option value="Lease Renewal Offer">Lease Renewal Offer (60 Days)</option>
              <option value="Vendor Maintenance Dispatch">Vendor Maintenance Dispatch</option>
              <option value="Notice N1 Delivery">Notice N1 Delivery Notification</option>
            </select>

            <textarea
              rows={8}
              value={templateContent}
              onChange={(e) => setTemplateContent(e.target.value)}
              className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            />
          </div>
        )}
      </div>
    </div>
  );
};
