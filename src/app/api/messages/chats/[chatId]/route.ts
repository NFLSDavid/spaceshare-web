import { NextRequest, NextResponse } from "next/server";
import { withAuth, parseBody, type RouteContext } from "@/lib/api-utils";
import { sendMessageSchema } from "@/lib/schemas";
import { chatService } from "@/lib/services";

export const GET = withAuth(async (req: NextRequest, session, context?: RouteContext) => {
  const { chatId } = await context!.params;
  const chat = await chatService.getChat(chatId, session.user.id);
  return NextResponse.json(chat);
});

export const POST = withAuth(
  async (req: NextRequest, session, context?: RouteContext) => {
    const { chatId } = await context!.params;
    const data = await parseBody(req, sendMessageSchema);
    const message = await chatService.sendMessage(
      chatId,
      session.user.id,
      `${session.user.firstName} ${session.user.lastName}`,
      data,
    );
    return NextResponse.json(message, { status: 201 });
  },
);

export const DELETE = withAuth(async (req: NextRequest, session, context?: RouteContext) => {
  const { chatId } = await context!.params;
  await chatService.deleteChat(chatId, session.user.id);
  return new NextResponse(null, { status: 204 });
});
