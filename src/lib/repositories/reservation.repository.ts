import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";
import { USER_PUBLIC_SELECT } from "./selects";

const RESERVATION_INCLUDE = {
  listing: {
    select: {
      id: true,
      title: true,
      photos: true,
      latitude: true,
      longitude: true,
      price: true,
      isActive: true,
      deletedAt: true,
    },
  },
  host: { select: { ...USER_PUBLIC_SELECT, email: true } },
  client: { select: USER_PUBLIC_SELECT },
} as const;

export const reservationRepository = {
  findById(id: string) {
    return prisma.reservation.findUnique({ where: { id } });
  },

  findByIdWithListing(id: string) {
    return prisma.reservation.findUnique({
      where: { id },
      include: { listing: { include: { bookings: true } } },
    });
  },

  findByHost(hostId: string) {
    return prisma.reservation.findMany({
      where: { hostId },
      include: RESERVATION_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  },

  findByClient(clientId: string) {
    return prisma.reservation.findMany({
      where: { clientId },
      include: RESERVATION_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  },

  create(data: Prisma.ReservationUncheckedCreateInput) {
    return prisma.reservation.create({ data, include: RESERVATION_INCLUDE });
  },

  update(id: string, data: Prisma.ReservationUncheckedUpdateInput) {
    return prisma.reservation.update({
      where: { id },
      data,
      include: RESERVATION_INCLUDE,
    });
  },

  updateMany(
    where: Prisma.ReservationWhereInput,
    data: Prisma.ReservationUncheckedUpdateManyInput,
  ) {
    return prisma.reservation.updateMany({ where, data });
  },

  findMany(where: Prisma.ReservationWhereInput) {
    return prisma.reservation.findMany({ where });
  },

  /**
   * Approve a reservation inside a transaction:
   * 1. Fetch current bookings for race-condition safety
   * 2. Run validation callback (throws if invalid)
   * 3. Create booking
   * 4. Update reservation status to APPROVED
   */
  async approveWithBooking(
    reservationId: string,
    bookingData: {
      listingId: string;
      startDate: Date;
      endDate: Date;
      reservedSpace: number;
    },
    validateAvailability: (
      bookings: { startDate: Date; endDate: Date; reservedSpace: number }[],
    ) => void,
  ) {
    return prisma.$transaction(async (tx) => {
      const currentBookings = await tx.booking.findMany({
        where: { listingId: bookingData.listingId },
      });
      validateAvailability(currentBookings);

      await tx.booking.create({ data: bookingData });
      return tx.reservation.update({
        where: { id: reservationId },
        data: { status: "APPROVED" },
        include: RESERVATION_INCLUDE,
      });
    });
  },

  /**
   * Cancel a reservation inside a transaction:
   * 1. Delete matching booking
   * 2. Update reservation status to CANCELLED
   */
  async cancelWithBookingCleanup(
    reservationId: string,
    bookingCriteria: {
      listingId: string;
      startDate: Date;
      endDate: Date;
      reservedSpace: number;
    },
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.booking.deleteMany({ where: bookingCriteria });
      return tx.reservation.update({
        where: { id: reservationId },
        data: { status: "CANCELLED" },
        include: RESERVATION_INCLUDE,
      });
    });
  },
};
