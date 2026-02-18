import { NextRequest, NextResponse } from "next/server";
import { withAuth, withErrorHandler } from "@/lib/api-utils";
import { authService } from "@/lib/services";

// POST: Send verification email (requires auth)
export const POST = withAuth(async (req: NextRequest, session) => {
  const result = await authService.sendVerificationEmail(session.user.id);
  return NextResponse.json(result);
});

// GET: Verify the token (public)
export const GET = withErrorHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const result = await authService.verifyEmail(token!);
  return NextResponse.json(result);
});
