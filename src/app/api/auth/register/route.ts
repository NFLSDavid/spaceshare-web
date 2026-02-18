import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler, parseBody } from "@/lib/api-utils";
import { registerSchema } from "@/lib/schemas";
import { authService } from "@/lib/services";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const data = await parseBody(req, registerSchema);
  const result = await authService.register(data);
  return NextResponse.json(result, { status: 201 });
});
