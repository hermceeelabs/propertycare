import {
  InspectionFrequency,
  InspectionTimetableConfig,
  Property,
  PropertyInspection,
  StaffDirectoryMember,
  Unit
} from '../types/database';

export const DEFAULT_STAFF_DIRECTORY: StaffDirectoryMember[] = [
  {
    id: 'staff-1',
    name: 'Marcus Vance',
    email: 'marcus.vance@propertyflow.com',
    role: 'Senior Field Audit Lead',
    can_be_lead: true
  },
  {
    id: 'staff-2',
    name: 'Amara Okafor',
    email: 'amara.okafor@propertyflow.com',
    role: 'Facility & MEP Lead Inspector',
    can_be_lead: true
  },
  {
    id: 'staff-3',
    name: 'Engr. Tunde Bakare',
    email: 'tunde.bakare@propertyflow.com',
    role: 'Structural & Safety Lead',
    can_be_lead: true
  },
  {
    id: 'staff-4',
    name: 'Elena Rostova',
    email: 'elena.rostova@propertyflow.com',
    role: 'Residential Compliance Inspector',
    can_be_lead: false
  },
  {
    id: 'staff-5',
    name: 'Chinedu Eze',
    email: 'chinedu.eze@propertyflow.com',
    role: 'HVAC & Plumbing Specialist',
    can_be_lead: false
  },
  {
    id: 'staff-6',
    name: 'Chloe Tremblay',
    email: 'chloe.tremblay@propertyflow.com',
    role: 'Shortlet & Suite Quality Auditor',
    can_be_lead: false
  },
  {
    id: 'staff-7',
    name: 'Ibrahim Musa',
    email: 'ibrahim.musa@propertyflow.com',
    role: 'Electrical & Fire Safety Inspector',
    can_be_lead: false
  }
];

export interface StaffWorkloadSummary {
  staff: StaffDirectoryMember;
  totalAssigned: number;
  leadCount: number;
  crewCount: number;
  maxWeekLoad: number;
  maxMonthLoad: number;
  withinQuota: boolean;
}

export interface GeneratedTimetableResult {
  inspections: PropertyInspection[];
  workloadSummary: StaffWorkloadSummary[];
  skippedDueToQuota: number;
}

