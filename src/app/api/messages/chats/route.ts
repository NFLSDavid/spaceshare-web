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

    const chats = await prisma.chat.findMany({
      where: {
        members: { some: { userId: session.user.id } },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Sort by last message time
    chats.sort((a, b) => {
      const aTime = a.messages[0]?.createdAt?.getTime() || a.createdAt.getTime();
      const bTime = b.messages[0]?.createdAt?.getTime() || b.createdAt.getTime();
      return bTime - aTime;
    });

    return NextResponse.json(chats);
  } catch (error) {
    console.error("Chats GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, photoUrl, listingId, memberIds } = await req.json();

    // Check if chat already exists between these members for this listing
    if (listingId && memberIds?.length === 2) {
      const existingChat = await prisma.chat.findFirst({
        where: {
          listingId,
          AND: memberIds.map((id: string) => ({
            members: { some: { userId: id } },
          })),
        },
        include: {
          members: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
            },
          },
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      });

      if (existingChat) {
        return NextResponse.json(existingChat);
      }
    }

    const chat = await prisma.chat.create({
      data: {
        title,
        photoUrl,
        listingId,
        members: {
          create: memberIds.map((userId: string) => ({ userId })),
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
          },
        },
        messages: true,
      },
    });

    return NextResponse.json(chat, { status: 201 });
  } catch (error) {
    console.error("Chats POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
