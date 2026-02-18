import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler, parseBody } from "@/lib/api-utils";
import { forgotPasswordSchema } from "@/lib/schemas";
import { authService } from "@/lib/services";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { email } = await parseBody(req, forgotPasswordSchema);
  const result = await authService.forgotPassword(email);
  return NextResponse.json(result);
});
