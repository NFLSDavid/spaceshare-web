import { NextRequest, NextResponse } from "next/server";
import { withAuth, parseBody } from "@/lib/api-utils";
import { createListingSchema } from "@/lib/schemas";
import { listingService } from "@/lib/services";
import type { SortOption } from "@/types";

export const GET = withAuth(async (req: NextRequest, session) => {
  const { searchParams } = new URL(req.url);

  if (searchParams.get("deleted") === "true") {
    const deleted = await listingService.getDeletedListings(session.user.id);
    return NextResponse.json(deleted);
  }

  const listings = await listingService.search(session.user.id, {
    hostId: searchParams.get("hostId") || undefined,
    lat: searchParams.get("lat") ? parseFloat(searchParams.get("lat")!) : undefined,
    lng: searchParams.get("lng") ? parseFloat(searchParams.get("lng")!) : undefined,
    radius: searchParams.get("radius") ? parseFloat(searchParams.get("radius")!) : undefined,
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
    spaceRequired: searchParams.get("spaceRequired") ? parseFloat(searchParams.get("spaceRequired")!) : undefined,
    sortBy: (searchParams.get("sortBy") as SortOption) || undefined,
  });

  return NextResponse.json(listings);
});

export const POST = withAuth(async (req: NextRequest, session) => {
  const data = await parseBody(req, createListingSchema);
  const listing = await listingService.create(session.user.id, data);
  return NextResponse.json(listing, { status: 201 });
});
