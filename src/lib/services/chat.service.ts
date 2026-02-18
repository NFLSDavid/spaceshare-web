import { ApiError } from "@/lib/api-utils";
import { chatRepository, messageRepository } from "@/lib/repositories";

type ChatResult = Awaited<ReturnType<typeof chatRepository.create>> | Awaited<ReturnType<typeof chatRepository.findExisting>>;

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
};
