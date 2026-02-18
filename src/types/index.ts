import type {
  User,
  Listing,
  Reservation,
  Chat,
  Message,
  Booking,
  Shortlist,
  Preferences,
  Amenity,
  ReservationStatus,
} from "@/generated/prisma/client";

export type {
  User,
  Listing,
  Reservation,
  Chat,
  Message,
  Booking,
  Shortlist,
  Preferences,
  Amenity,
  ReservationStatus,
};

export type ListingWithHost = Listing & {
  host: Pick<User, "id" | "firstName" | "lastName" | "photoUrl">;
};

export type ListingWithBookings = Listing & {
  bookings: Booking[];
};

export type ReservationWithDetails = Reservation & {
  listing: Pick<
    Listing,
    "id" | "title" | "photos" | "latitude" | "longitude" | "price" | "isActive" | "deletedAt"
  >;
  host: Pick<User, "id" | "firstName" | "lastName" | "photoUrl" | "email">;
  client: Pick<User, "id" | "firstName" | "lastName" | "photoUrl">;
};

export type ChatWithDetails = Chat & {
  members: {
    userId: string;
    user: Pick<User, "id" | "firstName" | "lastName" | "photoUrl">;
  }[];
  messages: Message[];
};

export interface SearchCriteria {
  latitude: number;
  longitude: number;
  radius: number;
  spaceRequired: number;
  startDate: string;
  endDate: string;
}

export interface FilterCriteria {
  minPrice: number;
  maxPrice: number;
  minSpace: number;
  maxSpace: number;
  amenities: Amenity[];
}

export type SortOption =
  | "CLOSEST"
  | "NEWEST"
  | "OLDEST"
  | "CHEAPEST"
  | "MOST_EXPENSIVE"
  | "LARGEST"
  | "SMALLEST"
  | "MOST_LIKED";

export const AMENITY_LABELS: Record<Amenity, string> = {
  SURVEILLANCE: "Surveillance-enabled",
  CLIMATE_CONTROLLED: "Climate-controlled",
  WELL_LIT: "Well-lit",
  ACCESSIBILITY: "Accessibility friendly",
  WEEKLY_CLEANING: "Cleaned weekly",
};

export const ITEM_TYPES = [
  "CLOTHING",
  "BOOKS_AND_DOCUMENTS",
  "FURNITURE",
  "SPORT_AND_RECREATIONAL",
  "APPLIANCE",
  "MEMENTOS",
  "DAILY_NECESSARY",
  "OTHERS",
] as const;

export type ItemType = (typeof ITEM_TYPES)[number];

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  CLOTHING: "Clothing",
  BOOKS_AND_DOCUMENTS: "Books & Documents",
  FURNITURE: "Furniture",
  SPORT_AND_RECREATIONAL: "Sport & Recreational",
  APPLIANCE: "Appliance",
  MEMENTOS: "Mementos",
  DAILY_NECESSARY: "Daily Necessities",
  OTHERS: "Others",
};

export const SPACE_BOOKING_LOWER_LIMIT = 0;
export const SPACE_OFFERING_LOWER_LIMIT = 0.5;
export const SPACE_UPPER_LIMIT = 100;
export const DEFAULT_MAX_PRICE = 100;

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      isAdmin: boolean;
      isVerified: number;
      image?: string | null;
      name?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    isAdmin: boolean;
    isVerified: number;
    firstName: string;
    lastName: string;
  }
}
