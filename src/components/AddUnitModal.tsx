import React, { useState } from 'react';
import { X, Home, Building2, Sparkles, Plus, CheckCircle2 } from 'lucide-react';
import { store, DatabaseState } from '../services/supabase';
import { Unit, RentalModel, UnitStatus } from '../types/database';
import { useCurrency } from '../context/CurrencyContext';

interface AddUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  dbState: DatabaseState;
  defaultPropertyId?: string;
}

export const AddUnitModal: React.FC<AddUnitModalProps> = ({
  isOpen,
  onClose,
  dbState,
  defaultPropertyId
}) => {
  const { currencyConfig } = useCurrency();

  const [propertyId, setPropertyId] = useState<string>(
    defaultPropertyId || dbState.properties[0]?.id || ''
  );
  const [unitNumber, setUnitNumber] = useState('');
  const [unitType, setUnitType] = useState('2-Bedroom');
  const [bedrooms, setBedrooms] = useState('2');
  const [bathrooms, setBathrooms] = useState('2');
  const [rentalModel, setRentalModel] = useState<RentalModel>('Shortlet / STR');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [nightlyRate, setNightlyRate] = useState('');
  const [cleaningFee, setCleaningFee] = useState('');
  const [commissionRate, setCommissionRate] = useState('15');
  const [status, setStatus] = useState<UnitStatus>('Vacant');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId || !unitNumber.trim()) return;

    const unitId = `unit-${Date.now()}`;
    const isShortlet = rentalModel === 'Shortlet / STR';
    const parsedComm = parseFloat(commissionRate);

    const newUnit: Unit = {
      id: unitId,
      property_id: propertyId,
      unit_number: unitNumber.trim(),
      unit_type: unitType,
      bedrooms: parseInt(bedrooms, 10) || 1,
      bathrooms: parseFloat(bathrooms) || 1,
      monthly_rent: parseFloat(monthlyRent) || (isShortlet ? (parseFloat(nightlyRate) || 0) * 22 : 0),
      status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      rental_model: rentalModel,
      management_fee_percentage: !isNaN(parsedComm) ? parsedComm : (isShortlet ? 15.0 : 10.0),
      nightly_rate: isShortlet ? parseFloat(nightlyRate) || undefined : undefined,
      cleaning_fee: isShortlet ? parseFloat(cleaningFee) || undefined : undefined,
      minimum_stay_nights: isShortlet ? 2 : undefined,
      current_occupancy_rate: isShortlet ? 75 : undefined
    };

    store.addUnit(newUnit);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-cream-50 w-full max-w-xl rounded-2xl border border-cream-300 shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="p-5 border-b border-cream-200 flex items-center justify-between bg-cream-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-50 text-brand-700 rounded-xl border border-brand-200">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">Add New Suite / Unit</h2>
              <p className="text-xs text-stone-500">Attach long-term apartment or shortlet suite to a property</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-cream-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          {/* Target Property */}
          <div>
            <label className="block text-stone-700 font-semibold mb-1">Target Property Asset *</label>
            <select
              required
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-cream-300 rounded-xl text-stone-900 font-bold focus:ring-2 focus:ring-brand-500 focus:outline-hidden cursor-pointer"
            >
              {dbState.properties.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.city})
                </option>
              ))}
            </select>
          </div>

          {/* Rental Model Selector */}
          <div>
            <label className="block text-stone-700 font-semibold mb-1.5">Operational Model *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRentalModel('Shortlet / STR')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  rentalModel === 'Shortlet / STR'
                    ? 'border-purple-500 bg-purple-50/50 ring-1 ring-purple-500'
                    : 'border-cream-300 bg-white hover:bg-cream-100/50'
                }`}
              >
                <Sparkles className="w-4 h-4 text-purple-600 mt-0.5" />
                <div>
                  <span className="font-bold text-stone-900 block">Shortlet / Vacation Rental</span>
                  <span className="text-[11px] text-stone-500">Nightly pricing, cleaning fees & bookings</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRentalModel('Long-Term')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  rentalModel === 'Long-Term'
                    ? 'border-brand-500 bg-brand-50/50 ring-1 ring-brand-500'
                    : 'border-cream-300 bg-white hover:bg-cream-100/50'
                }`}
              >
                <Building2 className="w-4 h-4 text-brand-600 mt-0.5" />
                <div>
                  <span className="font-bold text-stone-900 block">Long-Term Residential</span>
                  <span className="text-[11px] text-stone-500">Monthly recurring residential lease</span>
                </div>
              </button>
            </div>
          </div>

          {/* Unit Identification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-stone-700 font-semibold mb-1">Suite / Unit # *</label>
              <input
                type="text"
                required
                placeholder="e.g. Unit 304, Penthouse B, Suite 12"
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-cream-300 rounded-xl text-stone-900 font-bold focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">Layout Classification</label>
              <input
                type="text"
                placeholder="e.g. 2-Bedroom Executive, Studio Loft"
                value={unitType}
                onChange={(e) => setUnitType(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-cream-300 rounded-xl text-stone-900 font-medium focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">Bedrooms</label>
              <input
                type="number"
                min="0"
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-cream-300 rounded-xl text-stone-900 font-medium focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">Bathrooms</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-cream-300 rounded-xl text-stone-900 font-medium focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Financial Structure */}
          <div className="space-y-3 pt-2">
            <h3 className="font-bold text-stone-900 uppercase tracking-wider text-[11px] pb-1 border-b border-cream-200 flex items-center justify-between">
              <span>Financial Rates</span>
              <span className="text-brand-600 font-medium lowercase">in {currencyConfig.code}</span>
            </h3>

            {rentalModel === 'Shortlet / STR' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Nightly Shortlet Rate *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="e.g. 185000"
                    value={nightlyRate}
                    onChange={(e) => setNightlyRate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-cream-300 rounded-xl text-stone-900 font-bold focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Turnover Cleaning Fee</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 35000"
                    value={cleaningFee}
                    onChange={(e) => setCleaningFee(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-cream-300 rounded-xl text-stone-900 font-bold focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-stone-700 font-semibold mb-1">Monthly Contract Rent *</label>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="e.g. 3200000"
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-cream-300 rounded-xl text-stone-900 font-bold focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                />
              </div>
            )}

            <div>
              <label className="block text-stone-700 font-semibold mb-1">Suite Firm Commission (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-cream-300 rounded-xl text-stone-900 font-bold focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">Initial Occupancy Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as UnitStatus)}
                className="w-full px-3 py-2 bg-white border border-cream-300 rounded-xl text-stone-900 font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-hidden cursor-pointer"
              >
                <option value="Vacant">Vacant / Available</option>
                <option value="Occupied">Occupied</option>
                <option value="Maintenance">Under Maintenance</option>
              </select>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-cream-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-cream-200 hover:bg-cream-300 text-stone-700 font-bold rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> Save Suite / Unit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
