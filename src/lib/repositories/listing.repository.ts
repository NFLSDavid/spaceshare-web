import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";
import { USER_PUBLIC_SELECT } from "./selects";

const WITH_HOST = {
  host: { select: USER_PUBLIC_SELECT },
} as const;

const WITH_HOST_AND_BOOKINGS = {
  host: { select: USER_PUBLIC_SELECT },
  bookings: true,
} as const;

export const listingRepository = {
  findById(id: string) {
    return prisma.listing.findUnique({
      where: { id },
      include: WITH_HOST_AND_BOOKINGS,
    });
  },

  findByIdBasic(id: string) {
    return prisma.listing.findUnique({ where: { id } });
  },

  findByHost(hostId: string) {
    return prisma.listing.findMany({
      where: { hostId, deletedAt: null },
      include: WITH_HOST_AND_BOOKINGS,
      orderBy: { createdAt: "desc" },
    });
  },

  findActive(excludeHostId: string) {
    return prisma.listing.findMany({
      where: { isActive: true, deletedAt: null, hostId: { not: excludeHostId } },
      include: WITH_HOST_AND_BOOKINGS,
    });
  },

  findActiveByIds(ids: string[]) {
    return prisma.listing.findMany({
      where: { id: { in: ids }, isActive: true, deletedAt: null },
      include: WITH_HOST,
    });
  },

  findActiveForPricing(excludeHostId: string) {
    return prisma.listing.findMany({
      where: { isActive: true, deletedAt: null, hostId: { not: excludeHostId } },
      select: { price: true, latitude: true, longitude: true },
    });
  },

  create(data: Prisma.ListingUncheckedCreateInput) {
    return prisma.listing.create({ data, include: WITH_HOST });
  },

  update(id: string, data: Prisma.ListingUncheckedUpdateInput) {
    return prisma.listing.update({ where: { id }, data, include: WITH_HOST });
  },

  incrementLikes(id: string) {
    return prisma.listing.update({
      where: { id },
      data: { likes: { increment: 1 } },
    });
  },

  /**
   * Soft-delete a listing: deactivate, decline pending reservations,
   * cancel approved reservations, and remove their bookings.
   * All within a single transaction for atomicity.
   */
  async softDelete(id: string) {
    await prisma.$transaction(async (tx) => {
      await tx.listing.update({
        where: { id },
        data: { isActive: false, deletedAt: new Date() },
      });

      await tx.reservation.updateMany({
        where: { listingId: id, status: "PENDING" },
        data: { status: "DECLINED" },
      });

      const approvedReservations = await tx.reservation.findMany({
        where: { listingId: id, status: "APPROVED" },
      });

      for (const res of approvedReservations) {
        await tx.booking.deleteMany({
          where: {
            listingId: res.listingId,
            startDate: res.startDate,
            endDate: res.endDate,
            reservedSpace: res.spaceRequested,
          },
        });
      }

      if (approvedReservations.length > 0) {
        await tx.reservation.updateMany({
          where: { listingId: id, status: "APPROVED" },
          data: { status: "CANCELLED" },
        });
      }
    });
  },
};
