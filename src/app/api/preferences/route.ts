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

    const prefs = await prisma.preferences.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json(prefs || { userId: session.user.id, isActive: false, radius: 5 });
  } catch (error) {
    console.error("Preferences GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const prefs = await prisma.preferences.upsert({
      where: { userId: session.user.id },
      update: {
        isActive: body.isActive,
        latitude: body.latitude,
        longitude: body.longitude,
        radius: body.radius,
        email: body.email,
      },
      create: {
        userId: session.user.id,
        isActive: body.isActive ?? false,
        latitude: body.latitude,
        longitude: body.longitude,
        radius: body.radius ?? 5,
        email: body.email || session.user.email,
      },
    });

    return NextResponse.json(prefs);
  } catch (error) {
    console.error("Preferences PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
