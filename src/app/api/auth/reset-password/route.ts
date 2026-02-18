import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler, parseBody } from "@/lib/api-utils";
import { resetPasswordSchema } from "@/lib/schemas";
import { authService } from "@/lib/services";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { token, password } = await parseBody(req, resetPasswordSchema);
  const result = await authService.resetPassword(token, password);
  return NextResponse.json(result);
});
