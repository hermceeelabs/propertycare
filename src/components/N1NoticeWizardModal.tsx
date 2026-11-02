import React, { useState } from 'react';
import { FileText, X, AlertTriangle, ShieldCheck, Calculator, ArrowRight } from 'lucide-react';
import { DatabaseState, store } from '../services/supabase';
import { calculateN1Increase, createN1NoticeDraft, ONTARIO_RENT_INCREASE_GUIDELINE_2026 } from '../services/noticeService';

interface N1NoticeWizardModalProps {
  dbState: DatabaseState;
  onClose: () => void;
  onSuccess: () => void;
}

export const N1NoticeWizardModal: React.FC<N1NoticeWizardModalProps> = ({
  dbState,
  onClose,
  onSuccess
}) => {
  const [selectedLeaseId, setSelectedLeaseId] = useState(dbState.leases[0]?.id || '');
  const [customIncrease, setCustomIncrease] = useState<number>(ONTARIO_RENT_INCREASE_GUIDELINE_2026 * 100);
  
  // Default effective date set to 90 days from today (Ontario statutory requirement)
  const defaultEffectiveDate = new Date();
  defaultEffectiveDate.setDate(defaultEffectiveDate.getDate() + 90);
  const [effectiveDate, setEffectiveDate] = useState(defaultEffectiveDate.toISOString().split('T')[0]);

  const activeLease = dbState.leases.find(l => l.id === selectedLeaseId);
  const tenant = activeLease ? dbState.tenants.find(t => t.id === activeLease.tenant_id) : undefined;
  const unit = activeLease ? dbState.units.find(u => u.id === activeLease.unit_id) : undefined;
  const property = unit ? dbState.properties.find(p => p.id === unit.property_id) : undefined;

  const currentRent = activeLease ? activeLease.monthly_rent : 0;
  const calcResult = calculateN1Increase({
    currentRent,
    customPercentage: customIncrease,
    effectiveDate
  });

  const handleCreateDraft = () => {
    if (!tenant || !activeLease || !property || !unit) return;

    const noticeDraft = createN1NoticeDraft(tenant, activeLease, property, unit, calcResult);
    store.addNotice(noticeDraft);

    // Create task for manager review & approval
    store.addTask({
      id: 'task-' + Date.now(),
      assigned_to: 'Property Manager',
      task_type: 'Notice Approval',
      title: `Form N1 Approval: ${tenant.first_name} ${tenant.last_name} (Unit ${unit.unit_number})`,
      description: `Review Form N1 Notice of Rent Increase proposing ${calcResult.percentageChange.toFixed(1)}% ($${calcResult.increaseAmount.toFixed(2)}) increase to $${calcResult.newRent.toFixed(2)} effective ${calcResult.effectiveDate}.`,
      priority: 'High',
      status: 'Pending',
      due_date: new Date().toISOString().split('T')[0],
      related_entity_type: 'Notice',
      related_entity_id: noticeDraft.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Form N1 Rent Increase Notice Wizard</h3>
              <p className="text-xs text-slate-300">Ontario Residential Tenancies Act (RTA) Administrative Workflow</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Legal Disclaimer */}
        <div className="bg-amber-50 border-b border-amber-200 p-4 flex items-start gap-3 text-xs text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Administrative Workflow Notice</p>
            <p className="mt-0.5 text-amber-800">
              Legal compliance and notice requirements should be reviewed by the property manager or appropriate legal professional. Formal notice requires explicit manager approval and 90 days written delivery.
            </p>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Select Lease/Tenant */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Tenant & Unit
            </label>
            <select
              value={selectedLeaseId}
              onChange={(e) => setSelectedLeaseId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
            >
              {dbState.leases.map(l => {
                const t = dbState.tenants.find(ten => ten.id === l.tenant_id);
                const u = dbState.units.find(un => un.id === l.unit_id);
                const p = u ? dbState.properties.find(prop => prop.id === u.property_id) : undefined;
                return (
                  <option key={l.id} value={l.id}>
                    {t?.first_name} {t?.last_name} — {p?.name} Unit {u?.unit_number} (${l.monthly_rent}/mo)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Guidelines & Custom Increase Percentage */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Increase Percentage (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={customIncrease}
                  onChange={(e) => setCustomIncrease(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">%</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">2026 Ontario Guideline: 2.5%</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Effective Date (90 Days Min)
              </label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Calculation Card Breakdown */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-2">
              Calculation Breakdown
            </h4>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <span className="text-xs text-slate-500 block">Current Rent</span>
                <span className="text-base font-extrabold text-slate-900">${calcResult.currentRent.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-xs text-brand-700 block">Increase (+{calcResult.percentageChange.toFixed(1)}%)</span>
                <span className="text-base font-extrabold text-brand-600">+${calcResult.increaseAmount.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-xs text-emerald-700 block">New Rent</span>
                <span className="text-base font-extrabold text-emerald-600">${calcResult.newRent.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-brand-600" /> System generates DRAFT awaiting manager authorization
          </span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900">
              Cancel
            </button>
            <button
              onClick={handleCreateDraft}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              Generate Draft Notice <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
