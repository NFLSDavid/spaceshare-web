import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "startDate and endDate required" }, { status: 400 });
    }

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: { bookings: true },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const availability: { date: string; available: number }[] = [];

    const current = new Date(start);
    while (current <= end) {
      const dayStart = new Date(current);
      const dayEnd = new Date(current);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const overlapping = listing.bookings.filter(
        (b) => new Date(b.startDate) < dayEnd && new Date(b.endDate) > dayStart
      );
      const bookedSpace = overlapping.reduce((sum, b) => sum + b.reservedSpace, 0);
      const available = Math.max(0, listing.spaceAvailable - bookedSpace);

      availability.push({
        date: current.toISOString().split("T")[0],
        available: Math.round(available * 100) / 100,
      });

      current.setDate(current.getDate() + 1);
    }

    return NextResponse.json(availability);
  } catch (error) {
    console.error("Availability GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
