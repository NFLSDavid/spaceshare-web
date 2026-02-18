import { NextRequest, NextResponse } from "next/server";
import { withAuth, ApiError, type RouteContext } from "@/lib/api-utils";
import { listingService } from "@/lib/services";

export const GET = withAuth(async (req: NextRequest, session, context?: RouteContext) => {
  const { id } = await context!.params;
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!startDate || !endDate) {
    throw new ApiError(400, "startDate and endDate required");
  }

  const availability = await listingService.getAvailability(id, startDate, endDate);
  return NextResponse.json(availability);
});
