import { NextRequest, NextResponse } from "next/server";
import { withAuth, parseBody, type RouteContext } from "@/lib/api-utils";
import { rateListingSchema } from "@/lib/schemas";
import { listingService } from "@/lib/services";

export const POST = withAuth(
  async (req: NextRequest, session, context?: RouteContext) => {
    const { id } = await context!.params;
    const { reservationId, liked } = await parseBody(req, rateListingSchema);
    const result = await listingService.rate(id, session.user.id, reservationId, liked);
    return NextResponse.json(result);
  },
);
