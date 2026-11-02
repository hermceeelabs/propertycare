import React, { useState } from 'react';
import { X, DollarSign, Calendar, Building2, Home, Receipt, Tag } from 'lucide-react';
import { DatabaseState, store } from '../services/supabase';
import { Expense, ExpenseCategory, ExpenseScope } from '../types/database';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  dbState: DatabaseState;
  defaultPropertyId?: string;
  defaultUnitId?: string;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  dbState,
  defaultPropertyId,
  defaultUnitId
}) => {
  const [propertyId, setPropertyId] = useState<string>(defaultPropertyId || dbState.properties[0]?.id || '');
  const [scope, setScope] = useState<ExpenseScope>(defaultUnitId ? 'Unit' : 'Property');
  const [unitId, setUnitId] = useState<string>(defaultUnitId || '');
  const [vendorId, setVendorId] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategory>('Repairs & Maintenance');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Pending'>('Paid');

  if (!isOpen) return null;

  const propertyUnits = dbState.units.filter(u => u.property_id === propertyId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId || !amount || parseFloat(amount) <= 0) return;

    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      property_id: propertyId,
      unit_id: scope === 'Unit' && unitId ? unitId : undefined,
      scope,
      vendor_id: vendorId || undefined,
      category,
      description: description.trim() || `${category} expense`,
      amount: parseFloat(amount),
      date,
      payment_status: paymentStatus,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    store.addExpense(newExpense);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Record Operating Expense</h3>
              <p className="text-xs text-slate-500">Log cost against an entire property or a specific suite</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Scope Selector: Property vs Unit */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">Expense Target</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setScope('Property'); setUnitId(''); }}
                className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all ${
                  scope === 'Property'
                    ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Building2 className="w-4 h-4" /> Entire Property
              </button>
              <button
                type="button"
                onClick={() => setScope('Unit')}
                className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all ${
                  scope === 'Unit'
                    ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Home className="w-4 h-4" /> Specific Unit
              </button>
            </div>
          </div>

          {/* Property Dropdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Property</label>
              <select
                value={propertyId}
                onChange={(e) => {
                  setPropertyId(e.target.value);
                  setUnitId('');
                }}
                required
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              >
                {dbState.properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.city})</option>
                ))}
              </select>
            </div>

            {/* Unit Dropdown if Scope is Unit */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                {scope === 'Unit' ? 'Unit / Suite' : 'Unit (N/A for Whole Property)'}
              </label>
              <select
                disabled={scope !== 'Unit'}
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                required={scope === 'Unit'}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              >
                <option value="">{scope === 'Unit' ? '-- Select Unit --' : 'Common / All Units'}</option>
                {propertyUnits.map(u => (
                  <option key={u.id} value={u.id}>Unit {u.unit_number} ({u.unit_type})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Category & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Cost Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              >
                <option value="Repairs & Maintenance">Repairs & Maintenance</option>
                <option value="Utilities">Utilities (Hydro / Water / Gas)</option>
                <option value="Insurance">Insurance</option>
                <option value="Property Taxes">Property Taxes</option>
                <option value="Cleaning">Cleaning & Sanitization</option>
                <option value="Appliances">Appliances</option>
                <option value="Management">Management Fees</option>
                <option value="Other">Other Operating Cost</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Expense Amount (CAD)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-bold focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Vendor & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Assigned Vendor / Contractor</label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              >
                <option value="">-- Direct Expense / None --</option>
                {dbState.vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name} ({v.category})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Expense Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
              >
              </input>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Description / Notes</label>
            <input
              type="text"
              required
              placeholder="e.g. Unit 102 kitchen sink drain pipe repair"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-hidden"
            />
          </div>

          {/* Payment Status */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Payment Status</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="paymentStatus"
                  checked={paymentStatus === 'Paid'}
                  onChange={() => setPaymentStatus('Paid')}
                  className="text-brand-600 focus:ring-brand-500"
                />
                <span className="text-slate-800 font-medium">Paid Immediately</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="paymentStatus"
                  checked={paymentStatus === 'Pending'}
                  onChange={() => setPaymentStatus('Pending')}
                  className="text-brand-600 focus:ring-brand-500"
                />
                <span className="text-slate-800 font-medium">Pending / Accounts Payable</span>
              </label>
            </div>
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
              <DollarSign className="w-4 h-4" /> Save Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
