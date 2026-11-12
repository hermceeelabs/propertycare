import React, { useState } from 'react';
import {
  X, CheckCircle2, ShieldCheck, Lock, Users, Camera, Film, Volume2,
  FileText, Plus, Trash2, DollarSign, AlertTriangle, Calendar, Building2,
  Home, UserCheck, Upload
} from 'lucide-react';
import {
  ConditionRating,
  ExpenseCategory,
  InspectionAttachment,
  InspectionAttendee,
  InspectionItemFinding,
  InspectionStatus,
  Property,
  PropertyInspection,
  Unit
} from '../types/database';
import { store } from '../services/supabase';
import { useCurrency, CurrencyCode } from '../context/CurrencyContext';

interface InspectionDetailModalProps {
  inspection: PropertyInspection | null;
  onClose: () => void;
  properties: Property[];
  units: Unit[];
  currentStaffName?: string;
  isOwnerOrAdmin?: boolean;
}

const CONDITION_RATINGS: ConditionRating[] = [
  'Excellent',
  'Good',
  'Fair',
  'Requires Attention',
  'Critical Hazard'
];

const STATUS_OPTIONS: InspectionStatus[] = [
  'Scheduled',
  'In Progress',
  'Pending Review',
  'Approved / Completed',
  'Missed',
  'Cancelled'
];

