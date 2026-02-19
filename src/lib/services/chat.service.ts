import { ApiError } from "@/lib/api-utils";
import type { Prisma } from "@/generated/prisma";
import {
  chatRepository,
  messageRepository,
  reservationRepository,
} from "@/lib/repositories";
import { checkAvailability, calculateCost } from "@/lib/availability";

type ChatResult = Awaited<ReturnType<typeof chatRepository.create>> | Awaited<ReturnType<typeof chatRepository.findExisting>>;

export interface ProposalData {
  listingId: string;
  totalCost: number;
  spaceRequested: number;
  startDate: string;
  endDate: string;
  items?: Record<string, unknown>;
  message?: string;
  status: "pending" | "accepted" | "rejected";
}

export const chatService = {
  async getChats(userId: string) {
    const chats = await chatRepository.findByUser(userId);

    // Sort by last message time
    chats.sort((a, b) => {
      const aTime =
        a.messages[0]?.createdAt?.getTime() || a.createdAt.getTime();
      const bTime =
        b.messages[0]?.createdAt?.getTime() || b.createdAt.getTime();
      return bTime - aTime;
    });

    return chats;
  },

  async getChat(chatId: string, userId: string) {
    const chat = await chatRepository.findById(chatId);
    if (!chat) throw new ApiError(404, "Chat not found");

    const isMember = chat.members.some((m) => m.userId === userId);
    if (!isMember) throw new ApiError(403, "Forbidden");

    return chat;
  },

  async createChat(data: {
    title?: string;
    photoUrl?: string | null;
    listingId?: string;
    memberIds: string[];
  }): Promise<{ chat: NonNullable<ChatResult>; isNew: boolean }> {
    // Check if chat already exists between these members for this listing
    if (data.listingId && data.memberIds.length === 2) {
      const existing = await chatRepository.findExisting(
        data.listingId,
        data.memberIds,
      );
      if (existing) return { chat: existing, isNew: false };
    }

    const chat = await chatRepository.create({
      title: data.title ?? "",
      photoUrl: data.photoUrl,
      listingId: data.listingId,
      memberIds: data.memberIds,
    });
    return { chat, isNew: true };
  },

  async sendMessage(
    chatId: string,
    userId: string,
    userName: string,
    data: { text?: string; imageUrl?: string },
  ) {
    return messageRepository.create({
      chatId,
      senderId: userId,
      senderName: userName,
      text: data.text,
      imageUrl: data.imageUrl,
    });
  },

  async deleteChat(chatId: string, userId: string) {
    const chat = await chatRepository.findById(chatId);
    if (!chat) throw new ApiError(404, "Chat not found");
    const isMember = chat.members.some((m) => m.userId === userId);
    if (!isMember) throw new ApiError(403, "Forbidden");
    return chatRepository.delete(chatId);
  },

  async sendProposal(
    chatId: string,
    senderId: string,
    senderName: string,
    proposalInput: {
      totalCost: number;
      spaceRequested: number;
      startDate: string;
      endDate: string;
      items?: Record<string, unknown>;
      message?: string;
    },
  ) {
    const chat = await chatRepository.findById(chatId);
    if (!chat) throw new ApiError(404, "Chat not found");

    const isMember = chat.members.some((m) => m.userId === senderId);
    if (!isMember) throw new ApiError(403, "Forbidden");

    if (!chat.listing) {
      throw new ApiError(400, "Chat is not linked to a listing");
    }

    // Only the client (non-host) can send proposals
    if (chat.listing.hostId === senderId) {
      throw new ApiError(400, "Only the client can send a proposal");
    }

    const proposalData: ProposalData = {
      listingId: chat.listing.id,
      totalCost: proposalInput.totalCost,
      spaceRequested: proposalInput.spaceRequested,
      startDate: proposalInput.startDate,
      endDate: proposalInput.endDate,
      items: proposalInput.items,
      message: proposalInput.message,
      status: "pending",
    };

    return messageRepository.create({
      chatId,
      senderId,
      senderName,
      text: proposalInput.message ?? undefined,
      proposalData: proposalData as unknown as Prisma.InputJsonValue,
    });
  },

  async respondToProposal(
    chatId: string,
    messageId: string,
    userId: string,
    action: "accept" | "reject",
  ) {
    const chat = await chatRepository.findById(chatId);
    if (!chat) throw new ApiError(404, "Chat not found");

    const isMember = chat.members.some((m) => m.userId === userId);
    if (!isMember) throw new ApiError(403, "Forbidden");

    if (!chat.listing) {
      throw new ApiError(400, "Chat is not linked to a listing");
    }

    // Only the host can respond to proposals
    if (chat.listing.hostId !== userId) {
      throw new ApiError(403, "Only the host can respond to proposals");
    }

    const message = await messageRepository.findByIdFull(messageId);
    if (!message || message.chatId !== chatId) {
      throw new ApiError(404, "Message not found");
    }

    const proposal = message.proposalData as unknown as ProposalData | null;
    if (!proposal) {
      throw new ApiError(400, "Message is not a proposal");
    }
    if (proposal.status !== "pending") {
      throw new ApiError(400, `Proposal already ${proposal.status}`);
    }

    if (action === "reject") {
      const updated: ProposalData = { ...proposal, status: "rejected" };
      return messageRepository.update(messageId, {
        proposalData: updated as unknown as Prisma.InputJsonValue,
      });
    }

    // Accept: create reservation + booking atomically
    const start = new Date(proposal.startDate);
    const end = new Date(proposal.endDate);
    const clientId = message.senderId;

    await reservationRepository.createApprovedWithBooking(
      {
        listingId: proposal.listingId,
        hostId: userId,
        clientId,
        spaceRequested: proposal.spaceRequested,
        totalCost: proposal.totalCost,
        startDate: start,
        endDate: end,
        message: proposal.message,
        items: (proposal.items as Prisma.InputJsonValue) || undefined,
      },
      (currentBookings) => {
        const available = checkAvailability(
          currentBookings,
          start,
          end,
          chat.listing!.spaceAvailable,
        );
        if (available < proposal.spaceRequested) {
          throw new ApiError(
            409,
            "Not enough space available for the requested dates.",
          );
        }
      },
    );

    // Update proposal status to accepted
    const updated: ProposalData = { ...proposal, status: "accepted" };
    return messageRepository.update(messageId, {
      proposalData: updated as unknown as Prisma.InputJsonValue,
    });
  },
};
