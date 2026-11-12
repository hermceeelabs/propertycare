import React, { useState, useMemo } from 'react';
import {
  ClipboardCheck, Calendar, Users, Building2, Home, Sparkles, Search,
  CheckCircle2, Clock, AlertTriangle, Lock, Eye, Paperclip, UserCheck,
  Plus, Sliders, DollarSign
} from 'lucide-react';
import { DatabaseState, store } from '../services/supabase';
import { PropertyInspection } from '../types/database';
import { DEFAULT_STAFF_DIRECTORY } from '../services/inspectionScheduler';
import { InspectionGeneratorModal } from '../components/InspectionGeneratorModal';
import { InspectionDetailModal } from '../components/InspectionDetailModal';
import { usePermissions } from '../context/PermissionsContext';
import { useCurrency, CurrencyCode } from '../context/CurrencyContext';

interface InspectionsPageProps {
  dbState: DatabaseState;
}

export const InspectionsPage: React.FC<InspectionsPageProps> = ({ dbState }) => {
  const { profile, isOwner } = usePermissions();
  const { currentCurrency, convertAmount, currencyConfig } = useCurrency();

  const currentStaffName = profile?.full_name || 'Marcus Vance';

  const [viewMode, setViewMode] = useState<'timetable' | 'ledger' | 'workload'>('timetable');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>('All');
  const [selectedMonth, setSelectedMonth] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isGeneratorOpen, setIsGeneratorOpen] = useState<boolean>(false);
  const [activeInspection, setActiveInspection] = useState<PropertyInspection | null>(null);
  const [isAddSingleOpen, setIsAddSingleOpen] = useState<boolean>(false);

  // Quick single inspection form
  const [singlePropId, setSinglePropId] = useState<string>(dbState.properties[0]?.id || '');
  const [singleUnitId, setSingleUnitId] = useState<string>('');
  const [singleDate, setSingleDate] = useState<string>('2026-11-20');
  const [singleTime, setSingleTime] = useState<string>('10:00 AM');
  const [singleTitle, setSingleTitle] = useState<string>('Routine Suite & Safety Walkthrough');
  const [singleLeadId, setSingleLeadId] = useState<string>(DEFAULT_STAFF_DIRECTORY[0].id);

  const inspections = useMemo(() => {
    return [...(dbState.inspections || [])].sort((a, b) =>
      (b.scheduled_date || '').localeCompare(a.scheduled_date || '')
    );
  }, [dbState.inspections]);

  const getPropNativeCurrency = (propertyId?: string): CurrencyCode => {
    const prop = (dbState.properties || []).find(p => p.id === propertyId);
    return (
      prop?.acquisition?.acquisition_currency ||
      (prop?.city === 'Lagos' || prop?.city === 'Abuja' ? 'NGN' : 'CAD')
    );
  };

  const availableMonths = useMemo(() => {
    const s = new Set<string>();
    inspections.forEach(i => {
      if (i.scheduled_date && i.scheduled_date.length >= 7) {
        s.add(i.scheduled_date.slice(0, 7));
      }
    });
    return Array.from(s).sort((a, b) => b.localeCompare(a));
  }, [inspections]);

  const formatMonthLabel = (ym: string) => {
    const [y, m] = ym.split('-');
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Filtered Inspections
  const filteredInspections = useMemo(() => {
    return inspections.filter(insp => {
      if (selectedPropertyId !== 'All' && insp.property_id !== selectedPropertyId) return false;
      if (selectedStatus !== 'All' && insp.status !== selectedStatus) return false;
      if (selectedMonth !== 'All' && !(insp.scheduled_date || '').startsWith(selectedMonth)) {
        return false;
      }

      if (selectedStaffFilter === 'My Inspections') {
        const isMine =
          insp.team_lead_name.toLowerCase() === currentStaffName.toLowerCase() ||
          (insp.assigned_attendees || []).some(
            a => a.staff_name.toLowerCase() === currentStaffName.toLowerCase()
          );
        if (!isMine) return false;
      } else if (selectedStaffFilter !== 'All') {
        const matchesStaff =
          insp.team_lead_name === selectedStaffFilter ||
          (insp.assigned_attendees || []).some(a => a.staff_name === selectedStaffFilter);
        if (!matchesStaff) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const prop = dbState.properties.find(p => p.id === insp.property_id);
        const unit = dbState.units.find(u => u.id === insp.unit_id);
        const hay = [
          insp.title,
          insp.general_remarks,
          insp.team_lead_name,
          prop?.name,
          unit?.unit_number,
          ...(insp.assigned_attendees || []).map(a => a.staff_name)
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [
    inspections,
    selectedPropertyId,
    selectedStatus,
    selectedMonth,
    selectedStaffFilter,
    searchQuery,
    currentStaffName,
    dbState.properties,
    dbState.units
  ]);

  // Group filtered inspections by Month (YYYY-MM) for Timetable View
  const groupedByMonth = useMemo(() => {
    const groups: Record<string, PropertyInspection[]> = {};
    filteredInspections.forEach(insp => {
      const ym = (insp.scheduled_date || '2026-11').slice(0, 7);
      if (!groups[ym]) groups[ym] = [];
      groups[ym].push(insp);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredInspections]);

  // Staff Workload & Attendance Analytics across all inspections
  const staffWorkloadStats = useMemo(() => {
    return DEFAULT_STAFF_DIRECTORY.map(staff => {
      const assignedList = inspections.filter(
        i =>
          i.team_lead_name === staff.name ||
          (i.assigned_attendees || []).some(a => a.staff_name === staff.name)
      );
      const leadList = inspections.filter(i => i.team_lead_name === staff.name);
      const completedSessions = assignedList.filter(i => i.status === 'Approved / Completed');
      const attendedCount = assignedList.filter(i =>
        (i.assigned_attendees || []).some(a => a.staff_name === staff.name && a.attended)
      ).length;

      // Group by month to find peak monthly load
      const byMonth: Record<string, number> = {};
      const byWeek: Record<string, number> = {};
      assignedList.forEach(i => {
        const ym = (i.scheduled_date || '').slice(0, 7);
        if (ym) byMonth[ym] = (byMonth[ym] || 0) + 1;
        const d = new Date((i.scheduled_date || '2026-11-01') + 'T12:00:00Z');
        const wk = `${d.getUTCFullYear()}-${Math.ceil(d.getUTCDate() / 7)}-${d.getUTCMonth()}`;
        byWeek[wk] = (byWeek[wk] || 0) + 1;
      });

      const peakMonthLoad = Object.values(byMonth).length
        ? Math.max(...Object.values(byMonth))
        : 0;
      const peakWeekLoad = Object.values(byWeek).length
        ? Math.max(...Object.values(byWeek))
        : 0;

      return {
        staff,
        totalAssigned: assignedList.length,
        leadCount: leadList.length,
        completedCount: completedSessions.length,
        attendedCount,
        peakWeekLoad,
        peakMonthLoad
      };
    });
  }, [inspections]);

  // KPI Metrics
  const completedCount = inspections.filter(i => i.status === 'Approved / Completed').length;
  const scheduledCount = inspections.filter(
    i => i.status === 'Scheduled' || i.status === 'In Progress' || i.status === 'Pending Review'
  ).length;
  const totalIncurredInActiveCurr = inspections.reduce((sum, i) => {
    if (!i.incurred_cost) return sum;
    const native = getPropNativeCurrency(i.property_id);
    return sum + convertAmount(i.incurred_cost, native, currentCurrency);
  }, 0);

  const handleCreateSingleInspection = (e: React.FormEvent) => {
    e.preventDefault();
    const lead =
      DEFAULT_STAFF_DIRECTORY.find(s => s.id === singleLeadId) || DEFAULT_STAFF_DIRECTORY[0];
    const crew = DEFAULT_STAFF_DIRECTORY.filter(s => s.id !== lead.id).slice(0, 2);

    const newInsp: PropertyInspection = {
      id: `insp-manual-${Date.now()}`,
      property_id: singlePropId,
      unit_id: singleUnitId || undefined,
      title: singleTitle.trim() || 'Scheduled Property Inspection',
      scheduled_date: singleDate,
      scheduled_time: singleTime,
      team_lead_id: lead.id,
      team_lead_name: lead.name,
      assigned_attendees: [
        {
          staff_id: lead.id,
          staff_name: lead.name,
          staff_role: `${lead.role} (Team Lead)`,
          attended: false
        },
        ...crew.map(c => ({
          staff_id: c.id,
          staff_name: c.name,
          staff_role: c.role,
          attended: false
        }))
      ],
      status: 'Scheduled',
      general_remarks: 'Scheduled via Field Operations Hub.',
      findings: [
        { area: 'General Interior & Safety', rating: 'Good', remarks: 'Awaiting field inspection.' }
      ],
      attachments: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    store.addInspection(newInsp);
    setIsAddSingleOpen(false);
  };

  // Keep activeInspection synced with latest dbState
  const syncedActiveInspection = useMemo(() => {
    if (!activeInspection) return null;
    return inspections.find(i => i.id === activeInspection.id) || activeInspection;
  }, [inspections, activeInspection]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Title & Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Inspection Timetable, Staff Quotas & Field Audits
          </h1>
          <p className="text-sm text-slate-500">
            Configure property inspection frequencies, balance staff weekly/monthly workloads, track crew attendance & lock Team Lead approvals
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsAddSingleOpen(true)}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Schedule Single Inspection
          </button>
          <button
            onClick={() => setIsGeneratorOpen(true)}
            className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer"
          >
            <Sparkles className="w-4 h-4" /> Generate Smart Inspection Timetable
          </button>
        </div>
      </div>

      <hr className="border-t border-slate-800/80" />

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Total Timetable Sessions
            </span>
            <Calendar className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">{inspections.length}</div>
          <p className="text-[11px] text-slate-500">
            {scheduledCount} upcoming / active • {completedCount} signed off
          </p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Team Lead Signed & Locked
            </span>
            <Lock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono">
            {completedCount}{' '}
            <span className="text-xs font-bold text-slate-500">Verified Audits</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Approved by designated Team Leads (read-only lock active)
          </p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Active Inspection Crew Pool
            </span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {DEFAULT_STAFF_DIRECTORY.length} <span className="text-xs font-bold text-slate-500">Staff</span>
          </div>
          <p className="text-[11px] text-slate-500">
            {DEFAULT_STAFF_DIRECTORY.filter(s => s.can_be_lead).length} Team Leads •{' '}
            {DEFAULT_STAFF_DIRECTORY.length} Field Inspectors
          </p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Inspection-Linked Expenses
            </span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {currencyConfig.symbol}
            {Math.round(totalIncurredInActiveCurr).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500">
            Synced to Property & Landlord Statements
          </p>
        </div>
      </div>

      {/* View Switcher & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* View Mode Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('timetable')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'timetable'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly Timetable Schedule
            </button>
            <button
              onClick={() => setViewMode('workload')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'workload'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Staff Quotas & Attendance Matrix
            </button>
            <button
              onClick={() => setViewMode('ledger')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'ledger'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Detailed Audit Cards
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[230px] flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search property, unit, staff, findings..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
            />
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Property:</span>
            <select
              value={selectedPropertyId}
              onChange={e => setSelectedPropertyId(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 cursor-pointer"
            >
              <option value="All">All Properties ({dbState.properties.length})</option>
              {dbState.properties.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Staff / Crew:</span>
            <select
              value={selectedStaffFilter}
              onChange={e => setSelectedStaffFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 cursor-pointer"
            >
              <option value="All">All Inspection Staff</option>
              <option value="My Inspections">My Assigned Inspections ({currentStaffName})</option>
              {DEFAULT_STAFF_DIRECTORY.map(s => (
                <option key={s.id} value={s.name}>
                  {s.name} ({s.can_be_lead ? 'Team Lead' : 'Inspector'})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Status:</span>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending Review">Pending Team Lead Review</option>
              <option value="Approved / Completed">Approved / Completed (Locked)</option>
              <option value="Missed">Missed</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Month:</span>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 cursor-pointer"
            >
              <option value="All">All Months</option>
              {availableMonths.map(ym => (
                <option key={ym} value={ym}>
                  {formatMonthLabel(ym)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* VIEW 1: MONTHLY TIMETABLE SCHEDULE */}
      {viewMode === 'timetable' && (
        <div className="space-y-6">
          {groupedByMonth.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-2">
              <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">
                No scheduled or completed inspections match your current filter.
              </p>
              <button
                onClick={() => setIsGeneratorOpen(true)}
                className="mt-2 px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Generate Multi-Month Timetable
              </button>
            </div>
          ) : (
            groupedByMonth.map(([ym, monthList]) => (
              <div
                key={ym}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
              >
                <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-brand-400" />
                    <h3 className="font-bold text-sm tracking-wide">{formatMonthLabel(ym)}</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-[11px] font-bold">
                    {monthList.length} Inspections Scheduled / Conducted
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                        <th className="py-3 px-4">Date & Window</th>
                        <th className="py-3 px-4">Property & Unit</th>
                        <th className="py-3 px-4">Inspection Title & Remarks</th>
                        <th className="py-3 px-4">Team Lead</th>
                        <th className="py-3 px-4">Assigned Crew & Attendance</th>
                        <th className="py-3 px-4">Status & Lock</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthList.map(insp => {
                        const prop = dbState.properties.find(p => p.id === insp.property_id);
                        const unit = dbState.units.find(u => u.id === insp.unit_id);
                        const isLocked =
                          insp.status === 'Approved / Completed' && Boolean(insp.team_lead_signed_at);
                        const attendedCount = (insp.assigned_attendees || []).filter(
                          a => a.attended
                        ).length;
                        const totalCrew = (insp.assigned_attendees || []).length;

                        return (
                          <tr
                            key={insp.id}
                            onClick={() => setActiveInspection(insp)}
                            className="hover:bg-slate-50/90 transition-colors cursor-pointer"
                          >
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="font-mono font-bold text-slate-900">
                                {insp.scheduled_date}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {insp.scheduled_time || '10:00 AM'}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900">{prop?.name}</div>
                              <div className="text-[11px] text-slate-500">
                                {unit ? `Suite ${unit.unit_number}` : 'Building-Wide Audit'}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 max-w-xs">
                              <div className="font-bold text-slate-900 truncate">{insp.title}</div>
                              <div className="text-[11px] text-slate-500 truncate">
                                {insp.general_remarks}
                              </div>
                              {(insp.attachments || []).length > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 mt-1">
                                  <Paperclip className="w-3 h-3" /> {(insp.attachments || []).length}{' '}
                                  Media Files
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-purple-800 block">
                                {insp.team_lead_name}
                              </span>
                              {insp.team_lead_signed_at && (
                                <span className="text-[10px] text-emerald-700 font-semibold">
                                  ✓ Signed Off
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="text-slate-700 font-medium truncate max-w-[190px]">
                                {(insp.assigned_attendees || []).map(a => a.staff_name).join(', ')}
                              </div>
                              <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                                Attendance: {attendedCount}/{totalCrew} Present
                              </div>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                                  isLocked
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : insp.status === 'Scheduled'
                                    ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                    : insp.status === 'Missed'
                                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}
                              >
                                {isLocked && <Lock className="w-3 h-3" />}
                                {insp.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  setActiveInspection(insp);
                                }}
                                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-bold cursor-pointer"
                              >
                                {isLocked ? 'View Locked Audit' : 'Update / Approve'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* VIEW 2: STAFF WORKLOAD, QUOTAS & ATTENDANCE TRACKER */}
      {viewMode === 'workload' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm">
                Staff Inspection Roster, Weekly/Monthly Quotas & Attendance Audit
              </h3>
              <p className="text-xs text-slate-400">
                Monitors how many inspections each person conducts per week/month and verifies physical on-site attendance
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                  <th className="py-3.5 px-4">Staff Member</th>
                  <th className="py-3.5 px-4">Role & Authority</th>
                  <th className="py-3.5 px-4">Times as Team Lead</th>
                  <th className="py-3.5 px-4">Total Assigned</th>
                  <th className="py-3.5 px-4">On-Site Attendance</th>
                  <th className="py-3.5 px-4">Peak Weekly Load</th>
                  <th className="py-3.5 px-4">Peak Monthly Load</th>
                  <th className="py-3.5 px-4 text-right">Filter Schedule</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {staffWorkloadStats.map(row => (
                  <tr key={row.staff.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{row.staff.name}</div>
                      <div className="text-[11px] text-slate-500">{row.staff.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800 block">{row.staff.role}</span>
                      {row.staff.can_be_lead && (
                        <span className="inline-block mt-0.5 px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-bold">
                          Authorized Team Lead
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-purple-700">
                      {row.leadCount} sessions
                    </td>
                    <td className="py-3.5 px-4 font-black text-slate-900">
                      {row.totalAssigned} sessions
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-emerald-700">
                        {row.attendedCount} attended
                      </span>{' '}
                      <span className="text-slate-400">
                        ({row.completedCount} completed)
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold">
                        {row.peakWeekLoad} / week
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 font-bold">
                        {row.peakMonthLoad} / month
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedStaffFilter(row.staff.name);
                          setViewMode('timetable');
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-[11px] font-bold cursor-pointer"
                      >
                        View Timetable
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: DETAILED AUDIT CARDS */}
      {viewMode === 'ledger' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredInspections.map(insp => {
            const prop = dbState.properties.find(p => p.id === insp.property_id);
            const unit = dbState.units.find(u => u.id === insp.unit_id);
            const isLocked =
              insp.status === 'Approved / Completed' && Boolean(insp.team_lead_signed_at);

            return (
              <div
                key={insp.id}
                onClick={() => setActiveInspection(insp)}
                className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-brand-500 transition-all cursor-pointer space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block">
                      {insp.scheduled_date} • {insp.scheduled_time || '10:00 AM'}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">{insp.title}</h4>
                    <p className="text-xs text-slate-500">
                      {prop?.name} {unit ? `• Suite ${unit.unit_number}` : '• Building-Wide'}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      isLocked
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-blue-50 text-blue-800 border border-blue-200'
                    }`}
                  >
                    {insp.status}
                  </span>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2">{insp.general_remarks}</p>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    Lead: <strong className="text-slate-800">{insp.team_lead_name}</strong> (+
                    {Math.max(0, (insp.assigned_attendees || []).length - 1)} crew)
                  </span>
                  <span className="text-brand-600 font-bold">Open Audit Record →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Smart Timetable Generator Modal */}
      <InspectionGeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        properties={dbState.properties}
        units={dbState.units}
        staffDirectory={DEFAULT_STAFF_DIRECTORY}
      />

      {/* Inspection Detail / Field Update / Team Lead Approval Modal */}
      <InspectionDetailModal
        inspection={syncedActiveInspection}
        onClose={() => setActiveInspection(null)}
        properties={dbState.properties}
        units={dbState.units}
        currentStaffName={currentStaffName}
        isOwnerOrAdmin={isOwner}
      />

      {/* Quick Schedule Single Inspection Modal */}
      {isAddSingleOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateSingleInspection}
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900">
              Schedule Single Property / Unit Inspection
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Property</label>
                <select
                  value={singlePropId}
                  onChange={e => {
                    setSinglePropId(e.target.value);
                    setSingleUnitId('');
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                >
                  {dbState.properties.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Suite / Unit (Optional — leave blank for Building-Wide)
                </label>
                <select
                  value={singleUnitId}
                  onChange={e => setSingleUnitId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                >
                  <option value="">Building-Wide / Common Areas</option>
                  {dbState.units
                    .filter(u => u.property_id === singlePropId)
                    .map(u => (
                      <option key={u.id} value={u.id}>
                        Suite {u.unit_number} ({u.unit_type})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Inspection Title</label>
                <input
                  type="text"
                  required
                  value={singleTitle}
                  onChange={e => setSingleTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Scheduled Date</label>
                  <input
                    type="date"
                    required
                    value={singleDate}
                    onChange={e => setSingleDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Time Window</label>
                  <input
                    type="text"
                    value={singleTime}
                    onChange={e => setSingleTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Designated Team Lead</label>
                <select
                  value={singleLeadId}
                  onChange={e => setSingleLeadId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                >
                  {DEFAULT_STAFF_DIRECTORY.filter(s => s.can_be_lead).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddSingleOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold cursor-pointer"
              >
                Add to Timetable
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
