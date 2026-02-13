import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { newReservationRequestEmail } from "@/lib/email-templates";
import { format } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const asHost = searchParams.get("asHost") === "true";

    const where = asHost
      ? { hostId: session.user.id }
      : { clientId: session.user.id };

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        listing: {
          select: { id: true, title: true, photos: true, latitude: true, longitude: true, price: true },
        },
        host: { select: { id: true, firstName: true, lastName: true, photoUrl: true, email: true } },
        client: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(reservations);
  } catch (error) {
    console.error("Reservations GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { listingId, spaceRequested, startDate, endDate, message, items } = body;

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { bookings: true },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    if (listing.hostId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot reserve your own listing" },
        { status: 400 }
      );
    }

    // Check available space
    const start = new Date(startDate);
    const end = new Date(endDate);

    const overlapping = listing.bookings.filter(
      (b) => new Date(b.startDate) < end && new Date(b.endDate) > start
    );
    const bookedSpace = overlapping.reduce((sum, b) => sum + b.reservedSpace, 0);
    const available = listing.spaceAvailable - bookedSpace;

    if (available < spaceRequested) {
      return NextResponse.json(
        { error: "Not enough space available" },
        { status: 400 }
      );
    }

    // Calculate days and total cost
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const totalCost = Math.round(listing.price * spaceRequested * days * 100) / 100;

    const reservation = await prisma.reservation.create({
      data: {
        listingId,
        hostId: listing.hostId,
        clientId: session.user.id,
        spaceRequested,
        totalCost,
        startDate: start,
        endDate: end,
        message,
        items: items || undefined,
      },
      include: {
        listing: {
          select: { id: true, title: true, photos: true, latitude: true, longitude: true, price: true },
        },
        host: { select: { id: true, firstName: true, lastName: true, photoUrl: true, email: true } },
        client: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
      },
    });

    // Send email notification to host (fire-and-forget)
    const host = await prisma.user.findUnique({ where: { id: listing.hostId }, select: { email: true, firstName: true } });
    if (host) {
      const emailContent = newReservationRequestEmail(
        host.firstName,
        `${session.user.firstName} ${session.user.lastName}`,
        listing.title,
        spaceRequested,
        { start: format(start, "MMM d, yyyy"), end: format(end, "MMM d, yyyy") }
      );
      sendEmail(host.email, emailContent.subject, emailContent.html);
    }

    return NextResponse.json(reservation, { status: 201 });
  } catch (error) {
    console.error("Reservations POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
