import { ApiError } from "@/lib/api-utils";
import type { Prisma } from "@/generated/prisma";
import {
  reservationRepository,
  listingRepository,
  userRepository,
} from "@/lib/repositories";
import { notificationService } from "./notification.service";
import { checkAvailability, calculateCost } from "@/lib/availability";

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
  userId: string;
}

interface TransitionHandler {
  readonly requiredRole: "host" | "client" | "either";
  execute(ctx: TransitionContext): Promise<ReservationResult>;
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
    // Block the host from client's perspective so their listings are hidden
    userRepository
      .addBlockedUser(reservation.clientId, reservation.hostId)
      .catch(console.error);
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

const cancelRequestHandler: TransitionHandler = {
  requiredRole: "either",
  async execute({ reservationId, userId }) {
    return reservationRepository.update(reservationId, {
      status: "CANCEL_REQUESTED",
      cancelRequestedBy: userId,
    });
  },
};

const cancelApproveHandler: TransitionHandler = {
  requiredRole: "either",
  async execute({ reservationId, reservation, userId }) {
    if (reservation.cancelRequestedBy === userId) {
      throw new ApiError(400, "Cannot approve your own cancellation request");
    }
    return reservationRepository.cancelWithBookingCleanup(reservationId, {
      listingId: reservation.listingId,
      startDate: reservation.startDate,
      endDate: reservation.endDate,
      reservedSpace: reservation.spaceRequested,
    });
  },
};

const cancelRejectHandler: TransitionHandler = {
  requiredRole: "either",
  async execute({ reservationId, reservation, userId }) {
    if (reservation.cancelRequestedBy === userId) {
      throw new ApiError(400, "Cannot reject your own cancellation request");
    }
    return reservationRepository.update(reservationId, {
      status: "APPROVED",
      cancelRequestedBy: null,
    });
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
    CANCEL_REQUESTED: cancelRequestHandler,
  },
  CANCEL_REQUESTED: {
    CANCELLED: cancelApproveHandler,
    APPROVED: cancelRejectHandler,
  },
};

// ─── Service ──────────────────────────────────────────────────────────────────

export const reservationService = {
  async getReservations(userId: string, asHost: boolean, cleared: boolean = false) {
    return asHost
      ? reservationRepository.findByHost(userId, cleared)
      : reservationRepository.findByClient(userId, cleared);
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
        handler.requiredRole !== "either" &&
        ((handler.requiredRole === "host" && !isHost) ||
         (handler.requiredRole === "client" && !isClient))
      ) {
        throw new ApiError(
          403,
          `Only the ${handler.requiredRole} can ${params.status.toLowerCase()} this reservation`,
        );
      }
      return handler.execute({
        reservationId: params.reservationId,
        reservation,
        userId: params.userId,
      });
    }

    // Non-status updates (e.g., rated)
    const updateData: { rated?: boolean } = {};
    if (params.rated !== undefined) updateData.rated = params.rated;
    return reservationRepository.update(params.reservationId, updateData);
  },

  async clearReservation(reservationId: string, userId: string) {
    const reservation = await reservationRepository.findById(reservationId);
    if (!reservation) throw new ApiError(404, "Reservation not found");

    const isHost = reservation.hostId === userId;
    const isClient = reservation.clientId === userId;
    if (!isHost && !isClient) throw new ApiError(403, "Forbidden");

    const terminalStates = ["CANCELLED", "DECLINED", "COMPLETED"];
    if (!terminalStates.includes(reservation.status)) {
      throw new ApiError(400, "Only completed, cancelled, or declined reservations can be cleared");
    }

    const updateData: { clearedByHost?: boolean; clearedByClient?: boolean } = {};
    if (isHost) updateData.clearedByHost = true;
    if (isClient) updateData.clearedByClient = true;

    return reservationRepository.update(reservationId, updateData);
  },
};
