import React, { useState, useMemo } from 'react';
import { DatabaseState } from '../services/supabase';
import {
  Users, UserCheck, Calendar, Clock, CheckCircle2, ShieldCheck,
  Wrench, Bell, Mail, FileText, Filter, Printer, ChevronRight,
  TrendingUp, Sparkles, Building2, CalendarRange, Search, AlertCircle
} from 'lucide-react';
import { UserProfile, PropertyInspection, MaintenanceRequest, Notice, Communication, Task } from '../types/database';
import {
  ReportTimeFrame, getDateRangeForTimeFrame, formatMonthName,
  formatDayTitle, formatReadableDate, getQuarterInfo, DEFAULT_ANCHOR_DATE
} from '../services/reportGrouping';

interface StaffReportViewProps {
  dbState: DatabaseState;
  staffProfiles?: UserProfile[];
}

export const StaffReportView: React.FC<StaffReportViewProps> = ({
  dbState,
  staffProfiles = []
}) => {
  // Filters
  const [selectedStaffId, setSelectedStaffId] = useState<string>('All');
  const [timeFrame, setTimeFrame] = useState<ReportTimeFrame>('week');
  const [dateRange, setDateRange] = useState(() => getDateRangeForTimeFrame('week'));
  const [activityCategory, setActivityCategory] = useState<'All' | 'Inspections' | 'Maintenance' | 'Notices' | 'Comms' | 'Tasks'>('All');

  const handleTimeFrameChange = (newTf: ReportTimeFrame) => {
    setTimeFrame(newTf);
    if (newTf !== 'custom') {
      setDateRange(getDateRangeForTimeFrame(newTf));
    }
  };

  // Compile list of operational staff names/IDs
  const availableStaff = useMemo(() => {
    if (staffProfiles.length > 0) return staffProfiles;
    // Fallback: derive from inspections and tasks if database staffs table is syncing
    const derivedMap = new Map<string, { id: string; name: string; role: string }>();
    (dbState.inspections || []).forEach(i => {
      if (i.team_lead_name) {
        derivedMap.set(i.team_lead_id || i.team_lead_name, {
          id: i.team_lead_id || i.team_lead_name,
          name: i.team_lead_name,
          role: 'Field Operations Lead'
        });
      }
      (i.assigned_attendees || []).forEach(a => {
        if (a.staff_name) {
          derivedMap.set(a.staff_id || a.staff_name, {
            id: a.staff_id || a.staff_name,
            name: a.staff_name,
            role: a.staff_role || 'Field Auditor'
          });
        }
      });
    });
    return Array.from(derivedMap.values());
  }, [staffProfiles, dbState.inspections]);

  // Selected staff metadata
  const activeStaffMeta = useMemo(() => {
    if (selectedStaffId === 'All') return null;
    return availableStaff.find(s => s.id === selectedStaffId || (s as any).email === selectedStaffId);
  }, [selectedStaffId, availableStaff]);

  // 1. Filter Inspections attended or led by staff in dateRange
  const staffInspections = useMemo(() => {
    return (dbState.inspections || []).filter(i => {
      const date = i.scheduled_date;
      if (!date || date < dateRange.startDate || date > dateRange.endDate) return false;
      if (selectedStaffId === 'All') return true;

      const isLead = i.team_lead_id === selectedStaffId || i.team_lead_name?.toLowerCase() === (activeStaffMeta as any)?.full_name?.toLowerCase() || i.team_lead_name === (activeStaffMeta as any)?.name;
      const isAttendee = (i.assigned_attendees || []).some(a => a.staff_id === selectedStaffId || a.staff_name?.toLowerCase() === (activeStaffMeta as any)?.full_name?.toLowerCase() || a.staff_name === (activeStaffMeta as any)?.name);
      return isLead || isAttendee;
    });
  }, [dbState.inspections, selectedStaffId, activeStaffMeta, dateRange]);

  // 2. Filter Maintenance Requests dispatched or handled in dateRange
  const staffMaintenance = useMemo(() => {
    return (dbState.maintenance_requests || []).filter(m => {
      const date = (m.created_at || '').slice(0, 10) || m.reported_date;
      if (!date || date < dateRange.startDate || date > dateRange.endDate) return false;
      if (selectedStaffId === 'All') return true;
      // In operations, lead property managers oversee all dispatches or assigned contractors
      return true;
    });
  }, [dbState.maintenance_requests, selectedStaffId, dateRange]);

  // 3. Filter Notices served in dateRange
  const staffNotices = useMemo(() => {
    return (dbState.notices || []).filter(n => {
      const date = (n.created_at || '').slice(0, 10);
      if (!date || date < dateRange.startDate || date > dateRange.endDate) return false;
      return true;
    });
  }, [dbState.notices, dateRange]);

  // 4. Filter Tasks assigned to staff in dateRange
  const staffTasks = useMemo(() => {
    return (dbState.tasks || []).filter(t => {
      const date = (t.created_at || '').slice(0, 10) || t.due_date;
      if (!date || date < dateRange.startDate || date > dateRange.endDate) return false;
      if (selectedStaffId === 'All') return true;
      if (t.assigned_to === selectedStaffId || t.assigned_to === (activeStaffMeta as any)?.full_name || t.assigned_to === (activeStaffMeta as any)?.name || t.assigned_to === 'Property Manager') return true;
      return false;
    });
  }, [dbState.tasks, selectedStaffId, activeStaffMeta, dateRange]);

  // 5. Filter Communications sent in dateRange
  const staffComms = useMemo(() => {
    return (dbState.communications || []).filter(c => {
      const date = (c.sent_at || c.created_at || '').slice(0, 10);
      if (!date || date < dateRange.startDate || date > dateRange.endDate) return false;
      return true;
    });
  }, [dbState.communications, dateRange]);

  // Unique months across staff activities
  const allMonths = useMemo(() => {
    const monthSet = new Set<string>();
    staffInspections.forEach(i => { if (i.scheduled_date) monthSet.add(i.scheduled_date.slice(0, 7)); });
    staffMaintenance.forEach(m => {
      const d = (m.created_at || '').slice(0, 7) || (m.reported_date || '').slice(0, 7);
      if (d) monthSet.add(d);
    });
    staffNotices.forEach(n => { if (n.created_at) monthSet.add(n.created_at.slice(0, 7)); });
    staffTasks.forEach(t => {
      const d = (t.created_at || '').slice(0, 7) || (t.due_date || '').slice(0, 7);
      if (d) monthSet.add(d);
    });

    if (monthSet.size === 0 && dateRange.startDate) {
      monthSet.add(dateRange.startDate.slice(0, 7));
    }
    return Array.from(monthSet).sort().reverse();
  }, [staffInspections, staffMaintenance, staffNotices, staffTasks, dateRange]);

  // Unique days across staff activities for week view
  const allDays = useMemo(() => {
    const daySet = new Set<string>();
    staffInspections.forEach(i => { if (i.scheduled_date) daySet.add(i.scheduled_date); });
    staffMaintenance.forEach(m => {
      const d = (m.created_at || '').slice(0, 10) || m.reported_date;
      if (d) daySet.add(d);
    });
    staffNotices.forEach(n => { if (n.created_at) daySet.add(n.created_at.slice(0, 10)); });
    staffTasks.forEach(t => {
      const d = (t.created_at || '').slice(0, 10) || t.due_date;
      if (d) daySet.add(d);
    });

    if (daySet.size === 0 && dateRange.startDate) {
      daySet.add(dateRange.startDate);
    }
    return Array.from(daySet).sort().reverse();
  }, [staffInspections, staffMaintenance, staffNotices, staffTasks, dateRange]);

  // Quarters for year view
  const quarters = useMemo(() => {
    const year = parseInt((dateRange.startDate || DEFAULT_ANCHOR_DATE).slice(0, 4), 10) || 2026;
    return [
      getQuarterInfo(year, 1),
      getQuarterInfo(year, 2),
      getQuarterInfo(year, 3),
      getQuarterInfo(year, 4)
    ];
  }, [dateRange]);

  // Render a specific month section's content
  const renderMonthSectionContent = (monthStr: string) => {
    const mInspections = staffInspections.filter(i => (i.scheduled_date || '').startsWith(monthStr));
    const mMaintenance = staffMaintenance.filter(m => (m.created_at || '').startsWith(monthStr) || (m.reported_date || '').startsWith(monthStr));
    const mNotices = staffNotices.filter(n => (n.created_at || '').startsWith(monthStr));
    const mTasks = staffTasks.filter(t => (t.created_at || '').startsWith(monthStr) || (t.due_date || '').startsWith(monthStr));

    return (
      <div className="space-y-6 pt-2">
        {/* Metric summary counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-stone-200 text-xs">
          <div>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Audits Conducted</span>
            <span className="font-bold text-stone-900 font-mono text-sm">{mInspections.length}</span>
          </div>
          <div>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Repairs Dispatched</span>
            <span className="font-bold text-stone-900 font-mono text-sm">{mMaintenance.length}</span>
          </div>
          <div>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Official Notices Issued</span>
            <span className="font-bold text-stone-900 font-mono text-sm">{mNotices.length}</span>
          </div>
          <div>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Workflow Tasks Handled</span>
            <span className="font-bold text-stone-900 font-mono text-sm">{mTasks.length}</span>
          </div>
        </div>

        {/* SUBSECTION 1: FIELD INSPECTIONS CONDUCTED */}
        {(activityCategory === 'All' || activityCategory === 'Inspections') && (
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    Physical Field Audits & Walkthroughs Completed
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Inspections performed, rooms evaluated, and reports signed by staff
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full">
                {mInspections.length} Record{mInspections.length !== 1 ? 's' : ''}
              </span>
            </div>

            {mInspections.length === 0 ? (
              <p className="text-xs text-stone-400 py-3 text-center">No field audits completed in this month.</p>
            ) : (
              <div className="space-y-3">
                {mInspections.map(insp => (
                  <div key={insp.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900">{insp.title}</span>
                        <span className="text-[10px] font-mono text-stone-500">#{insp.id}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          insp.overall_condition === 'Excellent' ? 'bg-emerald-100 text-emerald-800' :
                          insp.overall_condition === 'Good' ? 'bg-blue-100 text-blue-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          Condition: {insp.overall_condition}
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-500">
                        Date: <strong>{insp.scheduled_date}</strong> • Lead: <strong>{insp.team_lead_name}</strong>
                      </span>
                    </div>

                    {insp.general_remarks && (
                      <p className="text-xs text-stone-600 bg-white p-2 rounded-lg border border-stone-200/60">
                        {insp.general_remarks}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUBSECTION 2: MAINTENANCE DISPATCHES */}
        {(activityCategory === 'All' || activityCategory === 'Maintenance') && (
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-50 text-amber-700 rounded-lg">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    Maintenance Tickets Triaged & Dispatched
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Resident repair tickets managed, vendor work orders, and resolutions
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full">
                {mMaintenance.length} Ticket{mMaintenance.length !== 1 ? 's' : ''}
              </span>
            </div>

            {mMaintenance.length === 0 ? (
              <p className="text-xs text-stone-400 py-3 text-center">No repair tickets triaged in this month.</p>
            ) : (
              <div className="space-y-3">
                {mMaintenance.map(req => (
                  <div key={req.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-stone-900">#{req.id}</span>
                        <span className="font-semibold text-stone-800">{req.category}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          req.priority === 'Urgent' ? 'bg-rose-100 text-rose-800' :
                          req.priority === 'High' ? 'bg-amber-100 text-amber-800' :
                          'bg-stone-200 text-stone-700'
                        }`}>
                          {req.priority}
                        </span>
                      </div>
                      <p className="text-stone-600 text-[11px] mt-0.5">{req.description}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      req.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                      req.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-stone-200 text-stone-700'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUBSECTION 3: NOTICES & CIRCULARS ISSUED */}
        {(activityCategory === 'All' || activityCategory === 'Notices') && (
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    Official Notices & Tenant Communications Drafted
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Statutory rent increase notices, circulars, and community broadcasts
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full">
                {mNotices.length} Notice{mNotices.length !== 1 ? 's' : ''}
              </span>
            </div>

            {mNotices.length === 0 ? (
              <p className="text-xs text-stone-400 py-3 text-center">No notices issued in this month.</p>
            ) : (
              <div className="space-y-3">
                {mNotices.map(n => (
                  <div key={n.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-stone-900">{n.title}</span>
                      <span className="text-[10px] text-stone-400 font-mono">{(n.created_at || '').slice(0, 10)}</span>
                    </div>
                    <p className="text-xs text-stone-600">{n.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUBSECTION 4: OPERATIONAL TASKS RESOLVED */}
        {(activityCategory === 'All' || activityCategory === 'Tasks') && (
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-50 text-purple-700 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    Operational Tasks & Compliance Workflows
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Assigned duties, overdue escalations, and review checklists
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-stone-600 bg-stone-100 px-2.5 py-0.5 rounded-full">
                {mTasks.length} Task{mTasks.length !== 1 ? 's' : ''}
              </span>
            </div>

            {mTasks.length === 0 ? (
              <p className="text-xs text-stone-400 py-3 text-center">No tasks assigned or completed in this month.</p>
            ) : (
              <div className="space-y-3">
                {mTasks.map(t => (
                  <div key={t.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900">{t.title}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                          {t.task_type}
                        </span>
                      </div>
                      <p className="text-stone-600 text-[11px] mt-0.5">{t.description}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      t.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          CONTROL & FILTER BAR
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs space-y-4">
        {/* Top Row: Staff Selector + Timeframe Selector */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Staff Member Selector Dropdown */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                Filter by Staff Member:
              </span>
              <div className="flex items-center gap-2 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200">
                <Users className="w-4 h-4 text-brand-600" />
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="bg-transparent text-xs font-bold text-stone-800 cursor-pointer focus:outline-hidden"
                >
                  <option value="All">All Operations Staff (Team Overview)</option>
                  {availableStaff.map(s => (
                    <option key={s.id} value={s.id}>
                      {(s as any).full_name || s.name} ({s.role || (s as any).role_title || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Timeframe Presets */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                Time-Frame Interval:
              </span>
              <div className="flex flex-wrap items-center bg-cream-100 p-1 rounded-xl border border-cream-300 gap-1">
                {[
                  { id: 'day' as ReportTimeFrame, label: 'Single Day' },
                  { id: 'week' as ReportTimeFrame, label: 'Weekly (Day-by-Day)' },
                  { id: 'month' as ReportTimeFrame, label: 'Monthly' },
                  { id: 'multi_month' as ReportTimeFrame, label: 'Multi-Month (Quarter)' },
                  { id: 'year' as ReportTimeFrame, label: 'Yearly (Quarterly)' },
                ].map(tf => (
                  <button
                    key={tf.id}
                    onClick={() => handleTimeFrameChange(tf.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      timeFrame === tf.id
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
                    }`}
                  >
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Activity Category Filter & Print Actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200">
              <Filter className="w-3.5 h-3.5 text-stone-500" />
              <select
                value={activityCategory}
                onChange={(e) => setActivityCategory(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-stone-800 cursor-pointer focus:outline-hidden"
              >
                <option value="All">All Activities</option>
                <option value="Inspections">Field Audits Only</option>
                <option value="Maintenance">Maintenance Dispatches</option>
                <option value="Notices">Notices Issued</option>
                <option value="Tasks">Tasks Handled</option>
              </select>
            </div>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Audit
            </button>
          </div>
        </div>

        {/* Date Span Description Bar */}
        <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-brand-600" />
            <span>Active Range: <strong>{formatReadableDate(dateRange.startDate)}</strong> – <strong>{formatReadableDate(dateRange.endDate)}</strong></span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-semibold text-stone-600">
            <span>Staff Selected: <strong className="text-stone-900">{selectedStaffId === 'All' ? 'Entire Operations Team' : (activeStaffMeta as any)?.full_name || (activeStaffMeta as any)?.name}</strong></span>
            <span>·</span>
            <span>Inspections: <strong className="text-stone-900">{staffInspections.length}</strong></span>
            <span>·</span>
            <span>Dispatches: <strong className="text-stone-900">{staffMaintenance.length}</strong></span>
            <span>·</span>
            <span>Tasks: <strong className="text-stone-900">{staffTasks.length}</strong></span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          VIEW MODE 1: WEEKLY (Each Day as Main Section)
          ========================================================================= */}
      {timeFrame === 'week' && (
        <div className="space-y-6">
          <div className="p-4 bg-cream-50 rounded-2xl border border-cream-300">
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-600" />
              Weekly Staff Activity Feed (Day-by-Day Sections)
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Chronological log of staff field attendance, repairs scheduled, and notices served per calendar day
            </p>
          </div>

          {allDays.map(dayStr => {
            const dInspections = staffInspections.filter(i => i.scheduled_date === dayStr);
            const dMaintenance = staffMaintenance.filter(m => (m.created_at || '').startsWith(dayStr) || m.reported_date === dayStr);
            const dNotices = staffNotices.filter(n => (n.created_at || '').startsWith(dayStr));
            const dTasks = staffTasks.filter(t => (t.created_at || '').startsWith(dayStr) || t.due_date === dayStr);
            const hasActivity = dInspections.length > 0 || dMaintenance.length > 0 || dNotices.length > 0 || dTasks.length > 0;

            return (
              <div key={dayStr} className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
                <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    <h3 className="font-bold text-sm tracking-wide">
                      {formatDayTitle(dayStr)}
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-stone-300">
                    {hasActivity ? 'Operations Active' : 'No Logged Actions'}
                  </span>
                </div>

                <div className="p-5 space-y-4">
                  {dInspections.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                        Field Audits Attended:
                      </span>
                      {dInspections.map(i => (
                        <div key={i.id} className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-stone-900">{i.title}</span>
                            <span className="text-stone-500 text-[11px] ml-2">Lead: {i.team_lead_name}</span>
                          </div>
                          <span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded text-[10px]">
                            {i.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {dMaintenance.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                        Repairs Dispatched:
                      </span>
                      {dMaintenance.map(m => (
                        <div key={m.id} className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-stone-900">{m.category}</span>
                            <span className="text-stone-600 text-[11px] ml-2">{m.description}</span>
                          </div>
                          <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px]">
                            {m.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {dTasks.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                        Tasks Completed / Due:
                      </span>
                      {dTasks.map(t => (
                        <div key={t.id} className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 flex items-center justify-between text-xs">
                          <span className="font-bold text-stone-900">{t.title}</span>
                          <span className="bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded text-[10px]">
                            {t.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {!hasActivity && (
                    <p className="text-xs text-stone-400 italic">No field actions logged for this date.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          VIEW MODE 2: MONTHLY & MULTI-MONTH (Each Month as Main Section)
          ========================================================================= */}
      {(timeFrame === 'month' || timeFrame === 'multi_month' || timeFrame === 'custom') && (
        <div className="space-y-8">
          {allMonths.map(monthStr => (
            <div key={monthStr} className="bg-cream-50/80 rounded-2xl border border-cream-300 p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-cream-300/80 gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {monthStr.slice(5, 7)}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-stone-900 tracking-tight">
                      {formatMonthName(monthStr)} Staff Activity Journal
                    </h2>
                    <span className="text-[11px] text-stone-500">
                      Operations Output, Field Inspections & Tenant Services
                    </span>
                  </div>
                </div>

                <span className="text-[10px] uppercase font-bold text-stone-400 bg-white px-2.5 py-1 rounded-lg border border-cream-300">
                  Primary Section: Monthly Cycle
                </span>
              </div>

              {renderMonthSectionContent(monthStr)}
            </div>
          ))}
        </div>
      )}

      {/* =========================================================================
          VIEW MODE 3: YEARLY (Quarterly Main Sections -> Monthly -> Subsections)
          ========================================================================= */}
      {timeFrame === 'year' && (
        <div className="space-y-10">
          {quarters.map(q => (
            <div key={q.id} className="bg-cream-100 rounded-3xl border-2 border-stone-800/10 p-6 shadow-sm space-y-6">
              <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-brand-400" />
                  <div>
                    <h2 className="text-base font-bold tracking-wide">{q.label}</h2>
                    <p className="text-xs text-stone-400">Quarterly Staff Operations Audit</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-stone-300 bg-slate-800 px-3 py-1 rounded-lg">
                  3 Calendar Months
                </span>
              </div>

              <div className="space-y-6">
                {q.months.map(mStr => (
                  <div key={mStr} className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4">
                    <div className="flex items-center gap-2.5 pb-2 border-b border-stone-100">
                      <span className="w-2 h-2 rounded-full bg-brand-600"></span>
                      <h3 className="font-bold text-sm text-stone-900">
                        {formatMonthName(mStr)}
                      </h3>
                    </div>
                    {renderMonthSectionContent(mStr)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =========================================================================
          VIEW MODE 4: SINGLE DAY
          ========================================================================= */}
      {timeFrame === 'day' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Daily Operations Log: {formatDayTitle(dateRange.startDate)}
              </h3>
              <p className="text-xs text-stone-500">
                Staff actions, dispatches, and attended audits for this 24-hour cycle
              </p>
            </div>
          </div>
          {renderMonthSectionContent(dateRange.startDate.slice(0, 7))}
        </div>
      )}
    </div>
  );
};
