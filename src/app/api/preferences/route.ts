import { NextRequest, NextResponse } from "next/server";
import { withAuth, parseBody } from "@/lib/api-utils";
import { updatePreferencesSchema } from "@/lib/schemas";
import { preferencesService } from "@/lib/services";

export const GET = withAuth(async (req: NextRequest, session) => {
  const prefs = await preferencesService.getPreferences(session.user.id);
  return NextResponse.json(prefs);
});

export const PUT = withAuth(async (req: NextRequest, session) => {
  const data = await parseBody(req, updatePreferencesSchema);
  const prefs = await preferencesService.updatePreferences(
    session.user.id,
    session.user.email,
    data,
  );
  return NextResponse.json(prefs);
});
