import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shortlist = await prisma.shortlist.findUnique({
      where: { userId: session.user.id },
    });

    if (!shortlist || shortlist.listingIds.length === 0) {
      return NextResponse.json([]);
    }

    const listings = await prisma.listing.findMany({
      where: {
        id: { in: shortlist.listingIds },
        isActive: true,
      },
      include: {
        host: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
      },
    });

    return NextResponse.json(listings);
  } catch (error) {
    console.error("Shortlist GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { listingId, action } = await req.json(); // action: "add" | "remove" | "toggle"

    let shortlist = await prisma.shortlist.findUnique({
      where: { userId: session.user.id },
    });

    if (!shortlist) {
      shortlist = await prisma.shortlist.create({
        data: { userId: session.user.id, listingIds: [] },
      });
    }

    let newListingIds = [...shortlist.listingIds];
    const isInList = newListingIds.includes(listingId);

    if (action === "add" && !isInList) {
      newListingIds.push(listingId);
    } else if (action === "remove" && isInList) {
      newListingIds = newListingIds.filter((id) => id !== listingId);
    } else if (action === "toggle") {
      if (isInList) {
        newListingIds = newListingIds.filter((id) => id !== listingId);
      } else {
        newListingIds.push(listingId);
      }
    }

    const updated = await prisma.shortlist.update({
      where: { userId: session.user.id },
      data: { listingIds: newListingIds },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Shortlist POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