function getFrequencyStepDays(freq: InspectionFrequency): number {
  switch (freq) {
    case 'Weekly':
      return 7;
    case 'Bi-Weekly':
      return 14;
    case 'Monthly':
      return 30;
    case 'Quarterly':
      return 90;
    case 'Semi-Annually':
      return 180;
    case 'Annually':
      return 365;
    default:
      return 30;
  }
}

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  const startOfYear = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const diffDays = Math.floor((d.getTime() - startOfYear.getTime()) / (24 * 3600 * 1000));
  const weekNum = Math.ceil((diffDays + startOfYear.getUTCDay() + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

// Shift Sunday (0) or Saturday (6) to Monday/Friday so inspections fall on business days
function normalizeToWeekday(date: Date, offsetSeed: number): Date {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + (offsetSeed % 5));
  const day = d.getDay();
  if (day === 0) d.setDate(d.getDate() + 1); // Sunday -> Monday
  if (day === 6) d.setDate(d.getDate() + 2); // Saturday -> Monday
  return d;
}

export function generateInspectionTimetable(
  config: InspectionTimetableConfig,
  properties: Property[],
  units: Unit[],
  staffDirectory: StaffDirectoryMember[]
): GeneratedTimetableResult {
  const startDate = new Date((config.start_date || '2026-11-15') + 'T12:00:00Z');
  const endDate = new Date(startDate.getTime());
  endDate.setMonth(endDate.getMonth() + config.horizon_months);

  // Track weekly and monthly assignments per staff_id
  const weeklyCounts: Record<string, Record<string, number>> = {};
  const monthlyCounts: Record<string, Record<string, number>> = {};
  const totalCounts: Record<string, number> = {};
  const leadCounts: Record<string, number> = {};
  const crewCounts: Record<string, number> = {};

  staffDirectory.forEach(s => {
    weeklyCounts[s.id] = {};
    monthlyCounts[s.id] = {};
    totalCounts[s.id] = 0;
    leadCounts[s.id] = 0;
    crewCounts[s.id] = 0;
  });

  const getWeekLoad = (staffId: string, wk: string) => weeklyCounts[staffId]?.[wk] || 0;
  const getMonthLoad = (staffId: string, ym: string) => monthlyCounts[staffId]?.[ym] || 0;

  const incrementLoad = (staffId: string, wk: string, ym: string, isLead: boolean) => {
    if (!weeklyCounts[staffId]) weeklyCounts[staffId] = {};
    if (!monthlyCounts[staffId]) monthlyCounts[staffId] = {};
    weeklyCounts[staffId][wk] = (weeklyCounts[staffId][wk] || 0) + 1;
    monthlyCounts[staffId][ym] = (monthlyCounts[staffId][ym] || 0) + 1;
    totalCounts[staffId] = (totalCounts[staffId] || 0) + 1;
    if (isLead) {
      leadCounts[staffId] = (leadCounts[staffId] || 0) + 1;
    } else {
      crewCounts[staffId] = (crewCounts[staffId] || 0) + 1;
    }
  };

  const leadPool = staffDirectory.filter(s => config.designated_lead_ids.includes(s.id));
  const memberPool = staffDirectory.filter(s => config.designated_member_ids.includes(s.id));

  const generated: PropertyInspection[] = [];
  let skippedDueToQuota = 0;
  let slotCounter = 0;

  const activePolicies = config.property_policies.filter(p => p.enabled);

  // Generate candidate inspection slots across the horizon
  interface CandidateSlot {
    dateStr: string;
    timeStr: string;
    property: Property;
    unit?: Unit;
    frequency: InspectionFrequency;
  }

  const candidateSlots: CandidateSlot[] = [];
  const timeWindows = ['09:30 AM', '11:00 AM', '01:30 PM', '03:00 PM'];

  activePolicies.forEach((policy, propIdx) => {
    const prop = properties.find(p => p.id === policy.property_id);
    if (!prop) return;

    const stepDays = getFrequencyStepDays(policy.frequency);
    const propUnits = units.filter(u => u.property_id === prop.id);
    const targetUnits =
      policy.scope === 'All Occupied Units'
        ? propUnits.filter(u => u.status === 'Occupied')
        : policy.scope === 'All Units'
        ? propUnits
        : [];

    let cursor = new Date(startDate.getTime());
    cursor.setDate(cursor.getDate() + propIdx * 2); // stagger properties across days

    while (cursor <= endDate) {
      if (policy.scope === 'Building-Wide' || targetUnits.length === 0) {
        const scheduledDateObj = normalizeToWeekday(cursor, propIdx);
        if (scheduledDateObj <= endDate) {
          candidateSlots.push({
            dateStr: formatDateISO(scheduledDateObj),
            timeStr: policy.preferred_time || timeWindows[propIdx % timeWindows.length],
            property: prop,
            unit: undefined,
            frequency: policy.frequency
          });
        }
      } else {
        targetUnits.forEach((unit, unitIdx) => {
          const unitDate = new Date(cursor.getTime());
          unitDate.setDate(unitDate.getDate() + Math.floor(unitIdx / 2));
          const scheduledDateObj = normalizeToWeekday(unitDate, propIdx + unitIdx);
          if (scheduledDateObj <= endDate) {
            candidateSlots.push({
              dateStr: formatDateISO(scheduledDateObj),
              timeStr: policy.preferred_time || timeWindows[(propIdx + unitIdx) % timeWindows.length],
              property: prop,
              unit,
              frequency: policy.frequency
            });
          }
        });
      }

      cursor.setDate(cursor.getDate() + stepDays);
    }
  });

  // Sort candidate slots chronologically
  candidateSlots.sort((a, b) => a.dateStr.localeCompare(b.dateStr));

  // Assign Team Lead and Crew respecting Min/Max team size & Min/Max weekly/monthly quotas
  candidateSlots.forEach((slot, idx) => {
    const wk = getWeekKey(slot.dateStr);
    const ym = getMonthKey(slot.dateStr);

    // 1. Pick Team Lead with lowest current load who hasn't exceeded weekly/monthly max
    const eligibleLeads = (leadPool.length > 0 ? leadPool : staffDirectory)
      .filter(
        s =>
          getWeekLoad(s.id, wk) < config.max_inspections_per_staff_week &&
          getMonthLoad(s.id, ym) < config.max_inspections_per_staff_month
      )
      .sort((a, b) => {
        // Prioritize staff below minimum weekly/monthly target first, then lowest total load
        const aUnderMin =
          getWeekLoad(a.id, wk) < config.min_inspections_per_staff_week ||
          getMonthLoad(a.id, ym) < config.min_inspections_per_staff_month
            ? 0
            : 1;
        const bUnderMin =
          getWeekLoad(b.id, wk) < config.min_inspections_per_staff_week ||
          getMonthLoad(b.id, ym) < config.min_inspections_per_staff_month
            ? 0
            : 1;
        if (aUnderMin !== bUnderMin) return aUnderMin - bUnderMin;
        return (totalCounts[a.id] || 0) - (totalCounts[b.id] || 0);
      });

    if (eligibleLeads.length === 0) {
      skippedDueToQuota++;
      return;
    }

    const chosenLead = eligibleLeads[0];

    // Determine target team size between min_team_size and max_team_size (including lead)
    const span = Math.max(0, config.max_team_size - config.min_team_size);
    const targetTeamSize = Math.max(1, config.min_team_size + (idx % (span + 1)));
    const additionalMembersNeeded = Math.max(0, targetTeamSize - 1);

    // 2. Pick additional crew members from memberPool
    const eligibleCrew = (memberPool.length > 0 ? memberPool : staffDirectory)
      .filter(
        s =>
          s.id !== chosenLead.id &&
          getWeekLoad(s.id, wk) < config.max_inspections_per_staff_week &&
          getMonthLoad(s.id, ym) < config.max_inspections_per_staff_month
      )
      .sort((a, b) => {
        const aUnderMin =
          getWeekLoad(a.id, wk) < config.min_inspections_per_staff_week ||
          getMonthLoad(a.id, ym) < config.min_inspections_per_staff_month
            ? 0
            : 1;
        const bUnderMin =
          getWeekLoad(b.id, wk) < config.min_inspections_per_staff_week ||
          getMonthLoad(b.id, ym) < config.min_inspections_per_staff_month
            ? 0
            : 1;
        if (aUnderMin !== bUnderMin) return aUnderMin - bUnderMin;
        return (totalCounts[a.id] || 0) - (totalCounts[b.id] || 0);
      });

    const chosenCrew = eligibleCrew.slice(0, additionalMembersNeeded);

    // Verify minimum team size constraint
    if (1 + chosenCrew.length < config.min_team_size && eligibleCrew.length < config.min_team_size - 1) {
      skippedDueToQuota++;
      return;
    }

    // Record load for lead and crew
    incrementLoad(chosenLead.id, wk, ym, true);
    chosenCrew.forEach(c => incrementLoad(c.id, wk, ym, false));

    slotCounter++;
    const titlePrefix = slot.unit
      ? `${slot.frequency} Suite Walkthrough — Unit ${slot.unit.unit_number}`
      : `${slot.frequency} Building & MEP Infrastructure Audit — ${slot.property.name}`;

    generated.push({
      id: `insp-sched-${Date.now()}-${slotCounter}`,
      property_id: slot.property.id,
      unit_id: slot.unit?.id,
      title: titlePrefix,
      scheduled_date: slot.dateStr,
      scheduled_time: slot.timeStr,
      team_lead_id: chosenLead.id,
      team_lead_name: chosenLead.name,
      assigned_attendees: [
        {
          staff_id: chosenLead.id,
          staff_name: chosenLead.name,
          staff_role: `${chosenLead.role} (Team Lead)`,
          attended: false,
          notes: 'Assigned as Team Lead'
        },
        ...chosenCrew.map(c => ({
          staff_id: c.id,
          staff_name: c.name,
          staff_role: c.role,
          attended: false,
          notes: 'Assigned Field Inspector'
        }))
      ],
      status: 'Scheduled',
      general_remarks: `Scheduled via ${config.horizon_months}-Month Smart Timetable Engine (${slot.frequency} cycle). Team size: ${1 + chosenCrew.length} staff.`,
      findings: [
        { area: 'Living & Entryway', rating: 'Good', remarks: 'Pending on-site inspection verification.' },
        { area: 'Kitchen & Plumbing', rating: 'Good', remarks: 'Pending on-site inspection verification.' },
        { area: 'HVAC & Electrical Panel', rating: 'Good', remarks: 'Pending on-site inspection verification.' }
      ],
      attachments: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  });

  const selectedIds = new Set([...config.designated_lead_ids, ...config.designated_member_ids]);
  const workloadSummary: StaffWorkloadSummary[] = staffDirectory
    .filter(s => selectedIds.has(s.id))
    .map(s => {
      const wkVals = Object.values(weeklyCounts[s.id] || {});
      const moVals = Object.values(monthlyCounts[s.id] || {});
      const maxWeekLoad = wkVals.length > 0 ? Math.max(...wkVals) : 0;
      const maxMonthLoad = moVals.length > 0 ? Math.max(...moVals) : 0;
      return {
        staff: s,
        totalAssigned: totalCounts[s.id] || 0,
        leadCount: leadCounts[s.id] || 0,
        crewCount: crewCounts[s.id] || 0,
        maxWeekLoad,
        maxMonthLoad,
        withinQuota:
          maxWeekLoad <= config.max_inspections_per_staff_week &&
          maxMonthLoad <= config.max_inspections_per_staff_month
      };
    });

  return {
    inspections: generated,
    workloadSummary,
    skippedDueToQuota
  };
}
