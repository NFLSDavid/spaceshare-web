import { NextRequest, NextResponse } from "next/server";
import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ZodSchema, ZodError } from "zod";

export type RouteContext = {
  params: Promise<Record<string, string>>;
};

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function requireAuth(): Promise<Session> {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new ApiError(401, "Unauthorized");
  }
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth();
  if (!session.user.isAdmin) {
    throw new ApiError(403, "Forbidden");
  }
  return session;
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode },
    );
  }
  if (error instanceof ZodError) {
    const message = error.issues.map((e) => e.message).join(", ");
    return NextResponse.json({ error: message }, { status: 400 });
  }
  console.error("Unhandled API error:", error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

type AuthHandler = (
  req: NextRequest,
  session: Session,
  context?: RouteContext,
) => Promise<NextResponse>;

export function withAuth(handler: AuthHandler) {
  return async (req: NextRequest, context?: RouteContext) => {
    try {
      const session = await requireAuth();
      return await handler(req, session, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

export function withErrorHandler(
  handler: (req: NextRequest, context?: RouteContext) => Promise<NextResponse>,
) {
  return async (req: NextRequest, context?: RouteContext) => {
    try {
      return await handler(req, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

export async function parseBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>,
): Promise<T> {
  const body = await req.json();
  return schema.parse(body);
}
