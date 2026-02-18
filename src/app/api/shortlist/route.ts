import { NextRequest, NextResponse } from "next/server";
import { withAuth, parseBody } from "@/lib/api-utils";
import { updateShortlistSchema } from "@/lib/schemas";
import { shortlistService } from "@/lib/services";

export const GET = withAuth(async (req: NextRequest, session) => {
  const listings = await shortlistService.getShortlist(session.user.id);
  return NextResponse.json(listings);
});

export const POST = withAuth(async (req: NextRequest, session) => {
  const { listingId, action } = await parseBody(req, updateShortlistSchema);
  const updated = await shortlistService.updateShortlist(session.user.id, listingId, action);
  return NextResponse.json(updated);
});
