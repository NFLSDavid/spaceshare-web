import { NextRequest, NextResponse } from "next/server";
import { withAuth, parseBody, type RouteContext } from "@/lib/api-utils";
import { sendProposalSchema } from "@/lib/schemas";
import { chatService } from "@/lib/services";

export const POST = withAuth(
  async (req: NextRequest, session, context?: RouteContext) => {
    const { chatId } = await context!.params;
    const data = await parseBody(req, sendProposalSchema);
    const message = await chatService.sendProposal(
      chatId,
      session.user.id,
      `${session.user.firstName} ${session.user.lastName}`,
      data,
    );
    return NextResponse.json(message, { status: 201 });
  },
);
