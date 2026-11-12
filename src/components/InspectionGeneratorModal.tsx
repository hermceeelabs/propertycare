import React, { useState, useMemo } from 'react';
import {
  X, Calendar, Users, Building2, CheckCircle2, Sparkles, Sliders,
  ShieldCheck, AlertTriangle, ArrowRight, ArrowLeft, Clock
} from 'lucide-react';
import {
  InspectionFrequency,
  InspectionTimetableConfig,
  Property,
  PropertyInspectionPolicy,
  StaffDirectoryMember,
  Unit
} from '../types/database';
import { generateInspectionTimetable } from '../services/inspectionScheduler';
import { store } from '../services/supabase';

interface InspectionGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  units: Unit[];
  staffDirectory: StaffDirectoryMember[];
}

const FREQUENCIES: InspectionFrequency[] = [
  'Weekly',
  'Bi-Weekly',
  'Monthly',
  'Quarterly',
  'Semi-Annually',
  'Annually'
];

export const InspectionGeneratorModal: React.FC<InspectionGeneratorModalProps> = ({
  isOpen,
  onClose,
  properties,
  units,
  staffDirectory
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [horizonMonths, setHorizonMonths] = useState<3 | 4 | 6 | 12>(6);
  const [startDate, setStartDate] = useState<string>('2026-11-16');

  // Team size & per-person workload limits
  const [minTeamSize, setMinTeamSize] = useState<number>(2);
  const [maxTeamSize, setMaxTeamSize] = useState<number>(3);
  const [minPerWeek, setMinPerWeek] = useState<number>(1);
  const [maxPerWeek, setMaxPerWeek] = useState<number>(4);
  const [minPerMonth, setMinPerMonth] = useState<number>(2);
  const [maxPerMonth, setMaxPerMonth] = useState<number>(12);

  // Selected Staff Leads & Crew
  const [leadIds, setLeadIds] = useState<string[]>(() =>
    staffDirectory.filter(s => s.can_be_lead).map(s => s.id)
  );
  const [memberIds, setMemberIds] = useState<string[]>(() =>
    staffDirectory.map(s => s.id)
  );

  // Per-Property Inspection Policies
  const [policies, setPolicies] = useState<PropertyInspectionPolicy[]>(() =>
    properties.map((p, idx) => ({
      property_id: p.id,
      enabled: true,
      frequency: idx % 2 === 0 ? 'Monthly' : 'Quarterly',
      scope: 'All Occupied Units',
      preferred_time: idx % 2 === 0 ? '10:00 AM' : '01:30 PM'
    }))
  );

  const toggleLead = (id: string) => {
    setLeadIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
    if (!memberIds.includes(id)) {
      setMemberIds(prev => [...prev, id]);
    }
  };

  const toggleMember = (id: string) => {
    setMemberIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const updatePolicy = (propertyId: string, updates: Partial<PropertyInspectionPolicy>) => {
    setPolicies(prev =>
      prev.map(p => (p.property_id === propertyId ? { ...p, ...updates } : p))
    );
  };

  const config: InspectionTimetableConfig = useMemo(
    () => ({
      horizon_months: horizonMonths,
      start_date: startDate,
      min_team_size: Math.min(minTeamSize, maxTeamSize),
      max_team_size: Math.max(minTeamSize, maxTeamSize),
      min_inspections_per_staff_week: Math.min(minPerWeek, maxPerWeek),
      max_inspections_per_staff_week: Math.max(minPerWeek, maxPerWeek),
      min_inspections_per_staff_month: Math.min(minPerMonth, maxPerMonth),
      max_inspections_per_staff_month: Math.max(minPerMonth, maxPerMonth),
      designated_lead_ids: leadIds,
      designated_member_ids: memberIds,
      property_policies: policies
    }),
    [
      horizonMonths,
      startDate,
      minTeamSize,
      maxTeamSize,
      minPerWeek,
      maxPerWeek,
      minPerMonth,
      maxPerMonth,
      leadIds,
      memberIds,
      policies
    ]
  );

  const previewResult = useMemo(
    () => generateInspectionTimetable(config, properties, units, staffDirectory),
    [config, properties, units, staffDirectory]
  );

  if (!isOpen) return null;

  const handlePublishTimetable = () => {
    if (previewResult.inspections.length === 0) return;
    store.addInspectionsBatch(previewResult.inspections);
    store.addAutomationLog({
      id: `log-insp-gen-${Date.now()}`,
      automation_type: 'inspection_timetable_generated',
      entity_type: 'InspectionTimetable',
      action: `Generated ${previewResult.inspections.length} scheduled inspections across ${
        policies.filter(p => p.enabled).length
      } properties (${horizonMonths}-month horizon, ${minTeamSize}-${maxTeamSize} staff/team)`,
      status: 'Success',
      created_at: new Date().toISOString()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                Smart Inspection Timetable & Quota Generator
              </h2>
              <p className="text-xs text-slate-400">
                Configure property inspection frequencies, designated staff & Team Leads, and weekly/monthly workload limits
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator Bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold shrink-0">
          <div className="flex items-center gap-2 sm:gap-6">
            <button
              onClick={() => setStep(1)}
              className={`flex items-center gap-2 cursor-pointer ${
                step === 1 ? 'text-brand-600' : 'text-slate-500'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
                  step === 1 ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                1
              </span>
              Horizon & Property Frequencies
            </button>
            <span className="text-slate-300">→</span>
            <button
              onClick={() => setStep(2)}
              className={`flex items-center gap-2 cursor-pointer ${
                step === 2 ? 'text-brand-600' : 'text-slate-500'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
                  step === 2 ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                2
              </span>
              Team Leads, Staff Pool & Quotas
            </button>
            <span className="text-slate-300">→</span>
            <button
              onClick={() => setStep(3)}
              className={`flex items-center gap-2 cursor-pointer ${
                step === 3 ? 'text-brand-600' : 'text-slate-500'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${
                  step === 3 ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                3
              </span>
              Preview Schedule ({previewResult.inspections.length} Sessions)
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* STEP 1: HORIZON & PROPERTY FREQUENCIES */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Horizon & Start Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Schedule Timeframe / Horizon
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {([3, 4, 6, 12] as const).map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setHorizonMonths(m)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          horizonMonths === m
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {m === 12 ? '12 Mo (Year)' : `${m} Months`}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Timetable Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Weekends are automatically shifted to business days (Mon–Fri).
                  </span>
                </div>
              </div>

              {/* Property-by-Property Frequency Matrix */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-brand-600" /> Property Inspection Frequency & Scope
                    </h3>
                    <p className="text-xs text-slate-500">
                      Select how frequently each property and its suites should be inspected
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setPolicies(prev => prev.map(p => ({ ...p, enabled: true })))
                      }
                      className="text-xs font-bold text-brand-600 hover:underline cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() =>
                        setPolicies(prev => prev.map(p => ({ ...p, enabled: false })))
                      }
                      className="text-xs font-bold text-slate-500 hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 uppercase text-[10px] font-bold">
                        <th className="py-3 px-4">Include</th>
                        <th className="py-3 px-4">Property Asset</th>
                        <th className="py-3 px-4">Inspection Frequency</th>
                        <th className="py-3 px-4">Target Scope</th>
                        <th className="py-3 px-4">Preferred Window</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {properties.map(prop => {
                        const pol = policies.find(p => p.property_id === prop.id) || {
                          property_id: prop.id,
                          enabled: true,
                          frequency: 'Monthly' as InspectionFrequency,
                          scope: 'All Occupied Units' as const,
                          preferred_time: '10:00 AM'
                        };
                        const propUnitsCount = units.filter(u => u.property_id === prop.id).length;

                        return (
                          <tr
                            key={prop.id}
                            className={pol.enabled ? 'bg-white' : 'bg-slate-50/60 opacity-60'}
                          >
                            <td className="py-3 px-4">
                              <input
                                type="checkbox"
                                checked={pol.enabled}
                                onChange={e =>
                                  updatePolicy(prop.id, { enabled: e.target.checked })
                                }
                                className="w-4 h-4 rounded text-brand-600 cursor-pointer"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{prop.name}</div>
                              <div className="text-[11px] text-slate-500">
                                {prop.city} • {propUnitsCount} Suites
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <select
                                value={pol.frequency}
                                disabled={!pol.enabled}
                                onChange={e =>
                                  updatePolicy(prop.id, {
                                    frequency: e.target.value as InspectionFrequency
                                  })
                                }
                                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 cursor-pointer"
                              >
                                {FREQUENCIES.map(f => (
                                  <option key={f} value={f}>
                                    {f}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-3 px-4">
                              <select
                                value={pol.scope}
                                disabled={!pol.enabled}
                                onChange={e =>
                                  updatePolicy(prop.id, { scope: e.target.value as any })
                                }
                                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800 cursor-pointer"
                              >
                                <option value="All Occupied Units">All Occupied Units</option>
                                <option value="All Units">All Units (Occupied & Vacant)</option>
                                <option value="Building-Wide">Building & Common Areas Only</option>
                              </select>
                            </td>
                            <td className="py-3 px-4">
                              <select
                                value={pol.preferred_time || '10:00 AM'}
                                disabled={!pol.enabled}
                                onChange={e =>
                                  updatePolicy(prop.id, { preferred_time: e.target.value })
                                }
                                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-700 cursor-pointer"
                              >
                                <option value="09:30 AM">09:30 AM</option>
                                <option value="11:00 AM">11:00 AM</option>
                                <option value="01:30 PM">01:30 PM</option>
                                <option value="03:00 PM">03:00 PM</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: TEAM SIZE, STAFF QUOTAS & DESIGNATED INSPECTORS */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Team Size & Per-Staff Weekly/Monthly Limits */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase">
                    <Users className="w-4 h-4 text-brand-600" /> People Per Inspection Team
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-500 font-semibold block mb-1">
                        Minimum Crew
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={6}
                        value={minTeamSize}
                        onChange={e => setMinTeamSize(Math.max(1, Number(e.target.value)))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 font-semibold block mb-1">
                        Maximum Crew
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={8}
                        value={maxTeamSize}
                        onChange={e => setMaxTeamSize(Math.max(1, Number(e.target.value)))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-900"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Includes 1 designated Team Lead + {Math.max(0, minTeamSize - 1)} to{' '}
                    {Math.max(0, maxTeamSize - 1)} field inspectors.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase">
                    <Calendar className="w-4 h-4 text-emerald-600" /> Weekly Quota Per Staff
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-500 font-semibold block mb-1">
                        Min / Week
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={15}
                        value={minPerWeek}
                        onChange={e => setMinPerWeek(Math.max(0, Number(e.target.value)))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 font-semibold block mb-1">
                        Max / Week
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={25}
                        value={maxPerWeek}
                        onChange={e => setMaxPerWeek(Math.max(1, Number(e.target.value)))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-900"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Prevents weekly over-scheduling of any single inspector.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase">
                    <Sliders className="w-4 h-4 text-purple-600" /> Monthly Quota Per Staff
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-500 font-semibold block mb-1">
                        Min / Month
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={40}
                        value={minPerMonth}
                        onChange={e => setMinPerMonth(Math.max(0, Number(e.target.value)))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 font-semibold block mb-1">
                        Max / Month
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={maxPerMonth}
                        onChange={e => setMaxPerMonth(Math.max(1, Number(e.target.value)))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-sm font-black text-slate-900"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Balances monthly inspection assignments across the staff pool.
                  </p>
                </div>
              </div>

              {/* Staff Roster Selection: Designated Inspection Members & Team Leads */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Designated Inspection Staff & Team Leads
                  </h3>
                  <p className="text-xs text-slate-500">
                    Choose which staff members participate in inspections and who is authorized to act as Team Lead (approving & locking completed inspection records).
                  </p>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 uppercase text-[10px] font-bold">
                        <th className="py-3 px-4">Staff Member</th>
                        <th className="py-3 px-4">Role / Specialty</th>
                        <th className="py-3 px-4 text-center">Eligible Field Inspector</th>
                        <th className="py-3 px-4 text-center">Authorized Team Lead</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {staffDirectory.map(staff => {
                        const isMember = memberIds.includes(staff.id);
                        const isLead = leadIds.includes(staff.id);
                        return (
                          <tr key={staff.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{staff.name}</div>
                              <div className="text-[11px] text-slate-500">{staff.email}</div>
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-700">{staff.role}</td>
                            <td className="py-3 px-4 text-center">
                              <input
                                type="checkbox"
                                checked={isMember}
                                onChange={() => toggleMember(staff.id)}
                                className="w-4 h-4 rounded text-brand-600 cursor-pointer"
                              />
                            </td>
                            <td className="py-3 px-4 text-center">
                              <input
                                type="checkbox"
                                checked={isLead}
                                onChange={() => toggleLead(staff.id)}
                                className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW GENERATED TIMETABLE & WORKLOAD DISTRIBUTION */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Top Summary Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <span className="text-[10px] font-bold uppercase text-emerald-700 block">
                    Scheduled Sessions Ready
                  </span>
                  <span className="text-2xl font-black text-emerald-900">
                    {previewResult.inspections.length} Inspections
                  </span>
                  <span className="text-[11px] text-emerald-700 block mt-0.5">
                    Spanning {horizonMonths} months from {startDate}
                  </span>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">
                    Team Composition Rule
                  </span>
                  <span className="text-2xl font-black text-slate-900">
                    {minTeamSize} – {maxTeamSize} Staff
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    1 Lead + Field Crew per inspection
                  </span>
                </div>

                <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl">
                  <span className="text-[10px] font-bold uppercase text-purple-700 block">
                    Quota Enforcement
                  </span>
                  <span className="text-2xl font-black text-purple-900">
                    Max {maxPerWeek}/wk • {maxPerMonth}/mo
                  </span>
                  <span className="text-[11px] text-purple-700 block mt-0.5">
                    {previewResult.skippedDueToQuota > 0
                      ? `${previewResult.skippedDueToQuota} slots capped by staff quota`
                      : '100% within staff workload caps'}
                  </span>
                </div>
              </div>

              {/* Staff Workload Distribution Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Staff Workload & Quota Balance
                </h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 text-[10px] font-bold uppercase">
                        <th className="py-2.5 px-4">Staff Member</th>
                        <th className="py-2.5 px-4">As Team Lead</th>
                        <th className="py-2.5 px-4">As Crew Member</th>
                        <th className="py-2.5 px-4">Total Assigned</th>
                        <th className="py-2.5 px-4">Peak Weekly Load</th>
                        <th className="py-2.5 px-4">Peak Monthly Load</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {previewResult.workloadSummary.map(row => (
                        <tr key={row.staff.id}>
                          <td className="py-2.5 px-4 font-bold text-slate-900">
                            {row.staff.name}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-purple-700">
                            {row.leadCount}x Lead
                          </td>
                          <td className="py-2.5 px-4 text-slate-700">{row.crewCount}x Crew</td>
                          <td className="py-2.5 px-4 font-black text-slate-900">
                            {row.totalAssigned} total
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold text-[11px]">
                              {row.maxWeekLoad} / {maxPerWeek} max
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-bold text-[11px]">
                              {row.maxMonthLoad} / {maxPerMonth} max
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sample Preview of Generated Timetable */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Generated Inspection Timetable Preview (First 15 Sessions)
                </h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-100 text-slate-600 border-b border-slate-200 text-[10px] font-bold uppercase">
                      <tr>
                        <th className="py-2.5 px-4">Date & Time</th>
                        <th className="py-2.5 px-4">Property & Unit</th>
                        <th className="py-2.5 px-4">Inspection Title</th>
                        <th className="py-2.5 px-4">Team Lead</th>
                        <th className="py-2.5 px-4">Assigned Team</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewResult.inspections.slice(0, 15).map(insp => {
                        const prop = properties.find(p => p.id === insp.property_id);
                        const unit = units.find(u => u.id === insp.unit_id);
                        return (
                          <tr key={insp.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                              {insp.scheduled_date}{' '}
                              <span className="text-slate-400 font-normal">
                                ({insp.scheduled_time})
                              </span>
                            </td>
                            <td className="py-2.5 px-4">
                              <span className="font-bold text-slate-900">{prop?.name}</span>
                              {unit && (
                                <span className="ml-1.5 px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-700">
                                  Unit {unit.unit_number}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-slate-700">{insp.title}</td>
                            <td className="py-2.5 px-4 font-bold text-purple-700">
                              {insp.team_lead_name}
                            </td>
                            <td className="py-2.5 px-4 text-slate-600">
                              {insp.assigned_attendees.map(a => a.staff_name).join(', ')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((step - 1) as 1 | 2)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Previous Step
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((step + 1) as 2 | 3)}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm"
            >
              Next Step <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePublishTimetable}
              disabled={previewResult.inspections.length === 0}
              className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" /> Publish {previewResult.inspections.length}{' '}
              Inspections to Timetable
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
