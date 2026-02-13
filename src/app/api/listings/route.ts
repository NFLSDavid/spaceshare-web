import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateDistanceKm } from "@/lib/geo";
import { sendEmail } from "@/lib/email";
import { newListingMatchEmail } from "@/lib/email-templates";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const hostId = searchParams.get("hostId");
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const radius = searchParams.get("radius");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const spaceRequired = searchParams.get("spaceRequired");

    // Host mode: get user's listings
    if (hostId) {
      const listings = await prisma.listing.findMany({
        where: { hostId },
        include: {
          host: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
          bookings: true,
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(listings);
    }

    // Client mode: search listings
    const where: any = {
      isActive: true,
      hostId: { not: session.user.id },
    };

    let listings = await prisma.listing.findMany({
      where,
      include: {
        host: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
        bookings: true,
      },
    });

    // Filter by distance if location provided
    if (lat && lng && radius) {
      const centerLat = parseFloat(lat);
      const centerLng = parseFloat(lng);
      const maxRadius = parseFloat(radius);

      listings = listings.filter((listing) => {
        const dist = calculateDistanceKm(
          centerLat,
          centerLng,
          listing.latitude,
          listing.longitude
        );
        (listing as any)._distance = dist;
        return dist <= maxRadius;
      });
    }

    // Filter by date availability and space
    if (startDate && endDate && spaceRequired) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const required = parseFloat(spaceRequired);

      listings = listings.filter((listing) => {
        const overlappingBookings = listing.bookings.filter(
          (b) => new Date(b.startDate) < end && new Date(b.endDate) > start
        );
        const bookedSpace = overlappingBookings.reduce(
          (sum, b) => sum + b.reservedSpace,
          0
        );
        const available = listing.spaceAvailable - bookedSpace;
        return available >= required;
      });
    }

    return NextResponse.json(listings);
  } catch (error) {
    console.error("Listings GET error:", error);
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
    const { title, description, price, spaceAvailable, amenities, photos, latitude, longitude } =
      body;

    if (!title || !description || price == null || !spaceAvailable || !latitude || !longitude) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const listing = await prisma.listing.create({
      data: {
        hostId: session.user.id,
        title,
        description,
        price: parseFloat(price),
        spaceAvailable: parseFloat(spaceAvailable),
        amenities: amenities || [],
        photos: photos || [],
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      },
      include: {
        host: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
      },
    });

    // Notify users with matching preferences (fire-and-forget)
    notifyMatchingPreferences(listing).catch(console.error);

    return NextResponse.json(listing, { status: 201 });
  } catch (error) {
    console.error("Listings POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function notifyMatchingPreferences(listing: any) {
  const preferences = await prisma.preferences.findMany({
    where: {
      isActive: true,
      userId: { not: listing.hostId },
      latitude: { not: null },
      longitude: { not: null },
    },
    include: { user: { select: { email: true, firstName: true } } },
  });

  for (const pref of preferences) {
    if (!pref.latitude || !pref.longitude || !pref.email) continue;

    const distance = calculateDistanceKm(
      pref.latitude,
      pref.longitude,
      listing.latitude,
      listing.longitude
    );

    if (distance <= pref.radius) {
      const emailContent = newListingMatchEmail(
        pref.user.firstName,
        listing.title,
        listing.price,
        distance,
        `${listing.latitude.toFixed(4)}, ${listing.longitude.toFixed(4)}`
      );
      sendEmail(pref.email, emailContent.subject, emailContent.html);
    }
  }
}
