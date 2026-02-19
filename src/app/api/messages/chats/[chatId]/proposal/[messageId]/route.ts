import { NextRequest, NextResponse } from "next/server";
import { withAuth, parseBody, type RouteContext } from "@/lib/api-utils";
import { respondProposalSchema } from "@/lib/schemas";
import { chatService } from "@/lib/services";

export const PATCH = withAuth(
  async (req: NextRequest, session, context?: RouteContext) => {
    const { chatId, messageId } = await context!.params;
    const { action } = await parseBody(req, respondProposalSchema);
    const result = await chatService.respondToProposal(
      chatId,
      messageId,
      session.user.id,
      action,
    );
    return NextResponse.json(result);
  },
);
