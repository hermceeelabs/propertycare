import React, { useState } from 'react';
import { X, TrendingUp, History, DollarSign, Calendar, Sparkles, Building2, AlertCircle } from 'lucide-react';
import { Unit } from '../types/database';
import { useCurrency, CurrencyCode } from '../context/CurrencyContext';
import { store } from '../services/supabase';

interface AdjustUnitPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit: Unit | null;
  propertyName?: string;
  propertyDefaultCommission?: number;
  nativeCurrency?: CurrencyCode;
}

export const AdjustUnitPriceModal: React.FC<AdjustUnitPriceModalProps> = ({
  isOpen,
  onClose,
  unit,
  propertyName,
  propertyDefaultCommission = 10.0,
  nativeCurrency = 'CAD'
}) => {
  const { formatAmountInTarget, formatMoney } = useCurrency();
  const [activeRateType, setActiveRateType] = useState<'monthly_rent' | 'nightly_rate'>(() => {
    return unit?.rental_model === 'Shortlet / STR' ? 'nightly_rate' : 'monthly_rent';
  });

  const [newPrice, setNewPrice] = useState<number>(() => {
    if (!unit) return 0;
    return unit.rental_model === 'Shortlet / STR' ? (unit.nightly_rate || 180) : unit.monthly_rent;
  });

  const [commissionRate, setCommissionRate] = useState<string>(() => {
    if (!unit) return propertyDefaultCommission.toString();
    return (unit.management_fee_percentage ?? propertyDefaultCommission).toString();
  });

  const [reason, setReason] = useState('Market rate adjustment for upcoming renewal cycle');
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !unit) return null;

  const isShortlet = unit.rental_model === 'Shortlet / STR';
  const currentPrice = activeRateType === 'nightly_rate' ? (unit.nightly_rate || 0) : unit.monthly_rent;
  const priceHistory = unit.price_history || [];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrice || newPrice <= 0) return;

    setIsSubmitting(true);
    const parsedCommission = parseFloat(commissionRate);
    const updates: Partial<Unit> = {
      management_fee_percentage: !isNaN(parsedCommission) ? parsedCommission : propertyDefaultCommission
    };
    if (activeRateType === 'nightly_rate') {
      updates.nightly_rate = Number(newPrice);
    } else {
      updates.monthly_rent = Number(newPrice);
    }

    store.updateUnit(unit.id, updates, reason.trim(), 'Admin Operations');
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-stone-200 shadow-2xl p-6 sm:p-7 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b border-stone-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-stone-900 text-lg">Adjust Suite Rate & Track Price History</h3>
              {isShortlet ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  Shortlet
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-700">
                  Long-Term
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500">
              Unit {unit.unit_number} ({unit.unit_type}) • {propertyName || 'Property Asset'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-5">
          {/* Rate Selector for Hybrid / Shortlet units */}
          {isShortlet && (
            <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setActiveRateType('nightly_rate');
                  setNewPrice(unit.nightly_rate || 180);
                }}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeRateType === 'nightly_rate' ? 'bg-stone-900 text-white shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Nightly Rate (STR)
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveRateType('monthly_rent');
                  setNewPrice(unit.monthly_rent || 0);
                }}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeRateType === 'monthly_rent' ? 'bg-stone-900 text-white shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Baseline Monthly Value
              </button>
            </div>
          )}

          {/* Current vs New Rate Visualizer */}
          <div className="grid grid-cols-2 gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-200">
            <div>
              <span className="text-[10px] font-bold uppercase text-stone-400 block tracking-wider">Current Active Rate</span>
              <span className="text-lg font-black text-stone-700 block">
                {formatAmountInTarget(currentPrice, nativeCurrency)}
              </span>
              <span className="text-[10px] text-stone-400 block font-mono">
                {activeRateType === 'nightly_rate' ? 'per booked night' : 'per calendar month'}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold uppercase text-emerald-700 block tracking-wider">New Proposed Rate</span>
              <span className="text-lg font-black text-emerald-800 block">
                {formatAmountInTarget(newPrice || 0, nativeCurrency)}
              </span>
              <span className="text-[10px] text-emerald-600 block">
                {newPrice > currentPrice ? `+${(((newPrice - currentPrice) / (currentPrice || 1)) * 100).toFixed(1)}% Increase` :
                 newPrice < currentPrice ? `${(((newPrice - currentPrice) / (currentPrice || 1)) * 100).toFixed(1)}% Reduction` : 'No change'}
              </span>
            </div>
          </div>

          {/* New Price & Suite Firm Commission Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 block">
                New {activeRateType === 'nightly_rate' ? 'Nightly Rate' : 'Monthly Rent'} ({nativeCurrency})
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={newPrice}
                  onChange={(e) => setNewPrice(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl font-black text-stone-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-700 block">
                  Suite Firm Commission (%)
                </label>
                <button
                  type="button"
                  onClick={() => setCommissionRate(propertyDefaultCommission.toString())}
                  className="text-[10px] font-bold text-brand-600 hover:underline cursor-pointer"
                >
                  Use Property Default ({propertyDefaultCommission}%)
                </button>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-amber-50/60 border border-amber-300 rounded-xl font-black text-stone-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Reason for Audit Log */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 block">
              Reason for Price Adjustment (Saved to Immutable Audit Trail)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Annual inflation indexing, peak holiday season, market comp review"
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>

          {/* Effective Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 block">
              Effective Date
            </label>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || newPrice <= 0}
              className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save & Record History'}
            </button>
          </div>
        </form>

        {/* Price History Timeline */}
        <div className="space-y-3 pt-3 border-t border-stone-200/80">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-stone-600" />
            <h4 className="font-bold text-xs text-stone-900 uppercase tracking-wider">
              Recorded Price History ({priceHistory.length})
            </h4>
          </div>

          {priceHistory.length === 0 ? (
            <p className="p-3 text-xs text-stone-400 italic bg-stone-50 rounded-xl text-center">
              No historical price modifications recorded for this unit yet.
            </p>
          ) : (
            <div className="space-y-2 max-h-44 overflow-y-auto divide-y divide-stone-100">
              {priceHistory.map(ph => (
                <div key={ph.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-stone-900">
                        {formatAmountInTarget(ph.old_price, nativeCurrency)} → {formatAmountInTarget(ph.new_price, nativeCurrency)}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-100 text-stone-600 font-mono">
                        {ph.field_changed === 'nightly_rate' ? 'STR Nightly' : 'Monthly Rent'}
                      </span>
                    </div>
                    <span className="text-[11px] text-stone-500 block mt-0.5">{ph.reason}</span>
                    <span className="text-[10px] text-stone-400">{ph.effective_date} • By {ph.changed_by || 'Admin'}</span>
                  </div>
                  <span className={`text-[11px] font-bold ${ph.new_price >= ph.old_price ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {ph.new_price >= ph.old_price ? `+${formatAmountInTarget(ph.new_price - ph.old_price, nativeCurrency)}` : `-${formatAmountInTarget(ph.old_price - ph.new_price, nativeCurrency)}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
