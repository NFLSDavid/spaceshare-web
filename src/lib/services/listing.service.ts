import { ApiError } from "@/lib/api-utils";
import { calculateDistanceKm } from "@/lib/geo";
import type { Prisma } from "@/generated/prisma";
import type { Amenity } from "@/generated/prisma/enums";
import type { SortOption } from "@/types";
import {
  listingRepository,
  reservationRepository,
} from "@/lib/repositories";
import "@/lib/events/observers"; // register all observers (idempotent via ESM cache)
import { eventBus } from "@/lib/events/bus";

type ListingWithDistance = Awaited<ReturnType<typeof listingRepository.findActive>>[number] & {
  _distance?: number;
};

function getAvailableSpacePerDay(
  bookings: { startDate: Date; endDate: Date; reservedSpace: number }[],
  start: Date,
  end: Date,
  totalSpace: number,
): { date: string; available: number }[] {
  const availability: { date: string; available: number }[] = [];
  const current = new Date(start);
  while (current <= end) {
    const dayStart = new Date(current);
    const dayEnd = new Date(current);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const overlapping = bookings.filter(
      (b) => new Date(b.startDate) < dayEnd && new Date(b.endDate) > dayStart,
    );
    const bookedSpace = overlapping.reduce(
      (sum, b) => sum + b.reservedSpace,
      0,
    );
    const available = Math.max(0, totalSpace - bookedSpace);

    availability.push({
      date: current.toISOString().split("T")[0],
      available: Math.round(available * 100) / 100,
    });
    current.setDate(current.getDate() + 1);
  }
  return availability;
}

function sortListings(
  listings: ListingWithDistance[],
  sortBy: SortOption,
): ListingWithDistance[] {
  return [...listings].sort((a, b) => {
    switch (sortBy) {
      case "CLOSEST":
        return (a._distance ?? Infinity) - (b._distance ?? Infinity);
      case "NEWEST":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "OLDEST":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "CHEAPEST":
        return a.price - b.price;
      case "MOST_EXPENSIVE":
        return b.price - a.price;
      case "LARGEST":
        return b.spaceAvailable - a.spaceAvailable;
      case "SMALLEST":
        return a.spaceAvailable - b.spaceAvailable;
      case "MOST_LIKED":
        return b.likes - a.likes;
    }
  });
}

