import { prisma } from "@/lib/prisma";

export const verificationTokenRepository = {
  findByToken(token: string) {
    return prisma.verificationToken.findUnique({ where: { token } });
  },

  create(data: {
    userId: string;
    token: string;
    type: string;
    expiresAt: Date;
  }) {
    return prisma.verificationToken.create({ data });
  },

  delete(id: string) {
    return prisma.verificationToken.delete({ where: { id } });
  },

  deleteByUserAndType(userId: string, type: string) {
    return prisma.verificationToken.deleteMany({
      where: { userId, type },
    });
  },
};
