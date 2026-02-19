import { NextRequest, NextResponse } from "next/server";
import { withAuth, parseBody } from "@/lib/api-utils";
import { blockUserSchema } from "@/lib/schemas";
import { userRepository } from "@/lib/repositories";

export const POST = withAuth(async (req: NextRequest, session) => {
  const { targetUserId } = await parseBody(req, blockUserSchema);
  await userRepository.addBlockedUser(session.user.id, targetUserId);
  return NextResponse.json({ success: true });
});
