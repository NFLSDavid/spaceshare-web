import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        host: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
        bookings: true,
      },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    return NextResponse.json(listing);
  } catch (error) {
    console.error("Listing GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const listing = await prisma.listing.findUnique({ where: { id } });

    if (!listing || listing.hostId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const updated = await prisma.listing.update({
      where: { id },
      data: {
        title: body.title,
        description: body.description,
        price: body.price !== undefined ? parseFloat(body.price) : undefined,
        spaceAvailable: body.spaceAvailable !== undefined ? parseFloat(body.spaceAvailable) : undefined,
        amenities: body.amenities,
        photos: body.photos,
        isActive: body.isActive,
        latitude: body.latitude !== undefined ? parseFloat(body.latitude) : undefined,
        longitude: body.longitude !== undefined ? parseFloat(body.longitude) : undefined,
      },
      include: {
        host: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Listing PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const listing = await prisma.listing.findUnique({ where: { id } });

    if (!listing || listing.hostId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check for upcoming reservations
    const upcomingReservations = await prisma.reservation.findMany({
      where: {
        listingId: id,
        status: { in: ["PENDING", "APPROVED"] },
        startDate: { gte: new Date() },
      },
    });

    if (upcomingReservations.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete listing with upcoming reservations" },
        { status: 409 }
      );
    }

    // Delete associated chats and the listing
    await prisma.chat.deleteMany({ where: { listingId: id } });
    await prisma.listing.delete({ where: { id } });

    return NextResponse.json({ message: "Listing deleted" });
  } catch (error) {
    console.error("Listing DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
