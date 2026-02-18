import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-utils";
import { userService } from "@/lib/services";

export const GET = withAuth(async (req: NextRequest, session) => {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("id");

  if (userId) {
    const user = await userService.getUser(userId);
    return NextResponse.json(user);
  }

  const users = await userService.getAllUsers(session.user.id, session.user.isAdmin);
  return NextResponse.json(users);
});

export const PUT = withAuth(async (req: NextRequest, session) => {
  const body = await req.json();

  // Admin updating verification status
  if (body.targetUserId && session.user.isAdmin) {
    const updated = await userService.updateVerification(
      session.user.id,
      session.user.isAdmin,
      body.targetUserId,
      body.isVerified,
    );
    return NextResponse.json(updated);
  }

  // User updating own profile
  const updated = await userService.updateProfile(session.user.id, body);
  return NextResponse.json(updated);
});
