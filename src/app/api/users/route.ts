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

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("id");

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          photoUrl: true,
          isVerified: true,
          governmentId: true,
          createdAt: true,
        },
      });
      return NextResponse.json(user);
    }

    // Admin: get all users
    if (!session.user.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isVerified: true,
        governmentId: true,
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Users GET error:", error);
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

    // Admin updating verification status
    if (body.targetUserId && session.user.isAdmin) {
      const updated = await prisma.user.update({
        where: { id: body.targetUserId },
        data: { isVerified: body.isVerified },
      });
      return NextResponse.json(updated);
    }

    // User updating own profile
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        photoUrl: body.photoUrl,
        governmentId: body.governmentId,
        isVerified: body.governmentId ? 0 : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Users PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
