import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateDistanceKm } from "@/lib/geo";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get("lat") || "0");
    const lng = parseFloat(searchParams.get("lng") || "0");

    if (!lat || !lng) {
      return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
    }

    const listings = await prisma.listing.findMany({
      where: {
        isActive: true,
        hostId: { not: session.user.id },
      },
      select: { price: true, latitude: true, longitude: true },
    });

    const nearby = listings.filter(
      (l) => calculateDistanceKm(lat, lng, l.latitude, l.longitude) <= 5
    );

    if (nearby.length === 0) {
      return NextResponse.json({ recommendedPrice: 0, count: 0 });
    }

    const avg =
      nearby.reduce((sum, l) => sum + l.price, 0) / nearby.length;

    return NextResponse.json({
      recommendedPrice: Math.round(avg * 100) / 100,
      count: nearby.length,
    });
  } catch (error) {
    console.error("Price recommendation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
