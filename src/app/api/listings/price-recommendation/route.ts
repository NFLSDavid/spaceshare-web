import { NextRequest, NextResponse } from "next/server";
import { withAuth, ApiError } from "@/lib/api-utils";
import { listingService } from "@/lib/services";

export const GET = withAuth(async (req: NextRequest, session) => {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get("lat") || "0");
  const lng = parseFloat(searchParams.get("lng") || "0");

  if (!lat || !lng) {
    throw new ApiError(400, "lat and lng required");
  }

  const result = await listingService.getPriceRecommendation(lat, lng, session.user.id);
  return NextResponse.json(result);
});
