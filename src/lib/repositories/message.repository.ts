import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";

export const messageRepository = {
  create(data: {
    chatId: string;
    senderId: string;
    senderName: string;
    text?: string;
    imageUrl?: string;
    proposalData?: Prisma.InputJsonValue;
  }) {
    return prisma.message.create({ data });
  },

  findById(id: string) {
    return prisma.message.findUnique({
      where: { id },
      select: { createdAt: true },
    });
  },

  findByIdFull(id: string) {
    return prisma.message.findUnique({ where: { id } });
  },

  update(id: string, data: Prisma.MessageUncheckedUpdateInput) {
    return prisma.message.update({ where: { id }, data });
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
