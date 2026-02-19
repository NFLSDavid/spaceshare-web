import { prisma } from "@/lib/prisma";
import { USER_PUBLIC_SELECT } from "./selects";

const MEMBER_INCLUDE = {
  user: { select: USER_PUBLIC_SELECT },
} as const;

const CHAT_LIST_INCLUDE = {
  members: { include: MEMBER_INCLUDE },
  messages: { orderBy: { createdAt: "desc" as const }, take: 1 },
} as const;

const CHAT_DETAIL_INCLUDE = {
  members: { include: MEMBER_INCLUDE },
  messages: { orderBy: { createdAt: "asc" as const } },
  listing: {
    select: {
      id: true,
      title: true,
      price: true,
      photos: true,
      latitude: true,
      longitude: true,
      isActive: true,
      deletedAt: true,
      spaceAvailable: true,
      hostId: true,
    },
  },
} as const;

export const chatRepository = {
  findByUser(userId: string) {
    return prisma.chat.findMany({
      where: { members: { some: { userId } } },
      include: CHAT_LIST_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  },

  findById(chatId: string) {
    return prisma.chat.findUnique({
      where: { id: chatId },
      include: CHAT_DETAIL_INCLUDE,
    });
  },

  findExisting(listingId: string, memberIds: string[]) {
    return prisma.chat.findFirst({
      where: {
        listingId,
        AND: memberIds.map((id) => ({
          members: { some: { userId: id } },
        })),
      },
      include: CHAT_LIST_INCLUDE,
    });
  },

  create(data: {
    title: string;
    photoUrl?: string | null;
    listingId?: string;
    memberIds: string[];
  }) {
    return prisma.chat.create({
      data: {
        title: data.title,
        photoUrl: data.photoUrl,
        listingId: data.listingId,
        members: {
          create: data.memberIds.map((userId) => ({ userId })),
        },
      },
      include: {
        members: { include: MEMBER_INCLUDE },
        messages: true,
      },
    });
  },

  findMember(chatId: string, userId: string) {
    return prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId } },
    });
  },

  delete(chatId: string) {
    return prisma.chat.delete({ where: { id: chatId } });
  },
};
