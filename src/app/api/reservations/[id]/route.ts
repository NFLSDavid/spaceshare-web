import { NextRequest, NextResponse } from "next/server";
import { withAuth, parseBody, type RouteContext } from "@/lib/api-utils";
import { updateReservationSchema } from "@/lib/schemas";
import { reservationService } from "@/lib/services";

export const PATCH = withAuth(
  async (req: NextRequest, session, context?: RouteContext) => {
    const { id } = await context!.params;
    const data = await parseBody(req, updateReservationSchema);

    if (data.cleared) {
      const updated = await reservationService.clearReservation(id, session.user.id);
      return NextResponse.json(updated);
    }

    const updated = await reservationService.updateStatus({
      reservationId: id,
      userId: session.user.id,
      ...data,
    });

    return NextResponse.json(updated);
  },
);
