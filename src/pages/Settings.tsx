import React, { useState, useEffect } from 'react';
import { Settings, Building2, Sliders, Mail, Link2, Check, AlertCircle, Info, RefreshCw, Database, Download, Upload, FileCode, ShieldCheck, Users, Lock, Plus, Sparkles, UserPlus, Trash2, Edit3 } from 'lucide-react';
import { DatabaseState, store, supabase } from '../services/supabase';
import { usePermissions } from '../context/PermissionsContext';
import { RoleTemplate, UserProfile, UserPermissions } from '../types/database';
import { OnboardStaffModal } from '../components/OnboardStaffModal';
import { RoleTemplateModal } from '../components/RoleTemplateModal';

interface SettingsProps {
  dbState: DatabaseState;
}

export const SettingsPage: React.FC<SettingsProps> = ({ dbState }) => {
  const [activeTab, setActiveTab] = useState<'access' | 'database' | 'company' | 'rules' | 'templates' | 'integrations'>('access');
  const [accessSubTab, setAccessSubTab] = useState<'team' | 'roles' | 'my_permissions'>('team');
  const [stessaMsg, setStessaMsg] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const { profile, isOwner, updatePermissions, setUserType } = usePermissions();

  // Role templates & staff members
  const [roleTemplates, setRoleTemplates] = useState<RoleTemplate[]>([]);
  const [staffProfiles, setStaffProfiles] = useState<UserProfile[]>([]);
  const [isOnboardStaffOpen, setIsOnboardStaffOpen] = useState(false);
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

  // Template editor state
  const [selectedTemplate, setSelectedTemplate] = useState('Rent Overdue Reminder');
  const [templateContent, setTemplateContent] = useState(`
Dear {{tenant_name}},

This is a reminder that your rent payment of {{rent_amount}} CAD for {{property_name}}, Unit {{unit_number}} due on {{due_date}} is currently overdue.

Please submit Interac e-Transfer to payments@propertyflow.app immediately.

Operations Team
  `.trim());

  const handleDownloadJson = () => {
    const jsonStr = store.exportJsonDatabase();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `propertyflow-database-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = store.importJsonDatabase(content);
      if (success) {
        setImportStatus('Database successfully imported and synchronized!');
      } else {
        setImportStatus('Failed to import JSON file. Please ensure it has a valid PropertyFlow schema.');
      }
      setTimeout(() => setImportStatus(null), 5000);
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">System Preferences & Database Management</h1>
        <p className="text-sm text-slate-500">Configure company profile, JSON database synchronization, automation rules & integrations</p>
      </div>

      {/* Decorative Divider */}
      <hr className="border-t border-slate-800/80" />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-px">
        {[
          { id: 'access', label: 'Team & Granular Access Control', icon: ShieldCheck },
          { id: 'database', label: 'Cloud Supabase & Sync', icon: Database },
          { id: 'company', label: 'Company Profile', icon: Building2 },
          { id: 'rules', label: 'Automation Rules & Thresholds', icon: Sliders },
          { id: 'templates', label: 'Notification Templates', icon: Mail },
          { id: 'integrations', label: 'Integrations (Stessa / n8n / Resend)', icon: Link2 }
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

      {/* Tab Panels */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        {/* TEAM & ACCESS CONTROL TAB */}
        {activeTab === 'access' && (
          <div className="space-y-6 max-w-4xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Company Staff & Permission-Based Access Control (PBAC)</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Onboard company staff, manage reusable role templates and configure granular permissions. The <strong>Owner Account</strong> retains fixed full authority.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsRoleTemplateModalOpen(true)}
                  className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-4 h-4" /> New Role Template
                </button>
                <button
                  onClick={() => setIsOnboardStaffOpen(true)}
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
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  accessSubTab === 'team' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Staff Directory ({staffProfiles.length})
              </button>
              <button
                onClick={() => setAccessSubTab('roles')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  accessSubTab === 'roles' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Reusable Role Templates ({roleTemplates.length})
              </button>
              <button
                onClick={() => setAccessSubTab('my_permissions')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  accessSubTab === 'my_permissions' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Active Session Permissions
              </button>
            </div>

            {/* SUBTAB 1: STAFF DIRECTORY */}
            {accessSubTab === 'team' && (
              <div className="space-y-3">
                {staffProfiles.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                    <p className="text-xs text-slate-500">No staff members onboarded yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {staffProfiles.map(staff => {
                      const template = roleTemplates.find(t => t.id === staff.role_template_id);
                      const isCurrentUser = staff.email === profile?.email;
                      return (
                        <div key={staff.id} className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-extrabold flex items-center justify-center text-sm shadow-sm">
                              {staff.full_name?.[0] || staff.email[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <strong className="text-slate-900 text-xs">{staff.full_name || staff.email}</strong>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  staff.email === 'hermceeelabs@gmail.com' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                                  staff.status === 'Suspended' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                                  'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}>
                                  {staff.email === 'hermceeelabs@gmail.com' ? 'Master Platform Owner' : (staff.status || 'Active')}
                                </span>
                                {isCurrentUser && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">You</span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {staff.role_title || template?.name || 'Operations Staff'} • {staff.email}
                              </p>
                              {staff.assigned_properties && staff.assigned_properties.length > 0 && (
                                <span className="text-[10px] text-brand-600 font-semibold block mt-0.5">
                                  Scoped to {staff.assigned_properties.length} assigned properties
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-center">
                            {staff.email !== 'hermceeelabs@gmail.com' && (
                              <button
                                onClick={() => handleToggleStaffStatus(staff)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                                  staff.status === 'Active'
                                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                {staff.status === 'Active' ? 'Suspend Access' : 'Reactivate'}
                              </button>
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
                          <button
                            onClick={() => {
                              setEditingTemplate(tpl);
                              setIsRoleTemplateModalOpen(true);
                            }}
                            className="text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit Template
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SUBTAB 3: ACTIVE SESSION & PERMISSION TOGGLES */}
            {accessSubTab === 'my_permissions' && (
              <div className="space-y-4">
                {/* Current Active User Card */}
                <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-stone-900 text-white font-extrabold flex items-center justify-center text-sm shadow-md">
                      {profile?.full_name?.[0] || 'A'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-stone-900 text-sm">{profile?.full_name || 'Active Admin'}</strong>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {isOwner ? 'Fixed Owner / SuperAdmin' : 'Staff / Custom Permissions'}
                        </span>
                      </div>
                      <span className="text-xs text-stone-500">{profile?.email || 'Corporate Account'}</span>
                    </div>
                  </div>

                  {/* Role Toggle for Interactive Demo */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-stone-600">Simulate Role:</span>
                    <select
                      value={profile?.user_type || 'owner'}
                      onChange={(e) => setUserType(e.target.value as any)}
                      className="px-3 py-1.5 bg-white border border-stone-300 rounded-xl text-xs font-bold text-stone-800 cursor-pointer shadow-xs"
                    >
                      <option value="owner">Owner (Full Unrestricted)</option>
                      <option value="staff">Team Member (Custom Permissions)</option>
                    </select>
                  </div>
                </div>

                {/* Granular Permission Toggles */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700">Granular Workspace Capabilities</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { key: 'can_view_financials', label: 'View Financials & P&L Reports', desc: 'Access to Rent Collections, Operating Expenses, Bills & Yield analytics' },
                      { key: 'can_manage_leases', label: 'Manage Leases & Rent Terms', desc: 'Create, renew, or adjust active tenant lease agreements' },
                      { key: 'can_dispatch_maintenance', label: 'Dispatch Maintenance & Vendors', desc: 'Triage repair tickets and assign registered trade contractors' },
                      { key: 'can_issue_notices', label: 'Issue Statutory Legal Notices', desc: 'Draft and approve Ontario Form N1/N4 eviction or increase notices' },
                      { key: 'can_edit_properties', label: 'Manage Physical Assets & Units', desc: 'Add new property buildings, edit units and shortlet configurations' },
                      { key: 'can_trigger_automations', label: 'Automations Center & Engine Triggers', desc: 'Execute recurring automation rules and view compliance audit trails' },
                    ].map(item => {
                      const isChecked = isOwner || !!profile?.permissions[item.key as keyof typeof profile.permissions];
                      return (
                        <div key={item.key} className="p-4 bg-white border border-stone-200 rounded-2xl flex items-start justify-between gap-3 shadow-xs">
                          <div className="space-y-0.5">
                            <strong className="text-xs text-stone-900 block">{item.label}</strong>
                            <p className="text-[11px] text-stone-500 leading-snug">{item.desc}</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isOwner}
                            onChange={(e) => updatePermissions({ [item.key]: e.target.checked })}
                            className="mt-1 w-4 h-4 rounded text-brand-600 focus:ring-brand-500 cursor-pointer disabled:opacity-50"
                          />
                        </div>
                      );
                    })}
                  </div>
                  {isOwner && (
                    <p className="text-[11px] text-stone-400 italic">
                      * Note: As the Master Owner account, all capabilities are permanently enabled to prevent accidental lockout.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Onboard Staff Modal */}
        <OnboardStaffModal
          isOpen={isOnboardStaffOpen}
          onClose={() => setIsOnboardStaffOpen(false)}
          roleTemplates={roleTemplates}
          properties={dbState.properties}
          onStaffAdded={(newStaff) => {
            setStaffProfiles(prev => [newStaff, ...prev.filter(p => p.id !== newStaff.id)]);
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

        {/* JSON DATABASE & GITHUB SYNC TAB */}
        {activeTab === 'database' && (
          <div className="space-y-6 max-w-4xl">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Client Demo JSON Database</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                This repository includes a standalone version-controlled JSON database committed to GitHub at{' '}
                <code className="text-brand-700 bg-brand-50 px-1 py-0.5 rounded font-mono text-[11px]">src/data/database.json</code>.
                All operational updates (properties, suites, expenses, profit margins, tenant screenings, leases) sync seamlessly with this schema.
              </p>
            </div>

            {/* Sync Status Banner */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start gap-3">
              <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-xs text-emerald-900">GitHub Standalone Mode Active</h4>
                <p className="text-xs text-emerald-800">
                  The demo does not require external database servers or API keys. Anyone cloning this repository from GitHub can run the entire platform with full unit economics out of the box.
                </p>
              </div>
            </div>

            {/* Live Database Statistics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 block">Properties</span>
                <span className="text-lg font-extrabold text-slate-900">{dbState.properties.length}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 block">Units</span>
                <span className="text-lg font-extrabold text-slate-900">{dbState.units.length}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 block">Logged Expenses</span>
                <span className="text-lg font-extrabold text-rose-600">{(dbState.expenses || []).length}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 block">Invoices & Bills</span>
                <span className="text-lg font-extrabold text-brand-700">{dbState.bills.length}</span>
              </div>
            </div>

            {/* Import / Export Controls */}
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Export & Sync Actions</h4>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleDownloadJson}
                  className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download Latest database.json
                </button>

                <label className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-2 shadow-xs">
                  <Upload className="w-4 h-4" /> Import External database.json
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={() => {
                    store.resetDemoData();
                    window.location.reload();
                  }}
                  className="px-4 py-2.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-xl transition-colors ml-auto"
                >
                  Reset to Seed Database
                </button>
              </div>

              {importStatus && (
                <div className={`p-3 rounded-lg text-xs font-semibold ${importStatus.includes('success') ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {importStatus}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Company Profile Tab */}
        {activeTab === 'company' && (
          <div className="space-y-4 max-w-2xl text-xs">
            <h3 className="font-bold text-slate-900 text-sm">PropertyFlow Management</h3>
            <p className="text-slate-500">Corporate legal identity, operations headquarters & Interac e-Transfer banking endpoints</p>

            <div className="grid grid-cols-2 gap-4 pt-2">
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
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </span>
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

        {/* Integrations Tab */}
        {activeTab === 'integrations' && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Third-Party SaaS Integrations</h3>
              <p className="text-xs text-slate-500">External connections for automated bookkeeping, custom webhook pipelines & transactional email</p>
            </div>

            {/* Stessa Integration */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Stessa Property Accounting Sync</h4>
                  <p className="text-xs text-slate-500">Automated financial ledger sync, asset performance & tax reporting</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                  Status: Not Connected
                </span>
              </div>
              <button
                onClick={() => setStessaMsg(true)}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
              >
                Connect Stessa
              </button>
              {stessaMsg && (
                <p className="text-xs font-semibold text-brand-700 bg-brand-50 p-2.5 rounded border border-brand-200">
                  Integration configuration will be available in production.
                </p>
              )}
            </div>

            {/* n8n Integration */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">n8n Workflow Automation Orchestrator</h4>
                  <p className="text-xs text-slate-500">External multi-step webhook pipeline orchestration & third-party connectors</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                  Status: Not Connected
                </span>
              </div>
              <p className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed">
                n8n can be connected later for external workflow orchestration and third-party integrations (e.g. SMS gateways, banking API Webhooks, automated accounting sync).
              </p>
            </div>

            {/* Resend Provider */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Resend Production Email Provider</h4>
                  <p className="text-xs text-slate-500">Transactional email engine with custom domain DKIM/SPF verification</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  POC Mock Provider Active
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Current POC uses <code>MockEmailProvider</code> to generate rendered email previews without requiring a Resend API key or sending domain.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
