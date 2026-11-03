import React, { useState } from 'react';
import { X, Building2, MapPin, Landmark, Clock, CheckCircle2 } from 'lucide-react';
import { store, DatabaseState } from '../services/supabase';
import { Property, PropertyType, AcquisitionType } from '../types/database';
import { useCurrency } from '../context/CurrencyContext';

interface AddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  dbState: DatabaseState;
  onCreated?: (propertyId: string) => void;
}

export const AddPropertyModal: React.FC<AddPropertyModalProps> = ({
  isOpen,
  onClose,
  dbState,
  onCreated
}) => {
  const { currencyConfig } = useCurrency();

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>('Multi-Family');

  // Acquisition details
  const [acquisitionType, setAcquisitionType] = useState<AcquisitionType>('Outright Purchase');
  const [totalCost, setTotalCost] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [amortYears, setAmortYears] = useState('20');
  const [leaseTermYears, setLeaseTermYears] = useState('10');
  const [monthlyLeaseCost, setMonthlyLeaseCost] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !city.trim()) return;

    const propertyId = `prop-${Date.now()}`;
    const costNum = parseFloat(totalCost) || 0;
    const downPaymentNum = parseFloat(downPayment) || 0;
    const amortNum = parseInt(amortYears, 10) || 20;
    const annualAmort = amortNum > 0 ? Math.round(costNum / amortNum) : 0;

    const newProperty: Property = {
      id: propertyId,
      name: name.trim(),
      address: address.trim() || `${name} Address`,
      city: city.trim(),
      province: province.trim() || 'State/Region',
      postal_code: postalCode.trim() || '00000',
      property_type: propertyType,
      units_count: 0,
      status: 'Active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      acquisition: {
        acquisition_type: acquisitionType,
        acquisition_date: new Date().toISOString().split('T')[0],
        total_acquisition_cost: costNum,
        down_payment_or_deposit: downPaymentNum,
        amortization_period_years: amortNum,
        annual_depreciation_or_amort: annualAmort,
        lease_term_years: acquisitionType === 'Long-Term Lease' ? parseInt(leaseTermYears, 10) || 10 : undefined,
        monthly_lease_cost: acquisitionType === 'Long-Term Lease' ? parseFloat(monthlyLeaseCost) || 0 : undefined,
        notes: notes.trim()
      }
    };

    store.addProperty(newProperty);
    if (onCreated) onCreated(propertyId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-cream-50 w-full max-w-2xl rounded-2xl border border-cream-300 shadow-2xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="p-5 border-b border-cream-200 flex items-center justify-between bg-cream-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-50 text-brand-700 rounded-xl border border-brand-200">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">Add New Real Estate Property</h2>
              <p className="text-xs text-stone-500">Register building, standalone villa, compound or high-rise asset</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-cream-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          {/* Basic Asset Info */}
          <div className="space-y-3">
            <h3 className="font-bold text-stone-900 uppercase tracking-wider text-[11px] pb-1 border-b border-cream-200">
              1. Basic Property Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">Property / Compound Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Victoria Crest Court, Maitama Heights"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-cream-300 rounded-xl text-stone-900 font-medium focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Property Type</label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value as PropertyType)}
                  className="w-full px-3 py-2 bg-white border border-cream-300 rounded-xl text-stone-900 font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                >
                  <option value="Multi-Family">Multi-Family / Apartment Complex</option>
                  <option value="Condominium">Condominium / High-Rise</option>
                  <option value="Single-Family">Single-Family / Standalone Villa</option>
                  <option value="Townhome">Townhome / Terraced Duplex</option>
                  <option value="Commercial">Commercial / Mixed Use</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-stone-700 font-semibold mb-1">Physical Street Address</label>
                <input
                  type="text"
                  placeholder="e.g. Plot 12 Admiralty Way, Lekki Phase 1"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-cream-300 rounded-xl text-stone-900 font-medium focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">City *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lagos, Abuja, Toronto"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-cream-300 rounded-xl text-stone-900 font-medium focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">State / Province / Region</label>
                <input
                  type="text"
                  placeholder="e.g. Lagos State, FCT, Ontario"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-cream-300 rounded-xl text-stone-900 font-medium focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Acquisition Structure */}
          <div className="space-y-3 pt-2">
            <h3 className="font-bold text-stone-900 uppercase tracking-wider text-[11px] pb-1 border-b border-cream-200 flex items-center justify-between">
              <span>2. Asset Acquisition & Investment Structure</span>
              <span className="text-brand-600 lowercase font-medium">values in {currencyConfig.code}</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAcquisitionType('Outright Purchase')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  acquisitionType === 'Outright Purchase'
                    ? 'border-brand-500 bg-brand-50/50 ring-1 ring-brand-500'
                    : 'border-cream-300 bg-white hover:bg-cream-100/50'
                }`}
              >
                <Landmark className="w-4 h-4 text-brand-600 mt-0.5" />
                <div>
                  <span className="font-bold text-stone-900 block">Outright Purchase</span>
                  <span className="text-[11px] text-stone-500">Freehold ownership, depreciation schedule</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAcquisitionType('Long-Term Lease')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  acquisitionType === 'Long-Term Lease'
                    ? 'border-purple-500 bg-purple-50/50 ring-1 ring-purple-500'
                    : 'border-cream-300 bg-white hover:bg-cream-100/50'
                }`}
              >
                <Clock className="w-4 h-4 text-purple-600 mt-0.5" />
                <div>
                  <span className="font-bold text-stone-900 block">Long-Term Master Lease</span>
                  <span className="text-[11px] text-stone-500">Master ground lease with monthly owner payout</span>
                </div>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">
                  {acquisitionType === 'Outright Purchase' ? 'Total Acquisition / Purchase Cost' : 'Total Master Lease Contract Value'}
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 500000000"
                  value={totalCost}
                  onChange={(e) => setTotalCost(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-cream-300 rounded-xl text-stone-900 font-bold focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">
                  {acquisitionType === 'Outright Purchase' ? 'Equity Down Payment / Initial Outlay' : 'Upfront Deposit & Initial Fit-Out'}
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 100000000"
                  value={downPayment}
                  onChange={(e) => setDownPayment(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-cream-300 rounded-xl text-stone-900 font-bold focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                />
              </div>

              {acquisitionType === 'Long-Term Lease' ? (
                <>
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Monthly Master Lease Fee (to Owner)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 4500000"
                      value={monthlyLeaseCost}
                      onChange={(e) => setMonthlyLeaseCost(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-cream-300 rounded-xl text-stone-900 font-bold focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Master Lease Term (Years)</label>
                    <input
                      type="number"
                      min="1"
                      value={leaseTermYears}
                      onChange={(e) => setLeaseTermYears(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-cream-300 rounded-xl text-stone-900 font-bold focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Amortization Period (Years)</label>
                  <input
                    type="number"
                    min="1"
                    value={amortYears}
                    onChange={(e) => setAmortYears(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-cream-300 rounded-xl text-stone-900 font-bold focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                  />
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="block text-stone-700 font-semibold mb-1">Acquisition Notes & Strategy</label>
                <textarea
                  rows={2}
                  placeholder="Notes on land title, power backup, target corporate yield, or tenancy restrictions..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-cream-300 rounded-xl text-stone-900 font-medium focus:ring-2 focus:ring-brand-500 focus:outline-hidden resize-none"
                />
              </div>
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
              <CheckCircle2 className="w-4 h-4" /> Save Property
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
