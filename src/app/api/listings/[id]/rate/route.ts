import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { reservationId, liked } = await req.json();

    if (!reservationId || typeof liked !== "boolean") {
      return NextResponse.json({ error: "Missing reservationId or liked" }, { status: 400 });
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    if (reservation.clientId !== session.user.id) {
      return NextResponse.json({ error: "Only the client can rate" }, { status: 403 });
    }

    if (reservation.listingId !== id) {
      return NextResponse.json({ error: "Reservation does not match listing" }, { status: 400 });
    }

    if (reservation.status !== "APPROVED") {
      return NextResponse.json({ error: "Reservation must be approved to rate" }, { status: 400 });
    }

    if (reservation.rated) {
      return NextResponse.json({ error: "Already rated" }, { status: 400 });
    }

    if (new Date(reservation.startDate) > new Date()) {
      return NextResponse.json({ error: "Cannot rate before start date" }, { status: 400 });
    }

    // If liked, increment likes count
    if (liked) {
      await prisma.listing.update({
        where: { id },
        data: { likes: { increment: 1 } },
      });
    }

    // Mark reservation as rated
    await prisma.reservation.update({
      where: { id: reservationId },
      data: { rated: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Rate POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