export const listingService = {
  async getPriceRecommendation(
    lat: number,
    lng: number,
    excludeUserId: string,
  ): Promise<{ recommendedPrice: number; count: number }> {
    const listings = await listingRepository.findActiveForPricing(excludeUserId);
    const nearby = listings.filter(
      (l) => calculateDistanceKm(lat, lng, l.latitude, l.longitude) <= 5,
    );
    if (nearby.length === 0) return { recommendedPrice: 0, count: 0 };
    const avg = nearby.reduce((sum, l) => sum + l.price, 0) / nearby.length;
    return {
      recommendedPrice: Math.round(avg * 100) / 100,
      count: nearby.length,
    };
  },

  async getById(id: string) {
    const listing = await listingRepository.findById(id);
    if (!listing) throw new ApiError(404, "Listing not found");
    return listing;
  },

  async search(
    userId: string,
    filters: {
      hostId?: string;
      lat?: number;
      lng?: number;
      radius?: number;
      startDate?: string;
      endDate?: string;
      spaceRequired?: number;
      sortBy?: SortOption;
    },
  ) {
    // Host mode: get user's listings
    if (filters.hostId) {
      return listingRepository.findByHost(filters.hostId);
    }

    // Client mode: search listings
    let listings: ListingWithDistance[] = await listingRepository.findActive(userId);

    // Filter by distance
    if (filters.lat && filters.lng && filters.radius) {
      listings = listings.filter((listing) => {
        const dist = calculateDistanceKm(
          filters.lat!,
          filters.lng!,
          listing.latitude,
          listing.longitude,
        );
        listing._distance = dist;
        return dist <= filters.radius!;
      });
    }

    // Filter by date availability and space
    if (filters.startDate && filters.endDate && filters.spaceRequired) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);

      listings = listings.filter((listing) => {
        // Check listing's own availability window
        if (listing.availableFrom && new Date(listing.availableFrom) > start) return false;
        if (listing.availableTo && new Date(listing.availableTo) < end) return false;

        const overlappingBookings = listing.bookings.filter(
          (b) => new Date(b.startDate) < end && new Date(b.endDate) > start,
        );
        const bookedSpace = overlappingBookings.reduce(
          (sum, b) => sum + b.reservedSpace,
          0,
        );
        return listing.spaceAvailable - bookedSpace >= filters.spaceRequired!;
      });
    }

    // Apply sorting (default to NEWEST)
    return sortListings(listings, filters.sortBy ?? "NEWEST");
  },

  async create(
    hostId: string,
    data: {
      title: string;
      description: string;
      price: number;
      spaceAvailable: number;
      amenities?: Amenity[];
      photos?: string[];
      latitude: number;
      longitude: number;
      availableFrom?: string | null;
      availableTo?: string | null;
    },
  ) {
    const listing = await listingRepository.create({
      hostId,
      ...data,
      availableFrom: data.availableFrom ? new Date(data.availableFrom) : null,
      availableTo: data.availableTo ? new Date(data.availableTo) : null,
    });

    eventBus.emit("listing.created", {
      hostId: listing.hostId,
      title: listing.title,
      price: listing.price,
      latitude: listing.latitude,
      longitude: listing.longitude,
    });

    return listing;
  },

  async update(
    id: string,
    userId: string,
    data: Prisma.ListingUncheckedUpdateInput,
  ) {
    const listing = await listingRepository.findByIdBasic(id);
    if (!listing || listing.hostId !== userId) {
      throw new ApiError(403, "Forbidden");
    }

    const { availableFrom, availableTo, ...rest } = data as Record<string, unknown>;
    return listingRepository.update(id, {
      ...rest,
      ...(availableFrom !== undefined && { availableFrom: availableFrom ? new Date(availableFrom as string) : null }),
      ...(availableTo !== undefined && { availableTo: availableTo ? new Date(availableTo as string) : null }),
    } as typeof data);
  },

  async delete(id: string, userId: string) {
    const listing = await listingRepository.findByIdBasic(id);
    if (!listing || listing.hostId !== userId) {
      throw new ApiError(403, "Forbidden");
    }

    await listingRepository.softDelete(id);

    return { message: "Listing deactivated" };
  },

  async getAvailability(id: string, startDate: string, endDate: string) {
    const listing = await listingRepository.findById(id);
    if (!listing) throw new ApiError(404, "Listing not found");

    return getAvailableSpacePerDay(
      listing.bookings,
      new Date(startDate),
      new Date(endDate),
      listing.spaceAvailable,
    );
  },

  async rate(
    listingId: string,
    userId: string,
    reservationId: string,
    liked: boolean,
  ) {
    const reservation = await reservationRepository.findById(reservationId);

    if (!reservation) throw new ApiError(404, "Reservation not found");
    if (reservation.clientId !== userId) {
      throw new ApiError(403, "Only the client can rate");
    }
    if (reservation.listingId !== listingId) {
      throw new ApiError(400, "Reservation does not match listing");
    }
    if (reservation.status !== "APPROVED") {
      throw new ApiError(400, "Reservation must be approved to rate");
    }
    if (reservation.rated) {
      throw new ApiError(400, "Already rated");
    }
    if (new Date(reservation.startDate) > new Date()) {
      throw new ApiError(400, "Cannot rate before start date");
    }

    if (liked) {
      await listingRepository.incrementLikes(listingId);
    }

    await reservationRepository.update(reservationId, { rated: true });

    return { success: true };
  },
};
