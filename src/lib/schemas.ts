import { z } from "zod";
import { Amenity, ReservationStatus } from "@/generated/prisma/enums";

// ---- Listings ----
export const createListingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  price: z.coerce.number().positive("Price must be positive"),
  spaceAvailable: z.coerce.number().positive("Space must be positive"),
  amenities: z.array(z.nativeEnum(Amenity)).default([]),
  photos: z.array(z.string()).default([]),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  availableFrom: z.string().nullable().optional(),
  availableTo: z.string().nullable().optional(),
});

export const updateListingSchema = createListingSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// ---- Reservations ----
export const createReservationSchema = z
  .object({
    listingId: z.string().min(1, "Listing ID is required"),
    spaceRequested: z.number().positive("Space must be positive"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    message: z.string().optional(),
    items: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  });

export const updateReservationSchema = z.object({
  status: z.nativeEnum(ReservationStatus).optional(),
  rated: z.boolean().optional(),
});

// ---- Chat / Messages ----
export const createChatSchema = z.object({
  title: z.string().optional(),
  photoUrl: z.string().nullable().optional(),
  listingId: z.string().optional(),
  memberIds: z.array(z.string()).min(1, "At least one member required"),
});

export const sendMessageSchema = z
  .object({
    text: z.string().optional(),
    imageUrl: z.string().optional(),
  })
  .refine((data) => data.text || data.imageUrl, {
    message: "Either text or imageUrl is required",
  });

// ---- Preferences ----
export const updatePreferencesSchema = z.object({
  isActive: z.boolean().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  radius: z.number().positive().optional(),
  email: z.string().email().optional().nullable(),
});

// ---- Shortlist ----
export const updateShortlistSchema = z.object({
  listingId: z.string().min(1, "Listing ID is required"),
  action: z.enum(["add", "remove", "toggle"]),
});

// ---- Rate ----
export const rateListingSchema = z.object({
  reservationId: z.string().min(1, "Reservation ID required"),
  liked: z.boolean(),
});

// ---- Auth (public routes) ----
export const registerSchema = z.object({
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email is required"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
