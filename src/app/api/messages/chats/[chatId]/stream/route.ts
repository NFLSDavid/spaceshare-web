import { NextRequest } from "next/server";
import { requireAuth, handleApiError } from "@/lib/api-utils";
import { chatRepository } from "@/lib/repositories";
import { messageRepository } from "@/lib/repositories";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const session = await requireAuth();
    const { chatId } = await params;

    // Verify membership
    const member = await chatRepository.findMember(chatId, session.user.id);

    if (!member) {
      return new Response("Forbidden", { status: 403 });
    }

    const encoder = new TextEncoder();
    let lastMessageId: string | null = null;
    let closed = false;

    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'));

        const poll = async () => {
          if (closed) return;

          try {
            let afterDate: Date | undefined;
            if (lastMessageId) {
              const lastMsg = await messageRepository.findById(lastMessageId);
              if (lastMsg) {
                afterDate = lastMsg.createdAt;
              }
            }

            const messages = lastMessageId
              ? await messageRepository.findNewMessages(chatId, afterDate)
              : await messageRepository.findLatest(chatId);

            if (messages.length > 0) {
              if (!lastMessageId) {
                lastMessageId = messages[messages.length - 1].id;
              } else {
                for (const msg of messages) {
                  const data = JSON.stringify({
                    type: "message",
                    message: msg,
                  });
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
  } catch (error) {
    return handleApiError(error);
  }
}
