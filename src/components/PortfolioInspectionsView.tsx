import React, { useState, useMemo } from 'react';
import {
  ClipboardCheck, Building2, Home, Calendar, UserCheck, CheckCircle2,
  AlertTriangle, Paperclip, Camera, Film, Volume2, FileText, Search,
  Eye, ShieldCheck, Users
} from 'lucide-react';
import { DatabaseState } from '../services/supabase';
import { Property, PropertyInspection } from '../types/database';
import { useCurrency, CurrencyCode } from '../context/CurrencyContext';
import { DualCurrencyDisplay } from './DualCurrencyDisplay';
import { PortalMediaModal, PortalMediaItem } from './PortalMediaModal';

interface PortfolioInspectionsViewProps {
  dbState: DatabaseState;
  ownedProperties: Property[];
  roleLabel?: 'Landlord' | 'Representative';
}

export const PortfolioInspectionsView: React.FC<PortfolioInspectionsViewProps> = ({
  dbState,
  ownedProperties,
  roleLabel = 'Landlord'
}) => {
  const { currentCurrency, convertAmount, formatAmountInTarget, currencyConfig } = useCurrency();

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('All');
  const [selectedCondition, setSelectedCondition] = useState<string>('All');
  const [selectedScope, setSelectedScope] = useState<'All' | 'Building' | 'Unit'>('All');
  const [selectedMonth, setSelectedMonth] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeMediaItem, setActiveMediaItem] = useState<PortalMediaItem | null>(null);

  const ownedPropertyIds = useMemo(() => ownedProperties.map(p => p.id), [ownedProperties]);

  const getPropNativeCurrency = (propertyId?: string): CurrencyCode => {
    const prop = (dbState.properties || []).find(p => p.id === propertyId);
    return prop?.acquisition?.acquisition_currency || (prop?.city === 'Lagos' || prop?.city === 'Abuja' ? 'NGN' : 'CAD');
  };

  // All inspections belonging to owned properties, sorted newest first
  const ownedInspections = useMemo(() => {
    return (dbState.inspections || [])
      .filter(i => ownedPropertyIds.includes(i.property_id))
      .sort((a, b) => (b.scheduled_date || '').localeCompare(a.scheduled_date || ''));
  }, [dbState.inspections, ownedPropertyIds]);

  // Available months in YYYY-MM format
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    ownedInspections.forEach(i => {
      if (i.scheduled_date && i.scheduled_date.length >= 7) {
        set.add(i.scheduled_date.slice(0, 7));
      }
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [ownedInspections]);

  const formatMonthLabel = (ym: string) => {
    const [year, month] = ym.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Filtered inspections
  const filteredInspections = useMemo(() => {
    return ownedInspections.filter(insp => {
      if (selectedPropertyId !== 'All' && insp.property_id !== selectedPropertyId) return false;
      if (selectedCondition !== 'All' && insp.overall_condition !== selectedCondition) return false;
      if (selectedScope === 'Building' && insp.unit_id) return false;
      if (selectedScope === 'Unit' && !insp.unit_id) return false;
      if (selectedMonth !== 'All' && !(insp.scheduled_date || '').startsWith(selectedMonth)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const prop = ownedProperties.find(p => p.id === insp.property_id);
        const unit = (dbState.units || []).find(u => u.id === insp.unit_id);
        const hay = [
          insp.title,
          insp.general_remarks,
          insp.team_lead_name,
          prop?.name,
          unit?.unit_number,
          ...(insp.findings || []).map(f => `${f.area} ${f.remarks}`)
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [ownedInspections, selectedPropertyId, selectedCondition, selectedScope, selectedMonth, searchQuery, ownedProperties, dbState.units]);

  // Summary metrics
  const excellentOrGoodCount = ownedInspections.filter(
    i => i.overall_condition === 'Excellent' || i.overall_condition === 'Good'
  ).length;
  const conditionHealthRate = ownedInspections.length > 0
    ? Math.round((excellentOrGoodCount / ownedInspections.length) * 100)
    : 100;

  const totalMediaCount = ownedInspections.reduce(
    (sum, i) => sum + ((i.attachments || []).filter(a => a.share_with_landlord !== false).length),
    0
  );

  const totalIncurredAuditCostInActiveCurr = ownedInspections.reduce((sum, i) => {
    if (!i.incurred_cost) return sum;
    const nativeCurr = getPropNativeCurrency(i.property_id);
    return sum + convertAmount(i.incurred_cost, nativeCurr, currentCurrency);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Page Title & Subtitle */}
      <div className="flex items-baseline gap-2 sm:gap-3 overflow-hidden">
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight whitespace-nowrap shrink-0">
          Inspections & Field Audits
        </h1>
        <span className="text-cream-400 font-light shrink-0">|</span>
        <p className="text-sm text-stone-600 truncate">
          At-a-glance physical walkthroughs, suite condition ratings, MEP safety checklists & media briefs across your {ownedProperties.length} properties
        </p>
      </div>

      <hr className="border-t border-slate-800/80" />

      {/* Top KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Field Audits</span>
            <ClipboardCheck className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-black text-stone-900 font-mono">
            {ownedInspections.length}
          </div>
          <p className="text-[11px] text-stone-500">
            {ownedInspections.filter(i => !!i.unit_id).length} suite walkthroughs • {ownedInspections.filter(i => !i.unit_id).length} building-wide
          </p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Portfolio Condition Rating</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono">
            {conditionHealthRate}% <span className="text-xs font-bold text-stone-500">Healthy</span>
          </div>
          <p className="text-[11px] text-stone-500">
            {excellentOrGoodCount} of {ownedInspections.length} rated Excellent or Good
          </p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Attached Media & Checklists</span>
            <Paperclip className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-stone-900 font-mono">
            {totalMediaCount} <span className="text-xs font-bold text-stone-500">Files</span>
          </div>
          <p className="text-[11px] text-stone-500">
            Photos, 360° videos, voice memos & signed PDFs
          </p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Turnover & Audit Costs</span>
            <CheckCircle2 className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-stone-900 font-mono">
            {currencyConfig.symbol}{Math.round(totalIncurredAuditCostInActiveCurr).toLocaleString()}
          </div>
          <p className="text-[11px] text-stone-500">
            Converted in {currentCurrency} across all audited assets
          </p>
        </div>
      </div>

      {/* Interactive Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Property Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Property:</span>
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 cursor-pointer focus:outline-hidden"
              >
                <option value="All">All Owned Properties ({ownedProperties.length})</option>
                {ownedProperties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Scope Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Scope:</span>
              <select
                value={selectedScope}
                onChange={(e) => setSelectedScope(e.target.value as any)}
                className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 cursor-pointer focus:outline-hidden"
              >
                <option value="All">All Audits ({ownedInspections.length})</option>
                <option value="Unit">Suite Walkthroughs</option>
                <option value="Building">Building-Wide & Infrastructure</option>
              </select>
            </div>

            {/* Condition Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Condition:</span>
              <select
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
                className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 cursor-pointer focus:outline-hidden"
              >
                <option value="All">All Ratings</option>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Requires Attention">Requires Attention</option>
              </select>
            </div>

            {/* Month Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Month:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 cursor-pointer focus:outline-hidden"
              >
                <option value="All">All 2026 Months</option>
                {availableMonths.map(ym => (
                  <option key={ym} value={ym}>{formatMonthLabel(ym)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[210px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search unit, inspector, findings..."
              className="w-full pl-8 pr-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-800 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-stone-500 pt-2 border-t border-stone-100">
          <span>
            Showing <strong className="text-stone-900">{filteredInspections.length}</strong> of {ownedInspections.length} physical inspections
          </span>
          {(selectedPropertyId !== 'All' || selectedCondition !== 'All' || selectedScope !== 'All' || selectedMonth !== 'All' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedPropertyId('All');
                setSelectedCondition('All');
                setSelectedScope('All');
                setSelectedMonth('All');
                setSearchQuery('');
              }}
              className="text-brand-700 hover:underline font-bold cursor-pointer"
            >
              Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* Inspections List */}
      {filteredInspections.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-14 text-center space-y-2">
          <ClipboardCheck className="w-8 h-8 text-stone-300 mx-auto" />
          <p className="text-sm font-bold text-stone-700">No inspections match your current filter criteria.</p>
          <p className="text-xs text-stone-400">Try selecting "All Owned Properties" or resetting the month/condition filters.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInspections.map((insp: PropertyInspection) => {
            const prop = ownedProperties.find(p => p.id === insp.property_id);
            const unit = (dbState.units || []).find(u => u.id === insp.unit_id);
            const nativeCurr = getPropNativeCurrency(insp.property_id);
            const sharedAttachments = (insp.attachments || []).filter(a => a.share_with_landlord !== false);
            const attendees = insp.assigned_attendees || [];
            const findings = insp.findings || [];

            return (
              <div
                key={insp.id}
                className="bg-white rounded-3xl border border-stone-200 shadow-xs p-5 sm:p-6 space-y-4 hover:border-stone-300 transition-all"
              >
                {/* Top Header Row */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 pb-3 border-b border-stone-100">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-stone-900 text-white">
                        <Building2 className="w-3 h-3 text-emerald-400" />
                        {prop?.name || 'Property'}
                      </span>

                      {unit ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-brand-50 text-brand-700 border border-brand-200">
                          <Home className="w-3 h-3" />
                          Suite {unit.unit_number} ({unit.unit_type})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          Building-Wide & Common Infrastructure
                        </span>
                      )}

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        insp.overall_condition === 'Excellent'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : insp.overall_condition === 'Good'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : insp.overall_condition === 'Fair'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        Condition: {insp.overall_condition || 'Good'}
                      </span>

                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                        {insp.status}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-stone-900 text-base tracking-tight">
                      {insp.title}
                    </h3>

                    <div className="flex items-center gap-4 flex-wrap text-xs text-stone-500">
                      <span className="flex items-center gap-1 font-medium text-stone-700">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        Conducted: <strong>{insp.scheduled_date}</strong> {insp.scheduled_time ? `at ${insp.scheduled_time}` : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Lead Auditor: <strong className="text-stone-800">{insp.team_lead_name}</strong>
                      </span>
                      {attendees.length > 0 && (
                        <span className="flex items-center gap-1 text-stone-500">
                          <Users className="w-3.5 h-3.5 text-stone-400" />
                          Team: {attendees.map(a => `${a.staff_name} (${a.staff_role})`).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Incurred Cost (if any) & Audit ID */}
                  <div className="flex items-center gap-3 self-start">
                    {insp.incurred_cost && insp.incurred_cost > 0 ? (
                      <div className="text-right px-3.5 py-2 bg-stone-50 rounded-xl border border-stone-200/80">
                        <span className="text-[10px] uppercase font-bold text-stone-400 block">Turnover / Audit Cost</span>
                        <DualCurrencyDisplay
                          amount={insp.incurred_cost}
                          nativeCurrency={nativeCurr}
                          primaryClassName="font-black text-sm text-stone-900 font-mono"
                          secondaryClassName="text-[10px] text-stone-400 block"
                        />
                      </div>
                    ) : (
                      <div className="text-right px-3 py-1.5 bg-emerald-50/70 rounded-xl border border-emerald-200/60">
                        <span className="text-[10px] uppercase font-bold text-emerald-700 block">Routine Audit</span>
                        <span className="text-xs font-bold text-emerald-900">Covered by Mandate</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* General Auditor Remarks */}
                {insp.general_remarks && (
                  <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80 text-xs text-stone-700 leading-relaxed">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                      Executive Field Remarks
                    </span>
                    {insp.general_remarks}
                  </div>
                )}

                {/* Area-by-Area Inspection Findings Grid */}
                {findings.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                      Area-by-Area Inspection Checklist ({findings.length} Zones Verified)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {findings.map((f, fIdx) => (
                        <div
                          key={fIdx}
                          className="p-3 bg-white rounded-xl border border-stone-200/90 space-y-1 flex flex-col justify-between"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-xs text-stone-900">{f.area}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              f.rating === 'Excellent'
                                ? 'bg-emerald-100 text-emerald-800'
                                : f.rating === 'Good'
                                ? 'bg-blue-100 text-blue-800'
                                : f.rating === 'Fair'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {f.rating}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-600 leading-snug">{f.remarks}</p>
                          {f.action_needed && (
                            <span className="text-[10px] font-bold text-amber-700 flex items-center gap-1 pt-1">
                              <AlertTriangle className="w-3 h-3" /> Follow-up action logged
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attached Media Briefs & Signed Checklists */}
                {sharedAttachments.length > 0 && (
                  <div className="pt-3 border-t border-stone-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-brand-600" />
                        Attached Inspection Documents, Photos & Media Briefs ({sharedAttachments.length})
                      </span>
                      <span className="text-[10px] text-stone-400">Click any item to preview</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {sharedAttachments.map(att => {
                        const isPhoto = att.file_type === 'photo';
                        const isVideo = att.file_type === 'video';
                        const isAudio = att.file_type === 'audio';

                        return (
                          <button
                            key={att.id}
                            type="button"
                            onClick={() =>
                              setActiveMediaItem({
                                type: isVideo ? 'video' : isAudio ? 'audio' : isPhoto ? 'photo' : 'document',
                                url: att.file_url,
                                title: att.file_name,
                                caption: att.caption || insp.general_remarks,
                                propertyName: prop?.name,
                                unitNumber: unit?.unit_number,
                                vendorOrAuditor: att.recorded_by || insp.team_lead_name,
                                date: insp.scheduled_date,
                                amountFormatted: insp.incurred_cost ? formatAmountInTarget(insp.incurred_cost, nativeCurr) : 'Included in Mandate',
                                status: `${insp.status} (${insp.overall_condition || 'Good'})`,
                                referenceId: insp.id.toUpperCase()
                              })
                            }
                            className="p-2 bg-stone-50 hover:bg-stone-100 border border-stone-200 hover:border-stone-300 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-stone-800 transition-all group cursor-pointer shadow-2xs"
                          >
                            {isPhoto ? (
                              <img
                                src={att.file_url}
                                alt={att.file_name}
                                className="w-8 h-8 rounded-lg object-cover border border-stone-200 shrink-0"
                              />
                            ) : isVideo ? (
                              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                                <Film className="w-4 h-4" />
                              </div>
                            ) : isAudio ? (
                              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                                <Volume2 className="w-4 h-4" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                            )}

                            <div className="text-left min-w-0">
                              <span className="block truncate max-w-[180px] text-[11px] font-bold text-stone-800">
                                {att.file_name}
                              </span>
                              <span className="block text-[10px] text-stone-500 capitalize">
                                {att.file_type === 'document' ? 'Signed Audit PDF' : `${att.file_type} Brief`}
                              </span>
                            </div>

                            <Eye className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-900 ml-1 shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Digital Sign-Off Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 text-[11px] text-stone-400">
                  <span>Audit Reference: <strong className="font-mono text-stone-600">{insp.id.toUpperCase()}</strong></span>
                  <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Digitally Certified by {insp.team_lead_signed_by || `${insp.team_lead_name} (Operations Lead)`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Shared Media / Document Viewer Modal */}
      <PortalMediaModal
        item={activeMediaItem}
        onClose={() => setActiveMediaItem(null)}
      />
    </div>
  );
};
