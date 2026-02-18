import { prisma } from "@/lib/prisma";

export const messageRepository = {
  create(data: {
    chatId: string;
    senderId: string;
    senderName: string;
    text?: string;
    imageUrl?: string;
  }) {
    return prisma.message.create({ data });
  },

  findById(id: string) {
    return prisma.message.findUnique({
      where: { id },
      select: { createdAt: true },
    });
  },

  findNewMessages(chatId: string, afterDate?: Date) {
    return prisma.message.findMany({
      where: {
        chatId,
        ...(afterDate ? { createdAt: { gt: afterDate } } : {}),
      },
      orderBy: { createdAt: "asc" },
    });
  },

  findLatest(chatId: string) {
    return prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" },
      take: 1,
    });
  },
};
