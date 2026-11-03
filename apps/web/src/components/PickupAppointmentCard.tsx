'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, CheckCircle2, AlertCircle, Plus, ChevronRight, ShieldCheck } from 'lucide-react';

interface PickupAppointmentCardProps {
  listingId: string;
}

export function PickupAppointmentCard({ listingId }: PickupAppointmentCardProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Booking form state
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('Main Campus Library Lobby');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem('campus_token');
      const res = await fetch(`http://localhost:4000/api/v1/auctions/${listingId}/appointments`, {
        headers: {
          Authorization: `Bearer ${token || ''}`,
        },
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setData(result.data);
        if (result.data.availableSlots?.length > 0) {
          setSelectedSlot(result.data.availableSlots[0].slotTime);
        }
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (listingId) fetchAppointments();
  }, [listingId]);

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const token = localStorage.getItem('campus_token');
      const res = await fetch(`http://localhost:4000/api/v1/auctions/${listingId}/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          slotTime: selectedSlot,
          locationName: selectedLocation,
          notes,
        }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setSuccessMsg('Campus pickup appointment scheduled!');
        setShowBookingForm(false);
        fetchAppointments();
      } else {
        setErrorMsg(result.message || 'Failed to book appointment');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return null;

  const hasAppointments = data?.appointments && data.appointments.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5EAF2]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#F1EEFF] text-[#633BFF] flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-black text-[#15152D]">Available Campus Handover Slots</h4>
            <p className="text-[11px] text-[#718096]">Daylight inspections in campus-monitored zones</p>
          </div>
        </div>

        {!showBookingForm && (
          <button
            type="button"
            onClick={() => setShowBookingForm(true)}
            className="px-4 py-2 bg-gradient-to-r from-[#633BFF] to-[#536BFF] hover:brightness-110 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-[#633BFF]/20"
          >
            <Plus className="w-3.5 h-3.5" />
            Book Pickup Slot
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-[#F1EEFF] border border-[#633BFF]/30 rounded-xl text-[#15152D] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#633BFF]" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Booking Form */}
      {showBookingForm && (
        <form onSubmit={handleBookAppointment} className="p-4 bg-[#F1EEFF]/60 rounded-2xl border border-[#633BFF]/20 space-y-3 text-xs animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="font-black uppercase tracking-wider text-[#633BFF] text-[11px]">Select Meeting Window</span>
            <button
              type="button"
              onClick={() => setShowBookingForm(false)}
              className="text-[#718096] hover:text-[#15152D] font-bold"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase text-[#718096] mb-1">Date & Time Slot</label>
              <select
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-xl border border-[#E5EAF2] font-bold text-[#15152D] focus:outline-none focus:border-[#633BFF]"
              >
                {data?.availableSlots?.map((s: any) => (
                  <option key={s.slotTime} value={s.slotTime}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-[#718096] mb-1">Designated Location</label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-xl border border-[#E5EAF2] font-bold text-[#15152D] focus:outline-none focus:border-[#633BFF]"
              >
                {data?.safeLocations?.map((loc: any) => (
                  <option key={loc.id} value={loc.name}>
                    {loc.name} ({loc.area})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-[#718096] mb-1">Handover Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Will meet near security checkpoint, carrying red backpack"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white rounded-xl border border-[#E5EAF2] text-[#15152D] text-xs focus:outline-none focus:border-[#633BFF]"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-gradient-to-r from-[#633BFF] to-[#536BFF] hover:brightness-110 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-md shadow-[#633BFF]/20"
          >
            {isSubmitting ? 'Confirming Appointment...' : 'Confirm Campus Handover Slot'}
          </button>
        </form>
      )}

      {/* Existing Appointments List */}
      <div className="space-y-2.5">
        {!hasAppointments ? (
          <div className="p-4 bg-[#F7F8FF] rounded-2xl border border-[#E5EAF2] text-center">
            <p className="text-xs text-[#718096]">
              No handover appointments scheduled yet. Choose a monitored campus meeting slot above.
            </p>
          </div>
        ) : (
          data.appointments.map((app: any) => (
            <div
              key={app.id}
              className="p-4 bg-white rounded-2xl border border-[#E5EAF2] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-[#F1EEFF] rounded-xl text-[#633BFF] mt-0.5">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-[#15152D]">
                      {new Date(app.slotTime).toLocaleString('en-IN', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {app.status}
                    </span>
                  </div>
                  <span className="text-[#718096] flex items-center gap-1 mt-1 text-[11px]">
                    <MapPin className="w-3.5 h-3.5 text-[#633BFF]" />
                    {app.locationName}
                  </span>
                  {app.notes && (
                    <span className="text-[11px] text-[#718096] italic block mt-1">"{app.notes}"</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
