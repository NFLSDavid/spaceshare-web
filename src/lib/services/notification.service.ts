import { calculateDistanceKm } from "@/lib/geo";
import { dispatchNotification } from "@/lib/events/notification-channel";
import {
  newListingMatchEmail,
  newReservationRequestEmail,
  reservationStatusEmail,
  reservationCancelledByClientEmail,
} from "@/lib/email/templates";
import { format } from "date-fns";
import { preferencesRepository, userRepository } from "@/lib/repositories";

export const notificationService = {
  async notifyMatchingPreferences(listing: {
    hostId: string;
    title: string;
    price: number;
    latitude: number;
    longitude: number;
  }) {
    const preferences = await preferencesRepository.findActiveWithLocation();

    for (const pref of preferences) {
      if (pref.userId === listing.hostId) continue;
      if (!pref.latitude || !pref.longitude || !pref.email) continue;

      const distance = calculateDistanceKm(
        pref.latitude,
        pref.longitude,
        listing.latitude,
        listing.longitude,
      );

      if (distance <= pref.radius) {
        const emailContent = newListingMatchEmail(
          pref.user.firstName,
          listing.title,
          listing.price,
          distance,
          `${listing.latitude.toFixed(4)}, ${listing.longitude.toFixed(4)}`,
        );
        dispatchNotification(pref.email, emailContent.subject, emailContent.html);
      }
    }
  },

  async notifyHostOfNewReservation(
    hostId: string,
    clientName: string,
    listingTitle: string,
    space: number,
    start: Date,
    end: Date,
  ) {
    const host = await userRepository.findByIdSelect(hostId, {
      email: true,
      firstName: true,
    });
    if (!host) return;
    const emailContent = newReservationRequestEmail(
      host.firstName,
      clientName,
      listingTitle,
      space,
      { start: format(start, "MMM d, yyyy"), end: format(end, "MMM d, yyyy") },
    );
    dispatchNotification(host.email, emailContent.subject, emailContent.html);
  },

  async notifyClientOfStatusChange(
    clientId: string,
    listingTitle: string,
    status: string,
    startDate: Date,
    endDate: Date,
  ) {
    const client = await userRepository.findByIdSelect(clientId, {
      email: true,
      firstName: true,
    });
    if (!client) return;
    const emailContent = reservationStatusEmail(
      client.firstName,
      listingTitle,
      status,
      {
        start: format(new Date(startDate), "MMM d, yyyy"),
        end: format(new Date(endDate), "MMM d, yyyy"),
      },
    );
    dispatchNotification(client.email, emailContent.subject, emailContent.html);
  },

  async notifyHostOfCancellation(
    hostId: string,
    clientId: string,
    listingTitle: string,
    startDate: Date,
    endDate: Date,
  ) {
    const [host, client] = await Promise.all([
      userRepository.findByIdSelect(hostId, { email: true, firstName: true }),
      userRepository.findByIdSelect(clientId, {
        firstName: true,
        lastName: true,
      }),
    ]);
    if (!host || !client) return;
    const emailContent = reservationCancelledByClientEmail(
      host.firstName,
      `${client.firstName} ${client.lastName}`,
      listingTitle,
      {
        start: format(new Date(startDate), "MMM d, yyyy"),
        end: format(new Date(endDate), "MMM d, yyyy"),
      },
    );
    dispatchNotification(host.email, emailContent.subject, emailContent.html);
  },
};
