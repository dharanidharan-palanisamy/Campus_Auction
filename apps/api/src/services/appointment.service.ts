import mongoose from 'mongoose';
import { PickupAppointment, AuctionListing, User, OutboxEvent, AuditLog, Bid, AuctionOutcome } from '../models';

export const SAFE_CAMPUS_LOCATIONS = [
  { id: 'loc-lib', name: 'Main Campus Library Lobby', area: 'Central Zone', monitored: true },
  { id: 'loc-sac', name: 'Student Activity Center (SAC) Plaza', area: 'North Zone', monitored: true },
  { id: 'loc-eng', name: 'Engineering Block A Main Porch', area: 'Academic Zone', monitored: true },
  { id: 'loc-gate', name: 'Campus Gate 1 Security Kiosk', area: 'Security Perimeter', monitored: true },
  { id: 'loc-cafe', name: 'Hostel Complex Common Food Court', area: 'Residential Zone', monitored: true },
];

export class AppointmentService {
  /**
   * Generates upcoming available inspection/handover time slots for a listing
   */
  static getAvailableSlots(baseDate: Date = new Date()): { slotTime: string; label: string }[] {
    const slots: { slotTime: string; label: string }[] = [];
    const now = new Date(baseDate);

    // Provide 8 slots over the next 2 days (between 10 AM and 7 PM)
    for (let dayOffset = 0; dayOffset <= 2; dayOffset++) {
      const day = new Date(now.getTime() + dayOffset * 24 * 3600 * 1000);
      const hours = [10, 12, 14, 16, 18];

      for (const hour of hours) {
        const slotDate = new Date(day);
        slotDate.setHours(hour, 0, 0, 0);

        if (slotDate.getTime() > now.getTime() + 30 * 60 * 1000) {
          const dateStr = slotDate.toLocaleDateString('en-IN', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });
          const timeStr = slotDate.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });

          slots.push({
            slotTime: slotDate.toISOString(),
            label: `${dateStr} at ${timeStr}`,
          });
        }
      }
    }

    return slots.slice(0, 10);
  }

  /**
   * List all appointments booked for an auction
   */
  static async getListingAppointments(listingId: string, userId: string) {
    const listing = await AuctionListing.findById(listingId);
    if (!listing) throw new Error('Listing not found');

    const appointments = await PickupAppointment.find({
      listingId: new mongoose.Types.ObjectId(listingId),
    })
      .sort({ slotTime: 1 })
      .populate('bookedBy', 'campusAlias fullName avatarUrl')
      .populate('sellerId', 'campusAlias fullName avatarUrl')
      .populate('buyerId', 'campusAlias fullName avatarUrl')
      .lean();

    return {
      listingId: listing._id.toString(),
      title: listing.title,
      defaultLocation: listing.pickupLocation,
      safeLocations: SAFE_CAMPUS_LOCATIONS,
      availableSlots: this.getAvailableSlots(),
      appointments: appointments.map((a: any) => ({
        id: a._id.toString(),
        slotTime: a.slotTime,
        locationName: a.locationName,
        locationDetails: a.locationDetails,
        status: a.status,
        notes: a.notes,
        createdAt: a.createdAt,
        bookedBy: a.bookedBy ? { id: a.bookedBy._id.toString(), alias: a.bookedBy.campusAlias } : null,
        seller: a.sellerId ? { id: a.sellerId._id.toString(), alias: a.sellerId.campusAlias } : null,
        buyer: a.buyerId ? { id: a.buyerId._id.toString(), alias: a.buyerId.campusAlias } : null,
      })),
    };
  }

  /**
   * Book or propose an appointment
   */
  static async bookAppointment(params: {
    listingId: string;
    userId: string;
    slotTime: string;
    locationName: string;
    locationDetails?: string;
    notes?: string;
  }) {
    const { listingId, userId, slotTime, locationName, locationDetails, notes } = params;

    const listing = await AuctionListing.findById(listingId);
    if (!listing) throw new Error('Listing not found');

    const sellerId = listing.sellerId;
    let buyerId: mongoose.Types.ObjectId = new mongoose.Types.ObjectId(userId);
    if (listing.leadingBidId) {
      const leadingBid = await Bid.findById(listing.leadingBidId);
      if (leadingBid) buyerId = leadingBid.bidderId;
    } else {
      const outcome = await AuctionOutcome.findOne({ listingId: listing._id });
      if (outcome && outcome.winnerId) buyerId = outcome.winnerId;
    }

    const slotDate = new Date(slotTime);
    if (isNaN(slotDate.getTime())) {
      throw new Error('Invalid appointment date/time.');
    }
    if (slotDate < new Date()) {
      throw new Error('Appointment time must be in the future.');
    }

    const appointment = await PickupAppointment.create({
      listingId: listing._id,
      sellerId,
      buyerId,
      slotTime: slotDate,
      locationName: locationName.trim(),
      locationDetails: locationDetails?.trim(),
      status: 'CONFIRMED', // Immediately confirmed on student consent
      bookedBy: new mongoose.Types.ObjectId(userId),
      notes: notes?.trim(),
    });

    // Create audit log
    await AuditLog.create({
      actorId: new mongoose.Types.ObjectId(userId),
      action: 'BOOKED_PICKUP_APPOINTMENT',
      entityType: 'PickupAppointment',
      entityId: appointment._id.toString(),
      reason: `Campus handover slot booked at ${locationName} for ${slotDate.toISOString()}`,
    });

    return appointment;
  }

  /**
   * Reschedule or cancel appointment
   */
  static async updateStatus(params: {
    appointmentId: string;
    userId: string;
    status: 'CONFIRMED' | 'RESCHEDULED' | 'CANCELLED';
    newSlotTime?: string;
    notes?: string;
  }) {
    const { appointmentId, userId, status, newSlotTime, notes } = params;

    const appointment = await PickupAppointment.findById(appointmentId);
    if (!appointment) throw new Error('Appointment not found');

    const sellerIdStr = appointment.sellerId.toString();
    const buyerIdStr = appointment.buyerId.toString();

    if (userId !== sellerIdStr && userId !== buyerIdStr) {
      throw new Error('Unauthorized: Only scheduled participants can modify this appointment.');
    }

    appointment.status = status;
    if (notes) appointment.notes = notes;

    if (status === 'RESCHEDULED' && newSlotTime) {
      const newDate = new Date(newSlotTime);
      if (isNaN(newDate.getTime()) || newDate < new Date()) {
        throw new Error('New appointment slot time must be valid and in the future.');
      }
      appointment.slotTime = newDate;
    }

    await appointment.save();

    return appointment;
  }
}
