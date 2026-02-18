import { ApiError } from "@/lib/api-utils";
import type { Prisma } from "@/generated/prisma";
import {
  reservationRepository,
  listingRepository,
} from "@/lib/repositories";
import { notificationService } from "./notification.service";

// ─── State Pattern ────────────────────────────────────────────────────────────
// Each TransitionHandler owns the business logic for one status transition.
// Adding a new transition = add a new handler + one entry in TRANSITIONS.
// The updateStatus() orchestrator never needs to change.

type ReservationWithListing = NonNullable<
  Awaited<ReturnType<typeof reservationRepository.findByIdWithListing>>
>;

type ReservationResult = Awaited<ReturnType<typeof reservationRepository.update>>;

interface TransitionContext {
  reservationId: string;
  reservation: ReservationWithListing;
}

interface TransitionHandler {
  readonly requiredRole: "host" | "client";
  execute(ctx: TransitionContext): Promise<ReservationResult>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function checkAvailability(
  bookings: { startDate: Date; endDate: Date; reservedSpace: number }[],
  start: Date,
  end: Date,
  totalSpace: number,
): number {
  const overlapping = bookings.filter(
    (b) => new Date(b.startDate) < end && new Date(b.endDate) > start,
  );
  const bookedSpace = overlapping.reduce((sum, b) => sum + b.reservedSpace, 0);
  return totalSpace - bookedSpace;
}

function calculateCost(
  pricePerUnit: number,
  space: number,
  startDate: Date,
  endDate: Date,
): number {
  const days = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  return Math.round(pricePerUnit * space * days * 100) / 100;
}

// ─── Transition Handlers ──────────────────────────────────────────────────────

const approveHandler: TransitionHandler = {
  requiredRole: "host",
  async execute({ reservationId, reservation }) {
    const result = await reservationRepository.approveWithBooking(
      reservationId,
      {
        listingId: reservation.listingId,
        startDate: reservation.startDate,
        endDate: reservation.endDate,
        reservedSpace: reservation.spaceRequested,
      },
      (currentBookings) => {
        const available = checkAvailability(
          currentBookings,
          reservation.startDate,
          reservation.endDate,
          reservation.listing.spaceAvailable,
        );
        if (available < reservation.spaceRequested) {
          throw new ApiError(
            409,
            "Not enough space available. Another reservation may have been approved for overlapping dates.",
          );
        }
      },
    );
    notificationService
      .notifyClientOfStatusChange(
        reservation.clientId,
        result.listing.title,
        "APPROVED",
        reservation.startDate,
        reservation.endDate,
      )
      .catch(console.error);
    return result;
  },
};

const declineHandler: TransitionHandler = {
  requiredRole: "host",
  async execute({ reservationId, reservation }) {
    const updated = await reservationRepository.update(reservationId, {
      status: "DECLINED",
    });
    notificationService
      .notifyClientOfStatusChange(
        reservation.clientId,
        updated.listing.title,
        "DECLINED",
        reservation.startDate,
        reservation.endDate,
      )
      .catch(console.error);
    return updated;
  },
};

const cancelHandler: TransitionHandler = {
  requiredRole: "client",
  async execute({ reservationId, reservation }) {
    const result = await reservationRepository.cancelWithBookingCleanup(
      reservationId,
      {
        listingId: reservation.listingId,
        startDate: reservation.startDate,
        endDate: reservation.endDate,
        reservedSpace: reservation.spaceRequested,
      },
    );
    notificationService
      .notifyHostOfCancellation(
        reservation.hostId,
        reservation.clientId,
        result.listing.title,
        reservation.startDate,
        reservation.endDate,
      )
      .catch(console.error);
    return result;
  },
};

const completeHandler: TransitionHandler = {
  requiredRole: "host",
  async execute({ reservationId, reservation }) {
    if (new Date(reservation.endDate) > new Date()) {
      throw new ApiError(400, "Cannot complete reservation before end date");
    }
    return reservationRepository.update(reservationId, { status: "COMPLETED" });
  },
};

// ─── Transition Table ─────────────────────────────────────────────────────────

const TRANSITIONS: Record<string, Record<string, TransitionHandler>> = {
  PENDING: {
    APPROVED: approveHandler,
    DECLINED: declineHandler,
    CANCELLED: cancelHandler,
  },
  APPROVED: {
    COMPLETED: completeHandler,
    CANCELLED: cancelHandler,
  },
};

// ─── Service ──────────────────────────────────────────────────────────────────

export const reservationService = {
  async getReservations(userId: string, asHost: boolean) {
    return asHost
      ? reservationRepository.findByHost(userId)
      : reservationRepository.findByClient(userId);
  },

  async create(params: {
    listingId: string;
    clientId: string;
    clientName: string;
    spaceRequested: number;
    startDate: string;
    endDate: string;
    message?: string;
    items?: Record<string, unknown>;
  }) {
    const listing = await listingRepository.findById(params.listingId);

    if (!listing) throw new ApiError(404, "Listing not found");
    if (listing.hostId === params.clientId) {
      throw new ApiError(400, "Cannot reserve your own listing");
    }

    const start = new Date(params.startDate);
    const end = new Date(params.endDate);
    const available = checkAvailability(
      listing.bookings,
      start,
      end,
      listing.spaceAvailable,
    );

    if (available < params.spaceRequested) {
      throw new ApiError(400, "Not enough space available");
    }

    const totalCost = calculateCost(
      listing.price,
      params.spaceRequested,
      start,
      end,
    );

    const reservation = await reservationRepository.create({
      listingId: params.listingId,
      hostId: listing.hostId,
      clientId: params.clientId,
      spaceRequested: params.spaceRequested,
      totalCost,
      startDate: start,
      endDate: end,
      message: params.message,
      items: (params.items as Prisma.InputJsonValue) || undefined,
    });

    // Fire-and-forget email notification
    notificationService
      .notifyHostOfNewReservation(
        listing.hostId,
        params.clientName,
        listing.title,
        params.spaceRequested,
        start,
        end,
      )
      .catch(console.error);

    return reservation;
  },

  async updateStatus(params: {
    reservationId: string;
    userId: string;
    status?: string;
    rated?: boolean;
  }) {
    const reservation = await reservationRepository.findByIdWithListing(
      params.reservationId,
    );

    if (!reservation) throw new ApiError(404, "Reservation not found");

    const isHost = reservation.hostId === params.userId;
    const isClient = reservation.clientId === params.userId;
    if (!isHost && !isClient) throw new ApiError(403, "Forbidden");

    if (params.status) {
      const handler = TRANSITIONS[reservation.status]?.[params.status];
      if (!handler) {
        throw new ApiError(
          400,
          `Cannot transition from ${reservation.status} to ${params.status}`,
        );
      }
      if (
        (handler.requiredRole === "host" && !isHost) ||
        (handler.requiredRole === "client" && !isClient)
      ) {
        throw new ApiError(
          403,
          `Only the ${handler.requiredRole} can ${params.status.toLowerCase()} this reservation`,
        );
      }
      return handler.execute({ reservationId: params.reservationId, reservation });
    }

    // Non-status updates (e.g., rated)
    const updateData: { rated?: boolean } = {};
    if (params.rated !== undefined) updateData.rated = params.rated;
    return reservationRepository.update(params.reservationId, updateData);
  },
};
