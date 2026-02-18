import { NextRequest, NextResponse } from "next/server";
import { withAuth, withErrorHandler, parseBody, type RouteContext } from "@/lib/api-utils";
import { updateListingSchema } from "@/lib/schemas";
import { listingService } from "@/lib/services";

export const GET = withErrorHandler(async (req: NextRequest, context?: RouteContext) => {
  const { id } = await context!.params;
  const listing = await listingService.getById(id);
  return NextResponse.json(listing);
});

export const PUT = withAuth(async (req: NextRequest, session, context?: RouteContext) => {
  const { id } = await context!.params;
  const data = await parseBody(req, updateListingSchema);
  const updated = await listingService.update(id, session.user.id, data);
  return NextResponse.json(updated);
});

export const DELETE = withAuth(
  async (req: NextRequest, session, context?: RouteContext) => {
    const { id } = await context!.params;
    const result = await listingService.delete(id, session.user.id);
    return NextResponse.json(result);
  },
);
