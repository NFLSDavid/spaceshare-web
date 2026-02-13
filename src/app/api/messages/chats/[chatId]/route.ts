import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId } = await params;

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
        },
        listing: {
          select: { id: true, title: true, price: true, photos: true, latitude: true, longitude: true },
        },
      },
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Verify user is a member
    const isMember = chat.members.some((m) => m.userId === session.user.id);
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(chat);
  } catch (error) {
    console.error("Chat GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Send a message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatId } = await params;
    const { text, imageUrl } = await req.json();

    const message = await prisma.message.create({
      data: {
        chatId,
        senderId: session.user.id,
        senderName: `${session.user.firstName} ${session.user.lastName}`,
        text,
        imageUrl,
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("Message POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