export const InspectionDetailModal: React.FC<InspectionDetailModalProps> = ({
  inspection,
  onClose,
  properties,
  units,
  currentStaffName = 'Marcus Vance',
  isOwnerOrAdmin = true
}) => {
  const { formatAmountInTarget } = useCurrency();

  if (!inspection) return null;

  const property = properties.find(p => p.id === inspection.property_id);
  const unit = units.find(u => u.id === inspection.unit_id);
  const nativeCurr: CurrencyCode =
    property?.acquisition?.acquisition_currency ||
    (property?.city === 'Lagos' || property?.city === 'Abuja' ? 'NGN' : 'CAD');

  // Lock check: Once Team Lead approves and signs off, the record is locked and cannot be edited
  const isApprovedAndLocked =
    inspection.status === 'Approved / Completed' && Boolean(inspection.team_lead_signed_at);

  // Check if current user is assigned to this inspection or is Team Lead / Admin
  const isAssignedMember =
    isOwnerOrAdmin ||
    inspection.team_lead_name.toLowerCase() === currentStaffName.toLowerCase() ||
    (inspection.assigned_attendees || []).some(
      a => a.staff_name.toLowerCase() === currentStaffName.toLowerCase()
    );

  const canEditRecord = !isApprovedAndLocked && isAssignedMember;
  const canTeamLeadApprove =
    !isApprovedAndLocked &&
    (isOwnerOrAdmin ||
      inspection.team_lead_name.toLowerCase() === currentStaffName.toLowerCase());

  const [status, setStatus] = useState<InspectionStatus>(inspection.status);
  const [overallCondition, setOverallCondition] = useState<ConditionRating>(
    inspection.overall_condition || 'Good'
  );
  const [generalRemarks, setGeneralRemarks] = useState<string>(
    inspection.general_remarks || ''
  );
  const [attendees, setAttendees] = useState<InspectionAttendee[]>(
    inspection.assigned_attendees || []
  );
  const [findings, setFindings] = useState<InspectionItemFinding[]>(
    inspection.findings || []
  );
  const [attachments, setAttachments] = useState<InspectionAttachment[]>(
    inspection.attachments || []
  );

  // New Finding Form
  const [newArea, setNewArea] = useState('');
  const [newRating, setNewRating] = useState<ConditionRating>('Good');
  const [newRemarks, setNewRemarks] = useState('');
  const [newActionNeeded, setNewActionNeeded] = useState(false);

  // New Media Attachment Form
  const [newFileName, setNewFileName] = useState('');
  const [newFileType, setNewFileType] = useState<'photo' | 'video' | 'audio' | 'document'>('photo');
  const [newFileCaption, setNewFileCaption] = useState('');
  const [shareWithLandlord, setShareWithLandlord] = useState(true);

  // Incurred Expense Form
  const [incurredCost, setIncurredCost] = useState<number>(inspection.incurred_cost || 0);
  const [expenseDesc, setExpenseDesc] = useState<string>(
    `Field Audit Remediation — ${inspection.title}`
  );
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('Repairs & Maintenance');
  const [recordExpenseInLedger, setRecordExpenseInLedger] = useState<boolean>(false);

  const handleToggleAttendance = (staffId: string) => {
    if (!canEditRecord) return;
    setAttendees(prev =>
      prev.map(a => (a.staff_id === staffId ? { ...a, attended: !a.attended } : a))
    );
  };

  const handleAttendeeNoteChange = (staffId: string, notes: string) => {
    if (!canEditRecord) return;
    setAttendees(prev =>
      prev.map(a => (a.staff_id === staffId ? { ...a, notes } : a))
    );
  };

  const handleAddFinding = () => {
    if (!canEditRecord || !newArea.trim()) return;
    setFindings(prev => [
      ...prev,
      {
        area: newArea.trim(),
        rating: newRating,
        remarks: newRemarks.trim() || 'Inspected on site.',
        action_needed: newActionNeeded
      }
    ]);
    setNewArea('');
    setNewRemarks('');
    setNewActionNeeded(false);
  };

  const handleRemoveFinding = (idx: number) => {
    if (!canEditRecord) return;
    setFindings(prev => prev.filter((_, i) => i !== idx));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEditRecord) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      const fType: 'photo' | 'video' | 'audio' | 'document' =
        file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(ext)
          ? 'photo'
          : file.type.startsWith('video/') || ['mp4', 'mov', 'webm'].includes(ext)
          ? 'video'
          : file.type.startsWith('audio/') || ['mp3', 'wav', 'm4a'].includes(ext)
          ? 'audio'
          : 'document';

      const reader = new FileReader();
      reader.onload = ev => {
        const dataUrl = (ev.target?.result as string) || '';
        setAttachments(prev => [
          ...prev,
          {
            id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            file_name: file.name,
            file_type: fType,
            file_url: dataUrl,
            file_size: file.size,
            caption: newFileCaption.trim() || `${fType.toUpperCase()} uploaded by ${currentStaffName}`,
            share_with_landlord: shareWithLandlord,
            recorded_at: new Date().toISOString(),
            recorded_by: currentStaffName
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddQuickAttachment = () => {
    if (!canEditRecord || !newFileName.trim()) return;
    const sampleUrl =
      newFileType === 'photo'
        ? 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=900&q=80'
        : '#';
    setAttachments(prev => [
      ...prev,
      {
        id: `att-${Date.now()}`,
        file_name: newFileName.trim(),
        file_type: newFileType,
        file_url: sampleUrl,
        caption: newFileCaption.trim() || `Field ${newFileType} logged during walkthrough`,
        share_with_landlord: shareWithLandlord,
        recorded_at: new Date().toISOString(),
        recorded_by: currentStaffName
      }
    ]);
    setNewFileName('');
    setNewFileCaption('');
  };

  const handleSaveFieldUpdates = (approveAndLock = false) => {
    if (!canEditRecord && !approveAndLock) return;

    let linkedExpenseId = inspection.incurred_expense_id;

    // If an incurred expense is entered and not yet linked, create an Expense record in the property ledger
    if (incurredCost > 0 && (recordExpenseInLedger || approveAndLock) && !linkedExpenseId) {
      linkedExpenseId = `exp-insp-${Date.now()}`;
      store.addExpense({
        id: linkedExpenseId,
        property_id: inspection.property_id,
        unit_id: inspection.unit_id,
        scope: inspection.unit_id ? 'Unit' : 'Property',
        category: expenseCategory,
        description:
          expenseDesc.trim() ||
          `Inspection Remediation Cost (${inspection.title} on ${inspection.scheduled_date})`,
        amount: incurredCost,
        date: inspection.scheduled_date || new Date().toISOString().split('T')[0],
        payment_status: 'Paid',
        invoice_number: `INV-INSP-${inspection.id.slice(-5).toUpperCase()}`,
        share_with_landlord: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    const nextStatus: InspectionStatus = approveAndLock
      ? 'Approved / Completed'
      : status === 'Scheduled' && attendees.some(a => a.attended)
      ? 'In Progress'
      : status;

    store.updateInspection(inspection.id, {
      status: nextStatus,
      overall_condition: overallCondition,
      general_remarks: generalRemarks,
      assigned_attendees: attendees,
      findings,
      attachments,
      incurred_cost: incurredCost > 0 ? incurredCost : undefined,
      incurred_expense_id: linkedExpenseId,
      ...(approveAndLock
        ? {
            team_lead_signed_at: new Date().toISOString(),
            team_lead_signed_by: inspection.team_lead_name || currentStaffName
          }
        : {})
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-brand-500/20 text-brand-300 border border-brand-400/30">
                {inspection.id}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                  isApprovedAndLocked
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                    : status === 'Missed' || status === 'Cancelled'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                }`}
              >
                {isApprovedAndLocked ? 'Approved & Closed (Locked)' : status}
              </span>
            </div>
            <h2 className="text-lg font-bold tracking-tight">{inspection.title}</h2>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-brand-400" />
                {property?.name}
              </span>
              {unit && (
                <span className="flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 text-emerald-400" />
                  Suite {unit.unit_number} ({unit.unit_type})
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                {inspection.scheduled_date} {inspection.scheduled_time && `• ${inspection.scheduled_time}`}
              </span>
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                Team Lead: <strong className="text-white">{inspection.team_lead_name}</strong>
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Read-Only Lock Banner when Approved by Team Lead */}
        {isApprovedAndLocked && (
          <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between text-xs text-emerald-900 shrink-0">
            <div className="flex items-center gap-2 font-bold">
              <Lock className="w-4 h-4 text-emerald-700" />
              This inspection was verified, signed off, and locked by Team Lead{' '}
              <span className="underline">{inspection.team_lead_signed_by}</span> on{' '}
              {inspection.team_lead_signed_at?.slice(0, 10)}. Staff members can view but cannot modify closed records.
            </div>
            <span className="px-2.5 py-0.5 bg-emerald-200/70 text-emerald-900 rounded-md font-extrabold text-[10px] uppercase">
              Immutable Audit Record
            </span>
          </div>
        )}

        {/* Scrollable Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* 1. EXECUTION STATUS & OVERALL CONDITION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Did Inspection Happen? (Execution Status)
              </label>
              <select
                value={status}
                disabled={!canEditRecord}
                onChange={e => setStatus(e.target.value as InspectionStatus)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 disabled:bg-slate-100"
              >
                {STATUS_OPTIONS.map(st => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Overall Asset / Suite Condition Rating
              </label>
              <select
                value={overallCondition}
                disabled={!canEditRecord}
                onChange={e => setOverallCondition(e.target.value as ConditionRating)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 disabled:bg-slate-100"
              >
                {CONDITION_RATINGS.map(cr => (
                  <option key={cr} value={cr}>
                    {cr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. TEAM ATTENDANCE VERIFICATION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-brand-600" /> Assigned Inspection Crew & Attendance Roll-Call
                </h3>
                <p className="text-xs text-slate-500">
                  Track whether each assigned team member physically attended the inspection
                </p>
              </div>
              <span className="text-xs font-bold text-slate-700">
                {attendees.filter(a => a.attended).length} of {attendees.length} Attended
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {attendees.map(att => (
                <div
                  key={att.staff_id}
                  className={`p-3.5 rounded-2xl border flex flex-col gap-2 transition-all ${
                    att.attended
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{att.staff_name}</div>
                      <div className="text-[11px] text-slate-500">{att.staff_role}</div>
                    </div>
                    <button
                      type="button"
                      disabled={!canEditRecord}
                      onClick={() => handleToggleAttendance(att.staff_id)}
                      className={`px-3 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer disabled:cursor-not-allowed ${
                        att.attended
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {att.attended ? '✓ Attended On-Site' : 'Mark Attended'}
                    </button>
                  </div>
                  <input
                    type="text"
                    disabled={!canEditRecord}
                    value={att.notes || ''}
                    onChange={e => handleAttendeeNoteChange(att.staff_id, e.target.value)}
                    placeholder="Attendance or field role note..."
                    className="w-full px-2.5 py-1 bg-white/90 border border-slate-200 rounded-lg text-[11px] text-slate-700"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 3. ROOM-BY-ROOM CHECKLIST & FIELD FINDINGS */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Room-by-Room Checklist & Field Remarks
            </h3>

            <div className="space-y-2">
              {findings.map((f, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{f.area}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          f.rating === 'Excellent' || f.rating === 'Good'
                            ? 'bg-emerald-100 text-emerald-800'
                            : f.rating === 'Fair'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {f.rating}
                      </span>
                      {f.action_needed && (
                        <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold">
                          Follow-Up Action Required
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600">{f.remarks}</p>
                  </div>
                  {canEditRecord && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFinding(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {canEditRecord && (
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
                <div className="text-[11px] font-bold text-slate-700 uppercase">
                  + Add Area / Room Inspection Finding
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    value={newArea}
                    onChange={e => setNewArea(e.target.value)}
                    placeholder="Area (e.g. Kitchen, Master Bath, HVAC)"
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                  />
                  <select
                    value={newRating}
                    onChange={e => setNewRating(e.target.value as ConditionRating)}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                  >
                    {CONDITION_RATINGS.map(r => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 px-2">
                    <input
                      type="checkbox"
                      checked={newActionNeeded}
                      onChange={e => setNewActionNeeded(e.target.checked)}
                      className="rounded text-rose-600"
                    />
                    Action / Repair Needed
                  </label>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRemarks}
                    onChange={e => setNewRemarks(e.target.value)}
                    placeholder="Detailed inspector observation or remark..."
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddFinding}
                    className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 cursor-pointer"
                  >
                    Add Finding
                  </button>
                </div>
              </div>
            )}

            {/* General Executive Summary Remarks */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                General Inspection Remarks & Summary (Shared with Landlord & Tenant)
              </label>
              <textarea
                rows={3}
                disabled={!canEditRecord}
                value={generalRemarks}
                onChange={e => setGeneralRemarks(e.target.value)}
                className="w-full p-3 bg-white border border-slate-300 rounded-2xl text-xs text-slate-800 disabled:bg-slate-100"
                placeholder="Enter executive walkthrough summary..."
              />
            </div>
          </div>

          {/* 4. MULTIMODAL ATTACHMENTS (PICTURES, VIDEOS, AUDIO, DOCUMENTS) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-purple-600" /> Attached Pictures, Videos, Voice Notes & Checklists ({attachments.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Evidence captured on-site linked directly to this property/unit inspection
                </p>
              </div>
              {canEditRecord && (
                <label className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs">
                  <Upload className="w-3.5 h-3.5" /> Upload Media File
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {attachments.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {attachments.map(att => (
                  <div
                    key={att.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {att.file_type === 'photo' && <Camera className="w-4 h-4 text-emerald-600 shrink-0" />}
                      {att.file_type === 'video' && <Film className="w-4 h-4 text-purple-600 shrink-0" />}
                      {att.file_type === 'audio' && <Volume2 className="w-4 h-4 text-amber-600 shrink-0" />}
                      {att.file_type === 'document' && <FileText className="w-4 h-4 text-blue-600 shrink-0" />}
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{att.file_name}</div>
                        <div className="text-[11px] text-slate-500 truncate">{att.caption}</div>
                      </div>
                    </div>
                    {canEditRecord && (
                      <button
                        type="button"
                        onClick={() => setAttachments(prev => prev.filter(x => x.id !== att.id))}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {canEditRecord && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center gap-2">
                <select
                  value={newFileType}
                  onChange={e => setNewFileType(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                >
                  <option value="photo">Photo</option>
                  <option value="video">Video</option>
                  <option value="audio">Audio Voice Note</option>
                  <option value="document">Signed PDF Checklist</option>
                </select>
                <input
                  type="text"
                  value={newFileName}
                  onChange={e => setNewFileName(e.target.value)}
                  placeholder="File name (e.g. unit_hvac_filter_photo.jpg)"
                  className="flex-1 min-w-[160px] px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
                <input
                  type="text"
                  value={newFileCaption}
                  onChange={e => setNewFileCaption(e.target.value)}
                  placeholder="Caption or note..."
                  className="flex-1 min-w-[160px] px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddQuickAttachment}
                  className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 cursor-pointer"
                >
                  + Attach Record
                </button>
              </div>
            )}
          </div>

          {/* 5. INCURRED EXPENSES ARISING FROM INSPECTION */}
          <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-700" /> Expenses Arising From This Inspection
                </h3>
                <p className="text-xs text-amber-800">
                  If an immediate expense arose during this inspection (e.g. filter replacement, detector battery, lock repair), log it here so it syncs to the Landlord & Property Expense Ledger.
                </p>
              </div>
              {incurredCost > 0 && (
                <span className="px-3 py-1 bg-amber-200/80 text-amber-950 rounded-xl text-xs font-black">
                  {formatAmountInTarget(incurredCost, nativeCurr)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-amber-900 mb-1">
                  Amount ({nativeCurr})
                </label>
                <input
                  type="number"
                  min={0}
                  disabled={!canEditRecord}
                  value={incurredCost}
                  onChange={e => setIncurredCost(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-amber-900 mb-1">
                  Expense Category
                </label>
                <select
                  value={expenseCategory}
                  disabled={!canEditRecord}
                  onChange={e => setExpenseCategory(e.target.value as ExpenseCategory)}
                  className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900"
                >
                  <option value="Repairs & Maintenance">Repairs & Maintenance</option>
                  <option value="Cleaning">Cleaning</option>
                  <option value="Appliances">Appliances</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-amber-900 mb-1">
                  Expense Description
                </label>
                <input
                  type="text"
                  disabled={!canEditRecord}
                  value={expenseDesc}
                  onChange={e => setExpenseDesc(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs text-slate-900"
                />
              </div>
            </div>

            {canEditRecord && incurredCost > 0 && !inspection.incurred_expense_id && (
              <label className="flex items-center gap-2 text-xs font-bold text-amber-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recordExpenseInLedger}
                  onChange={e => setRecordExpenseInLedger(e.target.checked)}
                  className="rounded text-amber-700"
                />
                Automatically post this {nativeCurr} {incurredCost.toLocaleString()} charge to Property & Landlord Expense Statement
              </label>
            )}
          </div>
        </div>

        {/* Footer Actions: Save Field Progress vs Team Lead Sign-off & Lock */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
          >
            Close Window
          </button>

          {!isApprovedAndLocked && (
            <div className="flex flex-wrap items-center gap-3">
              {canEditRecord && (
                <button
                  type="button"
                  onClick={() => handleSaveFieldUpdates(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
                >
                  Save Field Updates
                </button>
              )}

              {canTeamLeadApprove && (
                <button
                  type="button"
                  onClick={() => handleSaveFieldUpdates(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" /> Team Lead Approve & Close Inspection (Lock Record)
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
