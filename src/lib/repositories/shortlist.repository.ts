import { prisma } from "@/lib/prisma";

export const shortlistRepository = {
  findByUser(userId: string) {
    return prisma.shortlist.findUnique({ where: { userId } });
  },

  upsert(userId: string, listingIds: string[]) {
    return prisma.shortlist.upsert({
      where: { userId },
      update: { listingIds },
      create: { userId, listingIds },
    });
  },
};
