import React, { useState } from 'react';
import { ShieldCheck, UserCheck, CheckCircle2, XCircle, Play, FileText, AlertCircle } from 'lucide-react';
import { DatabaseState, store } from '../services/supabase';
import { TenantApplicant, Tenant, Lease } from '../types/database';

interface ScreeningProps {
  dbState: DatabaseState;
}

export const ScreeningPage: React.FC<ScreeningProps> = ({ dbState }) => {
  const [selectedApplicantId, setSelectedApplicantId] = useState<string>(dbState.applicants[0]?.id || '');

  const applicant = dbState.applicants.find(a => a.id === selectedApplicantId);
  const property = applicant ? dbState.properties.find(p => p.id === applicant.desired_property_id) : undefined;
  const unit = applicant ? dbState.units.find(u => u.id === applicant.desired_unit_id) : undefined;

  const handleUpdateStatus = (newStatus: 'Submitted' | 'In Review' | 'Approved' | 'Declined') => {
    if (!applicant) return;

    // Simulate Credit & Background Check output on Submission/Approval
    const updates: Partial<TenantApplicant> = {
      status: newStatus,
      credit_score: applicant.credit_score || Math.floor(Math.random() * (820 - 680 + 1)) + 680,
      background_check: newStatus === 'Approved' ? 'Passed' : applicant.background_check || 'Passed'
    };

    store.updateApplicant(applicant.id, updates);

    // If Approved, automatically convert to Active Tenant & Create Lease Draft
    if (newStatus === 'Approved') {
      const names = applicant.full_name.split(' ');
      const newTenant: Tenant = {
        id: 'ten-' + Date.now(),
        first_name: names[0] || applicant.full_name,
        last_name: names.slice(1).join(' ') || 'Applicant',
        email: applicant.email,
        phone: applicant.phone,
        status: 'Active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      store.getState().tenants.unshift(newTenant);

      if (unit) {
        const newLease: Lease = {
          id: 'lease-' + Date.now(),
          tenant_id: newTenant.id,
          unit_id: unit.id,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
          monthly_rent: unit.monthly_rent,
          deposit: unit.monthly_rent,
          status: 'Active',
          renewal_status: 'Pending Review',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        store.getState().leases.unshift(newLease);
        store.updatePayment(unit.id, { status: 'Occupied' } as any);
      }
    }

    // Add Audit Log
    store.addAutomationLog({
      id: 'log-' + Date.now(),
      automation_type: 'tenant_screening',
      entity_type: 'TenantApplicant',
      entity_id: applicant.id,
      action: `Screening workflow status updated to ${newStatus} for ${applicant.full_name}`,
      status: 'Success',
      metadata: { new_status: newStatus, credit_score: updates.credit_score },
      created_at: new Date().toISOString()
    });

    store.saveState();
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tenant Screening & Applications</h1>
          <p className="text-sm text-slate-500">Simulated screening verification, credit scoring & approval pipeline</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Applicant List Column */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">Applicants Queue</h3>
          <div className="space-y-2">
            {dbState.applicants.map(app => (
              <button
                key={app.id}
                onClick={() => setSelectedApplicantId(app.id)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                  selectedApplicantId === app.id
                    ? 'bg-brand-50 border-brand-300 ring-2 ring-brand-500/20'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-900">{app.full_name}</h4>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    app.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                    app.status === 'Declined' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {app.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{app.employment} • ${app.income.toLocaleString()}/yr</p>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Applicant Workflow & Actions (2 Columns) */}
        {applicant ? (
          <div className="lg:col-span-2 space-y-6">
            {/* Applicant Details Header */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                    Application ID: {applicant.id}
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 mt-1">{applicant.full_name}</h2>
                  <p className="text-xs text-slate-500">{applicant.email} • {applicant.phone}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Desired Unit</span>
                  <span className="text-sm font-bold text-slate-900">{property?.name} (Unit {unit?.unit_number})</span>
                </div>
              </div>

              {/* Progress Workflow Stepper */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Verification Pipeline</h4>
                <div className="flex items-center justify-between text-xs font-semibold">
                  {['Pending', 'Submitted', 'In Review', 'Approved'].map((st, i) => {
                    const isDone = ['Pending', 'Submitted', 'In Review', 'Approved'].indexOf(applicant.status) >= i;
                    return (
                      <div key={st} className={`flex items-center gap-1.5 ${isDone ? 'text-emerald-600' : 'text-slate-400'}`}>
                        <CheckCircle2 className={`w-4 h-4 ${isDone ? 'text-emerald-500' : 'text-slate-300'}`} />
                        <span>{st}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons for POC Simulation */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
                {applicant.status !== 'Approved' && (
                  <button
                    onClick={() => handleUpdateStatus('Approved')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <UserCheck className="w-4 h-4" /> Approve Application
                  </button>
                )}

                {applicant.status !== 'Declined' && (
                  <button
                    onClick={() => handleUpdateStatus('Declined')}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" /> Decline
                  </button>
                )}

                <button
                  onClick={() => handleUpdateStatus('In Review')}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" /> Request Screening Check
                </button>
              </div>
            </div>

            {/* Verification Checks Simulation Results */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Credit Score Check</span>
                <div className="text-2xl font-extrabold text-slate-900">
                  {applicant.credit_score ? `${applicant.credit_score} / 850` : 'Pending Verification'}
                </div>
                <p className="text-xs text-emerald-600 font-medium">Equifax / TransUnion Canada Simulated</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Background Check</span>
                <div className="text-xl font-extrabold text-slate-900">
                  {applicant.background_check || 'Pending'}
                </div>
                <p className="text-xs text-slate-500">Employment & income verification ($142k verified)</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500">
            Select an applicant to view screening records.
          </div>
        )}
      </div>
    </div>
  );
};
