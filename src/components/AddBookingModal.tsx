import React, { useState } from 'react';
import { X, Calendar, DollarSign, User, Phone, Mail, Sparkles, CheckCircle2 } from 'lucide-react';
import { store, DatabaseState } from '../services/supabase';
import { ShortletBooking } from '../types/database';
import { useCurrency } from '../context/CurrencyContext';

interface AddBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  dbState: DatabaseState;
  preselectedUnitId?: string;
}

export const AddBookingModal: React.FC<AddBookingModalProps> = ({
  isOpen,
  onClose,
  dbState,
  preselectedUnitId
}) => {
  const { currencyConfig } = useCurrency();
  const shortletUnits = dbState.units.filter(u => u.rental_model === 'Shortlet / STR');
  const defaultUnit = preselectedUnitId 
    ? dbState.units.find(u => u.id === preselectedUnitId)
    : (shortletUnits[0] || dbState.units[0]);

  const [unitId, setUnitId] = useState(defaultUnit?.id || '');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [checkIn, setCheckIn] = useState('2026-08-25');
  const [checkOut, setCheckOut] = useState('2026-08-29');
  const [platform, setPlatform] = useState<'Direct' | 'Airbnb' | 'VRBO' | 'Booking.com'>('Airbnb');
  const [nightlyRate, setNightlyRate] = useState<number>(defaultUnit?.nightly_rate || 200);
  const [cleaningFee, setCleaningFee] = useState<number>(defaultUnit?.cleaning_fee || 50);
  const [bookingStatus, setBookingStatus] = useState<'Confirmed' | 'Checked In' | 'Completed' | 'Cancelled'>('Confirmed');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Calculate nights
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const nightsDiff = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const totalPayout = (nightlyRate * nightsDiff) + cleaningFee;

  const handleUnitChange = (selectedId: string) => {
    setUnitId(selectedId);
    const u = dbState.units.find(item => item.id === selectedId);
    if (u) {
      if (u.nightly_rate) setNightlyRate(u.nightly_rate);
      if (u.cleaning_fee) setCleaningFee(u.cleaning_fee);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim() || !unitId) return;

    setIsSubmitting(true);
    const newBooking: ShortletBooking = {
      id: `book-${Date.now()}`,
      unit_id: unitId,
      guest_name: guestName.trim(),
      guest_email: guestEmail.trim() || 'guest@example.com',
      guest_phone: guestPhone.trim() || '+1 (555) 000-0000',
      check_in: checkIn,
      check_out: checkOut,
      nights_count: nightsDiff,
      nightly_rate: Number(nightlyRate),
      cleaning_fee: Number(cleaningFee),
      platform_source: platform,
      total_payout: totalPayout,
      booking_status: bookingStatus,
      created_at: new Date().toISOString()
    };

    store.addShortletBooking(newBooking);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-500/20 text-purple-300 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Record Shortlet Booking</h2>
              <p className="text-xs text-slate-300">Attach guest reservation to shortlet suite</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Unit Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Target Shortlet Suite *
            </label>
            <select
              value={unitId}
              onChange={(e) => handleUnitChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
              required
            >
              {shortletUnits.map(u => {
                const p = dbState.properties.find(prop => prop.id === u.property_id);
                return (
                  <option key={u.id} value={u.id}>
                    {p?.name} • Unit {u.unit_number} ({u.unit_type})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Guest Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Guest Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="e.g. Elena Rostova"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Platform Channel *
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
              >
                <option value="Airbnb">Airbnb</option>
                <option value="Booking.com">Booking.com</option>
                <option value="VRBO">VRBO</option>
                <option value="Direct">Direct Booking</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Guest Phone
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="+1 (416) 555-0199"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Guest Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  placeholder="guest@domain.com"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Check-In Date *
              </label>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Check-Out Date *
              </label>
              <input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900"
                required
              />
            </div>
          </div>

          {/* Pricing & Fees */}
          <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-purple-900">
              <span>Duration: {nightsDiff} Night{nightsDiff > 1 ? 's' : ''}</span>
              <span className="text-[11px] font-normal text-purple-700">Auto-calculated</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-purple-950 uppercase mb-1">
                  Nightly Rate ({currencyConfig.symbol})
                </label>
                <input
                  type="number"
                  min="1"
                  value={nightlyRate}
                  onChange={(e) => setNightlyRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-lg border border-purple-200 text-xs font-bold text-slate-900 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-purple-950 uppercase mb-1">
                  Cleaning Fee ({currencyConfig.symbol})
                </label>
                <input
                  type="number"
                  min="0"
                  value={cleaningFee}
                  onChange={(e) => setCleaningFee(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 rounded-lg border border-purple-200 text-xs font-bold text-slate-900 bg-white"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-purple-200/60 flex items-center justify-between text-xs">
              <span className="font-bold text-purple-900">Total Net Guest Payout:</span>
              <span className="font-extrabold text-sm text-purple-900">
                {currencyConfig.symbol}{totalPayout.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Booking Status *
            </label>
            <select
              value={bookingStatus}
              onChange={(e) => setBookingStatus(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800"
            >
              <option value="Confirmed">Confirmed (Pre-arrival)</option>
              <option value="Checked In">Checked In (Currently in Suite)</option>
              <option value="Completed">Completed (Checked Out)</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 shadow-sm transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> Save Booking Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
