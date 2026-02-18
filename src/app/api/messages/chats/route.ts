import { NextRequest, NextResponse } from "next/server";
import { withAuth, parseBody } from "@/lib/api-utils";
import { createChatSchema } from "@/lib/schemas";
import { chatService } from "@/lib/services";

export const GET = withAuth(async (req: NextRequest, session) => {
  const chats = await chatService.getChats(session.user.id);
  return NextResponse.json(chats);
});

export const POST = withAuth(async (req: NextRequest, session) => {
  const data = await parseBody(req, createChatSchema);
  const { chat, isNew } = await chatService.createChat(data);
  return NextResponse.json(chat, { status: isNew ? 201 : 200 });
});
