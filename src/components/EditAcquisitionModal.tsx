import React, { useState } from 'react';
import { X, Building2, DollarSign, Calendar, Clock, Landmark, ShieldCheck } from 'lucide-react';
import { Property, PropertyAcquisition, AcquisitionType } from '../types/database';
import { store } from '../services/supabase';
import { useCurrency } from '../context/CurrencyContext';

interface EditAcquisitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
}

export const EditAcquisitionModal: React.FC<EditAcquisitionModalProps> = ({
  isOpen,
  onClose,
  property
}) => {
  const current = property.acquisition || {
    acquisition_type: 'Outright Purchase',
    acquisition_date: property.created_at.split('T')[0],
    total_acquisition_cost: 4500000,
    down_payment_or_deposit: 900000,
    amortization_period_years: 25,
    annual_depreciation_or_amort: 180000,
    interest_rate_percent: 4.85,
    notes: ''
  };

  const [acquisitionType, setAcquisitionType] = useState<AcquisitionType>(current.acquisition_type);
  const [acquisitionDate, setAcquisitionDate] = useState<string>(current.acquisition_date);
  const [totalCost, setTotalCost] = useState<string>(current.total_acquisition_cost.toString());
  const [downPayment, setDownPayment] = useState<string>(current.down_payment_or_deposit.toString());
  const [leaseTermYears, setLeaseTermYears] = useState<string>((current.lease_term_years || 15).toString());
  const [monthlyLeaseCost, setMonthlyLeaseCost] = useState<string>((current.monthly_lease_cost || 15000).toString());
  const [amortYears, setAmortYears] = useState<string>(current.amortization_period_years.toString());
  const [interestRate, setInterestRate] = useState<string>((current.interest_rate_percent || 4.75).toString());
  const [notes, setNotes] = useState<string>(current.notes || '');
  const { formatMoney } = useCurrency();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const costNum = parseFloat(totalCost) || 0;
    const amortNum = parseInt(amortYears, 10) || 25;
    const annualAmort = amortNum > 0 ? Math.round(costNum / amortNum) : 0;

    const updatedAcquisition: PropertyAcquisition = {
      acquisition_type: acquisitionType,
      acquisition_date: acquisitionDate,
      total_acquisition_cost: costNum,
      down_payment_or_deposit: parseFloat(downPayment) || 0,
      lease_term_years: acquisitionType === 'Long-Term Lease' ? (parseInt(leaseTermYears, 10) || 15) : undefined,
      monthly_lease_cost: acquisitionType === 'Long-Term Lease' ? (parseFloat(monthlyLeaseCost) || 0) : undefined,
      amortization_period_years: amortNum,
      annual_depreciation_or_amort: annualAmort,
      interest_rate_percent: acquisitionType !== 'Long-Term Lease' ? (parseFloat(interestRate) || undefined) : undefined,
      notes: notes.trim()
    };

    store.updatePropertyAcquisition(property.id, updatedAcquisition);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Configure Asset Acquisition Terms</h3>
              <p className="text-xs text-slate-500">Record outright capital acquisition or long-term master lease</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Acquisition Structure Toggle */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">Acquisition Model</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setAcquisitionType('Outright Purchase');
                  setAmortYears('25');
                }}
                className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all ${
                  acquisitionType === 'Outright Purchase'
                    ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Landmark className="w-4 h-4" /> Outright Purchase
              </button>
              <button
                type="button"
                onClick={() => {
                  setAcquisitionType('Long-Term Lease');
                  setAmortYears(leaseTermYears || '15');
                }}
                className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all ${
                  acquisitionType === 'Long-Term Lease'
                    ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Clock className="w-4 h-4" /> Long-Term Master Lease
              </button>
            </div>
          </div>

          {/* Date & Total Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Acquisition Date</label>
              <input
                type="date"
                required
                value={acquisitionDate}
                onChange={(e) => setAcquisitionDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-medium focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                {acquisitionType === 'Outright Purchase' ? 'Total Purchase Price (CAD)' : 'Total Leasehold Capital / Commitment'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  step="1000"
                  min="0"
                  required
                  value={totalCost}
                  onChange={(e) => setTotalCost(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-bold focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Initial Equity Cash Down Payment / Upfront Lease Deposit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                {acquisitionType === 'Outright Purchase' ? 'Equity Down Payment (Cash Outflow)' : 'Upfront Capital & Lease Deposit'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  step="1000"
                  min="0"
                  required
                  value={downPayment}
                  onChange={(e) => setDownPayment(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-bold focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                />
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Used as the capital baseline for break-even payback calculation</span>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Amortization Period (Years)</label>
              <input
                type="number"
                min="1"
                max="50"
                required
                value={amortYears}
                onChange={(e) => setAmortYears(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-bold focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Annual write-off: {formatMoney((parseFloat(totalCost) || 0) / (parseInt(amortYears, 10) || 1), { maximumFractionDigits: 0 })}/yr
              </span>
            </div>
          </div>

          {/* Conditional Fields: Master Lease vs Purchase Mortgage */}
          {acquisitionType === 'Long-Term Lease' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-amber-50/50 rounded-xl border border-amber-200">
              <div>
                <label className="block text-amber-900 font-semibold mb-1">Master Lease Term (Years)</label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={leaseTermYears}
                  onChange={(e) => {
                    setLeaseTermYears(e.target.value);
                    setAmortYears(e.target.value);
                  }}
                  className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="block text-amber-900 font-semibold mb-1">Monthly Master Lease Fee (CAD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    step="100"
                    min="0"
                    value={monthlyLeaseCost}
                    onChange={(e) => setMonthlyLeaseCost(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-amber-200 rounded-xl text-slate-800 font-bold"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Financing / Mortgage Interest Rate (%)</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="25"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-bold"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Legal / Contract Notes</label>
            <input
              type="text"
              placeholder="e.g. Freehold commercial acquisition with 25-yr amortization"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" /> Save Acquisition Terms
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
