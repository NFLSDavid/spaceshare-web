import { NextRequest, NextResponse } from "next/server";
import { withAuth, parseBody } from "@/lib/api-utils";
import { createReservationSchema } from "@/lib/schemas";
import { reservationService } from "@/lib/services";

export const GET = withAuth(async (req: NextRequest, session) => {
  const { searchParams } = new URL(req.url);
  const asHost = searchParams.get("asHost") === "true";

  const reservations = await reservationService.getReservations(
    session.user.id,
    asHost,
  );

  return NextResponse.json(reservations);
});

export const POST = withAuth(async (req: NextRequest, session) => {
  const data = await parseBody(req, createReservationSchema);

  const reservation = await reservationService.create({
    ...data,
    clientId: session.user.id,
    clientName: `${session.user.firstName} ${session.user.lastName}`,
  });

  return NextResponse.json(reservation, { status: 201 });
});
