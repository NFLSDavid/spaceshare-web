import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { chatId } = await params;

  // Verify membership
  const member = await prisma.chatMember.findUnique({
    where: { chatId_userId: { chatId, userId: session.user.id } },
  });

  if (!member) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  let lastMessageId: string | null = null;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial keep-alive
      controller.enqueue(encoder.encode("data: {\"type\":\"connected\"}\n\n"));

      const poll = async () => {
        if (closed) return;

        try {
          const where: any = { chatId };
          if (lastMessageId) {
            // Get messages created after the last one we sent
            const lastMsg = await prisma.message.findUnique({
              where: { id: lastMessageId },
              select: { createdAt: true },
            });
            if (lastMsg) {
              where.createdAt = { gt: lastMsg.createdAt };
            }
          }

          const messages = await prisma.message.findMany({
            where,
            orderBy: { createdAt: "asc" },
            take: lastMessageId ? undefined : 1, // First poll: just get latest ID
          });

          if (messages.length > 0) {
            if (!lastMessageId) {
              // Initialize: just track the last message ID
              lastMessageId = messages[messages.length - 1].id;
            } else {
              // Send new messages
              for (const msg of messages) {
                const data = JSON.stringify({ type: "message", message: msg });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                lastMessageId = msg.id;
              }
            }
          }
        } catch (error) {
          console.error("SSE poll error:", error);
        }

        if (!closed) {
          setTimeout(poll, 2000);
        }
      };

      poll();
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
